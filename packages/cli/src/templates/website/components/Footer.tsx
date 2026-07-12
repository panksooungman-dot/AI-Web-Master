export function Footer() {
  return (
    <footer className="border-t border-foreground/10 py-8 text-center text-sm text-foreground/60">
      <p>
        {new Date().getFullYear()} {{projectName}}. All rights reserved.
      </p>
    </footer>
  );
}
