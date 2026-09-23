---
name: uploadx
description: Use the `uploadx` CLI (npm package `@uploadx-sdk/cli`) to manage UploadX file-upload apps, API tokens and uploaded files from the terminal. Use this skill whenever a task involves uploading files or build artifacts to UploadX, listing or pruning stored files, creating an UploadX app or bucket, minting or revoking UPLOADX_TOKEN API tokens, wiring UploadX into a Next.js project, or whenever you see `UPLOADX_TOKEN` / `UPLOADX_URL` in a `.env` file or a `.uploadx.json` in the repo — even if the user does not name the CLI.
---

# Using the uploadx CLI

`uploadx` manages UploadX apps, API tokens and uploaded files. It talks to an
UploadX dashboard over HTTP; it never needs storage credentials of its own.

```bash
npm install -g @uploadx-sdk/cli   # command is `uploadx`
npx @uploadx-sdk/cli --help       # or one-off
```

## Read this first: you probably cannot log in

`uploadx login` runs an OAuth device flow — it prints a code and waits for a
**human** to approve it in a browser. An agent cannot complete it alone. Do not
run `uploadx login` and sit there waiting; it will block until it times out.

Work out which mode you are in before doing anything else:

| Situation | What to do |
|---|---|
| `uploadx whoami` succeeds | A human already logged in. You have the full command set. |
| `UPLOADX_TOKEN` is set (or in `.env.local`) | App-scoped mode. `files` commands work; account commands do not. |
| Neither | Stop and ask the user to run `uploadx login`. Do not try to work around it. |

```bash
uploadx whoami --json   # cheapest way to find out; exits 1 if not logged in
```

**App-scoped mode** means exporting the token the SDK already uses:

```bash
export UPLOADX_TOKEN=upx_live_...        # from .env.local
export UPLOADX_URL=https://uploadx.crafter.run
uploadx files list --json
```

That token belongs to exactly one app, so `apps create`, `tokens create` and
friends refuse — they need a user identity the token does not carry. That
refusal is by design, not a bug to route around.

## Rules that matter when you are the one typing

**Always pass `--json` when you intend to parse the output.** The human-readable
tables are aligned for eyes, not for `grep`.

**Never rely on a prompt appearing.** With no TTY (which is usually your
situation), a missing value is an error naming the flag, not a question. Pass
every value explicitly: `uploadx apps create "My App"`, not `uploadx apps create`.

**Destructive commands need `-y`.** `apps delete`, `files delete` and
`tokens revoke` refuse outright without it when non-interactive. Before passing
`-y`, be sure — `apps delete` erases the bucket and every file in it, and there
is no undo. Prefer showing the user what would be deleted and asking first.

**Most commands need to know which app.** Resolution order:

1. `--app <id>`
2. `UPLOADX_APP_ID`
3. the nearest `.uploadx.json` (written by `uploadx link`, safe to commit)
4. an interactive picker — which you will not get, so supply one of the above

## Commands

```
uploadx login | logout | whoami            uploadx apps    list | create <name> | delete [id]
uploadx profiles list | use | remove       uploadx tokens  list | create <name> | revoke <id>
uploadx init | link                        uploadx files   list | upload <paths...> | delete <keys...>
```

Shared flags: `--json` on every read command, `-a, --app <id>`, `-p, --profile <name>`,
`-y, --yes` on destructive ones.

## Use cases

### Upload build artifacts

The common case. `--recursive` is required for directories, and relative paths
are preserved under `--prefix`, so `dist/assets/logo.png` lands at
`build/assets/<timestamp>-logo.png`.

```bash
uploadx files upload ./dist --recursive --prefix build/ --json
```

Four files upload at a time. CLI uploads go straight to storage and **do not run
the app's file router**, so `maxFileSize` and type rules are not enforced — the
same as uploading from the dashboard. Mention this if the user assumes otherwise.

### Find and delete files

Delete takes **storage keys**, not names or ids. Get them from `files list`:

```bash
uploadx files list --search old- --page-size 100 --json \
  | jq -r '.files[].key'

uploadx files delete "1712345678901-old-banner.png" --yes --json
```

### Set up a new Next.js project

`init` picks or creates an app, mints a token, appends to `.env.local`, writes
`.uploadx.json`, and scaffolds the route handlers. It **never overwrites** an
existing file or an existing `UPLOADX_TOKEN` — it warns and leaves them alone,
so it is safe to run in a project that is partly set up.

```bash
uploadx init --app <id>      # --app avoids the interactive picker
uploadx init --no-scaffold   # env + link only, no source files
```

It needs a logged-in user, since it creates a token.

### Mint a token without leaking it

`tokens create` prints the secret once and never again. Writing it straight to
the env file keeps it out of shell history and CI logs:

```bash
uploadx tokens create "CI" --app <id> --output-env .env.local
```

Only reach for `--json` here if the caller genuinely needs the secret in hand.

### Several instances or orgs

A profile is one instance plus one organization. Self-hosted instances work
because the CLI reads each instance's OAuth settings from `/api/cli/config`.

```bash
uploadx profiles list --json
uploadx files list --profile staging --json
```

## When something fails

Exit code is `1` for any error, `130` for a cancelled prompt. Errors go to
stderr as `✗ <message>`.

| Message | Meaning |
|---|---|
| `Not logged in to profile "…"` | No credentials. A human must run `uploadx login`. |
| `appId required, or app not found` | Wrong app, or it belongs to another org. Ids are not probeable — the message is deliberately the same for both. |
| `Refusing to … without --yes when not interactive` | Add `-y` once you are sure. |
| `An app name is required` | You hit a path that wanted a prompt. Pass the value as an argument. |
| `Invalid token` + *Check UPLOADX_TOKEN* | App-scoped token is wrong or revoked. Logging in will not help. |
| `Timed out after 30000ms: <url>` | The instance did not answer. Raise with `UPLOADX_TIMEOUT_MS`. |

Set `UPLOADX_DEBUG=1` to trace every HTTP request and each login step to stderr.
Use it before guessing at a hang — it names the exact URL or step.

## Environment variables

| Variable | Purpose |
|---|---|
| `UPLOADX_TOKEN` | App-scoped SDK token. Enables `files` commands without login. |
| `UPLOADX_URL` | Instance URL, used with `UPLOADX_TOKEN`. |
| `UPLOADX_APP_ID` | Default app, beating the link file. |
| `UPLOADX_PROFILE` | Profile to use, beaten by `--profile`. |
| `UPLOADX_CONFIG` | Credentials path. Default `~/.uploadx/config.json`, mode 0600. |
| `UPLOADX_DEBUG` | Any value turns on request tracing. |
| `UPLOADX_TIMEOUT_MS` | Per-request deadline. Default 30000. |
