# Multiplayer and Sync

Multiplayer is coordinated by the daemon that owns the workspace. Connected surfaces subscribe to shared state from that daemon; they do not elect a browser or phone as the file authority.

## Shared editor documents

For an opened file, the daemon maintains one authoritative Yrs document keyed by the file's absolute host path. Clients opening the same file receive a CRDT snapshot and exchange incremental updates through the daemon. Concurrent edits converge according to the shared document state rather than by repeatedly overwriting one client's whole buffer with another's.

Saving is daemon-owned. A save writes the converged document text to the host file and broadcasts a saved notification so connected panes update their dirty baseline. External changes to an open host file are folded back into the shared document and broadcast to subscribers.

The CRDT document is collaboration state, not a replacement for the host filesystem. The file becomes durable when it is saved. Do not assume every unsaved edit survives a daemon restart merely because it appeared on another connected surface.

Compatible editor clients publish document edits into this shared CRDT path and apply remote changes. Support depends on the client build: seeing a document, terminal, or agent conversation does not by itself establish editing parity. Use current compatible clients and verify editing on each connected device.

## Presence

Neoism sends collaborator presence separately from document updates. Current publishers send peer identity and live cursor positions. The protocol can represent selections, but that does not establish that clients publish them. Presence is transient:

- joining or opening a buffer publishes current presence;
- moving the cursor updates it;
- disconnecting removes that peer's presence from all buffers;
- stale presence is also swept by the daemon.

Presence proving that another person is viewing a file does not mean their latest text is saved to disk.

## Workspace UI state

The daemon also publishes workspace-level state used by connected surfaces, including workspace trees, published pane layouts, preferences, session summaries, and terminal output. Tab selections are retained per client/user rather than being one cursor shared by everyone. Some UI choices remain surface-specific, including browser-local display settings.

Sharing a layout is not the same as sharing a process. Connected clients can attach to a daemon-hosted terminal when that surface is configured to use it. This does not establish fine-grained per-terminal viewing or input grants. Shared agent chats use the same conversation across connected clients, with messages, tool activity, and approval requests. Conversation history and lifecycle remain separate from the PTY registry.

## Across devices and hosts

Multiple devices connected to one daemon collaborate against the same host files, PTYs, and shared documents. A second daemon is a different host authority. Merely pairing two hosts does not continuously mirror every checkout, process, terminal scrollback, secret, or unsaved buffer between them.

Neoism has explicit workspace-transfer and host-promotion flows for moving a workspace snapshot to another host. Those are deliberate operations, not the normal multiplayer transport. A promoted workspace can carry repository and snapshot state, while live operating-system processes and PTY history remain tied to the original host.

## Reconnection

After a brief client disconnect, the surface reconnects to the authoritative daemon, receives current workspace state, and can reattach to live terminal sessions. Shared documents synchronize from daemon state and disk state when reopened. Presence from the disconnected connection is removed and is republished after the client rejoins.