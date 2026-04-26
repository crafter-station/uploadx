"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderIcon, GridIcon, HomeIcon, KeyIcon, SettingsIcon } from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ width?: number; height?: number }>;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      <item.icon width={18} height={18} />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  // Detect if we are inside an app
  const appIdMatch = pathname.match(/\/dashboard\/apps\/([^/]+)/);
  const appId = appIdMatch?.[1] ?? null;

  if (appId) {
    const appNav: NavItem[] = [
      { href: `/dashboard/apps/${appId}`, label: "Overview", icon: HomeIcon },
      { href: `/dashboard/apps/${appId}/files`, label: "Files", icon: FolderIcon },
      { href: `/dashboard/apps/${appId}/tokens`, label: "API Keys", icon: KeyIcon },
      { href: `/dashboard/apps/${appId}/settings`, label: "Settings", icon: SettingsIcon },
    ];

    return (
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <nav className="flex-1 space-y-1 p-3">
          {appNav.map((item) => {
            const isActive =
              item.href === `/dashboard/apps/${appId}`
                ? pathname === `/dashboard/apps/${appId}`
                : pathname.startsWith(item.href);
            return <NavLink key={item.href} item={item} active={isActive} />;
          })}
        </nav>
      </aside>
    );
  }

  // Team-level sidebar
  const teamNav: NavItem[] = [{ href: "/dashboard", label: "Apps", icon: GridIcon }];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav className="flex-1 space-y-1 p-3">
        {teamNav.map((item) => {
          const isActive = pathname === item.href;
          return <NavLink key={item.href} item={item} active={isActive} />;
        })}
      </nav>
    </aside>
  );
}
