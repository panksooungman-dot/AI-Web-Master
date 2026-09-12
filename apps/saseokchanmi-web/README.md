# 사색찬미한정식 공식 홈페이지 (saseokchanmi-web)

경기 파주시 광탄면에 위치한 한정식 전문점 "사색찬미한정식"의 공식 홈페이지입니다.
CNBIZ 홈페이지(`apps/cnbiz-web`)와는 완전히 독립된 별도 프로젝트로,
`apps/cnbiz-web/lib`을 import하지 않고 `packages/ui`·`packages/layout-primitives`·
`packages/utils`만 재사용합니다(리포지토리 신규 프로젝트 추가 규칙 준수).

기획 근거: `사색찬미한정식 Claude Code 개발용 홈페이지 기획서 & 화면 스토리보드`(v2)

## 실행

```bash
npm install
npm run dev --workspace=saseokchanmi-web   # http://localhost:4100
```

## 페이지 구성

`/`(홈) · `/about` · `/menu` · `/food` · `/space` · `/occasion` · `/paju` · `/review` ·
`/location` · `/reservation`

## 아직 매장 확인이 필요한 항목 (TODO)

화면에는 이 항목들이 `TODO` 배지로 명시적으로 표시됩니다. 값이 확정되면 아래 파일만
수정하면 사이트 전체에 반영됩니다.

- `lib/site-config.ts` — `CONTACT`(전화번호·영업시간·라스트오더·휴무일·주차 정보·네이버
  플레이스 URL), `SITE_URL`(실제 도메인 확정 후 `.env.local`의 `NEXT_PUBLIC_SITE_URL`)
- `lib/content.ts` — `SIGNATURE_MENU`(대표 메뉴명·가격·사진), `REVIEWS`(실제 고객 후기,
  출처·사용 범위 확인 필요)
- `public/images/` — 실제 매장·음식 사진(현재는 `PhotoPlaceholder`로 대체됨)

## 예약 문의

`POST /api/reservation`이 로컬 JSON(`lib/data/reservations.json`, git 미추적)에 접수
내역을 저장합니다. 실제 운영 시 이메일/문자 알림 연동이 필요하면 `lib/reservation/`에
`apps/cnbiz-web/lib/inquiries/notify.ts`와 동일한 패턴으로 채널을 추가할 수 있습니다.
