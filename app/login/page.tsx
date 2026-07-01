"use client";

import Link from "next/link";

export default function LoginPage() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-white px-6 py-16 sm:px-8">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm shadow-zinc-900/5 sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              로그인
            </h1>
            <p className="mt-2 text-sm text-zinc-600 sm:text-base">
              계정에 로그인하여 업무 자동화를 시작하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-700">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="비밀번호 입력"
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
              />
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              로그인
            </button>
          </form>

          <Link
            href="/"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            메인 페이지로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
