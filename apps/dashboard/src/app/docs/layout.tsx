import Link from "next/link";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Top nav */}
      <nav className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            upload<span className="text-red-500">X</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-sm font-medium text-zinc-900 dark:text-white">
              Docs
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
