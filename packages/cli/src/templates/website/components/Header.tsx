export function Header() {
  return (
    <header className="border-b border-foreground/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold">{{projectName}}</span>
      </div>
    </header>
  );
}
