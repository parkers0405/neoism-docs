# Scheduled Workflows

Workflows are stored as Markdown files. YAML frontmatter controls when and how they run. A prompt workflow submits the Markdown body to Neoism Agent. A direct-action workflow specifies the action in frontmatter and leaves the body empty.

The Neoism Agent server runs the scheduler, not the Rune desktop frontend. In a local Rune workspace, open the command palette (`Alt+P`) and choose **Workflows**. For eligible prompt workflows, you can open the Markdown source in the editor, inspect recent Rune-started runs, and confirm **Activate**, **Pause**, or **Run now**. The panel does not show installation-wide workflows or grant operator approval for shell or compose actions. You can also manage workflows through the server's v2 Workflows API when that capability is enabled.

Activation in Rune is limited to workspace-root prompt workflows without skills or retries and with `concurrency.mode: forbid`. Rune pins the exact source path, revision, and file origin. If the source is edited, moved, or replaced, refresh the panel, review the source, and activate it again. This pin does not change normal hot reload for ordinary prompt workflows activated outside Rune.

Prompt workflows can run on a time schedule or be started manually. A normal workflow prompt can ask the agent to run a shell command, call MCP tools, or use [[Tool Composition]], subject to tool availability and permissions. Local operators can also opt in to text-only MCP event bindings or use the API to run or schedule an approved shell or restricted composition action.

## Locations

Global paths below use the Linux/macOS default `~/.config/neoism`. On Windows the global workflow directory is `%USERPROFILE%\AppData\Local\neoism\workflows\`.

| Scope | Canonical directory |
|---|---|
| Project | `<workspace>/.neoism/workflows/` |
| Global | `~/.config/neoism/workflows/` |
| Config override | `$NEOISM_AGENT_CONFIG_DIR/workflows/` |

Neoism also recognizes singular `workflow/` directories and the inherited `$HOME/.neoism` config root. Global workflows run separately in each tracked workspace, because every workflow conversation needs a workspace and project context.

Files can be nested under these directories. Every workflow file must use the `.md` extension.

## Complete example

```markdown
---
id: daily-review
name: Daily workspace review
active: true
directory: packages/web
schedule:
  frequency: daily
  interval: 1
  time: 9:30 AM
  timezone: America/Los_Angeles
agent: build
model:
  providerId: anthropic
  modelId: claude-sonnet-4
permissions:
  read: allow
  edit: deny
  bash:
    default: deny
    allow:
      - git status*
      - git diff*
---

Review recent changes and outstanding tasks for this package.
Return a concise report. Do not modify files.
```

## Frontmatter reference

| Field | Required | Meaning |
|---|---:|---|
| `id` | Yes | Stable lowercase slug containing letters, numbers, `.`, `_`, or `-`. |
| `name` | Yes | Human-readable workflow and conversation title. |
| `active` | No | `true` enables automatic execution for ordinary prompt workflows. Defaults to `false`. Direct actions require explicit operator activation. |
| `schedule` | Yes | One-time, recurring, or event-only schedule described below. |
| `action` | No | Fixed shell or restricted composition action instead of a Markdown prompt. |
| `directory` | No | Existing relative, home-relative, or absolute execution directory. Project workflows default to the workspace root; global workflows default to the OS home directory. |
| `agent` | No | Configured agent name. The normal default agent is used when omitted. |
| `model` | No | Provider, model, and optional variant selection. |
| `skill` | No | Configured skill whose content is prepended to the prompt. |
| `permissions` | No | Workflow permission overrides. Agent permissions are inherited when omitted. |
| `retry` | No | Automatic retry policy. Defaults to one attempt (no retries). |
| `concurrency` | No | Overlap policy. Defaults to `forbid`. |

Unknown fields, invalid combinations, empty prompts, and malformed values produce a workflow diagnostic instead of silently changing behavior.

## Conversation directory and project

When `directory` is omitted, a project workflow under `<workspace>/.neoism/workflows/` creates its conversation in the tracked workspace root:

```yaml
id: root-review
name: Root review
active: true
schedule:
  frequency: daily
  time: 09:00
```

The resulting session remains attached to the root project and is available in normal agent session history. A global workflow under `~/.config/neoism/workflows/` instead defaults to the operating system home directory (`$HOME` on Linux and macOS, and the user profile directory on Windows).

Set `directory` to run in a specific project subdirectory:

```yaml
directory: packages/web
```

Relative paths resolve from that workflow's default directory: the workspace root for project workflows and the OS home directory for global workflows. Home-relative and absolute paths are also supported:

```yaml
directory: ~/Documents/x/y
```

```yaml
directory: /srv/projects/example
```

The directory must already exist, and relative paths cannot contain `..`. Neoism canonicalizes it, records the exact directory on the conversation, and performs normal project discovery there. A directory inside a Git worktree is categorized under that Git project. A directory outside a Git worktree is categorized as `global`.

## Manage workflows from chat

In an interactive local agent session with Workflows enabled, the `workflow` tool can list definitions visible to the current workspace, get a definition, preview its next scheduled times, or show recent run history. Ask the agent to draft a workflow with a name, schedule, and prompt. The tool writes a paused workspace draft under `.agent/workflows/` when the session has edit permission, and refuses to replace an existing definition.

After reviewing the draft, you can ask the agent to activate, pause, or run it once. These operations are checked separately by the `workflow_activate`, `workflow_pause`, and `workflow_run` permission rules. Activation and one-off runs require the revision returned by inspection; if the definition changes before the action is approved, inspect it again. This check applies when the tool is called and does not disable normal file hot reload for an active schedule. A one-off run does not activate the schedule.

## Activation and hot reload

```yaml
active: true
```

Neoism uses native filesystem events. Creating, saving, atomically replacing, renaming, or deleting workflow files immediately triggers a debounced reconciliation. There is no short filesystem polling loop.

Saving `active: false` pauses future automatic runs without deleting history. Saving `active: true` activates or reactivates the workflow. Prompt, schedule, directory, agent, model, skill, and permission edits are loaded before the next run.

The activate and pause API routes remain available as temporary runtime overrides. A later source-file change makes frontmatter authoritative again.

## One-time schedules

Use an ISO calendar date, an optional time, and a timezone:

```yaml
schedule:
  date: 2026-09-15
  time: 10:40 PM
  timezone: America/Chicago
```

`time` defaults to `00:00`. `timezone` defaults to `UTC`.

A completed one-time workflow does not run again. Activating it after its timestamp has passed does not run it retroactively.

### Complete timestamp

Use `at` for an RFC 3339 timestamp containing its UTC offset:

```yaml
schedule:
  at: 2026-09-15T22:40:00-05:00
```

`at` cannot be combined with `date`, `time`, `frequency`, `interval`, `minute`, `weekdays`, `monthDay`, or `cron`.

## Recurring schedules

### Hourly

```yaml
schedule:
  frequency: hourly
  interval: 2
  minute: 15
  timezone: UTC
```

This runs every second matching hour at 15 minutes past the hour.

### Daily

```yaml
schedule:
  frequency: daily
  interval: 1
  time: 09:30
  timezone: America/Los_Angeles
```

### Weekly

```yaml
schedule:
  frequency: weekly
  interval: 1
  time: 8:00 AM
  timezone: Europe/London
  weekdays: [monday, thursday]
```

Weekdays accept full names or `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, and `sun`.

### Monthly

```yaml
schedule:
  frequency: monthly
  interval: 1
  time: 10:00
  timezone: UTC
  monthDay: 31
```

`monthDay` accepts `1` through `31`. If the selected day is beyond the end of a month, Neoism uses that month's final day.

### Cron

```yaml
schedule:
  frequency: cron
  cron: '30 9 * * MON-FRI'
  timezone: America/New_York
```

This runs at 9:30 a.m. New York time on weekdays. Cron expressions have five fields: minute, hour, day of month, month, and day of week. The timezone defaults to UTC. Do not combine cron with other schedule fields; if your workflow editor emits `interval`, leave it at `1`.

## Schedule field compatibility

| Schedule kind | Fields |
|---|---|
| One-time date | `date`, optional `time`, optional `timezone` |
| One-time timestamp | `at` |
| Hourly | `frequency`, optional `interval`, optional `minute`, optional `timezone` |
| Daily | `frequency`, optional `interval`, optional `time`, optional `timezone` |
| Weekly | `frequency`, optional `interval`, required `weekdays`, optional `time`, optional `timezone` |
| Monthly | `frequency`, optional `interval`, optional `monthDay`, optional `time`, optional `timezone` |
| Cron | `frequency: cron`, required `cron`, optional `timezone` |
| Event only | `frequency: event` for a prompt workflow with an operator-configured MCP event binding |

`interval` defaults to `1` and must be at least `1`. Fields from different schedule kinds cannot be mixed.

## Date, time, and timezone formats

Dates use one unambiguous format:

```text
YYYY-MM-DD
```

Accepted local time formats are:

```text
22:40
22:40:30
10:40 PM
10:40:30 PM
```

AM and PM are case-insensitive. Ambiguous locale dates such as `8/9/26` and free-form phrases such as `tomorrow morning` are intentionally rejected.

Use an IANA timezone such as:

```yaml
timezone: America/Chicago
timezone: Europe/London
timezone: UTC
```

`timezone: local` resolves the operating system's current IANA timezone. Named timezones are safer when a workflow may move between computers.

During daylight-saving transitions, nonexistent local times move forward to the first valid minute. Ambiguous local times run once at the earlier occurrence.

## Permissions

Omit `permissions` to inherit the selected agent and global configuration:

```yaml
agent: build
```

Use a direct action for all targets in one permission group:

```yaml
permissions:
  read: allow
  edit: deny
  bash: deny
```

Workflow overrides accept only `allow` and `deny`. If an inherited permission would ask for approval, the unattended run denies the tool call instead of waiting.

Use `default` and pattern lists for narrow overrides:

```yaml
permissions:
  bash:
    default: deny
    allow:
      - notify-send*
      - git status*
    deny:
      - rm *
```

Pattern precedence is deterministic: explicit `deny` patterns override `allow`, and explicit patterns override `default`. Workflow rules are applied after configured agent rules.

## Notification example

```markdown
---
id: workflow-notification
name: Workflow notification test
active: true
schedule:
  date: 2026-08-23
  time: 10:40 PM
  timezone: America/Chicago
permissions:
  bash:
    default: deny
    allow:
      - notify-send*
---

Run exactly this command with the bash tool:

`notify-send "Neoism Workflow" "Workflow worked"`

Do not perform any other action.
```

## Agent, model, and skill

Select a configured agent:

```yaml
agent: build
```

Select a model:

```yaml
model:
  providerId: anthropic
  modelId: claude-sonnet-4
  variant: high
```

Load a configured skill before the workflow prompt:

```yaml
skill: release-review
```

When omitted, Neoism uses the normal agent and model selection for the execution directory.

## Execution and recovery

At the scheduled timestamp, the agent server durably claims the run before creating a session. The resulting conversation remains in agent session history, and the Workflows API keeps a separate run history.

If the scheduler was offline for several recurring occurrences, Neoism coalesces the backlog to the latest missed occurrence instead of replaying every interval. A one-time run is eligible only when it was activated before its timestamp. Invalid or deleted active source files are paused rather than executing stale prompts.

The default `concurrency.mode: forbid` skips scheduled occurrences while a run is queued or running and rejects an overlapping manual run. Use `allow` with `maxRunning` to permit a bounded number of queued or running attempts. Use `replace` to mark older queued or running attempts as `replaced`; this does not cancel an agent turn that is already in progress.

An unfinished run is marked `interrupted` if the agent server restarts. By default, Neoism does not repeat it. To opt in to retrying failures or interruptions, use a policy such as:

```yaml
retry:
  maxAttempts: 3
  backoff: exponential
  initialDelayMs: 5000
  maxDelayMs: 60000
  retryableErrors: [temporarily unavailable]
```

`maxAttempts` includes the first attempt. Backoff is `fixed` by default or `exponential`; `initialDelayMs` defaults to `0`, and `maxDelayMs: 0` means no cap. `retryableErrors` matches case-insensitive substrings of the error; omitting it allows any error to qualify for retry. Enable retries only if repeating the prompt and its tool calls is safe.

## Trigger a text-only prompt from a local MCP event

MCP event intake is opt-in and supports up to 16 bindings per agent server process, with at most one binding per workspace workflow. Configure an enabled remote server on a literal loopback HTTP address in your workspace agent config. With the standard adapter, that is `.agent/agent.json`:

```json
{
  "mcp": {
    "issues": {
      "type": "remote",
      "url": "http://127.0.0.1:9130/mcp",
      "enabled": true,
      "oauth": false
    }
  }
}
```

The endpoint must advertise the MCP Events push extension. OAuth, custom headers, redirects, and proxies are not supported. Activate a managed local prompt workflow with an explicit built-in OpenAI model, such as `model: { providerId: openai, id: gpt-4.1-mini }`. Set `NEOISM_WORKFLOW_MCP_EVENT` on the agent server process using the active definition's exact `sha256:` revision:

```sh
export NEOISM_WORKFLOW_MCP_EVENT='{"workspace":"/absolute/path/to/workspace","workflow":"inbox","revision":"sha256:<64 lowercase hex digits>","server":"issues","url":"http://127.0.0.1:9130/mcp","event":"issue.updated","arguments":{"project":"infra"}}'
```

For multiple workflows, set `NEOISM_WORKFLOW_MCP_EVENTS` instead, as a JSON array of the same binding objects. Set only one of the two variables. Each binding pins its own source revision and keeps its own replay checkpoint.

The binding is separate from the workflow schedule. Set `schedule: { frequency: event }` to prevent clock-based runs, or keep a clock schedule to run on both time and matching events. The event payload is passed to the selected model as separate, untrusted user data. The event turn cannot use tools, chat hooks, or external agents. The payload is limited to 16 KiB, the reply to 64 KiB, and the turn to 120 seconds. Pause the workflow to stop new event dispatches; after a source edit, update the binding's revision before it can dispatch again.

Replay deduplicates previously admitted events. If the server restarts before a pending event is claimed, that run can still be dispatched. If it restarts after claiming the run but before recording a reply, the run is marked `interrupted` and is not retried, because the provider may already have processed the request.

## Fixed shell actions

On Unix, a local operator can run or schedule a fixed command through the Workflows API without starting a model session. Use a managed workspace definition under `.agent/workflows/`. Leave the Markdown body empty, omit `active` or set it to `false`, and specify the command in the frontmatter:

```yaml
---
id: shell-test
name: Shell test
schedule:
  frequency: cron
  cron: '0 * * * *'
action:
  kind: shell
  command: |
    printf '%s\n' "$PWD"
---
```

Use the local operator bearer credential configured with `NEOISM_AGENT_TOKEN`. Send `POST` to the workflow's `/activate` endpoint to enable the schedule or to `/run` for a one-off run. Include the workspace directory and `If-Match: "sha256:<source-hash>"` for the exact source revision. If the identity is not approved, an otherwise valid authenticated request returns it in the error. After reviewing the exact command and working directory, the operator can add that identity to the comma-separated `NEOISM_WORKFLOW_SHELL_APPROVALS` environment variable on the agent server and repeat the request. Source edits require new approval and explicit reactivation. A file edit alone cannot enable a shell schedule, and the chat tool cannot activate or run one.

The command runs as the agent server's OS user in the approved directory with a cleared inherited environment and a 30-second timeout; it is not sandboxed. Operator-only run history records the exit code and bounded stdout and stderr. A nonzero exit marks the run failed. Shell runs are not retried. Pausing or deleting the workflow prevents queued scheduled commands from starting, but does not stop a command that is already running.

## Restricted composition actions

On Unix, a local operator can run or schedule a composition script without starting a model session. A script can use either the built-in `docs` listing or a single approved `provider_metadata` adapter. It cannot browse or call the general MCP catalog, execute shell commands, or directly access the filesystem or network.

Use a managed definition in `.agent/workflows/`, leave the Markdown body empty, and omit `active` or set it to `false`:

```yaml
---
id: docs-list
name: List bundled documentation
schedule:
  frequency: cron
  cron: '0 * * * *'
action:
  kind: compose
  toolIds: [docs]
  code: |
    return await tools.neoism.docs({operation: 'list'});
---
```

Set `NEOISM_WORKFLOW_COMPOSE_DOCS_PERMISSION=allow` and add the exact approval identity to `NEOISM_WORKFLOW_COMPOSE_APPROVALS` on the agent server. Use the local operator bearer credential and `If-Match: "sha256:<source-hash>"` with `/run` or `/activate`. The approval binds the exact code, tool list, source revision, and working directory. The workspace tool catalog must already be loaded and expose `docs`. The listing returns up to 256 entries within a 16 KiB budget and sets `truncated: true` if it omitted entries. Results are recorded in operator-only run history.

To use metadata instead, configure a trusted adapter that implements Neoism's signed definition precondition protocol. Register it as an enabled remote server on literal loopback HTTP, with OAuth disabled and no custom headers. Allow the exact capability under `permission.mcp`, for example `mcp__fixture__provider_metadata: allow`. Provision `NEOISM_WORKFLOW_COMPOSE_METADATA` on the agent server with the `server`, `endpoint`, `approvalIdentity`, `definitionSha256`, and `keyHex` fields. The key must be a unique 32-byte shared secret encoded as lowercase hex and kept outside workspace and workflow files. An ordinary MCP server does not implement this adapter protocol.

Use the exact tool ID in `toolIds`, for example `[mcp__fixture__provider_metadata]`, and call `tools.neoism.provider_metadata({})` in the script. The only result is a bounded version string. The operator credential and exact `If-Match` revision are still required; the signed adapter binding replaces the docs-specific permission and approval settings.

## Workflows API

On the agent server, these routes are provided by the `dev.neoism.workflows` plugin. For a typed client, see [[SDK#Optional capabilities]].

```text
GET    /v2/plugins/dev.neoism.workflows
POST   /v2/plugins/dev.neoism.workflows
GET    /v2/plugins/dev.neoism.workflows/{workflow_id}
PUT    /v2/plugins/dev.neoism.workflows/{workflow_id}
PATCH  /v2/plugins/dev.neoism.workflows/{workflow_id}
DELETE /v2/plugins/dev.neoism.workflows/{workflow_id}
GET    /v2/plugins/dev.neoism.workflows/{workflow_id}/preview
POST   /v2/plugins/dev.neoism.workflows/{workflow_id}/activate
POST   /v2/plugins/dev.neoism.workflows/{workflow_id}/pause
POST   /v2/plugins/dev.neoism.workflows/{workflow_id}/run
GET    /v2/plugins/dev.neoism.workflows/{workflow_id}/runs?limit=50
GET    /v2/plugins/dev.neoism.workflows/{workflow_id}/runs/{run_id}
POST   /v2/plugins/dev.neoism.workflows/{workflow_id}/runs/{run_id}/retry
```

Pass the workspace with `?directory=/path/to/workspace` or the `X-Neoism-Directory` header. On operations that accept `scope`, use `scope=installation` for global definitions; the directory alone does not select global storage. Preview returns upcoming UTC timestamps and their local representations. Manual runs do not change source activation state. Failed, interrupted, and replaced runs can be retried manually.