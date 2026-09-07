"""얼굴 위치를 감지해 줌 중심점을 잡는다 (선택 기능, --follow-face).

무거운 딥러닝 모델 없이 OpenCV에 기본 내장된 Haar Cascade로 프레임을 몇 장 샘플링해
평균 위치를 구하는 가벼운 방식이다. 얼굴을 못 찾으면 화면 중앙으로 안전하게 폴백한다.
"""

from __future__ import annotations

from typing import Optional

import cv2
import numpy as np

_face_cascade: "cv2.CascadeClassifier | None" = None


def _get_cascade() -> "cv2.CascadeClassifier":
    global _face_cascade
    if _face_cascade is None:
        path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _face_cascade = cv2.CascadeClassifier(path)
    return _face_cascade


def estimate_face_center(
    video_path: str,
    start: float,
    end: float,
    *,
    sample_count: int = 5,
) -> Optional[tuple[float, float]]:
    """[start, end] 구간에서 프레임을 몇 장 샘플링해 얼굴 중심의 평균 위치(정규화 0~1)를 반환.

    얼굴을 한 번도 못 찾으면 None(호출자가 화면 중앙 등으로 폴백).
    """

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None

    try:
        width = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0
        height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0
        if width <= 0 or height <= 0:
            return None

        cascade = _get_cascade()
        centers: list[tuple[float, float]] = []
        duration = max(end - start, 0.0)
        sample_count = max(1, sample_count)

        for i in range(sample_count):
            t = start + duration * (i + 0.5) / sample_count
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
            ok, frame = cap.read()
            if not ok or frame is None:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=5, minSize=(60, 60))
            if len(faces) == 0:
                continue

            # 가장 큰 얼굴(카메라에 가장 가까운 사람)을 기준으로 삼는다.
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            cx = (x + w / 2) / width
            cy = (y + h / 2) / height
            centers.append((cx, cy))

        if not centers:
            return None

        arr = np.array(centers)
        return float(np.mean(arr[:, 0])), float(np.mean(arr[:, 1]))
    finally:
        cap.release()
