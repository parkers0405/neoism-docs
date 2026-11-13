# Hosting Neoism

Neoism has one native Agent runtime. The desktop and workspace daemon, standalone server, and embedded applications use its existing sessions, tools, permissions, compaction, plugins, and event API. Hosting changes how that runtime is owned and reached; it does not introduce another agent implementation.

## Choose a host

| Mode | Entry point | Use it for |
|---|---|---|
| Desktop and daemon | Neoism's normal workspace connection | Interactive local or remote development |
| Standalone native server | `neoism-agent serve` | SDK clients and HTTP/SSE integrations |
| Docker | Native server inside the repository's image | Persistent self-hosted installations |
| Embedded Rust application | `EmbeddedAgent` from `neoism-agent-server` | Direct in-process access without a listener |
| Embedded Node application | `createEmbeddedNeoism` from `@neoism/sdk-node` | Existing typed SDK backed by the native runtime in process |
| Durable-object coordinator | Customer-owned object plus an authorized native worker | Durable routing and application state around the native runtime |

Start with [[Embedding]], [[Docker]], or [[Durable Objects]]. The durable-object guide distinguishes a coordinator from executing the native engine inside a restricted object runtime. Direct restricted-Worker/Wasm execution is not currently supported.

## Same API, different transport

```text
Desktop / SDK client -> HTTP or daemon transport -> Agent router -> Agent runtime
Embedded application -> in-memory request       -> Agent router -> Agent runtime
```

The embedded host does not open a listening socket or add an HTTP network hop. Requests still pass through the existing authentication, authorization, routing, and plugin layers. Responses retain their status codes, headers, bodies, and SSE streams. WebSocket upgrades need a real server connection.

## Company installations

A company owns its deployment, storage, model credentials, authentication policy, and execution infrastructure. A native process with local tools has the authority of its OS account. Do not treat a tenant identifier, directory prefix, container name, or embedded host as an OS security boundary.

For mutually untrusted companies or workspaces, use strict hosted authentication and separate isolated execution workers. The shared control plane is execution-disabled. See [[Server and API]] and the [hosted architecture guide](https://github.com/parkers0405/neoism/blob/main/neoism-agent/docs/hosted-control-plane.md) for existing host/broker contracts and their supported isolation model.

## Persistence is not transparent continuation

Sessions and messages persist, and queued prompts have recovery. Claimed model turns resume from saved history after process loss or orderly shutdown, up to ten restart attempts. This does not restore a live stream, subprocess, or tool future and does not guarantee exactly-once external effects. Keep the original message identity rather than resending an interrupted prompt as a new command; reconcile uncertain effects before retrying them.

Keep one runtime owner per database, keep its data on persistent storage, and retire it before opening a replacement. Customer infrastructure supplies routing, backups, secrets, health checks, and restart policy. Neoism does not provision Azure or AWS resources for an embedded application.