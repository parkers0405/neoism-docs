# Durable Objects

There are two different meanings of object-based hosting: a durable coordinator that calls a native Agent worker, and the Agent engine itself executing inside a restricted object runtime. Neoism currently supports its native runtime through embedding and HTTP. It does not currently supply a Workerd/Wasm engine profile or a binding that runs `EmbeddedAgent` directly inside a Cloudflare Durable Object.

## Supported building block: a native owned host

An application running native Rust can retain one `EmbeddedAgent` per authorized workspace activation and dispatch API requests in memory. Sessions are stored in the existing Agent database, and the application explicitly closes the host before handing ownership to another process. Multiple conversations belong to the same host; creating one host per prompt is unnecessary.

If an Azure, AWS, or other application framework can host native Rust, it can own this lifecycle. The framework must supply exclusive ownership, durable storage attached to the correct worker, routing, secrets, and shutdown handling. A framework's actor abstraction does not automatically make a local database portable between machines.

## Durable coordinator plus native worker

For a restricted object runtime, use the object as your application's coordinator and keep Neoism in an authorized native worker:

```text
Authenticated application
          |
Durable coordinator
  workspace/worker identity
  authorized routing and operation records
          |
Neoism native worker
  existing Agent API and runtime
  persistent sessions and workspace
```

This is an integration architecture, not a bundled cloud deployment or a claim that the native engine executes in the object. The existing worker host/broker contracts can supply authenticated worker connections; see [[Server and API]] and [[SDK]].

1. Authenticate the company user before selecting an object or workspace. Do not let untrusted input choose an arbitrary worker URL or tenant namespace.
2. Persist the authorized workspace identity and resolve its current worker generation through the trusted host/broker. Do not persist long-lived raw credentials in object state.
3. Create or reuse a Neoism session on that worker. Persist the session ID and a caller-generated message ID before submitting each logical prompt.
4. Forward requests with a short-lived, scoped credential. Keep the worker's authorization checks; the coordinator is not an authentication bypass.
5. Record admitted operations and results. On ambiguous delivery, inspect the saved session and reuse the same message ID and payload rather than creating a second prompt.
6. Reconnect event streams using the supported cursor/reconciliation behavior. Live token deltas are transient and are not a durable execution log.
7. Use your host's durable alarms or jobs to reconcile pending operation status after coordinator eviction. Do not replay arbitrary side effects merely because a timer fires again.

Keep remote compute alive according to your worker policy while the coordinator is evicted. Evicting the coordinator and terminating the worker are separate events with different recovery consequences.

## Recovery contract

| Event | Existing behavior or host responsibility |
|---|---|
| Client/object connection disconnects | The native worker can continue the admitted run. Reconnect and inspect state. |
| Duplicate prompt delivery | Reuse the same `messageId` and identical payload; handle conflicts and saved results. |
| Native process restarts before queued work begins | Persisted queue recovery can resume admitted waiting work. |
| Native process disappears during a claimed model turn | Startup resumes the existing loop from saved history, with a durable limit of ten restart attempts. This is at-least-once continuation, not exact replay. |
| Tool effect succeeds but its result is not saved | Outcome may be uncertain. Reconcile with the external system; do not assume failure. |
| Two workers claim the same database/workspace | Prevent this through authoritative ownership and fencing; a local coordinator is not sufficient. |
| Object eviction skips cleanup | Application correctness must not depend on an eviction callback or `close()` being invoked. |

## Native restart recovery

Model turns write a durable execution claim before provider/tool work. Shutdown preserves that claim; terminal settlement and explicit Stop release it. Startup schedules a continuation through the existing queue without duplicating the original user message. Completed tool results remain in context; unfinished tool calls are represented as interrupted, and the model is instructed to check uncertain outcomes before retrying. Pending permission/question waiters from the dead process are cancelled rather than exposed as answerable; the resumed model can ask again. This does not restore a live model stream, subprocess, or arbitrary tool future.

The claim survives queue-to-run handoff and repeated crashes during recovery. A durable counter limits a turn to ten restart attempts; terminal settlement resets the budget by releasing the claim. The host must guarantee the prior owner is dead before reopening the database. Recovery does not provide exactly-once external effects or distributed ownership.

## Direct restricted-runtime embedding

Running the engine itself inside a restricted object runtime additionally requires a compatible build, injected storage/network implementations, and disabling or replacing unavailable native services. Those adapters must reuse the existing Neoism runtime rather than implement a second conversation engine.

That direct-host profile is not part of the native `EmbeddedAgent` API. Do not describe a proxy/coordinator deployment as direct engine embedding. The native embedding and Docker guides describe the executable deployment paths available now.