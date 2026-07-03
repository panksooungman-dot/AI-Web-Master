import Link from "next/link";

const LINKS = [
  { href: "/developer/workspace", label: "Workspace" },
  { href: "/developer/terminal", label: "Terminal" },
  { href: "/developer/github", label: "GitHub" },
];

export default function DeveloperPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Development OS</h1>
      <ul className="flex flex-col gap-2 max-w-xs">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded bg-gray-900 border border-gray-700 px-4 py-3 hover:border-blue-500 transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
