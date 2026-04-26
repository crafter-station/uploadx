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
    <div className="max-w-lg space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Settings</h1>

        <form onSubmit={handleRename} className="space-y-4">
          <div>
            <label htmlFor="appName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              App Name
            </label>
            <input
              id="appName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={saving || name === originalName}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-lg p-6 dark:border-red-900">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Deleting this app will remove all files and tokens. This cannot be undone.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="deleteConfirm" className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Type <strong>{originalName}</strong> to confirm
            </label>
            <input
              id="deleteConfirm"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            onClick={handleDelete}
            disabled={deleteConfirm !== originalName || deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete App"}
          </button>
        </div>
      </div>
    </div>
  );
}
