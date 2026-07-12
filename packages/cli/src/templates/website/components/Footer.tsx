import Link from "next/link";
import { Container } from "./Container";
import { legalLinks, navItems, siteConfig } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-foreground">{siteConfig.projectName}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-foreground/60">{siteConfig.seoDescription}</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Explore</p>
          <ul className="mt-4 space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-foreground/70 hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Legal</p>
          <ul className="mt-4 space-y-2">
            {legalLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-foreground/70 hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Contact</p>
          <p className="mt-4 text-sm text-foreground/70">
            <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-foreground">
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
      </Container>

      <div className="border-t border-border py-6 text-center text-sm text-foreground/50">
        {new Date().getFullYear()} {siteConfig.projectName}. All rights reserved.
      </div>
    </footer>
  );
}
