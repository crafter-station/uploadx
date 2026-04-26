import { eq } from "drizzle-orm";
import Link from "next/link";
import { apps } from "uploadx/db";
import { getTeamForOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const team = await getTeamForOrg();

  if (!team) {
    return (
      <div className="text-center py-12">
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
    orderBy: (apps, { desc }) => [desc(apps.createdAt)],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Apps</h1>
        <Link
          href="/dashboard/apps/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Create App
        </Link>
      </div>

      {appList.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-300 rounded-lg dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">No apps yet. Create your first app.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appList.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/apps/${app.id}`}
              className="block p-6 border border-zinc-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition dark:border-zinc-800 dark:hover:border-blue-700"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{app.name}</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Bucket: {app.bucketName}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Created {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
