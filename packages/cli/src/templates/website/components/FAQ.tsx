"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/content";

export function FAQ({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="divide-y divide-border rounded-2xl border border-border">
          {items.map((item, index) => {
            const isOpen = index === openIndex;
            const panelId = `faq-panel-${index}`;

            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-semibold text-foreground">{item.question}</span>
                  <svg
                    aria-hidden
                    className={`h-5 w-5 shrink-0 text-foreground/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.2 7.2a1 1 0 0 1 1.4 0L10 10.6l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {isOpen && (
                  <div id={panelId} className="px-6 pb-5 text-sm leading-relaxed text-foreground/70">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
