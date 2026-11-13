# Embedding

`neoism-agent-server` exposes `EmbeddedAgent`, an explicitly owned native host for the existing Neoism runtime. It uses the same Axum router and Agent services as the standalone server. It opens no listener and does not create a separate model/tool loop.

## Create a host

Use this API from a Rust application with a Tokio runtime. In a Neoism workspace package, add `neoism-agent-server.workspace = true` and the workspace's compatible `axum` and `tokio` dependencies. External Rust applications can use the crate from a pinned Neoism repository revision. Node applications can use the existing TypeScript SDK through the native binding below.

```rust
use axum::{body::Body, http::Request};
use neoism_agent_server::{EmbeddedAgent, EmbeddedOptions, standard_services};

let host = EmbeddedAgent::open(EmbeddedOptions::new(
    "/persistent/company/agent.db",
    standard_services(),
)).await?;

let result = host.request(
    Request::builder()
        .uri("/v2/meta")
        .body(Body::empty())?
).await;

host.close().await?;
let response = result?;
```

This fragment belongs inside an async function returning an error-compatible result. Always arrange `close().await` on error paths too. `standard_services()` supplies native/local services and minimal workspace search. Applications needing indexed search should inject their search implementation through `services_with_workspace_search`; applications needing shared hosting must supply tenant-scoped services, not assume local defaults are safe.

Run the compiled example from the Neoism repository:

```sh
cargo run -p neoism-agent-server --example embedded -- /persistent/company/agent.db /workspace
```

The example creates a real session through the existing API, then closes the host. Supply an existing workspace directory and a writable persistent database location. The example uses `NEOISM_AGENT_TOKEN` when configured and does not print it.

## Embed from TypeScript

`@neoism/sdk-node` exposes `createEmbeddedNeoism()`. It loads the native Node-API binding and connects the existing typed SDK to the same in-memory router. There is no HTTP listener, proxy server, or second conversation loop.

From `neoism-agent/sdk/typescript` in the source checkout:

```sh
npm run build
npm run native:build
npm run test:embedded
```

Then use the built SDK package:

```ts
import { createEmbeddedNeoism } from "@neoism/sdk-node";

const host = await createEmbeddedNeoism({
  database: "/persistent/company/agent.db",
  // token: process.env.NEOISM_AGENT_TOKEN,
});
try {
  const session = await host.client.sessions.create({ directory: "/workspace" });
  console.log(session.id);
} finally {
  await host.close();
}
```

The host also supports `Symbol.asyncDispose`. Use a current Node runtime with Fetch/Web Streams and `AbortSignal.any`. The default native artifact is `native/<platform>-<arch>/neoism_agent.node` inside the Node SDK package; `nativeModule` selects an explicit trusted path. Source builds are host-platform specific. Cross-platform prebuilt releases are not implied by this guide, and loading a native module requires trusting that binary and its system dependencies.

The bridge preserves HTTP statuses, binary artifact bytes, SSE parsing/reconnect behavior, and cancellation. Response delivery is pull-based with chunks up to 64 KiB. Request bodies are bounded at 16 MiB and each host has a maximum of 64 active exchanges; consume or cancel bodies to release them. Closing a host aborts its owned SDK subscriptions. Cancelling a request does not automatically undo an already admitted agent prompt; use the existing session abort API for that.

`host.client` is the existing typed SDK client. `host.fetch` provides low-level in-memory Fetch access restricted to `http://neoism.embedded.invalid`; it cannot fetch another origin. The bridge uses native/local services and existing environment/configuration behavior, not a new company-isolation mechanism. Shared installations still need explicitly isolated workers and the existing hosted authorization model.

## Use existing sessions and events

Send ordinary API requests through `host.request(request)`. There is no new session schema or parallel API to learn:

1. `POST /v2/sessions?directory=<url-encoded-directory>` creates a session.
2. `GET /v2/events?sessionId=<id>&tail=true` subscribes to its event stream.
3. `POST /v2/sessions/<id>/prompt` submits a prompt using the existing JSON body and a stable `messageId` for redelivery.
4. `POST /v2/sessions/<id>/wait` waits for the existing run/queue to settle.
5. `GET /v2/sessions/<id>/messages` reads saved messages. Reuse the same session for subsequent turns.

Read the response body incrementally for SSE or artifact downloads. For SSE, `response.into_body().into_data_stream()` yields byte chunks, not necessarily complete events; use a proper SSE parser. Do not collect an infinite event stream into a single byte buffer. Use `since` or `Last-Event-ID` for supported event replay and handle expired cursors. See [[Server and API]] for routes and stream semantics.

The existing Rust/provider/plugin contracts and route handlers remain responsible for model selection, tools, approval interactions, subagents, compaction, and workflows. Host services and configuration determine which capabilities are enabled. The TypeScript SDK can use either the network transport or the native in-process binding; both use the same generated API contracts.

## Lifecycle and ownership

- Retain one host for the lifetime of an application or workspace activation, not one per request.
- Cloned handles share state. Closing any handle retires the runtime for every clone.
- Closing stops admission, cancels outstanding in-memory request futures, and calls the existing native state shutdown. SSE streams terminate during retirement.
- Close is repeatable. Dropping the caller's close future does not abandon the shutdown task; another caller can await the same result.
- A shutdown failure is retained and reported. Do not reopen the same database after incomplete retirement in the same process.
- `EmbeddedOptions::shutdown_timeout` defaults to 30 seconds. Stop accepting application traffic before closing, and let the owning Tokio runtime remain alive until retirement finishes.

Dropping a Rust handle is not an async shutdown operation. A process crash may bypass cleanup entirely. Claimed model turns resume from saved conversation history on reopening, with a ten-attempt restart limit. This is at-least-once continuation, not restoration of a live tool future or exactly-once effects. See [[Durable Objects]] for the recovery contract.

Node hosts may pass `config` to `createEmbeddedNeoism`; Rust hosts may use `EmbeddedOptions::with_config`. The document replaces local configuration discovery and is immutable through config updates. Supply it again on reopening. This does not sandbox native tools or replace native credential services; Rust hosts can inject those services through `AgentServices`.

## Authentication and configuration

An in-memory request is not automatically authenticated. Pass the same `Authorization` header required by the native API. The host validates `AgentServices` before opening storage, and management mutation APIs are disabled by default; enabling them requires an explicit `ManagementPolicy`.

Native services can discover local configuration and credentials, just like the server. For strict shared hosting, inject authoritative tenant resolution, scoped provider and MCP credentials, shared artifact storage, and enable `for_hosted_control_plane()`. Keep native execution in separately isolated workers. Protect the database and artifact directory as sensitive company data.

These hosts execute native Rust, directly or through the Node binding. The local database, native tools, background services, and Tokio execution model are not a Workerd/Wasm adapter. See [[Durable Objects]] before choosing an eviction-based host.