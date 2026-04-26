"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Token {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function TokensPage() {
  const { appId } = useParams<{ appId: string }>();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tokens?appId=${appId}`);
    if (res.ok) {
      const data = await res.json();
      setTokens(data.tokens);
    }
    setLoading(false);
  }, [appId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, name: newTokenName }),
    });
    if (res.ok) {
      const data = await res.json();
      setCreatedToken(data.token);
      setNewTokenName("");
      fetchTokens();
    }
    setCreating(false);
  };

  const handleRevoke = async (tokenId: string) => {
    if (!confirm("Revoke this token? This cannot be undone.")) return;
    const res = await fetch("/api/tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId }),
    });
    if (res.ok) fetchTokens();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">API Tokens</h1>
        <button
          onClick={() => { setShowCreate(true); setCreatedToken(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Create Token
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="mb-6 p-4 border border-zinc-200 rounded-lg dark:border-zinc-800">
          {createdToken ? (
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Token created! Copy it now — you won&apos;t see it again.
              </p>
              <code className="block p-3 bg-zinc-100 rounded text-sm font-mono break-all dark:bg-zinc-800 dark:text-zinc-200">
                {createdToken}
              </code>
              <button
                onClick={() => { setShowCreate(false); setCreatedToken(null); }}
                className="mt-3 text-sm text-zinc-500 hover:text-zinc-700"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="tokenName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Token Name
                </label>
                <input
                  id="tokenName"
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. production"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : tokens.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-300 rounded-lg dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">No tokens yet.</p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Key</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Last Used</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{token.name}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">
                    {token.tokenPrefix}...
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {new Date(token.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(token.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
