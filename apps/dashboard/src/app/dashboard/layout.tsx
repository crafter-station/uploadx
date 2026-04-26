import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-zinc-50 flex flex-col dark:border-zinc-800 dark:bg-zinc-900">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            UploadX
          </Link>
        </div>

        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <OrganizationSwitcher
            appearance={{
              elements: { rootBox: "w-full" },
            }}
          />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Apps
          </Link>
          <Link
            href="/docs"
            className="block px-3 py-2 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Docs
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <UserButton showName />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-white dark:bg-zinc-950">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
