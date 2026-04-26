"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STORAGE_OPTIONS = [
  { label: "1 GB", value: 1 * 1024 * 1024 * 1024 },
  { label: "2 GB", value: 2 * 1024 * 1024 * 1024 },
  { label: "5 GB", value: 5 * 1024 * 1024 * 1024 },
  { label: "10 GB", value: 10 * 1024 * 1024 * 1024 },
  { label: "50 GB", value: 50 * 1024 * 1024 * 1024 },
  { label: "Unlimited", value: 0 },
];

export default function NewAppPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [storageLimit, setStorageLimit] = useState(2 * 1024 * 1024 * 1024);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        storageLimit: storageLimit === 0 ? null : storageLimit,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create app");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/dashboard/apps/${data.id}`);
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Create New App</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Set up a new app with its own storage bucket.
      </p>

      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              App Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="my-app"
            />
          </div>

          <div>
            <label
              htmlFor="storageLimit"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Storage Limit
            </label>
            <select
              id="storageLimit"
              value={storageLimit}
              onChange={(e) => setStorageLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {STORAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              You can change this later in app settings.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create App"}
          </button>
        </form>
      </div>
    </div>
  );
}
