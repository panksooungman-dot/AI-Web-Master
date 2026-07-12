export default function Home() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{{heroHeadline}}</h1>
      <p className="max-w-2xl text-lg text-foreground/70">{{heroSubheadline}}</p>
      <a
        href="#contact"
        className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Get in touch
      </a>
    </section>
  );
}
