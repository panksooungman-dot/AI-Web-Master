import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Newsletter } from "@/components/Newsletter";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: content.blog.title,
  description: content.blog.intro
};

export default function BlogPage() {
  return (
    <>
      <Hero title={content.blog.title} subtitle={content.blog.intro} />
      <section className="py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.blog.posts.map((post) => (
            <article
              key={post.title}
              className="flex flex-col rounded-2xl border border-border bg-background p-8 shadow-sm"
            >
              <h3 className="text-lg font-bold text-foreground">{post.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/70">{post.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
      <Newsletter title="Never miss a post" subtitle="Get new articles delivered straight to your inbox." />
    </>
  );
}
