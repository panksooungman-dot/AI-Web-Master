from lecture_editor.cutdetect import CutConfig, build_edl
from lecture_editor.edl import Word


def _mkwords(specs: list[tuple[str, float, float]]) -> list[Word]:
    return [Word(text=t, start=s, end=e, prob=0.99) for t, s, e in specs]


def test_no_words_keeps_whole_source():
    edl = build_edl(source="a.mp4", duration=10.0, fps=30.0, language="ko", words=[], whisper_model="small")
    assert len(edl.segments) == 1
    assert edl.segments[0].action == "keep"


def test_long_gap_between_utterances_is_cut_as_dead_air():
    words = _mkwords([
        ("Hello", 0.0, 0.5),
        ("world", 0.5, 1.0),
        # 5초의 긴 침묵
        ("Second", 6.0, 6.5),
        ("sentence", 6.5, 7.0),
    ])
    edl = build_edl(source="a.mp4", duration=8.0, fps=30.0, language="en", words=words, whisper_model="small")

    keep = [s for s in edl.segments if s.action == "keep"]
    cut = [s for s in edl.segments if s.action == "cut"]
    assert len(keep) == 2
    assert any(s.reason == "dead_air" and s.duration > 3.0 for s in cut)
    # 유지 구간 합은 원본보다 훨씬 짧아야 한다(무음이 제거됨)
    assert edl.total_output_duration() < 3.0


def test_retake_trigger_removes_previous_attempt():
    words = _mkwords([
        ("This", 0.0, 0.3),
        ("is", 0.3, 0.5),
        ("wrong", 0.5, 0.9),
        # 1.5초 리셋 간격 -> 새 시도 시작으로 간주
        ("다시", 2.4, 2.7),
        ("할게요", 2.7, 3.1),
        # 짧은 간격으로 이어지는 실제 설명
        ("This", 3.6, 3.9),
        ("is", 3.9, 4.1),
        ("correct", 4.1, 4.6),
    ])
    edl = build_edl(source="a.mp4", duration=6.0, fps=30.0, language="ko", words=words, whisper_model="small")

    retake_segments = [s for s in edl.segments if s.reason == "retake"]
    assert len(retake_segments) >= 2  # "This is wrong" 구간 + "다시 할게요" 구간 모두 cut
    assert all(s.action == "cut" for s in retake_segments)

    kept_texts = " ".join(s.text for s in edl.segments if s.action == "keep")
    assert "wrong" not in kept_texts
    assert "다시" not in kept_texts
    assert "correct" in kept_texts


def test_filler_heavy_segment_is_flagged_not_cut():
    words = _mkwords([
        ("음", 0.0, 0.2),
        ("어", 0.2, 0.4),
        ("그", 0.4, 0.6),
        ("네", 0.6, 0.8),
    ])
    cfg = CutConfig(filler_ratio_flag=0.5, filler_min_words=3)
    edl = build_edl(source="a.mp4", duration=1.5, fps=30.0, language="ko", words=words, whisper_model="small", config=cfg)

    seg = next(s for s in edl.segments if s.text.strip())
    assert seg.action == "keep"  # 자동으로 지우지 않는다
    assert seg.reason == "filler_flag"


def test_segments_cover_full_timeline_without_gaps():
    words = _mkwords([("Hi", 1.0, 1.3), ("there", 2.0, 2.4)])
    edl = build_edl(source="a.mp4", duration=5.0, fps=30.0, language="en", words=words, whisper_model="small")

    ordered = sorted(edl.segments, key=lambda s: s.start)
    assert ordered[0].start == 0.0
    assert ordered[-1].end == 5.0
    for a, b in zip(ordered, ordered[1:]):
        assert abs(a.end - b.start) < 1e-6
