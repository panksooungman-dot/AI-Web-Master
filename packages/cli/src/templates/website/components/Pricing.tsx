import Link from "next/link";
import type { PricingPlan } from "@/lib/content";

export function Pricing({ plans }: { plans: PricingPlan[] }) {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-2xl border p-8 ${
              plan.highlighted ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-background"
            }`}
          >
            {plan.highlighted && (
              <span className="mb-4 inline-block w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </span>
            )}
            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              {plan.period && <span className="text-sm text-foreground/50">{plan.period}</span>}
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-foreground/70">
                  <svg aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/contact"
              className={`mt-8 inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${
                plan.highlighted ? "bg-primary text-white" : "border border-border text-foreground"
              }`}
            >
              Choose {plan.name}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
