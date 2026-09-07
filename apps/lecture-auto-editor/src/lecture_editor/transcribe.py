"""faster-whisper로 단어 단위 타임스탬프를 뽑아낸다.

컷편집·줌 타이밍이 전부 이 결과 위에서 계산되므로 파이프라인의 기초 데이터다.
"""

from __future__ import annotations

from .edl import Word


def transcribe_words(
    video_path: str,
    *,
    language: str | None = "ko",
    model_size: str = "small",
    device: str = "auto",
    compute_type: str = "auto",
) -> tuple[list[Word], str]:
    """영상/오디오 파일을 단어 단위 Word 리스트로 변환한다.

    Returns:
        (words, detected_language)
    """

    from faster_whisper import WhisperModel  # 지연 import: CLI --help 등에서 무거운 로딩 방지

    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        video_path,
        language=language,
        word_timestamps=True,
        vad_filter=True,  # 무음 구간을 미리 걸러 관대한 컷편집 판단에 도움
        vad_parameters=dict(min_silence_duration_ms=400),
    )

    words: list[Word] = []
    for seg in segments:
        if not seg.words:
            # word_timestamps가 비어있는 드문 경우 세그먼트 단위로라도 보존
            words.append(Word(text=seg.text.strip(), start=seg.start, end=seg.end, prob=1.0))
            continue
        for w in seg.words:
            text = (w.word or "").strip()
            if not text:
                continue
            words.append(Word(text=text, start=float(w.start), end=float(w.end), prob=float(w.probability)))

    return words, (info.language or language or "ko")
