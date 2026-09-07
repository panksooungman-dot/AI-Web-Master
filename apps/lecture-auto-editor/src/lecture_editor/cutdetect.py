"""단어 타임스탬프 -> 컷편집 결정(EDL 세그먼트).

핵심 아이디어:
1. 말이 이어지는 구간(단어 사이 간격이 짧은 구간)을 "발화 구간(utterance)"으로 묶는다.
2. 발화 구간 사이의 간격(침묵)은 전부 잘라내고, 발화 구간 앞뒤에 아주 짧은 여백만 남긴다.
   -> 별도 "무음 제거" 로직 없이, 남기는 구간만 이어붙이면 자연스럽게 뜸 들이는 부분이 사라진다.
3. "다시 할게요" 류의 재촬영 트리거 문구를 감지하면, 그 문구가 포함된 구간과
   그 직전의 "재시도 시작 지점"까지를 통째로 잘라낸다(마지막 시도만 남기기 위함).
   -> 이 부분은 휴리스틱이다. 반드시 render 전에 검토용 텍스트(review.txt)로 확인할 것.
4. 군더더기(음/어/uh/um)가 많은 구간은 자르지 않고 "검토 필요"로만 표시한다(자동 삭제는 위험).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .edl import EDL, Segment, Word, ZoomPlan

# 재촬영/다시 찍기 트리거 문구 (소문자/공백정규화 후 부분일치 검사)
RETAKE_TRIGGERS_KO = [
    "다시 할게요", "다시할게요", "다시 갈게요", "다시갈게요",
    "다시 찍을게요", "다시찍을게요", "다시 갈게", "다시갈게",
    "처음부터 다시", "잠깐만요 다시", "죄송해요 다시", "죄송합니다 다시",
    "아 다시", "아니 다시", "잠깐 다시", "다시 한번 할게요", "다시 갈게요이",
    "컷 하고", "컷하고", "엔지 났어요", "엔지났어요", "다시 촬영",
]
RETAKE_TRIGGERS_EN = [
    "let me redo that", "let's redo that", "cut that", "start over",
    "scratch that", "let me try that again", "one more time", "take two",
    "let me do that again", "sorry let me redo",
]
RETAKE_TRIGGERS = RETAKE_TRIGGERS_KO + RETAKE_TRIGGERS_EN

FILLER_WORDS = {
    "음", "어", "그", "저", "그니까", "그러니까", "인제", "이제", "약간",
    "uh", "um", "umm", "uhh", "like", "you", "know",
}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


@dataclass
class CutConfig:
    utterance_gap: float = 0.6          # 이 이상 벌어지면 새 발화 구간으로 분리
    edge_padding: float = 0.12          # 발화 구간 앞뒤로 남기는 자연스러운 여백(초)
    retake_lookback_max: float = 20.0   # 재촬영 감지 시 최대 몇 초 전까지 되돌아가 잘라낼지
    retake_reset_gap: float = 1.0       # 이만큼 침묵이 있으면 "새 시도의 시작"으로 간주
    filler_ratio_flag: float = 0.35     # 발화 구간 내 군더더기 단어 비율이 이 이상이면 flag
    filler_min_words: int = 4           # 너무 짧은 구간은 flag 대상에서 제외


@dataclass
class _Utterance:
    words: list[Word] = field(default_factory=list)
    start_idx: int = 0   # 원본 words 리스트에서의 시작 인덱스
    end_idx: int = 0     # 끝 인덱스(exclusive)

    @property
    def start(self) -> float:
        return self.words[0].start

    @property
    def end(self) -> float:
        return self.words[-1].end

    @property
    def text(self) -> str:
        return " ".join(w.text for w in self.words)


def _clean_token(text: str) -> str:
    return _norm(text).strip(".,!?~\"'")


def _find_trigger_spans(words: list[Word]) -> list[tuple[int, int]]:
    """재촬영 트리거 문구가 등장하는 (시작 인덱스, 끝 인덱스) 구간을 단어 단위로 찾는다.

    문장 단위 부분일치 대신 단어 시퀀스를 정확히 매칭해, 트리거 문구가 다른 정상적인
    설명 문장과 같은 발화 구간에 섞여 있어도 트리거 부분만 정확히 골라낼 수 있게 한다.
    """

    tokens_all = [_clean_token(w.text) for w in words]
    trigger_token_lists = sorted(
        (t.split(" ") for t in RETAKE_TRIGGERS), key=len, reverse=True,
    )

    spans: list[tuple[int, int]] = []
    i = 0
    n = len(words)
    while i < n:
        matched = False
        for trig_tokens in trigger_token_lists:
            tlen = len(trig_tokens)
            if i + tlen > n:
                continue
            if tokens_all[i:i + tlen] == trig_tokens:
                spans.append((i, i + tlen))
                i += tlen
                matched = True
                break
        if not matched:
            i += 1
    return spans


def _group_utterances(words: list[Word], gap: float, forced_breaks: set[int]) -> list[_Utterance]:
    """단어들을 발화 구간으로 묶는다. forced_breaks에 포함된 인덱스는 무조건 새 구간으로 시작한다."""

    utterances: list[_Utterance] = []
    current = _Utterance()
    current_start_idx = 0
    prev_end: float | None = None

    for idx, w in enumerate(words):
        should_break = idx in forced_breaks or (prev_end is not None and (w.start - prev_end) >= gap)
        if should_break and current.words:
            current.start_idx = current_start_idx
            current.end_idx = idx
            utterances.append(current)
            current = _Utterance()
            current_start_idx = idx
        current.words.append(w)
        prev_end = w.end

    if current.words:
        current.start_idx = current_start_idx
        current.end_idx = len(words)
        utterances.append(current)
    return utterances


def _filler_ratio(utt: _Utterance) -> float:
    if not utt.words:
        return 0.0
    filler = sum(1 for w in utt.words if _norm(w.text).strip(".,!?~") in FILLER_WORDS)
    return filler / len(utt.words)


def build_edl(
    *,
    source: str,
    duration: float,
    fps: float,
    language: str,
    words: list[Word],
    whisper_model: str,
    config: CutConfig | None = None,
) -> EDL:
    cfg = config or CutConfig()
    notes: list[str] = []

    if not words:
        notes.append("음성이 감지되지 않았습니다. 원본을 그대로 1개 구간으로 유지합니다.")
        seg = Segment(id=1, start=0.0, end=duration, text="", action="keep", reason="source")
        return EDL(source=source, duration=duration, fps=fps, language=language, whisper_model=whisper_model,
                    segments=[seg], words=words, notes=notes)

    # 0) 트리거 문구의 단어 구간을 먼저 찾아, 그 경계에서 무조건 발화가 나뉘도록 강제한다.
    #    (트리거 문구와 그 뒤 정상 설명이 쉼 없이 바로 이어져도 함께 잘려나가지 않게 하기 위함)
    trigger_spans = _find_trigger_spans(words)
    forced_breaks: set[int] = set()
    for a, b in trigger_spans:
        forced_breaks.add(a)
        if b < len(words):
            forced_breaks.add(b)

    utterances = _group_utterances(words, cfg.utterance_gap, forced_breaks)

    # 1) 재촬영 트리거 구간과 정확히 겹치는 발화 구간의 인덱스를 찾는다.
    retake_trigger_idx = {
        i for i, u in enumerate(utterances)
        if any(a <= u.start_idx and u.end_idx <= b for a, b in trigger_spans)
    }

    # 2) 트리거가 있으면, 직전 "재시도 리셋 지점"까지 되돌아가며 함께 잘라낼 구간을 표시한다.
    cut_idx: set[int] = set(retake_trigger_idx)
    for trigger_i in sorted(retake_trigger_idx):
        j = trigger_i - 1
        lookback_start_time = utterances[trigger_i].end
        while j >= 0:
            gap_before = utterances[j + 1].start - utterances[j].end
            too_far_back = (lookback_start_time - utterances[j].start) > cfg.retake_lookback_max
            if too_far_back:
                break
            cut_idx.add(j)
            if gap_before >= cfg.retake_reset_gap:
                break
            j -= 1
        notes.append(
            f"재촬영 감지: \"{utterances[trigger_i].text.strip()}\" "
            f"({utterances[trigger_i].start:.1f}s) 발화 이전 시도를 함께 제거했습니다. "
            f"컷 경계가 어색하면 review 파일에서 직접 확인하세요."
        )

    # 3) 세그먼트 목록 구성: 발화 구간(keep 후보) + 발화 사이 간격(cut, 무음 제거)을
    #    시간 순서대로 번갈아 채워 0~duration을 빈틈없이 덮는 타임라인을 만든다.
    segments: list[Segment] = []
    seg_id = 1
    cursor = 0.0
    flagged_fillers = 0

    for i, utt in enumerate(utterances):
        pad_start = max(cursor, utt.start - cfg.edge_padding)
        pad_end = min(
            utt.end + cfg.edge_padding,
            utterances[i + 1].start - cfg.edge_padding if i + 1 < len(utterances) else duration,
        )
        pad_end = max(pad_end, pad_start)

        # 간격(직전 keep 구간 끝 ~ 이번 구간 시작)을 dead_air cut으로 채운다.
        if pad_start > cursor:
            segments.append(Segment(
                id=seg_id, start=cursor, end=pad_start, text="", action="cut", reason="dead_air",
            ))
            seg_id += 1

        if i in cut_idx:
            segments.append(Segment(
                id=seg_id, start=pad_start, end=pad_end, text=utt.text.strip(), action="cut", reason="retake",
            ))
        else:
            reason = "explain"
            note = ""
            ratio = _filler_ratio(utt)
            if ratio >= cfg.filler_ratio_flag and len(utt.words) >= cfg.filler_min_words:
                reason = "filler_flag"
                note = f"군더더기 단어 비율 {ratio:.0%} — 필요시 잘라내세요."
                flagged_fillers += 1
            segments.append(Segment(
                id=seg_id, start=pad_start, end=pad_end, text=utt.text.strip(),
                action="keep", reason=reason, note=note,
            ))
        seg_id += 1
        cursor = pad_end

    if cursor < duration:
        segments.append(Segment(id=seg_id, start=cursor, end=duration, text="", action="cut", reason="dead_air"))

    if flagged_fillers:
        notes.append(f"군더더기(음/어 등) 비중이 높은 구간 {flagged_fillers}개를 검토 대상으로 표시했습니다(자동 삭제 안 함).")

    kept = sum(1 for s in segments if s.action == "keep")
    cut = len(segments) - kept
    notes.insert(0, f"전체 {len(segments)}개 구간 중 유지 {kept}개 / 제거 {cut}개.")

    return EDL(
        source=source, duration=duration, fps=fps, language=language, whisper_model=whisper_model,
        segments=segments, words=words, notes=notes,
    )
