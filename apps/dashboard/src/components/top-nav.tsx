"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

export function TopNav() {
  const pathname = usePathname();
  const [appName, setAppName] = useState<string | null>(null);
  // Extract appId from pathname
  const appIdMatch = pathname.match(/\/dashboard\/apps\/([^/]+)/);
  const appId = appIdMatch?.[1] ?? null;

  useEffect(() => {
    if (!appId) {
      setAppName(null);
      return;
    }
    fetch(`/api/apps?appId=${appId}`)
      .then((r) => r.json())
      .then((d) => setAppName(d.app?.name ?? null))
      .catch(() => setAppName(null));
  }, [appId]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Left: logo + breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1 text-lg font-bold tracking-tight">
          <span>upload</span>
          <span className="text-red-500">X</span>
        </Link>

        <span className="text-zinc-300 dark:text-zinc-700">/</span>

        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "flex items-center",
              organizationSwitcherTrigger:
                "flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800",
            },
          }}
        />

        {appId && appName && (
          <>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-xs font-bold text-white">
                {appName.charAt(0).toLowerCase()}
              </span>
              <span className="text-sm font-medium">{appName}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Docs + theme + user */}
      <div className="flex items-center gap-2">
        <Link
          href="/docs"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Docs
        </Link>
        <ThemeToggle />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </header>
  );
}
