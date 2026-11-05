import { config } from 'zod/v4/core';
import '@scalar/api-reference/style.css';
import './scalar-reference.css';
import contract from '../reference/openapi.json';

// Configure Zod before importing Scalar and constructing any of its schemas.
// Even a caught eval probe creates a violation under strict script-src CSP.
config({ jitless: true });
const { createApiReference } = await import('@scalar/api-reference');

const labels: Record<string, string> = {
  system: 'System', plugins: 'Plugins', events: 'Events', sessions: 'Sessions',
  catalog: 'Models & tools', management: 'Management', artifacts: 'Artifacts',
  interactions: 'Permissions & questions', subagents: 'Subagents',
};

export function mountReference(container: HTMLElement, onReady: () => void): () => void {
  const mount = document.createElement('div');
  mount.className = 'scalar-scope';
  container.append(mount);
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const reference = createApiReference(mount, {
    content: {
      ...contract,
      info: {
        ...contract.info,
        title: 'Neoism Agent API',
        description: 'The versioned HTTP API for Neoism\'s local agent runtime.\n\n' +
          '## Connect to your server\n\nThe default local address is `http://127.0.0.1:4096`. This website is a reference, not a hosted agent service.\n\n' +
          'Authenticated requests use `Authorization: Bearer <token>`. Loopback servers may run in trusted mode; configured authentication still applies. Management endpoints require a local operator token.\n\n' +
          'Plugin capabilities can be optional at runtime. Discover what your server supports rather than assuming every capability is enabled.\n\n' +
          '## Build with Neoism\n\nRead the [product guides](/api/docs/), [TypeScript SDK](https://github.com/parkers0405/neoism/blob/main/neoism-agent/sdk/typescript/README.md), or [plugin architecture](https://github.com/parkers0405/neoism/blob/main/docs/plugins.md).',
      },
      servers: [{ url: 'http://127.0.0.1:4096', description: 'Default local agent server' }],
      tags: contract.tags.map(tag => ({ ...tag, 'x-displayName': labels[tag.name] ?? tag.name })),
    },
    theme: 'none',
    layout: 'modern',
    showSidebar: true,
    defaultOpenAllTags: true,
    expandAllResponses: true,
    withDefaultFonts: false,
    hideDarkModeToggle: true,
    forceDarkModeState: theme(),
    hideClientButton: true,
    hideTestRequestButton: true,
    persistAuth: false,
    agent: { disabled: true },
    mcp: { disabled: true },
    telemetry: false,
    showDeveloperTools: 'never',
    defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
    modelsSectionLabel: 'Schemas',
    documentDownloadType: 'json',
    onLoaded: () => { mount.setAttribute('data-ready', 'true'); onReady(); },
  });
  return () => {
    reference.destroy();
    mount.remove();
  };
}