import { db } from "@/lib/db";
import { apps, fileMetadata } from "@uploadx-sdk/core/db";
import { count, desc, eq, sql, sum } from "drizzle-orm";
import { notFound } from "next/navigation";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)}${units[i]}`;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AppOverviewPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app) notFound();

  // Stats
  const [statsResult] = await db
    .select({
      fileCount: count(fileMetadata.id),
      totalSize: sum(fileMetadata.size),
    })
    .from(fileMetadata)
    .where(eq(fileMetadata.appId, appId));

  const fileCount = Number(statsResult?.fileCount ?? 0);
  const totalSize = Number(statsResult?.totalSize ?? 0);

  // Daily uploads for chart (last 30 days)
  const dailyUploads = await db
    .select({
      date: sql<string>`DATE(${fileMetadata.uploadedAt})`.as("date"),
      cnt: count(fileMetadata.id),
    })
    .from(fileMetadata)
    .where(eq(fileMetadata.appId, appId))
    .groupBy(sql`DATE(${fileMetadata.uploadedAt})`)
    .orderBy(sql`DATE(${fileMetadata.uploadedAt})`);

  // Take last 30 entries for chart
  const chartData = dailyUploads.slice(-30);
  const maxCount = Math.max(1, ...chartData.map((d) => Number(d.cnt)));

  // Recent and largest files
  const recentFiles = await db.query.fileMetadata.findMany({
    where: eq(fileMetadata.appId, appId),
    orderBy: (f) => [desc(f.uploadedAt)],
    limit: 5,
  });

  const largestFiles = await db.query.fileMetadata.findMany({
    where: eq(fileMetadata.appId, appId),
    orderBy: (f) => [desc(f.size)],
    limit: 5,
  });

  return (
    <div className="space-y-6">
      {/* Usage card */}
      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Usage</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Showing upload usage history</p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Uploaded files</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{fileCount}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Usage</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatSize(totalSize)}
              </p>
            </div>
          </div>
        </div>

        {/* Bar chart */}
        {chartData.length > 0 ? (
          <div className="flex items-end gap-1 h-32 mb-4">
            {chartData.map((d) => (
              <div
                key={d.date}
                className="flex-1 rounded-t bg-red-200 dark:bg-red-900/40 min-w-[4px] transition-all hover:bg-red-400 dark:hover:bg-red-700"
                style={{ height: `${(Number(d.cnt) / maxCount) * 100}%` }}
                title={`${d.date}: ${d.cnt} uploads`}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-zinc-400">
            <div className="text-center">
              <p className="font-semibold text-zinc-500 dark:text-zinc-400">No Data</p>
              <p className="text-xs">Start uploading files to see your usage history.</p>
            </div>
          </div>
        )}

        {/* Usage bar */}
        <div className="mt-4">
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            {app.storageLimit ? (
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${Math.min(100, (totalSize / app.storageLimit) * 100)}%` }}
              />
            ) : (
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: totalSize > 0 ? "2%" : "0%" }}
              />
            )}
          </div>
          <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {formatSize(totalSize)} used &middot;{" "}
            {app.storageLimit ? `${formatSize(app.storageLimit)} limit` : "Unlimited"}
          </p>
        </div>
      </div>

      {/* Recent Uploads + Largest Files */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Recent Uploads</h3>
          {recentFiles.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">No files yet</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="truncate text-zinc-700 dark:text-zinc-300">{f.name}</span>
                  <span className="ml-3 shrink-0 text-xs text-zinc-400">
                    {formatDate(f.uploadedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Largest Files</h3>
          {largestFiles.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">No files yet</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {largestFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="truncate text-zinc-700 dark:text-zinc-300">{f.name}</span>
                  <span className="ml-3 shrink-0 text-xs text-zinc-400">{formatSize(f.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
