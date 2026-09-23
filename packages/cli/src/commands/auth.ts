import * as prompts from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { createClient, fetchInstanceConfig } from "../lib/api.js";
import {
  DEFAULT_PROFILE,
  DEFAULT_URL,
  readConfig,
  removeProfile,
  resolveProfileName,
  saveProfile,
  writeConfig,
} from "../lib/config.js";
import { pollForToken, requestDeviceCode, revokeToken } from "../lib/device-flow.js";
import { CliError, info, isInteractive, printJson, success, table, warn } from "../lib/output.js";

interface Me {
  userId: string;
  email: string | null;
  name: string | null;
  orgs: Array<{ id: string; slug: string | null; name: string }>;
}

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Authenticate this machine with an UploadX instance")
    .option("-p, --profile <name>", "profile to store credentials under")
    .option("-u, --url <url>", "instance URL", DEFAULT_URL)
    .option("-o, --org <org>", "organization id or slug to act for")
    .action(login);

  program
    .command("logout")
    .description("Revoke this machine's credentials and forget the profile")
    .option("-p, --profile <name>", "profile to log out of")
    .action(logout);

  program
    .command("whoami")
    .description("Show who the CLI is authenticated as")
    .option("-p, --profile <name>", "profile to inspect")
    .option("--json", "output JSON")
    .action(whoami);

  const profiles = program.command("profiles").description("Manage saved profiles");

  profiles
    .command("list")
    .description("List saved profiles")
    .option("--json", "output JSON")
    .action(listProfiles);

  profiles.command("use <name>").description("Set the default profile").action(useProfile);

  profiles
    .command("remove <name>")
    .description("Forget a profile without revoking it")
    .action(forgetProfile);
}

async function login(options: { profile?: string; url: string; org?: string }): Promise<void> {
  const instance = await fetchInstanceConfig(options.url);

  if (!instance.clerkFapiUrl || !instance.oauthClientId) {
    throw new CliError(
      `${options.url} has no CLI OAuth application configured.\nThe instance operator must set CLERK_CLI_OAUTH_CLIENT_ID to a public Clerk OAuth\napplication with the device authorization grant enabled.`,
    );
  }

  const device = await requestDeviceCode(instance.clerkFapiUrl, instance.oauthClientId);

  info("");
  info(`  Open ${pc.cyan(device.verificationUriComplete ?? device.verificationUri)}`);
  info(`  and enter the code ${pc.bold(device.userCode)}`);
  info("");

  const spinner = prompts.spinner();
  if (isInteractive()) spinner.start("Waiting for approval");

  let token: Awaited<ReturnType<typeof pollForToken>>;
  try {
    token = await pollForToken(instance.clerkFapiUrl, instance.oauthClientId, device);
  } catch (error) {
    if (isInteractive()) spinner.stop("Not approved");
    throw new CliError((error as Error).message);
  }
  if (isInteractive()) spinner.stop("Approved");

  // Identity and org list come from the instance: Clerk advertises no userinfo
  // endpoint, and OAuth tokens carry no organization.
  const me = await fetchMe(options.url, token.accessToken);
  const org = await chooseOrg(me, options.org);

  const name = options.profile ?? DEFAULT_PROFILE;
  await saveProfile(name, {
    url: options.url.replace(/\/$/, ""),
    auth: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      userId: me.userId,
      orgId: org.id,
      orgSlug: org.slug,
    },
  });

  success(
    `Logged in as ${pc.bold(me.email ?? me.userId)} (${org.name}) — profile ${pc.bold(name)}`,
  );
}

async function fetchMe(url: string, accessToken: string): Promise<Me> {
  const response = await fetch(`${url.replace(/\/$/, "")}/api/cli/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new CliError(`Signed in, but the instance rejected the token (${response.status})`);
  }
  return (await response.json()) as Me;
}

async function chooseOrg(
  me: Me,
  requested: string | undefined,
): Promise<{ id: string; slug: string | null; name: string }> {
  if (me.orgs.length === 0) {
    throw new CliError(
      "Your account belongs to no organization. Create one in the dashboard first.",
    );
  }

  if (requested) {
    const match = me.orgs.find((o) => o.id === requested || o.slug === requested);
    if (!match) throw new CliError(`You are not a member of "${requested}"`);
    return match;
  }

  const only = me.orgs[0];
  if (me.orgs.length === 1 && only) return only;

  if (!isInteractive()) {
    throw new CliError("Several organizations available — choose one with --org <id|slug>");
  }

  const choice = await prompts.select({
    message: "Which organization?",
    options: me.orgs.map((org) => ({
      value: org.id,
      label: org.name,
      hint: org.slug ?? undefined,
    })),
  });
  if (prompts.isCancel(choice)) throw new CliError("Cancelled", 130);

  const picked = me.orgs.find((o) => o.id === choice);
  if (!picked) throw new CliError("Cancelled", 130);
  return picked;
}

async function logout(options: { profile?: string }): Promise<void> {
  const config = await readConfig();
  const name = resolveProfileName(options.profile, config);
  const profile = config.profiles[name];

  if (!profile) {
    warn(`No profile named "${name}"`);
    return;
  }

  const instance = await fetchInstanceConfig(profile.url).catch(() => null);
  let revoked = false;

  if (instance?.clerkFapiUrl && instance.oauthClientId) {
    revoked = await revokeToken(
      instance.clerkFapiUrl,
      instance.oauthClientId,
      profile.auth.refreshToken ?? profile.auth.accessToken,
    );
  }

  await removeProfile(name);

  if (revoked) {
    success(`Logged out of "${name}" and revoked the token`);
  } else {
    warn(
      `Forgot profile "${name}", but could not reach the instance to revoke the token.\nRevoke it from the dashboard if this machine may be compromised.`,
    );
  }
}

async function whoami(options: { profile?: string; json?: boolean }): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const me = await client.request<Me & { kind: string }>("GET", "/api/cli/me");

  if (options.json) {
    printJson({ ...me, url: client.url, orgId: client.orgId });
    return;
  }

  info(`${pc.dim("user")}     ${me.email ?? me.userId}`);
  info(`${pc.dim("instance")} ${client.url}`);
  if (client.orgId) {
    const org = me.orgs.find((o) => o.id === client.orgId);
    info(`${pc.dim("org")}      ${org?.name ?? client.orgId}`);
  } else {
    info(`${pc.dim("auth")}     app token (UPLOADX_TOKEN)`);
  }
}

async function listProfiles(options: { json?: boolean }): Promise<void> {
  const config = await readConfig();
  const names = Object.keys(config.profiles);

  if (options.json) {
    printJson({ defaultProfile: config.defaultProfile, profiles: config.profiles });
    return;
  }

  if (names.length === 0) {
    info("No profiles yet — run `uploadx login`.");
    return;
  }

  info(
    table(
      ["", "PROFILE", "URL", "ORG"],
      names.map((name) => {
        const profile = config.profiles[name];
        return [
          name === config.defaultProfile ? "*" : " ",
          name,
          profile?.url ?? "",
          profile?.auth.orgSlug ?? profile?.auth.orgId ?? "",
        ];
      }),
    ),
  );
}

async function useProfile(name: string): Promise<void> {
  const config = await readConfig();
  if (!config.profiles[name]) throw new CliError(`No profile named "${name}"`);
  config.defaultProfile = name;
  await writeConfig(config);
  success(`Default profile is now ${pc.bold(name)}`);
}

async function forgetProfile(name: string): Promise<void> {
  const removed = await removeProfile(name);
  if (!removed) throw new CliError(`No profile named "${name}"`);
  success(`Forgot profile ${pc.bold(name)} (the token was not revoked)`);
}
