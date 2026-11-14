import path from "node:path";
import { createFileStore } from "./backends";
import { StoreNotReadyError, type ContractStore } from "./store";

let cached: ContractStore | null = null;

/**
 * 사용할 저장소를 고른다.
 * - 개발(`next dev`): 로컬 파일(`lib/data/contract/`, .gitignore 대상) 또는 CONTRACT_DATA_DIR
 * - 운영(NODE_ENV=production): DB가 연결되어야 한다. 서버리스 디스크는 영구 저장이 아니어서,
 *   DB 없이 파일에 쓰면 데이터가 조용히 사라진다. 그래서 운영에서는 파일 저장소를 쓰지 않고 오류로 알린다.
 *   (Neon 저장소는 다음 단계에서 같은 ContractStore 인터페이스로 추가한다.)
 */
export function getStore(): ContractStore {
  if (cached) return cached;
  if (process.env.DATABASE_URL) {
    throw new StoreNotReadyError("DATABASE_URL이 설정되어 있지만 DB 저장소는 아직 구현되지 않았습니다. (다음 단계에서 추가 예정)");
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
