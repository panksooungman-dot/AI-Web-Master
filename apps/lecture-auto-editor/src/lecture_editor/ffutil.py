"""ffmpeg/ffprobe 실행 래퍼."""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


class FFmpegNotFoundError(RuntimeError):
    pass


def require_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise FFmpegNotFoundError(
            "ffmpeg/ffprobe를 찾을 수 없습니다. 먼저 설치하세요.\n"
            "  macOS : brew install ffmpeg\n"
            "  Ubuntu: sudo apt-get install -y ffmpeg\n"
            "  Windows: https://www.gyan.dev/ffmpeg/builds/ 에서 받아 PATH에 등록"
        )


@dataclass
class VideoInfo:
    duration: float
    fps: float
    width: int
    height: int
    has_audio: bool


def probe_video(path: str | Path) -> VideoInfo:
    require_ffmpeg()
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)

    video_stream = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    audio_stream = next((s for s in data["streams"] if s["codec_type"] == "audio"), None)
    if video_stream is None:
        raise ValueError(f"{path}: 영상 스트림을 찾을 수 없습니다.")

    duration = float(data["format"].get("duration") or video_stream.get("duration") or 0.0)

    fps_raw = video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate") or "30/1"
    num, _, den = fps_raw.partition("/")
    fps = float(num) / float(den) if den and float(den) != 0 else float(num or 30.0)

    return VideoInfo(
        duration=duration,
        fps=fps,
        width=int(video_stream.get("width", 0)),
        height=int(video_stream.get("height", 0)),
        has_audio=audio_stream is not None,
    )


def run_ffmpeg(args: list[str], *, quiet: bool = True) -> None:
    require_ffmpeg()
    cmd = ["ffmpeg", "-y"]
    if quiet:
        cmd += ["-hide_banner", "-loglevel", "error"]
    cmd += args
    subprocess.run(cmd, check=True)
