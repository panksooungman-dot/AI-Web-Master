# 강의영상 자동편집 웹사이트

`apps/lecture-auto-editor`(Python CLI, 실제 컷편집·줌인 엔진)를 감싸는 업로드/처리/다운로드
웹앱입니다. 의뢰자가 브라우저로 촬영 원본을 올리면, 서버가 뒤에서 자동으로 컷편집 +
줌인 + 렌더링까지 처리하고, 완성된 영상을 다운로드할 수 있게 해줍니다.

**⚠️ Vercel에는 배포하지 않습니다.** 영상 처리(음성인식+렌더링)는 몇 분씩 걸리고
파일이 수백 MB~GB 단위라 서버리스 실행시간·용량 제한에 맞지 않습니다. 반드시
**의뢰자가 준비한 VPS(가상 서버)** 에 `next start`로 직접 띄웁니다.

## 아키텍처

```
브라우저 (업로드/진행상황/다운로드)
   ↓ HTTP
Next.js 앱 (이 저장소) — 업로드 받기, 작업 상태 관리, 화면 제공
   ↓ child_process.spawn
apps/lecture-auto-editor (Python CLI) — 실제 Whisper 음성인식 + ffmpeg 렌더링
```

- 작업(Job) 상태는 DB 없이 `DATA_DIR/jobs/<id>/job.json` 파일로 관리합니다(단일 서버,
  트래픽이 크지 않은 내부 도구라 이 정도로 충분합니다).
- 업로드된 원본·완성 영상도 같은 서버 디스크에 저장됩니다. 서버 디스크 용량을
  넉넉히 잡아야 합니다(영상 원본 + 중간 결과물 + 완성본이 함께 쌓입니다).

## 로컬 개발

```bash
# 1) 이 앱 의존성 설치
npm install   # 저장소 루트에서 (npm workspaces)

# 2) apps/lecture-auto-editor를 Python으로 먼저 설치해야 합니다
cd ../lecture-auto-editor
python3 -m venv .venv
.venv/bin/pip install -e .
cd ../lecture-editor-web

# 3) 환경변수 설정
cp .env.example .env.local
# .env.local의 LECTURE_EDITOR_PYTHON을 위에서 만든 .venv/bin/python 경로로 수정

# 4) 개발 서버 실행 (4000번 포트)
npm run dev
```

## 실제 서버(VPS) 배포

1. **서버 기본 준비** (Ubuntu 기준)
   ```bash
   sudo apt-get update
   sudo apt-get install -y ffmpeg python3 python3-venv nodejs npm nginx
   ```

2. **저장소 클론**
   ```bash
   git clone https://github.com/panksooungman-dot/AI-Web-Master.git /opt/ai-web-master
   ```

3. **lecture-auto-editor(Python 엔진) 설치**
   ```bash
   cd /opt/ai-web-master/apps/lecture-auto-editor
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   .venv/bin/pip install -e .
   ```

4. **이 웹앱 빌드**
   ```bash
   cd /opt/ai-web-master
   npm install
   cd apps/lecture-editor-web
   cp .env.example .env.local
   # .env.local 편집:
   #   ACCESS_PASSWORD=<의뢰자와 공유할 비밀번호>
   #   LECTURE_EDITOR_PYTHON=/opt/ai-web-master/apps/lecture-auto-editor/.venv/bin/python
   #   LECTURE_EDITOR_DIR=/opt/ai-web-master/apps/lecture-auto-editor
   #   DATA_DIR=/var/lib/lecture-editor-web   (디스크 용량 넉넉한 경로로)
   npm run build
   ```

5. **상시 실행 등록 (systemd)**
   `/etc/systemd/system/lecture-editor-web.service`:
   ```ini
   [Unit]
   Description=Lecture Editor Web
   After=network.target

   [Service]
   WorkingDirectory=/opt/ai-web-master/apps/lecture-editor-web
   ExecStart=/usr/bin/npm run start
   Restart=always
   EnvironmentFile=/opt/ai-web-master/apps/lecture-editor-web/.env.local

   [Install]
   WantedBy=multi-user.target
   ```
   ```bash
   sudo systemctl enable --now lecture-editor-web
   ```

6. **(선택) 도메인 연결 — nginx 리버스 프록시**
   대용량 영상 업로드를 받으므로 `client_max_body_size`를 넉넉히 설정해야 합니다.
   ```nginx
   server {
     listen 80;
     server_name <도메인>;
     client_max_body_size 5G;
     location / {
       proxy_pass http://localhost:4000;
       proxy_read_timeout 3600s;   # 렌더링이 오래 걸릴 수 있어 타임아웃 넉넉히
     }
   }
   ```
   이후 `certbot`으로 HTTPS 적용을 권장합니다.

## 사용 흐름

1. 비밀번호로 로그인
2. 영상 업로드 → 자동으로 분석(컷편집 계산) + 렌더링까지 진행
3. 완료되면 검토표(어디를 자르고 줌인했는지)와 완성 영상 다운로드 버튼 표시
4. 마음에 안 드는 부분은 자연어로 수정 요청 → 자동 재렌더링 (예: "3번 구간 살려줘")
   - 수정 요청 기능은 `ANTHROPIC_API_KEY` 환경변수가 설정되어 있어야 동작합니다.
     없으면 나머지 기능은 정상 동작하고 수정 요청만 오류 메시지를 보여줍니다.

## 알려진 제약 (v1)

- 동시에 여러 영상을 올려도 순서대로(직렬로) 처리됩니다 — 병렬 처리 큐는 아직 없습니다.
  물량이 많아지면 개선이 필요합니다.
- 업로드 용량 제한은 따로 걸지 않았습니다(서버 디스크 용량이 실질적인 제한입니다).
- 인증은 비밀번호 하나를 공유하는 최소한의 보호입니다(회원가입·다중 계정 없음) —
  의뢰자 소수만 접근하는 내부 도구 전제로 설계했습니다.
