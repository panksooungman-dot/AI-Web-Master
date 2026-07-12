import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { Navbar } from "./Navbar";

export function Header() {
  return (
    <header className="relative border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {{initial}}
          </span>
          <span>{siteConfig.projectName}</span>
        </Link>

        <Navbar />

        <Link
          href="/contact"
          className="hidden shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:inline-flex"
        >
          Contact Us
        </Link>
      </div>
    </header>
  );
}
