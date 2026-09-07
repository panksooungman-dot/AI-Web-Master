# lecture-auto-editor

촬영한 영어 지문 강의 원본 영상을 넣으면 자동으로

1. **컷편집** — 침묵/뜸 들이는 구간 제거, "다시 할게요" 같은 재촬영 문구를 감지해 이전 시도를 잘라냄
2. **줌인** — 설명이 이어지는 구간마다 서서히 화면을 당기고(punch-in), 얼굴 위치를 따라 중심을 맞춤(옵션)
3. **재수정** — "3번 구간 자르지 말고 살려줘" 같은 자연어 지시로 편집 결과를 다시 고침

까지 해주는 CLI 도구입니다. 영어 지문 몇 백 개를 동일한 프로세스로 반복 처리해야 하는
상황을 자동화하기 위해 만들었습니다.

이 도구는 CNBIZ 홈페이지(cnbiz.kr) 프로젝트와 별개의 독립 실행 프로그램입니다.
웹사이트 코드를 참조하지 않고, npm이 아닌 Python으로 동작합니다.

---

## 결과물이 완벽하지 않다는 것을 먼저 이해해주세요

- **재촬영 감지**는 "다시 할게요" 류 문구를 기준으로 한 휴리스틱입니다. 특이한 표현으로
  다시 찍었다면 놓칠 수 있고, 반대로 그 문구를 언급만 했는데 잘라낼 수도 있습니다.
- **줌**은 카메라가 특정 지점을 정밀 추적하는 게 아니라, "말하는 동안 서서히 당기고
  컷이 바뀌면 리셋"하는 방식입니다. 얼굴 추적(`--follow-face`)을 켜면 그나마 인물 위치에
  중심을 맞추지만, 조명·각도에 따라 얼굴을 못 찾을 수 있고 그럴 땐 화면 중앙을 씁니다.
- 그래서 `analyze` 실행 후 반드시 **`*.review.txt`를 먼저 훑어보고**, 이상한 부분만
  `revise`로 고친 뒤 `render`하는 흐름을 권장합니다. 처음부터 100% 자동을 기대하지 마세요.

---

## 설치

### 1) ffmpeg 설치 (필수)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y ffmpeg

# Windows
# https://www.gyan.dev/ffmpeg/builds/ 에서 받아 PATH에 등록
```

### 2) Python 패키지 설치

Python 3.10 이상이 필요합니다.

```bash
cd apps/lecture-auto-editor
python3 -m venv .venv
source .venv/bin/activate        # Windows는 .venv\Scripts\activate
pip install -e .
```

설치가 끝나면 `lecture-editor` 명령을 바로 쓸 수 있습니다(가상환경 안에서).

> **참고**: `opencv-python-headless`는 5.x 버전에서 얼굴 추적에 쓰는
> `CascadeClassifier`가 빠져 있어 `<5.0.0`으로 고정해뒀습니다. 직접
> `pip install -U opencv-python-headless`로 업그레이드하면 얼굴 추적이 깨집니다.

### 3) (선택) 자연어 재수정 기능을 쓰려면

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

키가 없어도 `analyze`/`render`/`batch`는 정상 동작합니다. `revise` 명령(자연어 수정)만
이 키가 필요합니다 — 키가 없으면 `edl.json` 파일을 텍스트 에디터로 직접 열어 고치면 됩니다.

---

## 기본 사용법

### 영상 1개만 검토하며 편집하고 싶을 때

```bash
# 1) 분석 — 편집 계획(EDL)과 검토용 텍스트를 만든다
lecture-editor analyze raw/passage_001.mp4 --out-dir output --lang ko

# 2) output/passage_001.review.txt 를 열어서 컷/줌 결정을 눈으로 확인
#    (텍스트 파일이라 메모장으로도 충분합니다)

# 3) 이상한 부분이 있으면 자연어로 수정 지시
lecture-editor revise output/passage_001.edl.json "3번 구간은 재촬영 아니니까 살려줘"

# 4) 최종 영상 렌더링
lecture-editor render output/passage_001.edl.json --out output/passage_001.final.mp4
```

### 검토 없이 한 번에 끝내고 싶을 때

```bash
lecture-editor full raw/passage_001.mp4 --out-dir output
```

`analyze` + `render`를 이어서 실행합니다. 나중에 마음에 안 드는 부분이 있으면
같은 `output` 폴더에 남아있는 `.edl.json`으로 `revise` → `render`만 다시 하면 됩니다
(음성 인식을 처음부터 다시 하지 않아도 됩니다).

### 영어 지문 몇 백 개를 한 번에 처리하고 싶을 때

```bash
lecture-editor batch raw_footage/ output/
```

`raw_footage/` 폴더 안의 모든 영상(mp4/mov/m4v/mkv/avi)을 순서대로
analyze → render까지 자동 처리합니다. 중간에 하나가 실패해도 나머지는 계속 진행하고,
끝에 성공/실패 목록을 보여줍니다. 개별 영상의 `.edl.json`도 함께 저장되므로, 결과가
이상한 것만 나중에 `revise`로 골라 고칠 수 있습니다.

---

## 명령어 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `--lang` | 설명하는 언어(ko/en 등) | `ko` |
| `--model` | Whisper 모델 크기 | `small` |
| `--follow-face / --no-follow-face` | 얼굴 위치로 줌 중심 맞추기 | 켜짐 |

**Whisper 모델 크기 선택**

| 모델 | 속도 | 정확도 | 비고 |
|---|---|---|---|
| `tiny` | 매우 빠름 | 낮음 | 빠른 시험용 |
| `base` | 빠름 | 보통 | |
| `small` | 보통 | 좋음 | **기본값, 대부분 이걸로 충분** |
| `medium` | 느림 | 더 좋음 | 발음이 불명확하거나 배경 소음이 있을 때 |
| `large-v3` | 매우 느림 | 최고 | 정확도가 정말 중요할 때만 |

처음 실행 시 선택한 모델을 인터넷에서 자동 다운로드합니다(수백 MB~수 GB, 1회만).

---

## EDL(편집 계획) 파일 구조

`analyze`가 만드는 `*.edl.json`은 사람이 직접 읽고 고칠 수 있는 JSON입니다.

```json
{
  "source": "raw/passage_001.mp4",
  "segments": [
    {
      "id": 3,
      "start": 12.4,
      "end": 15.1,
      "text": "The cat sat on the mat",
      "action": "keep",
      "reason": "explain",
      "zoom": { "zoom_from": 1.0, "zoom_to": 1.12, "follow_face": true }
    }
  ]
}
```

- `action`을 `"keep"` ↔ `"cut"`으로 바꾸면 그 구간을 살리거나 잘라낼 수 있습니다.
- `zoom.zoom_to`를 키우면 더 세게 당기고, `1.0`으로 두면 줌 없이 유지합니다.
- 고친 뒤에는 `lecture-editor render <edl.json>`만 다시 실행하면 됩니다
  (음성 인식은 다시 안 함 — 훨씬 빠릅니다).

---

## 폴더 구조

```
src/lecture_editor/
  transcribe.py   Whisper로 단어 단위 타임스탬프 추출
  cutdetect.py    침묵 제거 + 재촬영 문구 감지 -> 컷 결정
  zoom.py         구간 길이에 따른 줌 강도 자동 배정
  facetrack.py    (선택) 얼굴 위치 감지로 줌 중심점 계산
  edl.py          편집 계획(EDL) 데이터 모델, 저장/불러오기, 검토용 텍스트 생성
  render.py       ffmpeg로 실제 컷+줌 렌더링
  revise.py       자연어 지시 -> EDL 수정 (Claude API)
  pipeline.py     analyze 단계 전체 흐름 조합
  cli.py          명령줄 인터페이스
tests/            핵심 로직 단위 테스트 (pytest)
```

## 테스트

```bash
pip install -e ".[dev]" 2>/dev/null || pip install pytest
python -m pytest tests -q
```

ffmpeg/Whisper 없이도 돌아가는 순수 로직 테스트(컷 판정, EDL 저장/불러오기, 자연어
수정 적용 로직)만 포함되어 있습니다. 실제 렌더링·음성 인식은 별도로 영상을 넣어 확인하세요.
