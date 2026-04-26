import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apps } from "uploadx/db";
import { db } from "@/lib/db";

export default async function AppOverviewPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app) notFound();

  const links = [
    { href: `/dashboard/apps/${appId}/files`, label: "Files", desc: "Browse and manage uploaded files" },
    { href: `/dashboard/apps/${appId}/tokens`, label: "API Tokens", desc: "Create and manage API tokens" },
    { href: `/dashboard/apps/${appId}/settings`, label: "Settings", desc: "App configuration and danger zone" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{app.name}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">Bucket: {app.bucketName}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-6 border border-zinc-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition dark:border-zinc-800 dark:hover:border-blue-700"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{link.label}</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
