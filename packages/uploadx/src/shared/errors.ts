export type ErrorCode =
  | "UNAUTHORIZED"
  | "FILE_TOO_LARGE"
  | "FILE_TOO_SMALL"
  | "INVALID_FILE_TYPE"
  | "TOO_MANY_FILES"
  | "TOO_FEW_FILES"
  | "ROUTE_NOT_FOUND"
  | "UPLOAD_FAILED"
  | "FILE_NOT_FOUND"
  | "INTERNAL_ERROR";

export class UploadxError extends Error {
  public readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = "UploadxError";
    this.code = code;
  }
}
