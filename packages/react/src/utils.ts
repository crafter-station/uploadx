import type { FileRouteInput } from "uploadx/server";

const MIME_MAP: Record<string, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  pdf: "application/pdf",
  text: "text/*",
  blob: "*/*",
};

/**
 * Convert a `FileRouteInput` config to an HTML `accept` attribute string.
 * e.g. `{ image: { ... }, pdf: { ... } }` → `"image/*,application/pdf"`
 */
export function deriveAcceptString(config: FileRouteInput): string {
  return Object.keys(config)
    .map((key) => MIME_MAP[key] ?? key)
    .join(",");
}

/**
 * Get total max file count from route config, summing up per-type maxes.
 */
export function deriveMaxFileCount(config: FileRouteInput): number | undefined {
  let total = 0;
  let anyDefined = false;
  for (const cfg of Object.values(config)) {
    const typed = cfg as { maxFileCount?: number };
    if (typed.maxFileCount !== undefined) {
      anyDefined = true;
      total += typed.maxFileCount;
    }
  }
  return anyDefined ? total : undefined;
}
