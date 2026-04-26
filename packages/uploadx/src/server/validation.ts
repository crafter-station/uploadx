import { UploadxError } from "../shared/errors";
import type { FileRouteInput, FileTypeConfig } from "../shared/types";
import { matchesMimeFilter, parseFileSize } from "../shared/utils";

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

/**
 * Validate an array of files against a route's file config.
 * Throws `UploadxError` on any violation.
 */
export function validateFiles(files: FileInfo[], routeConfig: FileRouteInput): void {
  // Find the matching config entry for each file
  for (const file of files) {
    const entry = findMatchingConfig(file.type, routeConfig);
    if (!entry) {
      throw new UploadxError(
        "INVALID_FILE_TYPE",
        `File "${file.name}" has type "${file.type}" which is not allowed by this route`,
      );
    }

    // Check max file size
    if (entry.maxFileSize) {
      const maxBytes = parseFileSize(entry.maxFileSize);
      if (file.size > maxBytes) {
        throw new UploadxError(
          "FILE_TOO_LARGE",
          `File "${file.name}" is ${file.size} bytes but max is ${maxBytes} bytes (${entry.maxFileSize})`,
        );
      }
    }
  }

  // Check file counts per config key
  for (const [key, config] of Object.entries(routeConfig)) {
    const matchingFiles = files.filter((f) => matchesMimeFilter(f.type, key));
    const typedConfig = config as FileTypeConfig;

    if (typedConfig.maxFileCount !== undefined && matchingFiles.length > typedConfig.maxFileCount) {
      throw new UploadxError(
        "TOO_MANY_FILES",
        `Too many files for "${key}": got ${matchingFiles.length}, max is ${typedConfig.maxFileCount}`,
      );
    }

    if (typedConfig.minFileCount !== undefined && matchingFiles.length < typedConfig.minFileCount) {
      throw new UploadxError(
        "TOO_FEW_FILES",
        `Too few files for "${key}": got ${matchingFiles.length}, min is ${typedConfig.minFileCount}`,
      );
    }
  }
}

function findMatchingConfig(mimeType: string, routeConfig: FileRouteInput): FileTypeConfig | null {
  for (const [key, config] of Object.entries(routeConfig)) {
    if (matchesMimeFilter(mimeType, key)) {
      return config as FileTypeConfig;
    }
  }
  return null;
}
