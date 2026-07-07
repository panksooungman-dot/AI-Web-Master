# vendor/

`packages/dev-inspector`의 **물리적 복사본**이다. npm 심볼릭 링크가 아니라
실제 파일로 복사해 둔 이유는, 이 CLI 패키지(`@cnbiz/ai-business-os-cli`)가
`npm pack`/`npm install -g`로 다른 컴퓨터에 설치될 때 `packages/dev-inspector`
(별도 워크스페이스 경로)를 참조할 수 없기 때문이다 — CLI 패키지 자신의
디렉터리 안에 있어야 함께 설치된다.

`ai devmode`는 대상 프로젝트에 Visual Editor를 연결할 때 이 vendor 사본을
`npm install <이 경로>`로 참조한다(코드 복사가 아니라 로컬 패키지 참조).

## 동기화

`packages/dev-inspector`의 소스가 바뀌면 이 사본도 다시 복사해야 한다:

```powershell
Remove-Item -Recurse -Force packages/cli/vendor/dev-inspector
Copy-Item -Recurse packages/dev-inspector packages/cli/vendor/dev-inspector
Remove-Item -Recurse -Force packages/cli/vendor/dev-inspector/node_modules -ErrorAction SilentlyContinue
```
