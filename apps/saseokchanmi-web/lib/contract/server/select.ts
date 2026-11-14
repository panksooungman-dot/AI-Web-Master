import path from "node:path";
import { createFileStore } from "./backends";
import { createNeonStore } from "./neon";
import { StoreNotReadyError, type ContractStore } from "./store";

let cached: ContractStore | null = null;

/**
 * 사용할 저장소를 고른다.
 * - 개발(`next dev`): 로컬 파일(`lib/data/contract/`, .gitignore 대상) 또는 CONTRACT_DATA_DIR
 * - DATABASE_URL이 있으면 어디서든 Neon(Postgres)을 쓴다. 테이블은 첫 요청 때 자동으로 만들어진다.
 * - 운영(NODE_ENV=production)에서 DATABASE_URL이 없으면 오류로 알린다. 서버리스 디스크는 영구 저장이 아니어서,
 *   DB 없이 파일에 쓰면 데이터가 조용히 사라지기 때문이다.
 */
export function getStore(): ContractStore {
  if (cached) return cached;
  if (process.env.DATABASE_URL) {
    cached = createNeonStore(process.env.DATABASE_URL);
    return cached;
  }
  if (process.env.NODE_ENV === "production") {
    throw new StoreNotReadyError("운영 환경에는 DB 연결이 필요합니다. DATABASE_URL을 설정해 주세요.");
  }
  cached = createFileStore(process.env.CONTRACT_DATA_DIR || path.join(process.cwd(), "lib", "data", "contract"));
  return cached;
}

/** 테스트에서 저장소를 교체한다. null을 넘기면 원래 선택 로직으로 돌아간다. */
export function setStoreForTests(store: ContractStore | null): void {
  cached = store;
}
