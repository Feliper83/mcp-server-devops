# mcp-server-devops

[![M8ven Score](https://m8ven.ai/badge/mcp/feliper83-mcp-server-devops-12qg2p?v=665580931045178e9ae18e73901b91dd)](https://m8ven.ai/mcp/feliper83-mcp-server-devops-12qg2p?s=readme)

An [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server that exposes Kubernetes, Prometheus, and
Grafana observability data as tools an AI assistant (Claude Code, Cursor, Claude Desktop) can call directly during a
conversation — "is this pod healthy", "what's p95 latency on the provisioning API", "summarize the cluster overview
dashboard" — without the human having to switch to `kubectl`, a PromQL console, or the Grafana UI.

## Why this exists

Built after years of running Kubernetes/Prometheus/Grafana observability stacks in production (telecom provisioning
platforms, authentication services). The goal is to let an AI coding assistant reason about live system state as part
of its context — e.g. "check if the last deploy caused a latency regression before we proceed" — instead of only
reasoning about source code.

## Tools exposed

| Tool | Description |
|---|---|
| `k8s_pod_status` | Lists pod phase, readiness, restart count, and node for a namespace (or the whole cluster). |
| `prometheus_query` | Runs a PromQL instant query and returns the raw result. |
| `grafana_dashboard_summary` | Fetches a dashboard's title and panel list by UID. |

## Mock mode vs. live mode

Every tool works out of the box with **no infrastructure** — if the relevant environment variables aren't set, it
returns realistic mock data (modeled after a telecom provisioning platform: pods, latency/error-rate metrics, and
dashboards). This makes the server demoable and testable without a real cluster.

Set the environment variables below to point a tool at a real backend:

| Variable | Tool | Purpose |
|---|---|---|
| `KUBECONFIG` | `k8s_pod_status` | Path to a kubeconfig file to query a real cluster. |
| `MCP_K8S_IN_CLUSTER` | `k8s_pod_status` | Set (any value) to use in-cluster service account auth instead of a kubeconfig. |
| `MCP_PROMETHEUS_URL` | `prometheus_query` | Base URL of a Prometheus server, e.g. `https://prometheus.internal`. |
| `MCP_PROMETHEUS_TOKEN` | `prometheus_query` | Optional bearer token for authenticated Prometheus instances. |
| `MCP_GRAFANA_URL` | `grafana_dashboard_summary` | Base URL of a Grafana instance. |
| `MCP_GRAFANA_API_KEY` | `grafana_dashboard_summary` | Grafana API key / service account token. |

## Install & build

```bash
npm install
npm run build
```

## Run standalone (for debugging)

```bash
npm run inspector
```

This launches the server behind the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector), a
web UI for calling tools manually without needing Claude/Cursor installed.

## Register with Claude Code

```bash
claude mcp add devops -- node /absolute/path/to/mcp-server-devops/dist/index.js
```

Or add it to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "devops": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-devops/dist/index.js"],
      "env": {
        "MCP_PROMETHEUS_URL": "https://prometheus.internal"
      }
    }
  }
}
```

## Register with Cursor / Claude Desktop

Add to `claude_desktop_config.json` (or Cursor's equivalent MCP settings):

```json
{
  "mcpServers": {
    "devops": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-devops/dist/index.js"]
    }
  }
}
```

## Project layout

```
src/
  index.ts           entrypoint: registers tools, starts the stdio transport
  tools/k8s.ts        Kubernetes pod status (real via @kubernetes/client-node, or mock)
  tools/prometheus.ts Prometheus instant query (real via HTTP API, or mock)
  tools/grafana.ts    Grafana dashboard summary (real via HTTP API, or mock)
```

## License

Proprietary — Copyright (c) 2026 Felipe Feres. All Rights Reserved.

This software is proprietary and confidential. No permission is granted to use,
copy, modify, or distribute it without the prior express written permission of
the owner. See [LICENSE](LICENSE) for full terms.
