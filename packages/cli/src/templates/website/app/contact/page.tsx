import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { ContactForm } from "@/components/ContactForm";
import { content } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: content.contact.title,
  description: content.contact.intro
};

export default function ContactPage() {
  return (
    <>
      <Hero title={content.contact.title} subtitle={content.contact.intro} />
      <section className="py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-5xl gap-12 px-6 lg:grid-cols-2">
          <ContactForm />
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-primary">Email</h3>
              <p className="mt-2 text-foreground/80">
                <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-primary">
                  {siteConfig.contactEmail}
                </a>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-primary">Response Time</h3>
              <p className="mt-2 text-foreground/80">We typically respond within one business day.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
