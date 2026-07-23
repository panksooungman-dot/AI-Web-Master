export interface GitStepResult {
  success: boolean;
  error?: string;
  stdout?: string;
}

/** 실제 git 실행을 감싸는 함수 시그니처 — 테스트에서 실제 프로세스 없이 주입 가능하게 한다. */
export type GitCommandRunner = (args: string[], cwd: string) => Promise<GitStepResult>;
