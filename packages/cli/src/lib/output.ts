import pc from "picocolors";

/** Whether prompts are possible: a TTY, not CI, and not asked for JSON. */
export function isInteractive(json?: boolean): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.CI && !json;
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function success(message: string): void {
  process.stdout.write(`${pc.green("✓")} ${message}\n`);
}

export function info(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function warn(message: string): void {
  process.stderr.write(`${pc.yellow("!")} ${message}\n`);
}

/** An expected, user-facing failure. Carries the process exit code. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}

/** Render rows as an aligned table. Returns "" for no rows. */
export function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "";

  const widths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => (row[i] ?? "").length)),
  );

  const line = (cells: string[]) =>
    cells
      .map((cell, i) => (cell ?? "").padEnd(widths[i] ?? 0))
      .join("  ")
      .trimEnd();

  return [pc.dim(line(headers)), ...rows.map(line)].join("\n");
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)}${units[unit]}`;
}
