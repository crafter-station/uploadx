"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DownloadIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";
import { ConfirmModal } from "@/components/confirm-modal";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface FileItem {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
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

export default function FilesPage() {
  const { appId } = useParams<{ appId: string }>();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      appId,
      page: String(pagination.page),
      pageSize: String(pagination.pageSize),
    });
    if (search) params.set("search", search);
    const res = await fetch(`/api/files?${params}`);
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [appId, pagination.page, pagination.pageSize, search]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: deleteTarget }),
    });
    setDeleteTarget(null);
    if (res.ok) fetchFiles();
  };

  const confirmBulkDelete = async () => {
    if (selected.size === 0) return;
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds: Array.from(selected) }),
    });
    setShowBulkDelete(false);
    setSelected(new Set());
    if (res.ok) fetchFiles();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map((f) => f.id)));
  };

  const goToPage = (p: number) => {
    setPagination((prev) => ({ ...prev, page: p }));
  };

  const handleDownload = async (fileId: string) => {
    const res = await fetch(`/api/files/download?fileId=${fileId}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("appId", appId);
    for (const file of Array.from(selectedFiles)) {
      formData.append("files", file);
    }
    const res = await fetch("/api/files/upload", { method: "POST", body: formData });
    if (res.ok) {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchFiles();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Files</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            These are all of the files that have been uploaded via your uploader.
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          <UploadIcon width={16} height={16} />
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <SearchIcon
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setShowBulkDelete(true)}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <TrashIcon width={14} height={14} />
            Delete {selected.size} file{selected.size > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={files.length > 0 && selected.size === files.length}
                  onChange={toggleAll}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Route
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Uploaded
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Status
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No files found.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      className="rounded border-zinc-300 dark:border-zinc-600"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {file.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">Serverside Upload</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatDate(file.uploadedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Uploaded
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownload(file.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <DownloadIcon width={14} height={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(file.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                      >
                        <TrashIcon width={14} height={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">
            {selected.size} of ~{pagination.total} row(s) selected.
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Rows per page</span>
            <select
              value={pagination.pageSize}
              onChange={(e) =>
                setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))
              }
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-zinc-500">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronsLeftIcon width={16} height={16} />
              </button>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronLeftIcon width={16} height={16} />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronRightIcon width={16} height={16} />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.totalPages)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronsRightIcon width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete file"
        description="Are you sure you want to delete this file? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={showBulkDelete}
        title={`Delete ${selected.size} file${selected.size > 1 ? "s" : ""}`}
        description={`Are you sure you want to delete ${selected.size} selected file${selected.size > 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete all"
        variant="danger"
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </div>
  );
}
