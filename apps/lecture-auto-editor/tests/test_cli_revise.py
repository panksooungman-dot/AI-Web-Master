"""revise CLI 명령이 실제로 파일을 백업·저장·재검토표 생성까지 하는지 확인한다.

Anthropic API 호출부(_call_claude)만 가짜 응답으로 대체해 네트워크 없이 검증한다.
"""

import json

from click.testing import CliRunner

from lecture_editor import revise as revise_module
from lecture_editor.cli import main
from lecture_editor.edl import EDL, Segment


def _sample_edl_path(tmp_path):
    edl = EDL(source="dummy.mp4", duration=6.0, fps=30.0, language="ko", segments=[
        Segment(id=1, start=0.0, end=2.0, text="첫 문장", action="cut", reason="retake"),
        Segment(id=2, start=2.0, end=6.0, text="둘째 문장", action="keep", reason="explain"),
    ])
    path = tmp_path / "sample.edl.json"
    edl.save(path)
    return path


def test_revise_cli_applies_change_and_backs_up(tmp_path, monkeypatch):
    path = _sample_edl_path(tmp_path)

    fake_response = json.dumps([{"op": "set_action", "id": 1, "action": "keep"}])
    monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key-for-test")
    monkeypatch.setattr(revise_module, "_call_claude", lambda *a, **k: fake_response)

    runner = CliRunner()
    result = runner.invoke(main, ["revise", str(path), "1번 구간도 살려줘"])

    assert result.exit_code == 0, result.output
    assert "적용된 변경 1건" in result.output

    backup = path.with_suffix(path.suffix + ".bak")
    assert backup.exists()

    updated = EDL.load(path)
    assert updated.segments[0].action == "keep"

    review_path = tmp_path / "sample.review.txt"
    assert review_path.exists()
    assert "첫 문장" in review_path.read_text(encoding="utf-8")
