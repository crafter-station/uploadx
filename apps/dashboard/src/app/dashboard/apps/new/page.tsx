"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewAppPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
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
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Create New App</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            App Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="my-app"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create App"}
        </button>
      </form>
    </div>
  );
}
