# websummit-mcp

An MCP server that reads and writes the **Web Summit Lisbon (lis26)** attendee app
using your own ticket. It does **not** scrape websummit.com — it drives the same
HTTPS endpoints the web app uses, signed in as you.

> **Unofficial.** This project is not affiliated with or endorsed by Web Summit.
> It uses your own attendee account and is subject to Web Summit's terms of use.

## What it does

| Tool | What it does |
| --- | --- |
| `auth_status` | Are you signed in? Masked email only. |
| `auth_start` | Send a one-time sign-in code to your email. |
| `auth_verify` | Enter the code you received. |
| `auth_logout` | Delete stored credentials. |
| `search_sessions` | Search the schedule by query, day, track, speaker, time window. |
| `get_session` | Full session detail including description and speakers. |
| `search_speakers` / `get_speaker` | Speaker search and profiles. |
| `search_attendees` / `get_attendee` | Attendee directory (max 25 results). |
| `search_companies` / `get_company` | Companies, startups and exhibitors. |
| `my_schedule` | Your bookmarked sessions, in time order, with clash detection. |
| `schedule_add` / `schedule_remove` | Bookmark / unbookmark a session. Syncs to the phone app. |
| `free_slots` | Free gaps in your schedule. |
| `export_ics` | Export your schedule as an `.ics` file. |

Social tools (`list_connections`, `list_meetings`, `send_connection_request`,
`request_meeting`) exist but are **off by default** — set `WEBSUMMIT_ENABLE_SOCIAL=1`
to register them. They always require an explicit `confirm: true` argument.

## Sign in

The attendee app signs in by email + one-time code. You type both yourself.

1. Ask the assistant to run `auth_start` with your ticket email.
2. Check your inbox for the code.
3. Run `auth_verify` with the code.

Credentials are stored at `~/.websummit-mcp/lis26.credentials.json` with file mode
`0600`. They are never printed or logged.

### Claude Code

```bash
npx websummit-mcp
```

or register it:

```bash
claude mcp add websummit -- node /abs/path/to/dist/index.js
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "websummit": {
      "command": "node",
      "args": ["/abs/path/to/dist/index.js"]
    }
  }
}
```

## Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `WEBSUMMIT_EVENT` | `lis26` | Event slug |
| `WEBSUMMIT_DATA_DIR` | `~/.websummit-mcp` | Where credentials and `agenda.ics` live |
| `WEBSUMMIT_TOKEN` | — | Debug override: bare identity cookie value. Never set in production. |
| `WEBSUMMIT_ENABLE_SOCIAL` | unset | Register social write tools |
| `WEBSUMMIT_RPS` | `2` | Requests per second (max 4) |

## Guardrails

- **Your account only.** You type your email and code. We never read your inbox.
- **No secrets in output.** Tokens, cookies and codes are never printed, logged,
  committed or returned. They are redacted in fixtures and docs.
- **Polite traffic.** Max 2 requests/second, 2 in flight. Backs off on 429/5xx and
  respects `Retry-After`.
- **Writes need consent.** Actions another person can see require
  `WEBSUMMIT_ENABLE_SOCIAL=1` and an explicit `confirm: true`.
- **Personal writes** (bookmarking) are allowed without the flag — they are
  reversible and visible only to you.

## Development

```bash
npm install
npm run build        # tsc
npm run dev          # watch
npm run test         # vitest
npm run smoke        # read-only live check (needs credentials)
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

UNLICENSED.
