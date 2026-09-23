import { appendFile } from "node:fs/promises";
import * as prompts from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { createClient } from "../lib/api.js";
import { CliError, info, isInteractive, printJson, success, table, warn } from "../lib/output.js";
import { resolveAppId } from "../lib/target.js";

interface TokenSummary {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function registerTokenCommands(program: Command): void {
  const tokens = program.command("tokens").description("Manage app API tokens");

  tokens
    .command("list")
    .alias("ls")
    .description("List an app's tokens")
    .option("-a, --app <id>", "app id")
    .option("-p, --profile <name>", "profile to use")
    .option("--json", "output JSON")
    .action(list);

  tokens
    .command("create [name]")
    .description("Mint a token — shown once, never again")
    .option("-a, --app <id>", "app id")
    .option("-p, --profile <name>", "profile to use")
    .option("--output-env [file]", "append to an env file instead of printing")
    .option("--json", "output JSON (prints the secret)")
    .action(create);

  tokens
    .command("revoke <tokenId>")
    .description("Revoke a token")
    .option("-p, --profile <name>", "profile to use")
    .option("-y, --yes", "skip confirmation")
    .option("--json", "output JSON")
    .action(revoke);
}

async function list(options: {
  app?: string;
  profile?: string;
  json?: boolean;
}): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const appId = await resolveAppId(client, options);
  const { tokens } = await client.request<{ tokens: TokenSummary[] }>(
    "GET",
    `/api/tokens?appId=${appId}`,
  );

  if (options.json) return printJson({ tokens });

  if (tokens.length === 0) {
    info("No tokens yet — create one with `uploadx tokens create`.");
    return;
  }

  info(
    table(
      ["ID", "NAME", "PREFIX", "LAST USED"],
      tokens.map((token) => [
        token.id,
        token.name,
        `${token.tokenPrefix}…`,
        token.lastUsedAt ? new Date(token.lastUsedAt).toISOString().slice(0, 10) : "never",
      ]),
    ),
  );
}

async function create(
  name: string | undefined,
  options: {
    app?: string;
    profile?: string;
    outputEnv?: string | boolean;
    json?: boolean;
  },
): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const appId = await resolveAppId(client, options);

  let tokenName = name;
  if (!tokenName) {
    if (!isInteractive(options.json)) {
      throw new CliError("A token name is required: `uploadx tokens create <name>`");
    }
    const answer = await prompts.text({
      message: "Token name",
      placeholder: "Local development",
      validate: (value) => (value.trim() ? undefined : "A name is required"),
    });
    if (prompts.isCancel(answer)) throw new CliError("Cancelled", 130);
    tokenName = String(answer);
  }

  const { token } = await client.request<{ token: string }>("POST", "/api/tokens", {
    appId,
    name: tokenName,
  });

  if (options.outputEnv) {
    const file = typeof options.outputEnv === "string" ? options.outputEnv : ".env.local";
    await appendFile(file, `\nUPLOADX_TOKEN=${token}\nUPLOADX_URL=${client.url}\n`);
    success(`Wrote UPLOADX_TOKEN to ${pc.bold(file)}`);
    return;
  }

  if (options.json) return printJson({ token });

  info("");
  info(`  ${pc.bold(token)}`);
  info("");
  warn("This is the only time the token is shown. Store it now.");
}

async function revoke(
  tokenId: string,
  options: { profile?: string; yes?: boolean; json?: boolean },
): Promise<void> {
  const client = await createClient({ profile: options.profile });

  if (!options.yes) {
    if (!isInteractive(options.json)) {
      throw new CliError("Refusing to revoke without --yes when not interactive");
    }
    const confirmed = await prompts.confirm({ message: `Revoke token ${tokenId}?` });
    if (prompts.isCancel(confirmed) || !confirmed) throw new CliError("Cancelled", 130);
  }

  await client.request("DELETE", "/api/tokens", { tokenId });

  if (options.json) return printJson({ success: true, tokenId });
  success(`Revoked ${pc.dim(tokenId)}`);
}
