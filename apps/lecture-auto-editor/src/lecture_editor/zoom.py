"""'설명하는 부분' 줌인 강도를 구간 길이에 맞춰 자동 배정한다.

카메라가 고정된(발표자 얼굴/자료를 비추는) 촬영을 기본 전제로, 말하는 구간마다
서서히 화면을 당겨(punch-in) 강조하고, 컷이 바뀌면 다시 기본 배율로 리셋하는
방식이다. 실제 어디를 중심으로 당길지(얼굴 위치)는 facetrack.py가 채운다.
"""

from __future__ import annotations

from dataclasses import dataclass

from .edl import EDL, ZoomPlan


@dataclass
class ZoomConfig:
    min_duration_for_zoom: float = 1.2   # 이보다 짧은 구간은 줌 적용 안 함(너무 빨라 어지러움)
    base_zoom: float = 1.0
    max_zoom: float = 1.18               # 최대 배율(너무 과하면 화질 저하·부자연스러움)
    zoom_per_second: float = 0.015       # 초당 배율 증가량
    zoom_cap_duration: float = 8.0       # 이 시간 이후로는 더 당기지 않음(무한정 확대 방지)
    follow_face: bool = True


def assign_zoom_plans(edl: EDL, config: ZoomConfig | None = None) -> None:
    """edl.segments를 제자리(in-place)에서 수정하여 각 keep 구간에 ZoomPlan을 채운다."""

    cfg = config or ZoomConfig()
    for seg in edl.segments:
        if seg.action != "keep":
            seg.zoom = ZoomPlan(zoom_from=1.0, zoom_to=1.0, follow_face=False)
            continue

        if seg.duration < cfg.min_duration_for_zoom:
            seg.zoom = ZoomPlan(zoom_from=cfg.base_zoom, zoom_to=cfg.base_zoom, follow_face=False)
            continue

        effective_duration = min(seg.duration, cfg.zoom_cap_duration)
        target = cfg.base_zoom + cfg.zoom_per_second * effective_duration
        target = min(target, cfg.max_zoom)

        seg.zoom = ZoomPlan(zoom_from=cfg.base_zoom, zoom_to=round(target, 4), follow_face=cfg.follow_face)
