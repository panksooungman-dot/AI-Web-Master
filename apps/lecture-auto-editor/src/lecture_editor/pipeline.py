"""analyze 단계 전체 파이프라인: 원본 영상 -> EDL."""

from __future__ import annotations

from . import ffutil
from .cutdetect import CutConfig, build_edl
from .edl import EDL
from .facetrack import estimate_face_center
from .transcribe import transcribe_words
from .zoom import ZoomConfig, assign_zoom_plans


def analyze_video(
    video_path: str,
    *,
    language: str | None = "ko",
    whisper_model: str = "small",
    cut_config: CutConfig | None = None,
    zoom_config: ZoomConfig | None = None,
    follow_face: bool = True,
    progress=print,
) -> EDL:
    ffutil.require_ffmpeg()
    info = ffutil.probe_video(video_path)

    progress(f"1/4 영상 정보 확인: {info.width}x{info.height} @ {info.fps:.2f}fps, 길이 {info.duration:.1f}s")

    progress("2/4 음성 인식 중 (Whisper) — 영상 길이에 따라 몇 분 걸릴 수 있습니다...")
    words, detected_lang = transcribe_words(video_path, language=language, model_size=whisper_model)
    progress(f"   -> 단어 {len(words)}개 인식됨 (언어: {detected_lang})")

    progress("3/4 컷편집 구간 계산 중 (침묵 제거 + 재촬영 감지)...")
    edl = build_edl(
        source=video_path,
        duration=info.duration,
        fps=info.fps,
        language=detected_lang,
        words=words,
        whisper_model=whisper_model,
        config=cut_config,
    )

    zcfg = zoom_config or ZoomConfig(follow_face=follow_face)
    assign_zoom_plans(edl, zcfg)

    if follow_face:
        progress("4/4 얼굴 위치 추적 중 (줌 중심점 계산)...")
        for seg in edl.kept_segments():
            if not seg.zoom.follow_face:
                continue
            center = estimate_face_center(video_path, seg.start, seg.end)
            if center is not None:
                seg.zoom.center_x, seg.zoom.center_y = center
    else:
        progress("4/4 얼굴 추적 건너뜀 (--no-follow-face)")

    for n in edl.notes:
        progress(f"   · {n}")

    return edl
