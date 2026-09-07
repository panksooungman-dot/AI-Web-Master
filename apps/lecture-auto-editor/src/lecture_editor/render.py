"""EDL을 실제 ffmpeg 명령으로 렌더링한다.

전략(2단계):
  1) keep 세그먼트마다 원본에서 잘라내면서 시간에 따라 서서히 당겨지는 줌(zoompan) 필터를 적용해
     각각 독립된 임시 클립으로 인코딩한다.
  2) 모든 임시 클립을 순서대로 이어붙인다(concat).

세그먼트를 독립적으로 잘라 렌더링하므로 zoompan의 프레임 카운터(on)가 세그먼트 시작마다
자연스럽게 0부터 다시 시작하고, revise로 EDL 일부만 바뀌어도 해당 구간만 다시 잘라내면 되는
구조로 확장하기 쉽다(v1은 우선 전체 재렌더링으로 단순하게 구현).

참고: 시간에 따라 배율이 바뀌는 줌에는 ffmpeg의 crop 필터를 쓸 수 없다 — crop의 w/h
표현식은 최초 1회만 평가되고('t' 참조 불가), x/y만 프레임마다 재평가된다. 그래서 원래
Ken-Burns 효과(정지 이미지 확대)용으로 만들어진 zoompan 필터를 d=1(입력 프레임 1개당
출력 프레임 1개)로 써서 동영상에 적용한다.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from . import ffutil
from .edl import EDL, Segment
from .facetrack import estimate_face_center

MIN_SEGMENT_DURATION = 0.05


def _zoompan_filter(
    zoom_from: float, zoom_to: float, duration: float, cx: float, cy: float,
    *, fps: float, width: int, height: int,
) -> str:
    duration = max(duration, 0.001)
    fps_val = max(fps, 1.0)
    even_w, even_h = width - (width % 2), height - (height % 2)

    # d=1(입력 프레임 1개 -> 출력 프레임 1개)이므로 zoompan의 프레임 카운터 'on'은
    # 이 세그먼트 클립 안에서 0부터 시작한다. on/fps로 경과 시간을 근사해 zoom_from -> zoom_to를
    # 선형 보간한다(duration을 넘어가지 않게 clip).
    t_expr = f"clip(on/{fps_val},0,{duration})"
    zoom_expr = f"({zoom_from}+({zoom_to}-{zoom_from})*{t_expr}/{duration})"
    # x,y는 '줌 배율 적용 전' 원본 좌표계에서 크롭 영역의 좌상단을 의미한다.
    # (원본 정규화 좌표 cx,cy가 화면 중앙에 오도록 크롭 폭/높이의 절반만큼 당겨서 잡고, 경계를 벗어나지 않게 clip)
    x_expr = f"clip(iw*{cx}-(iw/zoom)/2,0,iw-iw/zoom)"
    y_expr = f"clip(ih*{cy}-(ih/zoom)/2,0,ih-ih/zoom)"

    return f"zoompan=z='{zoom_expr}':x='{x_expr}':y='{y_expr}':d=1:s={even_w}x{even_h}:fps={fps_val}"


def _render_segment_clip(
    source: str,
    seg: Segment,
    out_path: Path,
    *,
    fps: float,
    width: int,
    height: int,
    follow_face_override: bool | None,
) -> None:
    follow_face = seg.zoom.follow_face if follow_face_override is None else follow_face_override
    cx, cy = seg.zoom.center_x, seg.zoom.center_y

    if follow_face and (cx is None or cy is None):
        center = estimate_face_center(source, seg.start, seg.end)
        if center is not None:
            cx, cy = center

    cx = 0.5 if cx is None else cx
    cy = 0.5 if cy is None else cy

    vf = _zoompan_filter(
        seg.zoom.zoom_from, seg.zoom.zoom_to, seg.duration, cx, cy,
        fps=fps, width=width, height=height,
    )
    vf += ",setsar=1"

    args = [
        "-ss", f"{seg.start:.3f}",
        "-i", source,
        "-t", f"{seg.duration:.3f}",
        "-vf", vf,
        "-r", f"{fps}",
        "-vsync", "cfr",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "160k",
        "-movflags", "+faststart",
        str(out_path),
    ]
    ffutil.run_ffmpeg(args)


def _concat_clips(clip_paths: list[Path], output_path: Path, list_file: Path) -> None:
    list_file.write_text(
        "\n".join(f"file '{p.resolve().as_posix()}'" for p in clip_paths) + "\n",
        encoding="utf-8",
    )
    try:
        ffutil.run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", str(output_path)])
    except subprocess.CalledProcessError:
        # 스트림 복사 concat이 실패하면(코덱/타임스탬프 불일치 등) 재인코딩으로 한 번 더 시도한다.
        ffutil.run_ffmpeg([
            "-f", "concat", "-safe", "0", "-i", str(list_file),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac",
            str(output_path),
        ])


def render(
    edl: EDL,
    source_video: str,
    output_path: str,
    *,
    follow_face_override: bool | None = None,
    keep_temp: bool = False,
) -> Path:
    ffutil.require_ffmpeg()
    info = ffutil.probe_video(source_video)

    segments = [s for s in edl.kept_segments() if s.duration >= MIN_SEGMENT_DURATION]
    if not segments:
        raise ValueError("남길(keep) 구간이 없습니다. EDL을 확인하세요.")

    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    tmp_dir = Path(tempfile.mkdtemp(prefix="lecture_editor_"))
    try:
        clip_paths: list[Path] = []
        for i, seg in enumerate(segments):
            clip_path = tmp_dir / f"clip_{i:04d}.mp4"
            _render_segment_clip(
                source_video, seg, clip_path,
                fps=edl.fps or info.fps, width=info.width, height=info.height,
                follow_face_override=follow_face_override,
            )
            clip_paths.append(clip_path)

        list_file = tmp_dir / "concat_list.txt"
        _concat_clips(clip_paths, out_path, list_file)
    finally:
        if keep_temp:
            print(f"[디버그] 중간 클립 보존됨: {tmp_dir}")
        else:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    return out_path
