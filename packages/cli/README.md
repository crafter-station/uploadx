# uploadx

Manage [UploadX](https://github.com/Ignac/uploadx) apps, tokens and files from your terminal.

```bash
npx uploadx login
npx uploadx init
```

## Authentication

`uploadx login` uses the OAuth 2.0 Device Authorization Grant: the CLI prints a code,
you approve it in a browser, and the CLI stores the resulting tokens. The browser does
not have to be on the same machine, so this works over SSH and inside containers.

```bash
uploadx login                                  # the hosted instance
uploadx login --url https://uploadx.example.com --profile self-hosted
uploadx login --org acme                       # pick an org up front
```

Credentials live in `~/.uploadx/config.json` (mode `0600`), keyed by profile. Override
the location with `UPLOADX_CONFIG`.

`uploadx logout` revokes the token with the identity provider as well as deleting it
locally — deleting the file alone would leave the refresh token valid.

### Profiles

A profile is an instance plus the organization you act for. Log in again with a
different `--profile` to work with a second instance or a second org.

```bash
uploadx profiles list
uploadx profiles use staging
uploadx profiles remove staging     # forgets without revoking
```

Selection order: `--profile`, then `UPLOADX_PROFILE`, then the default profile.

### CI

The device flow needs a human. In CI, set `UPLOADX_TOKEN` to an app-scoped token
(the same one the SDK uses) and `UPLOADX_URL` to the instance:

```bash
UPLOADX_TOKEN=upx_live_… UPLOADX_URL=https://uploadx.example.com \
  uploadx files upload ./dist --recursive --prefix build/
```

App-scoped tokens can list, upload and delete files for **their own app**. Commands
that act on the account — `apps create`, `tokens create` — refuse, because the token
carries no user identity.

## Choosing an app

Most commands need an app. They resolve it in this order:

1. `--app <id>`
2. `UPLOADX_APP_ID`
3. the nearest `.uploadx.json`, written by `uploadx link` (commit it — it holds no secrets)
4. an interactive picker

## Commands

```
uploadx login | logout | whoami
uploadx profiles list | use <name> | remove <name>
uploadx init                       # create/pick an app, write .env.local, scaffold Next.js
uploadx link                       # record the app for this directory

uploadx apps list | create <name> | delete [appId]
uploadx tokens list | create <name> | revoke <tokenId>
uploadx files list | upload <paths...> | delete <keys...>
```

Every read command takes `--json`. Every command is fully driveable by flags: when
there is no TTY, or `CI` is set, or `--json` is passed, a missing value is an error
naming the flag rather than a prompt.

### Uploading

```bash
uploadx files upload ./logo.png
uploadx files upload ./dist --recursive --prefix assets/
```

Directories need `--recursive`, and relative paths are preserved in the storage key.
Four files upload at a time.

Uploads through the CLI go straight to storage and **do not run your file router**, so
`maxFileSize` and type rules are not applied — the same as uploading from the dashboard.

### Destructive commands

`apps delete` asks you to type the app name; `files delete` and `tokens revoke` ask to
confirm. `--yes` skips the prompt and is **required** when there is no TTY.

`tokens create` prints the secret once. `--output-env` appends it to `.env.local`
instead, so it never reaches your shell history:

```bash
uploadx tokens create "Local dev" --output-env
```

## Self-hosting

The CLI discovers an instance's OAuth settings from `GET /api/cli/config`. To make a
self-hosted instance CLI-ready, register a **public** Clerk OAuth application with the
**device authorization grant** enabled and the scopes
`openid profile email offline_access user:org:read`, then set:

```bash
CLERK_CLI_OAUTH_CLIENT_ID=<client id>
```

`uploadx login --url <your instance>` then works against it.
