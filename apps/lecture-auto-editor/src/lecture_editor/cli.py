"""CLI 진입점.

기본 흐름:
  1) analyze  촬영본 -> edl.json + review.txt (검토용 타임라인)
  2) (검토 후 필요하면) revise "지시문"  -> edl.json 수정
  3) render   edl.json -> 완성 영상

수백 개를 한 번에 돌리고 싶으면 `batch` 명령으로 폴더 전체를 analyze+render까지 자동 처리한다.
"""

from __future__ import annotations

import shutil
import sys
import time
from pathlib import Path

import click

from . import ffutil
from .cutdetect import CutConfig
from .edl import EDL, render_review_text
from .pipeline import analyze_video
from .render import render as render_edl
from .revise import ReviseError, revise_edl
from .zoom import ZoomConfig

VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".mkv", ".avi"}


def _stem_paths(source: str, out_dir: Path) -> tuple[Path, Path]:
    stem = Path(source).stem
    return out_dir / f"{stem}.edl.json", out_dir / f"{stem}.review.txt"


def _write_review(edl: EDL, review_path: Path) -> None:
    review_path.parent.mkdir(parents=True, exist_ok=True)
    review_path.write_text(render_review_text(edl), encoding="utf-8")


@click.group()
def main() -> None:
    """촬영 원본 영어 강의 영상을 자동 컷편집 + 줌인 편집하는 도구."""


@main.command()
@click.argument("source", type=click.Path(exists=True, dir_okay=False))
@click.option("--out-dir", default="output", show_default=True, help="edl.json/review.txt 저장 폴더")
@click.option("--lang", default="ko", show_default=True, help="말하는 언어(설명이 한국어면 ko, 영어면 en)")
@click.option("--model", "whisper_model", default="small", show_default=True,
              help="Whisper 모델 크기: tiny/base/small/medium/large-v3 (클수록 정확하지만 느림)")
@click.option("--follow-face/--no-follow-face", default=True, show_default=True,
              help="줌 중심을 얼굴 위치에 맞출지 여부")
def analyze(source: str, out_dir: str, lang: str, whisper_model: str, follow_face: bool) -> None:
    """촬영 원본 1개를 분석해 EDL(편집 계획)과 검토용 텍스트를 만든다."""

    out_dir_path = Path(out_dir)
    edl_path, review_path = _stem_paths(source, out_dir_path)

    edl = analyze_video(source, language=lang, whisper_model=whisper_model, follow_face=follow_face)
    edl.save(edl_path)
    _write_review(edl, review_path)

    click.echo(f"\n완료: {edl_path}")
    click.echo(f"검토용 텍스트: {review_path}  (열어서 컷/줌 결정을 확인하세요)")


@main.command()
@click.argument("edl_json", type=click.Path(exists=True, dir_okay=False))
@click.option("--out", "out_path", default=None, help="출력 영상 경로 (기본: edl 파일과 같은 폴더의 <이름>.final.mp4)")
@click.option("--follow-face/--no-follow-face", default=None, help="지정하면 EDL에 저장된 값을 무시하고 강제 적용")
@click.option("--keep-temp", is_flag=True, help="디버깅용: 중간 클립 파일을 지우지 않고 보존")
def render(edl_json: str, out_path: str | None, follow_face: bool | None, keep_temp: bool) -> None:
    """EDL을 실제 영상으로 렌더링한다."""

    edl = EDL.load(edl_json)
    if not Path(edl.source).exists():
        click.echo(f"오류: EDL이 가리키는 원본 영상을 찾을 수 없습니다: {edl.source}", err=True)
        sys.exit(1)

    final_out = out_path or str(Path(edl_json).with_suffix("").with_suffix(".final.mp4"))
    started = time.time()
    result = render_edl(edl, edl.source, final_out, follow_face_override=follow_face, keep_temp=keep_temp)
    click.echo(f"완료: {result}  ({time.time() - started:.1f}초)")


@main.command()
@click.argument("edl_json", type=click.Path(exists=True, dir_okay=False))
@click.argument("instruction")
@click.option("--out", "out_path", default=None, help="저장할 경로 (기본: 원본 EDL을 덮어쓰고 .bak 백업 생성)")
def revise(edl_json: str, instruction: str, out_path: str | None) -> None:
    """자연어 지시로 EDL을 수정한다. 예) "3번 구간 자르지 말고 살려줘\""""

    edl = EDL.load(edl_json)
    try:
        new_edl, applied = revise_edl(edl, instruction)
    except ReviseError as e:
        click.echo(str(e), err=True)
        sys.exit(1)

    target = Path(out_path) if out_path else Path(edl_json)
    if not out_path:
        backup = target.with_suffix(target.suffix + ".bak")
        shutil.copyfile(target, backup)
        click.echo(f"(수정 전 백업: {backup})")

    new_edl.save(target)
    _write_review(new_edl, target.with_name(target.stem.replace(".edl", "") + ".review.txt"))

    click.echo(f"\n적용된 변경 {len(applied)}건:")
    for line in applied:
        click.echo(f"  {line}")
    click.echo(f"\n저장됨: {target}")
    click.echo("다시 render 명령을 실행해 최종 영상을 만드세요.")


@main.command()
@click.argument("source", type=click.Path(exists=True, dir_okay=False))
@click.option("--out-dir", default="output", show_default=True)
@click.option("--lang", default="ko", show_default=True)
@click.option("--model", "whisper_model", default="small", show_default=True)
@click.option("--follow-face/--no-follow-face", default=True, show_default=True)
def full(source: str, out_dir: str, lang: str, whisper_model: str, follow_face: bool) -> None:
    """analyze + render를 한 번에 실행한다 (검토 없이 바로 완성본까지)."""

    out_dir_path = Path(out_dir)
    edl_path, review_path = _stem_paths(source, out_dir_path)

    edl = analyze_video(source, language=lang, whisper_model=whisper_model, follow_face=follow_face)
    edl.save(edl_path)
    _write_review(edl, review_path)

    final_out = out_dir_path / f"{Path(source).stem}.final.mp4"
    result = render_edl(edl, source, str(final_out), follow_face_override=None)
    click.echo(f"\n완료: {result}")
    click.echo(f"(수정하고 싶으면: revise {edl_path} \"지시문\"  후 render {edl_path} 다시 실행)")


@main.command()
@click.argument("input_dir", type=click.Path(exists=True, file_okay=False))
@click.argument("output_dir", type=click.Path(file_okay=False))
@click.option("--lang", default="ko", show_default=True)
@click.option("--model", "whisper_model", default="small", show_default=True)
@click.option("--follow-face/--no-follow-face", default=True, show_default=True)
def batch(input_dir: str, output_dir: str, lang: str, whisper_model: str, follow_face: bool) -> None:
    """폴더 안의 영상을 전부 자동으로 analyze+render 처리한다 (수백 개 일괄 처리용)."""

    ffutil.require_ffmpeg()
    in_dir = Path(input_dir)
    out_dir_path = Path(output_dir)
    out_dir_path.mkdir(parents=True, exist_ok=True)

    sources = sorted(p for p in in_dir.iterdir() if p.suffix.lower() in VIDEO_EXTS)
    if not sources:
        click.echo(f"{input_dir}에 처리할 영상 파일이 없습니다 ({', '.join(sorted(VIDEO_EXTS))}).")
        return

    click.echo(f"총 {len(sources)}개 영상 처리 시작\n")
    succeeded, failed = [], []

    for i, src in enumerate(sources, start=1):
        click.echo(f"[{i}/{len(sources)}] {src.name}")
        try:
            edl = analyze_video(str(src), language=lang, whisper_model=whisper_model, follow_face=follow_face)
            edl_path, review_path = _stem_paths(str(src), out_dir_path)
            edl.save(edl_path)
            _write_review(edl, review_path)

            final_out = out_dir_path / f"{src.stem}.final.mp4"
            render_edl(edl, str(src), str(final_out), follow_face_override=None)
            succeeded.append(src.name)
            click.echo(f"  -> 완료: {final_out}\n")
        except Exception as e:  # noqa: BLE001 - 배치 중 하나 실패해도 나머지는 계속 진행
            failed.append((src.name, str(e)))
            click.echo(f"  -> 실패: {e}\n", err=True)

    click.echo("=" * 50)
    click.echo(f"성공 {len(succeeded)}개 / 실패 {len(failed)}개")
    if failed:
        click.echo("실패 목록:")
        for name, err in failed:
            click.echo(f"  - {name}: {err}")


if __name__ == "__main__":
    main()
