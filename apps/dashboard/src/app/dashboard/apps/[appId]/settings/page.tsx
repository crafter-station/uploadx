"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    fetch(`/api/apps?appId=${appId}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.app.name);
        setOriginalName(data.app.name);
      });
  }, [appId]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/apps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, name }),
    });
    setOriginalName(name);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== originalName) return;
    setDeleting(true);
    const res = await fetch("/api/apps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId }),
    });
    if (res.ok) {
      router.push("/dashboard");
    }
    setDeleting(false);
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage your app configuration.</p>
      </div>

      {/* Rename */}
      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">App Name</h2>
        <form onSubmit={handleRename} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={saving || name === originalName}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-red-200 p-6 dark:border-red-900">
        <h2 className="mb-2 text-lg font-semibold text-red-600">Danger Zone</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Deleting this app will remove all files and tokens. This cannot be undone.
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="deleteConfirm"
              className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400"
            >
              Type <strong>{originalName}</strong> to confirm
            </label>
            <input
              id="deleteConfirm"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteConfirm !== originalName || deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete App"}
          </button>
        </div>
      </div>
    </div>
  );
}
