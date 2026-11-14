import "@/lib/contract/paper.css";
import { contractHTML, type ContractConfig, type ContractSubmissionView } from "@/lib/contract";

interface Props {
  data?: ContractSubmissionView | null;
  config: Partial<ContractConfig>;
  className?: string;
}

/**
 * 계약서 종이. 본문은 contractHTML()이 만든 마크업이며 모든 입력값은 그 안에서 이스케이프된다.
 * 제출 건을 열 때는 반드시 그 제출의 설정 스냅샷을 `config`로 넘긴다.
 */
export function ContractPaper({ data = null, config, className = "" }: Props) {
  return <div className={`paper ${className}`} dangerouslySetInnerHTML={{ __html: contractHTML(data, config) }} />;
}
