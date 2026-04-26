"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface FileItem {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export default function FilesPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ appId });
    if (search) params.set("search", search);
    const res = await fetch(`/api/files?${params}`);
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
    }
    setLoading(false);
  }, [appId, search]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async (fileId: string) => {
    if (!confirm("Delete this file?")) return;
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    if (res.ok) fetchFiles();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Files</h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
        >
          Back
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-zinc-300 rounded-md text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : files.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-300 rounded-lg dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">No files found.</p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Size</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{file.name}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{file.type}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatSize(file.size)}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Delete
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
