# Welcome to Neoism

Neoism is a terminal-first workspace for code, notes, drawings, agents, and shared work across devices.

This handbook has four parts:

- **Getting Started** is the shortest path from first launch to a working project.
- **Neoism** explains the workspace, terminal, editor, notes, navigation, and appearance.
- **Neoism Agent** explains providers, models, sessions, tools, permissions, extensions, and memory.
- **Neoism Daemon** explains persistent workspace sessions, pairing, remote clients, and synchronization.

## Start here

Follow these guides in order:

1. [[Getting Started/01 Meet Neoism|Meet Neoism]]
2. [[Getting Started/02 Open Your First Workspace|Open Your First Workspace]]
3. [[Getting Started/03 Terminal, Editor, and Notes|Terminal, Editor, and Notes]]
4. [[Getting Started/04 Start Your First Agent|Start Your First Agent]]
5. [[Getting Started/05 Connect Another Device|Connect Another Device]]
6. [[Getting Started/06 Configure Neoism|Configure Neoism]]
7. [[Getting Started/07 Essential Keybindings|Essential Keybindings]]

## Neoism

- [[Neoism/Workspaces|Workspaces]]
- [[Neoism/Terminal|Terminal]]
- [[Neoism/Editor|Editor]]
- [[Neoism/Notes and Drawings|Notes and Drawings]]
- [[Neoism/Navigation and Keybindings|Navigation and Keybindings]]
- [[Neoism/Appearance|Appearance]]

## Neoism Agent

Begin with [[Neoism Agent/The Neoism Agent|The Neoism Agent]], then use the focused guides:

- [[Neoism Agent/Configure|Configure]]
- [[Neoism Agent/Providers|Providers]] and [[Neoism Agent/Models|Models]]
- [[Neoism Agent/Agents and Subagents|Agents and Subagents]]
- [[Neoism Agent/Permissions|Permissions]]
- [[Neoism Agent/Sessions and Sharing|Sessions and Sharing]]
- [[Neoism Agent/Undo and Redo|Undo and Redo]]
- [[Neoism Agent/Commands|Commands]]
- [[Neoism Agent/Skills|Skills]] and [[Neoism Agent/Instructions|Instructions]]
- [[Neoism Agent/MCP Servers|MCP Servers]]
- [[Neoism Agent/Attachments|Attachments]] and [[Neoism Agent/Compaction|Compaction]]
- [[Neoism Agent/Tools and Background Tasks|Tools and Background Tasks]]
- [[Neoism Agent/Memory|Memory]]
- [[Neoism Agent/Formatters, LSP, and References|Formatters, LSP, and References]]
- [[Neoism Agent/Troubleshooting|Troubleshooting]]

## Neoism Daemon

- [[Neoism Daemon/The Neoism Daemon|The Neoism Daemon]]
- [[Neoism Daemon/Sessions and Persistence|Sessions and Persistence]]
- [[Neoism Daemon/Remote Devices and Pairing|Remote Devices and Pairing]]
- [[Neoism Daemon/Multiplayer and Sync|Multiplayer and Sync]]
- [[Neoism Daemon/Troubleshooting|Troubleshooting]]

## Editable introduction, immutable reference

New vaults receive one short, editable `Welcome/Welcome.md` note, not a folder full of handbook pages. Open `Alt+P` → **Open Documentation**, or run `neoism docs`, to read the full local handbook and Scalar API reference in your browser. The application starts its documentation server lazily on `127.0.0.1`; a standalone `neoism docs` server stays running until you press `Ctrl+C` in its terminal. The same documentation is available online at <https://neoism.ai/api/docs/>.

The built-in Neoism Docs tool reads a bundled machine-readable copy, so deleting or changing a Welcome note does not remove authoritative documentation available to agents. Older handbook copies already in Notes are preserved; you can keep or remove them yourself.