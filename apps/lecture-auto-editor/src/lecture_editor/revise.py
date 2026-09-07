"""자연어 지시사항으로 EDL을 수정한다.

신뢰성을 위해 Claude에게 EDL 전체를 다시 쓰게 하지 않고, "이 구간을 keep으로 바꿔라"
같은 작은 operation 목록만 JSON으로 받아 우리 코드가 직접 적용한다 — 모델이 타임스탬프를
잘못 옮겨 적거나 구간을 누락시킬 위험을 원천적으로 없애기 위함이다.

ANTHROPIC_API_KEY 환경 변수가 필요하다. 없거나 실패하면 EDL은 JSON 텍스트 파일이므로
직접 열어 action/zoom 값을 고쳐도 된다 — 이 명령은 그 수작업을 편하게 해주는 보조 수단이다.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import replace

from .edl import EDL, Segment, ZoomPlan

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

VALID_ACTIONS = {"keep", "cut"}
VALID_OPS = {"set_action", "set_zoom", "extend", "note"}


class ReviseError(RuntimeError):
    pass


def _build_prompt(edl: EDL, instruction: str) -> str:
    seg_lines = []
    for s in edl.segments:
        text = s.text.strip().replace("\n", " ")
        if len(text) > 120:
            text = text[:117] + "..."
        seg_lines.append(
            f'{{"id":{s.id},"start":{s.start:.2f},"end":{s.end:.2f},'
            f'"action":"{s.action}","reason":"{s.reason}","text":"{text}"}}'
        )
    segments_json = "[\n  " + ",\n  ".join(seg_lines) + "\n]"

    return f"""당신은 영상 편집 타임라인(EDL)을 수정하는 어시스턴트입니다.
아래는 자동 컷편집기가 만든 구간 목록입니다. action이 "keep"이면 최종 영상에 남고,
"cut"이면 잘려나갑니다. 사용자의 수정 지시를 반영해 바꿔야 할 부분만 operation으로 출력하세요.

구간 목록:
{segments_json}

사용자 지시: "{instruction}"

다음 JSON 배열 형식으로만 답하세요. 다른 설명, 코드블록 마크다운 없이 순수 JSON 배열만 출력합니다.
가능한 operation:
- {{"op":"set_action","id":<구간id>,"action":"keep"|"cut"}}
- {{"op":"set_zoom","id":<구간id>,"zoom_from":<float>,"zoom_to":<float>,"follow_face":<bool>}}
- {{"op":"extend","id":<구간id>,"start_delta":<float, 초 단위, 음수면 앞으로 당김>,"end_delta":<float>}}
- {{"op":"note","id":<구간id>,"note":"<문자열>"}}

지시와 관련 없는 구간은 절대 건드리지 마세요. 존재하지 않는 id를 만들어내지 마세요.
"""


def _extract_json_array(text: str) -> list[dict]:
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        raise ReviseError(f"응답에서 JSON 배열을 찾지 못했습니다:\n{text}")
    return json.loads(match.group(0))


def _call_claude(prompt: str, *, model: str, api_key: str, timeout: float = 120.0) -> str:
    body = json.dumps({
        "model": model,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")

    req = urllib.request.Request(
        ANTHROPIC_API_URL,
        data=body,
        method="POST",
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise ReviseError(f"Anthropic API 호출 실패 ({e.code}): {detail}") from e
    except urllib.error.URLError as e:
        raise ReviseError(f"Anthropic API에 연결하지 못했습니다: {e.reason}") from e

    blocks = payload.get("content", [])
    text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
    if not text:
        raise ReviseError(f"Anthropic 응답에 텍스트가 없습니다: {payload}")
    return text


def _apply_ops(edl: EDL, ops: list[dict]) -> list[str]:
    by_id = {s.id: s for s in edl.segments}
    applied: list[str] = []

    for op in ops:
        kind = op.get("op")
        seg_id = op.get("id")
        seg = by_id.get(seg_id)
        if kind not in VALID_OPS:
            applied.append(f"⚠️ 알 수 없는 operation 무시: {op}")
            continue
        if seg is None:
            applied.append(f"⚠️ 존재하지 않는 구간 id={seg_id} 무시")
            continue

        if kind == "set_action":
            action = op.get("action")
            if action not in VALID_ACTIONS:
                applied.append(f"⚠️ 잘못된 action 값 무시: {op}")
                continue
            old = seg.action
            seg.action = action
            applied.append(f"[{seg.id:03d}] action: {old} → {action}  (\"{seg.text[:40]}\")")

        elif kind == "set_zoom":
            seg.zoom = ZoomPlan(
                zoom_from=float(op.get("zoom_from", seg.zoom.zoom_from)),
                zoom_to=float(op.get("zoom_to", seg.zoom.zoom_to)),
                follow_face=bool(op.get("follow_face", seg.zoom.follow_face)),
            )
            applied.append(f"[{seg.id:03d}] 줌 변경: {seg.zoom.zoom_from:.2f}x → {seg.zoom.zoom_to:.2f}x")

        elif kind == "extend":
            sd = float(op.get("start_delta", 0.0))
            ed = float(op.get("end_delta", 0.0))
            seg.start = max(0.0, seg.start + sd)
            seg.end = max(seg.start + 0.05, seg.end + ed)
            applied.append(f"[{seg.id:03d}] 구간 조정: start{sd:+.2f}s, end{ed:+.2f}s")

        elif kind == "note":
            seg.note = str(op.get("note", ""))
            applied.append(f"[{seg.id:03d}] 메모 추가: {seg.note}")

    return applied


def revise_edl(edl: EDL, instruction: str, *, model: str = DEFAULT_MODEL) -> tuple[EDL, list[str]]:
    """instruction을 반영한 새 EDL과, 실제로 적용된 변경 로그를 반환한다."""

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ReviseError(
            "ANTHROPIC_API_KEY 환경 변수가 설정되어 있지 않습니다.\n"
            "지시사항을 자동 반영하려면 API 키를 설정하거나, edl.json 파일을 직접 열어\n"
            "segments[].action(\"keep\"/\"cut\")·segments[].zoom 값을 수정한 뒤 render 명령을 다시 실행하세요."
        )

    prompt = _build_prompt(edl, instruction)
    response_text = _call_claude(prompt, model=model, api_key=api_key)
    ops = _extract_json_array(response_text)

    new_edl = EDL.from_dict(edl.to_dict())  # deep copy
    applied = _apply_ops(new_edl, ops)
    new_edl.notes.append(f"[revise] \"{instruction}\" → {len(applied)}건 반영")
    return new_edl, applied
