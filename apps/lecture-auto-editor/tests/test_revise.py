import pytest

from lecture_editor.edl import EDL, Segment
from lecture_editor.revise import ReviseError, _apply_ops, _extract_json_array, revise_edl


def _sample_edl() -> EDL:
    return EDL(source="a.mp4", duration=10.0, fps=30.0, language="ko", segments=[
        Segment(id=1, start=0.0, end=2.0, text="첫 문장", action="cut", reason="retake"),
        Segment(id=2, start=2.0, end=5.0, text="둘째 문장", action="keep", reason="explain"),
    ])


def test_apply_set_action_flips_segment():
    edl = _sample_edl()
    applied = _apply_ops(edl, [{"op": "set_action", "id": 1, "action": "keep"}])
    assert edl.segments[0].action == "keep"
    assert len(applied) == 1


def test_apply_ignores_unknown_id():
    edl = _sample_edl()
    applied = _apply_ops(edl, [{"op": "set_action", "id": 999, "action": "keep"}])
    assert "존재하지 않는" in applied[0]
    assert edl.segments[0].action == "cut"  # 원본 불변


def test_apply_ignores_invalid_action_value():
    edl = _sample_edl()
    applied = _apply_ops(edl, [{"op": "set_action", "id": 1, "action": "delete_everything"}])
    assert "잘못된" in applied[0]
    assert edl.segments[0].action == "cut"


def test_apply_extend_moves_boundaries():
    edl = _sample_edl()
    _apply_ops(edl, [{"op": "extend", "id": 2, "start_delta": -0.5, "end_delta": 1.0}])
    seg = edl.segments[1]
    assert seg.start == 1.5
    assert seg.end == 6.0


def test_apply_set_zoom_updates_plan():
    edl = _sample_edl()
    _apply_ops(edl, [{"op": "set_zoom", "id": 2, "zoom_to": 1.3, "follow_face": True}])
    assert edl.segments[1].zoom.zoom_to == 1.3
    assert edl.segments[1].zoom.follow_face is True


def test_extract_json_array_from_noisy_text():
    text = "여기 결과입니다:\n[{\"op\": \"note\", \"id\": 1, \"note\": \"ok\"}]\n감사합니다."
    ops = _extract_json_array(text)
    assert ops == [{"op": "note", "id": 1, "note": "ok"}]


def test_extract_json_array_raises_when_missing():
    with pytest.raises(ReviseError):
        _extract_json_array("죄송하지만 JSON을 드릴 수 없습니다.")


def test_revise_edl_without_api_key_raises_clear_error(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    edl = _sample_edl()
    with pytest.raises(ReviseError):
        revise_edl(edl, "1번 구간 살려줘")
