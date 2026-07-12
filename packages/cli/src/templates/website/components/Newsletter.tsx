"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

interface NewsletterProps {
  title: string;
  subtitle?: string;
}

export function Newsletter({ title, subtitle }: NewsletterProps) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") })
      });

      if (!response.ok) {
        throw new Error("failed");
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="border-t border-border bg-muted py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-foreground/60">{subtitle}</p>}

        {status === "success" ? (
          <p className="text-sm font-medium text-success">Thanks for subscribing!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row" noValidate>
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "submitting" ? "Submitting…" : "Subscribe"}
            </button>
          </form>
        )}

        {status === "error" && <p className="text-xs text-danger">Something went wrong — please try again.</p>}
      </div>
    </section>
  );
}
