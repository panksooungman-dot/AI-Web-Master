import json

from lecture_editor.edl import EDL, Segment, Word, ZoomPlan, render_review_text


def _sample_edl() -> EDL:
    return EDL(
        source="raw/passage_001.mp4",
        duration=12.0,
        fps=30.0,
        language="ko",
        whisper_model="small",
        notes=["테스트 메모"],
        segments=[
            Segment(id=1, start=0.0, end=1.0, text="", action="cut", reason="dead_air"),
            Segment(id=2, start=1.0, end=5.0, text="안녕하세요", action="keep", reason="explain",
                     zoom=ZoomPlan(zoom_from=1.0, zoom_to=1.1, follow_face=True)),
        ],
        words=[Word(text="안녕하세요", start=1.0, end=1.5, prob=0.95)],
    )


def test_roundtrip_save_load(tmp_path):
    edl = _sample_edl()
    path = tmp_path / "edl.json"
    edl.save(path)

    loaded = EDL.load(path)
    assert loaded.source == edl.source
    assert loaded.duration == edl.duration
    assert len(loaded.segments) == 2
    assert loaded.segments[1].zoom.zoom_to == 1.1
    assert loaded.segments[1].zoom.follow_face is True
    assert loaded.words[0].text == "안녕하세요"


def test_saved_file_is_readable_json(tmp_path):
    edl = _sample_edl()
    path = tmp_path / "edl.json"
    edl.save(path)
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["source"] == "raw/passage_001.mp4"
    assert isinstance(data["segments"], list)


def test_kept_segments_and_output_duration():
    edl = _sample_edl()
    kept = edl.kept_segments()
    assert len(kept) == 1
    assert edl.total_output_duration() == 4.0


def test_review_text_contains_key_info():
    edl = _sample_edl()
    text = render_review_text(edl)
    assert "안녕하세요" in text
    assert "KEEP" in text
    assert "CUT" in text
    assert "테스트 메모" in text
