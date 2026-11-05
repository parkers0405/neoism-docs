# Terminal

Neoism's Ghostty-powered terminal is a native GPU-rendered PTY surface, not a simulated command prompt. By default it keeps commands and their output together in blocks. Interactive shells, alternate-screen applications, mouse reporting, OSC links, job control, and terminal graphics run against a host-side session owned by the workspace daemon.

## Open terminals

Use `Alt+T` to open a terminal tab (`Option+T` on macOS). A new terminal starts in the active workspace root. Splitting creates another pane/session without redefining the workspace.

Configure a shell in the `terminal` domain:

```jsonc
{
  "terminal": {
    "shell": {
      "program": "/bin/fish",
      "args": ["--login"]
    }
  }
}
```

Omit the block to use Neoism's platform default.

## Write and run commands

The input bar supports ordinary text editing, mouse selection, and clipboard paste. `Ctrl+Shift+V` or `Shift+Insert` pastes from the clipboard; macOS also supports `Cmd+V`. Pasting edits the draft; `Enter` submits it.

| Action | Behavior |
|---|---|
| `Tab` / `Shift+Tab` | Preview and cycle completions in the input bar without executing them. |
| Type with the completion menu open | Refresh suggestions while keeping the menu visible during lookup. |
| `Escape` with a picker open | Close it and restore the query you typed before previewing. |
| `Enter` after a completion preview | Submit the command once. |
| `Up` / `Ctrl+R` | Open command history. Navigating entries previews them in the input bar. |
| `Enter` with history open | Accept the preview into the draft. Press `Enter` again to run it. |

Completions can include host commands, paths, live shell names, Git data, and package scripts. Candidates depend on the shell, its completion setup, and the connected daemon. Bash supports registered completion functions; zsh currently uses live-name and host-data fallback rather than native ZLE/compdef completion. See [completion support](https://github.com/parkers0405/neoism/blob/main/neoism-frontend/gpuix/README.md#block-terminal-completion) for detailed compatibility and permission boundaries.

## Work with output blocks

Each command block keeps its working directory, command, and output together, with timing and exit status. Hover over a block to reveal its filter and action menu.

- Drag to select command or output text, including across blocks. `Ctrl+Shift+C`, or `Cmd+C` on macOS, copies the selection.
- Filter output to find matching lines without changing the stored transcript.
- Copy a command or its output, collapse a block, or reuse a command in the input bar.
- Open supported file and directory links in `ls` output. Dragging across a link selects text rather than opening it.
- Run `clear` to clear visible blocks while retaining recent command history.

Full-screen terminal applications use the native terminal grid. The block view sits on the same terminal engine and shell session.

## Choose your layout

Block terminal is enabled by default. In Settings, choose bottom, top, or flow input placement. To use the classic terminal, turn off **Block terminal**, or configure:

```json
{
  "terminal": {
    "block-ui": false
  }
}
```

Terminal presentation applies to new sessions. Changing it leaves existing running shells alone. Closing the frontend also leaves daemon-owned shell sessions alive while the daemon and host remain running.

## Working directory

Each terminal tracks its own current directory. `cd` affects that shell only. New project-level content, Explorer, search, and agents remain rooted at the declared workspace directory.

## Scrollback and selection

- `Shift+PageUp` / `Shift+PageDown`: page through history.
- `Shift+Home` / `Shift+End`: top or bottom.
- Terminal context menu: copy, paste, clear, and search.

Scrollback is bounded host-side history, not durable terminal recording. A daemon restart does not checkpoint a running process or guarantee its old output can be reconstructed.

## Command blocks and background processes

Shell integration can mark prompts/commands with OSC 133 boundaries, allowing Neoism to present command-aware output. A process placed in the shell's background remains part of that PTY. Agent `background_task` jobs are different: they are tracked by Neoism Agent and have their own status/cancellation UI.

## Links, paths, and graphics

Neoism recognizes terminal hyperlinks/path hints and supports terminal image protocols handled by the renderer. Applications remain responsible for emitting valid escape sequences.

## Vi mode and cursor

Terminal Vi mode and the editor's Vim layer are separate. Toggle Neoism's Vim layer with `Alt+Shift+Space` where applicable. Terminal applications can still use their own modes.

Configure cursor appearance in the terminal domain:

```jsonc
{
  "terminal": {
    "cursor": {
      "shape": "block",
      "blinking": false
    },
    "scroll": {
      "multiplier": 3.0
    }
  }
}
```

## Remote terminals

The PTY runs on the daemon host. Desktop, browser, and mobile clients attach to that host-owned session; they do not move the process onto the viewing device. Disconnecting a client does not intentionally stop the shell.

See [[Neoism Daemon/Sessions and Persistence]] and [[Neoism Daemon/Remote Devices and Pairing]].

## Troubleshooting

- A missing terminal after a daemon restart is not recoverable as a live process; create a new session.
- A persisted tab can reference a stale session ID. Recreate/reattach instead of reopening it indefinitely.
- If input appears captured, dismiss the workspace picker or modal with `Esc` and refocus the terminal.
- If the web terminal stops updating, check daemon connectivity before changing shell configuration.