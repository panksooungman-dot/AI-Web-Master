import Link from "next/link";
import { content } from "@/lib/content";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{content.notFound.title}</h1>
      <p className="max-w-md text-foreground/70">{content.notFound.message}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Back to Home
      </Link>
    </section>
  );
}
