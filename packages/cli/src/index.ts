import { Command } from "commander";
import pc from "picocolors";
import { registerAppCommands } from "./commands/apps.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerFileCommands } from "./commands/files.js";
import { registerInitCommands } from "./commands/init.js";
import { registerTokenCommands } from "./commands/tokens.js";
import { ApiError, NotLoggedInError } from "./lib/api.js";
import { CliError } from "./lib/output.js";

/** Replaced at build time with the version in package.json. */
declare const __CLI_VERSION__: string;

const VERSION = typeof __CLI_VERSION__ === "string" ? __CLI_VERSION__ : "0.0.0";

const program = new Command();

program
  .name("uploadx")
  .description("Manage UploadX apps, tokens and files from your terminal")
  .version(VERSION)
  .showHelpAfterError();

registerAuthCommands(program);
registerInitCommands(program);
registerAppCommands(program);
registerTokenCommands(program);
registerFileCommands(program);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  process.exitCode = report(error);
}

/** Turn an error into a message and an exit code. */
function report(error: unknown): number {
  if (error instanceof CliError) {
    process.stderr.write(`${pc.red("✗")} ${error.message}\n`);
    return error.exitCode;
  }

  if (error instanceof NotLoggedInError) {
    process.stderr.write(`${pc.red("✗")} ${error.message}\n`);
    return 1;
  }

  if (error instanceof ApiError) {
    process.stderr.write(`${pc.red("✗")} ${error.message}\n`);
    if (error.status === 401) {
      // Pointing an app-token caller at `login` would send them the wrong way:
      // a bad UPLOADX_TOKEN is not fixed by authenticating a user.
      const hint = process.env.UPLOADX_TOKEN
        ? "Check UPLOADX_TOKEN — it belongs to one app and may have been revoked."
        : "Try `uploadx login` again.";
      process.stderr.write(`  ${pc.dim(hint)}\n`);
    }
    return 1;
  }

  // Node wraps connection failures in a TypeError, with the real code on `cause`.
  const cause = error instanceof Error ? (error.cause as { code?: string } | undefined) : undefined;
  const code = (error as { code?: string })?.code ?? cause?.code;

  if (code && ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT"].includes(code)) {
    process.stderr.write(
      `${pc.red("✗")} Could not reach the instance (${code}) — check the URL and that it is running.\n`,
    );
    return 1;
  }

  process.stderr.write(
    `${pc.red("✗")} ${error instanceof Error ? error.message : String(error)}\n`,
  );
  return 1;
}
