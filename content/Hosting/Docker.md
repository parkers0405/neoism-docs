# Docker

The Neoism repository includes a Docker image that contains the native workspace daemon, Agent executable, and browser Agent assets. Its default command starts the workspace daemon on port 9876. To host only the Agent API, override that command and health check as shown below. The Agent inside the container is the same runtime used by native and embedded hosts.

## Build the image

From a checkout of the Neoism repository, initialize the pinned documentation submodule and build:

```sh
git submodule update --init --recursive vendor/neoism-docs
docker build -t neoism-local:current .
```

The current root Dockerfile installs an x86-64 editor archive; use a Linux amd64 builder/host for this recipe. Building compiles the native binaries and requires substantial memory and disk. This is a source-build recipe, not a claim that a public image with this tag exists.

## Run only the Agent API

Set `NEOISM_AGENT_TOKEN` in your shell or secret manager to a strong installation token, then run:

```sh
: "${NEOISM_AGENT_TOKEN:?Set a strong installation token first}"

docker run -d --name neoism-agent \
  --restart unless-stopped \
  --stop-timeout 40 \
  -p 127.0.0.1:4096:4096 \
  -e NEOISM_AGENT_TOKEN \
  -e NEOISM_AGENT_STATE_DIR=/var/lib/neoism/state/agent \
  -e NEOISM_AGENT_AUTH_PATH=/var/lib/neoism/state/agent/auth.json \
  -e XDG_CONFIG_HOME=/var/lib/neoism/config \
  --mount source=neoism-state,target=/var/lib/neoism/state \
  --mount source=neoism-workspaces,target=/var/lib/neoism/workspaces \
  --mount source=neoism-data,target=/var/lib/neoism/data \
  --mount source=neoism-config,target=/var/lib/neoism/config \
  --workdir /var/lib/neoism/workspaces \
  --health-cmd='curl -fsS http://127.0.0.1:4096/v2/health || exit 1' \
  neoism-local:current \
  neoism-agent serve --hostname 0.0.0.0 --port 4096
```

The container binds all of its interfaces, but the published host port is loopback-only. Do not change the host binding to a public interface without authenticated TLS ingress and a reviewed execution boundary. In production, use your platform's secret delivery rather than placing credentials in source control. Docker environment values are visible to administrators who can inspect the container.

The named volumes and explicit credential/configuration paths preserve state, provider credentials, user configuration, and workspaces across replacement containers. The Agent's user configuration is under `/var/lib/neoism/config/agent`. Docker initializes new named volumes from the image's owned directories. Existing bind mounts or volumes must be writable by the image's `neoism` user; do not solve permissions by making the entire container privileged.

## Connect and configure

```sh
curl --fail http://127.0.0.1:4096/v2/health
curl --fail \
  -H "Authorization: Bearer ${NEOISM_AGENT_TOKEN}" \
  http://127.0.0.1:4096/v2/meta
```

Point the SDK at `http://127.0.0.1:4096` with the configured bearer token. Configure model providers using the supported [[Providers]] and [[Configure]] mechanisms. Session directories are paths inside the container, such as `/var/lib/neoism/workspaces/project`, not paths on the client machine. Mount only the repositories and data the agent should access. Install required build tools in a derived image rather than assuming they exist in the base runtime.

To use the bundled browser interface, add `--web` to the `serve` command. To host the full workspace daemon instead, retain the image's default command, publish its port 9876 only to a trusted interface, and use daemon-specific authentication and connection instructions.

## Operations and isolation

- Use one active process per Agent database. Do not scale replicas by pointing multiple processes at the same local database volume.
- Allow orderly shutdown before replacement. Claimed model turns resume from saved history after restart, but external effects are not exactly-once and live subprocesses are not restored by that continuation.
- Back up database, artifact, configuration, and required workspace data consistently. Prefer an orderly stopped-volume snapshot unless your backup method explicitly supports the active database format.
- Keep container control sockets, host credentials, and unrelated filesystem mounts out of agent reach. Never mount the Docker socket merely to let the agent run commands.
- A container is not the documented production VM isolation guarantee for mutually untrusted workspace tenants. Use the strict control-plane and isolated-worker architecture for that deployment model.
- A restart policy restarts a process; it does not deduplicate external tool effects or resume arbitrary interrupted work.

No Azure/AWS provisioning is required by this recipe. Companies choose their container platform, ingress, volumes, secret manager, and backup policy. See [[Durable Objects]] for coordinating native workers from an object-based application.