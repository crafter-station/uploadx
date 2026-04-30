import { PlusIcon, SettingsIcon } from "@/components/icons";
import { getTeamForOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { apps, fileMetadata } from "@uploadx-sdk/core/db";
import { count, eq, inArray, sum } from "drizzle-orm";
import Link from "next/link";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)}${units[i]}`;
}

function patternStyle(id: string) {
  const hash = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  const hue = (hash * 37) % 360;
  return {
    backgroundColor: `hsl(${hue}, 30%, 90%)`,
    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, hsla(${hue},30%,80%,0.4) 10px, hsla(${hue},30%,80%,0.4) 20px)`,
  };
}

export default async function DashboardPage() {
  const team = await getTeamForOrg();

  if (!team) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          No organization selected
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Create or select an organization to get started.
        </p>
      </div>
    );
  }

  const appList = await db.query.apps.findMany({
    where: eq(apps.teamId, team.id),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  const storageMap: Record<string, { fileCount: number; totalSize: number }> = {};
  if (appList.length > 0) {
    const stats = await db
      .select({
        appId: fileMetadata.appId,
        fileCount: count(fileMetadata.id),
        totalSize: sum(fileMetadata.size),
      })
      .from(fileMetadata)
      .where(
        inArray(
          fileMetadata.appId,
          appList.map((a) => a.id),
        ),
      )
      .groupBy(fileMetadata.appId);

    for (const s of stats) {
      storageMap[s.appId] = {
        fileCount: Number(s.fileCount),
        totalSize: Number(s.totalSize ?? 0),
      };
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Apps</h1>
        <Link
          href="/dashboard/apps/new"
          className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
        >
          <PlusIcon width={16} height={16} />
          Create a new app
        </Link>
      </div>

      {appList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            No apps yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {appList.map((app) => {
            const stats = storageMap[app.id] ?? { fileCount: 0, totalSize: 0 };
            const quota = app.storageLimit;
            const pct = quota ? ((stats.totalSize / quota) * 100).toFixed(1) : null;

            return (
              <Link
                key={app.id}
                href={`/dashboard/apps/${app.id}`}
                className="group block overflow-hidden rounded-lg border border-zinc-200 transition hover:shadow-md dark:border-zinc-800"
              >
                <div className="h-20" style={patternStyle(app.id)} />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{app.name}</h3>
                    <SettingsIcon
                      width={16}
                      height={16}
                      className="text-zinc-400 opacity-0 transition group-hover:opacity-100"
                    />
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    No URL specified
                  </p>
                  <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="font-bold">{formatSize(stats.totalSize)}</span>
                    {quota ? (
                      <span className="text-zinc-400">
                        {" "}
                        / {formatSize(quota)} ({pct}%)
                      </span>
                    ) : (
                      <span className="text-zinc-400"> / Unlimited</span>
                    )}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Free
                    </span>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Self-hosted
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
