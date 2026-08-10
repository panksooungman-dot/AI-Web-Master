import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import type { DesignPlanInput, DesignPlanRecord } from "./types";
import { generateDesignPlan } from "./generator";
import { createDesignPlan } from "./registry";
import { generateStoryboard } from "./storyboard-generator";
import { createStoryboard, type StoryboardRecord } from "./storyboard";
import { generateWireframe } from "./wireframe-generator";
import { createWireframe, type WireframeRecord } from "./wireframe";
import { generatePrototype } from "./prototype-generator";
import { createPrototype, type PrototypeRecord } from "./prototype";
import { generateClaudeDesign } from "./claude-design-generator";
import { createClaudeDesign, type ClaudeDesignRecord } from "./claude-design";
import { createReview } from "./review-registry";
import type { ReviewRecord } from "./review";

/**
 * Design Automation — Chain A(창작 체인) Orchestrator. Requirements → Storyboard → Wireframe →
 * Prototype → Claude Design 5단계는 전부 순수 생성 단계(이전 산출물의 id만 있으면 항상 실행
 * 가능, 사람의 판단이 끼어들 여지가 없다)라 Chain B(9-Stage Orchestrator, lib/design/
 * orchestrator.ts)와 동일한 원칙으로 하나의 체인으로 묶는다 — 요구사항 한 번 입력으로 5번의
 * 개별 API 호출을 대신한다.
 *
 * **Review에서 멈춘다 — Chain B와의 결정적 차이**. Chain B는 규모가 크지 않으면 끝까지(10단계
 * 전부) 자동 실행하지만, 이 체인은 아무리 작은 프로젝트여도 Claude Design 다음의
 * "Review"(Customer Review & Approval, review.ts)에서 항상 멈춘다 — Review는 생성 단계가
 * 아니라 "고객/관리자가 승인·반려·수정요청을 판단하는" 사람의 결정 지점이기 때문이다. 이
 * 오케스트레이터는 Review 레코드를 생성해 검토 가능한 상태(`in_review`)로 만들어 두는
 * 데까지만 하고, 승인은 절대 대신하지 않는다 — Figma Export/Design Sync는 Review가
 * approved여야 의미가 있으므로(website.ts의 Approval Rule과 동일한 원칙) 이 체인에
 * 포함하지 않는다. 승인 이후 절차(승인 → Figma/Sync → Website Build)는 기존과 동일하게
 * 별도로 진행한다.
 */
type ChatFn = (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult>;

export interface DesignChainResult {
  planId: string;
  designPlan: DesignPlanRecord;
  storyboard: StoryboardRecord;
  wireframe: WireframeRecord;
  prototype: PrototypeRecord;
  claudeDesign: ClaudeDesignRecord;
  review: ReviewRecord;
}

export async function runDesignChainOrchestration(
  input: DesignPlanInput,
  store: CollectionStore = getDefaultStore(),
  chatFn: ChatFn = chatViaCli,
  actor: string | null = null
): Promise<DesignChainResult> {
  const plan = await generateDesignPlan(input, chatFn);
  const designPlan = await createDesignPlan(
    { input, content: plan.content, simulated: plan.simulated, provider: plan.provider, model: plan.model },
    store
  );

  const sb = await generateStoryboard(designPlan, chatFn, store);
  const storyboard = await createStoryboard(
    { planId: designPlan.id, content: sb.content, simulated: sb.simulated, provider: sb.provider, model: sb.model },
    store
  );

  const wf = await generateWireframe(storyboard, chatFn);
  const wireframe = await createWireframe(
    {
      storyboardId: storyboard.id,
      planId: storyboard.planId,
      content: wf.content,
      simulated: wf.simulated,
      provider: wf.provider,
      model: wf.model,
    },
    store
  );

  const proto = await generatePrototype(wireframe, chatFn);
  const prototype = await createPrototype(
    {
      wireframeId: wireframe.id,
      planId: wireframe.planId,
      content: proto.content,
      simulated: proto.simulated,
      provider: proto.provider,
      model: proto.model,
    },
    store
  );

  const cd = await generateClaudeDesign(prototype, chatFn);
  const claudeDesign = await createClaudeDesign(
    {
      prototypeId: prototype.id,
      planId: prototype.planId,
      content: cd.content,
      simulated: cd.simulated,
      provider: cd.provider,
      model: cd.model,
    },
    store
  );

  const review = await createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId, actor }, store);

  return {
    planId: designPlan.id,
    designPlan,
    storyboard,
    wireframe,
    prototype,
    claudeDesign,
    review,
  };
}
