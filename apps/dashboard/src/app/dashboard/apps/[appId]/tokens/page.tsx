"use client";

import { ConfirmModal } from "@/components/confirm-modal";
import { CopyIcon, EyeIcon, EyeOffIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Token {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}

export default function TokensPage() {
  const { appId } = useParams<{ appId: string }>();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set());
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedPrefix, setCopiedPrefix] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

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
      setShowCreate(false);
      fetchTokens();
    }
    setCreating(false);
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    const res = await fetch("/api/tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId: revokeTarget }),
    });
    setRevoking(false);
    setRevokeTarget(null);
    if (res.ok) fetchTokens();
  };

  const toggleReveal = (id: string) => {
    setRevealedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyEnv = () => {
    navigator.clipboard.writeText(
      "UPLOADX_TOKEN=<your-token-here>\nUPLOADX_URL=https://uploadx.crafter.run",
    );
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 1500);
  };

  const copyCreatedToken = () => {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 1500);
  };

  const copyPrefix = (id: string, prefix: string) => {
    navigator.clipboard.writeText(prefix);
    setCopiedPrefix(id);
    setTimeout(() => setCopiedPrefix(null), 1500);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">API Keys</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            View and manage your UploadX API keys.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setCreatedToken(null);
          }}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          <PlusIcon width={16} height={16} />
          Create key
        </button>
      </div>

      {/* Quick Copy */}
      <div className="mb-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick Copy</h3>
          <p className="text-xs text-zinc-500">Copy your environment variable to your clipboard.</p>
        </div>
        <div className="p-4">
          <div className="relative rounded-lg bg-zinc-950 p-4 font-mono text-sm text-zinc-300">
            <div className="mb-1 text-zinc-500">.env.local</div>
            <div>
              <span className="text-blue-400">UPLOADX_TOKEN</span>=
              <span className="text-green-400">&apos;your-token-here&apos;</span>
            </div>
            <div>
              <span className="text-blue-400">UPLOADX_URL</span>=
              <span className="text-green-400">&apos;https://uploadx.crafter.run&apos;</span>
            </div>
            <button
              type="button"
              onClick={copyEnv}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              <CopyIcon width={12} height={12} />
              {copiedEnv ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Standard Keys */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Standard Keys</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          These keys will allow you to authenticate API requests.
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : tokens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">No keys yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Last used
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {token.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleReveal(token.id)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {revealedTokens.has(token.id) ? (
                          <EyeOffIcon width={14} height={14} />
                        ) : (
                          <EyeIcon width={14} height={14} />
                        )}
                      </button>
                      <span className="font-mono text-zinc-500 dark:text-zinc-400">
                        {revealedTokens.has(token.id)
                          ? token.tokenPrefix
                          : `${token.tokenPrefix.slice(0, 8)}${"•".repeat(12)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyPrefix(token.id, token.tokenPrefix)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {copiedPrefix === token.id ? (
                          <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>
                        ) : (
                          <CopyIcon width={13} height={13} />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatDate(token.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {token.lastUsedAt ? timeAgo(token.lastUsedAt) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(token.id)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                    >
                      <TrashIcon width={14} height={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create key modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={creating ? undefined : () => setShowCreate(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Create API key
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Give your key a name to identify it later.
            </p>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="tokenName"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Key Name
                </label>
                <input
                  id="tokenName"
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  required
                  disabled={creating}
                  autoFocus
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g. Production"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {creating && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created token copy modal */}
      {createdToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Key created
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Copy your key now. You won&apos;t be able to see it again.
            </p>
            <div className="mt-4">
              <code className="block w-full rounded-lg bg-zinc-950 p-4 font-mono text-sm text-zinc-300 break-all">
                {createdToken}
              </code>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCopiedToken(false);
                  setCreatedToken(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Done
              </button>
              <button
                type="button"
                onClick={copyCreatedToken}
                className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                <CopyIcon width={14} height={14} />
                {copiedToken ? "Copied!" : "Copy key"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={revokeTarget !== null}
        title="Revoke API key"
        description="Are you sure you want to revoke this key? Any applications using it will lose access. This action cannot be undone."
        confirmLabel="Revoke"
        variant="danger"
        loading={revoking}
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
