from lecture_editor.edl import EDL, Segment
from lecture_editor.zoom import ZoomConfig, assign_zoom_plans


def test_short_segment_gets_no_zoom():
    edl = EDL(source="a.mp4", duration=5.0, fps=30.0, language="ko", segments=[
        Segment(id=1, start=0.0, end=0.5, text="hi", action="keep"),
    ])
    assign_zoom_plans(edl, ZoomConfig(min_duration_for_zoom=1.0))
    assert edl.segments[0].zoom.zoom_from == edl.segments[0].zoom.zoom_to == 1.0


def test_longer_segment_gets_progressive_zoom_capped_at_max():
    edl = EDL(source="a.mp4", duration=30.0, fps=30.0, language="ko", segments=[
        Segment(id=1, start=0.0, end=20.0, text="long explanation", action="keep"),
    ])
    cfg = ZoomConfig(min_duration_for_zoom=1.0, max_zoom=1.2, zoom_per_second=0.05, zoom_cap_duration=8.0)
    assign_zoom_plans(edl, cfg)
    seg = edl.segments[0]
    assert seg.zoom.zoom_from == 1.0
    assert seg.zoom.zoom_to <= 1.2
    assert seg.zoom.zoom_to > 1.0


def test_cut_segments_never_get_zoom():
    edl = EDL(source="a.mp4", duration=5.0, fps=30.0, language="ko", segments=[
        Segment(id=1, start=0.0, end=5.0, text="", action="cut", reason="dead_air"),
    ])
    assign_zoom_plans(edl)
    assert edl.segments[0].zoom.zoom_from == edl.segments[0].zoom.zoom_to == 1.0
    assert edl.segments[0].zoom.follow_face is False
