"""EDL(Edit Decision List) 데이터 모델.

analyze 단계의 산출물이자 revise/render 단계의 입력이 되는 중간 파일 포맷.
사람이 직접 읽고 고칠 수 있도록 JSON으로 저장하며, 자연어 지시(revise 명령)로도
이 파일을 수정한다 — 즉 이 파일 하나가 "편집 타임라인"의 단일 진실 공급원이다.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Literal, Optional

SegmentAction = Literal["keep", "cut"]
SegmentReason = Literal["explain", "retake", "dead_air", "filler_flag", "manual", "source"]


@dataclass
class Word:
    """Whisper 단어 단위 타임스탬프."""

    text: str
    start: float
    end: float
    prob: float = 1.0

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict) -> "Word":
        return Word(text=d["text"], start=float(d["start"]), end=float(d["end"]), prob=float(d.get("prob", 1.0)))


@dataclass
class ZoomPlan:
    """세그먼트 안에서 시간에 따라 어떻게 줌인/줌아웃할지."""

    zoom_from: float = 1.0
    zoom_to: float = 1.0
    follow_face: bool = False
    # follow_face=True이고 얼굴이 감지되면 render 단계가 채워 넣는 정규화 좌표(0~1)
    center_x: Optional[float] = None
    center_y: Optional[float] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict) -> "ZoomPlan":
        return ZoomPlan(
            zoom_from=float(d.get("zoom_from", 1.0)),
            zoom_to=float(d.get("zoom_to", 1.0)),
            follow_face=bool(d.get("follow_face", False)),
            center_x=d.get("center_x"),
            center_y=d.get("center_y"),
        )


@dataclass
class Segment:
    """편집 구간 하나. action=keep인 것만 최종 영상에 순서대로 이어붙여진다."""

    id: int
    start: float
    end: float
    text: str
    action: SegmentAction = "keep"
    reason: SegmentReason = "explain"
    zoom: ZoomPlan = field(default_factory=ZoomPlan)
    note: str = ""

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["zoom"] = self.zoom.to_dict()
        return d

    @staticmethod
    def from_dict(d: dict) -> "Segment":
        return Segment(
            id=int(d["id"]),
            start=float(d["start"]),
            end=float(d["end"]),
            text=d.get("text", ""),
            action=d.get("action", "keep"),
            reason=d.get("reason", "explain"),
            zoom=ZoomPlan.from_dict(d.get("zoom", {})),
            note=d.get("note", ""),
        )


@dataclass
class EDL:
    """영상 하나에 대한 전체 편집 결정 목록."""

    source: str
    duration: float
    fps: float
    language: str
    segments: list[Segment] = field(default_factory=list)
    words: list[Word] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    whisper_model: str = ""

    def kept_segments(self) -> list[Segment]:
        return [s for s in self.segments if s.action == "keep"]

    def total_output_duration(self) -> float:
        return sum(s.duration for s in self.kept_segments())

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "duration": self.duration,
            "fps": self.fps,
            "language": self.language,
            "whisper_model": self.whisper_model,
            "notes": self.notes,
            "segments": [s.to_dict() for s in self.segments],
            "words": [w.to_dict() for w in self.words],
        }

    @staticmethod
    def from_dict(d: dict) -> "EDL":
        return EDL(
            source=d["source"],
            duration=float(d["duration"]),
            fps=float(d.get("fps", 30.0)),
            language=d.get("language", "ko"),
            whisper_model=d.get("whisper_model", ""),
            notes=list(d.get("notes", [])),
            segments=[Segment.from_dict(s) for s in d.get("segments", [])],
            words=[Word.from_dict(w) for w in d.get("words", [])],
        )

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")

    @staticmethod
    def load(path: str | Path) -> "EDL":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return EDL.from_dict(data)


def _fmt_ts(seconds: float) -> str:
    m, s = divmod(max(0.0, seconds), 60)
    h, m = divmod(int(m), 60)
    return f"{h:02d}:{int(m):02d}:{s:05.2f}"


REASON_LABEL = {
    "explain": "설명(유지)",
    "retake": "재촬영 감지(제거)",
    "dead_air": "무음/빈 구간(제거)",
    "filler_flag": "군더더기 의심(검토 필요, 기본 유지)",
    "manual": "수동 지정",
    "source": "원본 그대로",
}


def render_review_text(edl: EDL) -> str:
    """사람이 훑어보고 판단하기 위한 검토용 텍스트(타임스탬프 + 자막 + 편집 결정)."""

    lines: list[str] = []
    lines.append(f"# 편집 검토표: {edl.source}")
    lines.append(f"# 원본 길이: {_fmt_ts(edl.duration)}  /  편집 후 예상 길이: {_fmt_ts(edl.total_output_duration())}")
    lines.append("")
    if edl.notes:
        lines.append("## 자동 분석 메모")
        for n in edl.notes:
            lines.append(f"- {n}")
        lines.append("")
    lines.append("## 구간별 결정 (수정하려면 revise 명령으로 지시하거나 edl.json을 직접 편집하세요)")
    for seg in edl.segments:
        mark = "✅ KEEP" if seg.action == "keep" else "✂️ CUT "
        reason = REASON_LABEL.get(seg.reason, seg.reason)
        zoom_note = ""
        if seg.action == "keep" and (seg.zoom.zoom_from != seg.zoom.zoom_to):
            zoom_note = f"  [줌 {seg.zoom.zoom_from:.2f}x → {seg.zoom.zoom_to:.2f}x{' · 얼굴 추적' if seg.zoom.follow_face else ''}]"
        lines.append(
            f"[{seg.id:03d}] {mark}  {_fmt_ts(seg.start)} ~ {_fmt_ts(seg.end)}  ({reason}){zoom_note}\n"
            f"      {seg.text.strip()}"
        )
    return "\n".join(lines) + "\n"
