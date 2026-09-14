"use client";

import { ScreenFrame, type MockupBreakpoint, type MockupScreen } from "./ScreenWireframeMockup";

/**
 * "이런식 스토리보드 만들수 있어"(2026-09-14, 실제 UX 디자이너가 만든 번호 매긴 플로우 밴드 +
 * 폰 프레임 참고 이미지) — 그 이미지 수준의 실제 색상·아이콘·지도 사진까지는 자동화 범위 밖임을
 * 설명한 뒤, "번호매긴 플로우 밴드 + 폰프레임" 스타일만 우리 데이터로 구현하기로 확정. Phase 2
 * Storyboard가 이미 갖고 있는 User Journey(persona·goal·steps[])를 그 참고 이미지처럼 번호
 * (01·02·03…) + 제목 + 설명이 있는 색상 밴드로, 좌우 지그재그로 배치하고 각 단계 옆에 그 화면의
 * 실제 Wireframe 폰 프레임(ScreenWireframeMockup.tsx의 ScreenFrame 재사용)을 붙인다. 참고
 * 이미지와 달리 실제 UI 색상·아이콘·사진은 없다 — 여전히 구조 확인용 스케치이지만, 배치·순서가
 * 실제 제품 소개 자료처럼 읽히도록 만든 것이 이번 변경의 목적이다.
 */

interface JourneyStep {
  step: number;
  screen: string;
  goal: string;
  emotion?: string;
}

export function UserJourneyFlow({
  persona,
  goal,
  steps,
  wireframeByScreen,
  pageNames,
  breakpoint,
}: {
  persona: string;
  goal: string;
  steps: JourneyStep[];
  /** step.screen 이름 → 그 화면의 Wireframe 목업. Wireframe이 아직 없으면 빈 객체(정상). */
  wireframeByScreen: Record<string, MockupScreen>;
  pageNames: string[];
  breakpoint: MockupBreakpoint;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-slate-900 px-4 py-3">
        <p className="text-sm font-semibold text-white">사용자 시나리오 — {persona}</p>
        <p className="text-xs text-slate-300">목표: {goal}</p>
      </div>
      <div className="flex flex-col divide-y divide-slate-100">
        {steps.map((step, i) => {
          const screenMockup = wireframeByScreen[step.screen];
          const reversed = i % 2 === 1;

          return (
            <div
              key={step.step}
              className={`flex flex-col gap-4 p-4 sm:flex-row sm:p-5 ${reversed ? "sm:flex-row-reverse" : ""} ${
                i % 2 === 0 ? "bg-white" : "bg-primary/5"
              }`}
            >
              <div className="flex flex-1 flex-col justify-center gap-1">
                <span className="text-3xl font-bold text-primary/20" aria-hidden>
                  {String(step.step).padStart(2, "0")}
                </span>
                <p className="text-base font-bold text-slate-900">{step.screen}</p>
                <p className="text-sm text-slate-600">{step.goal}</p>
                {step.emotion && (
                  <span className="mt-1 inline-block w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {step.emotion}
                  </span>
                )}
              </div>
              <div className="flex w-full shrink-0 items-start justify-center sm:w-56">
                {screenMockup ? (
                  <ScreenFrame screen={screenMockup} breakpoint={breakpoint} pageNames={pageNames} />
                ) : (
                  <div className="flex aspect-[16/10] w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                    화면 구성 데이터 없음
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
