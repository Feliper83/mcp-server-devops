#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getPodStatus } from "./tools/k8s.js";
import { queryPrometheus } from "./tools/prometheus.js";
import { getDashboardSummary } from "./tools/grafana.js";

const server = new McpServer({
  name: "mcp-server-devops",
  version: "0.1.0",
});

server.registerTool(
  "k8s_pod_status",
  {
    title: "Kubernetes Pod Status",
    description:
      "List pod status (phase, readiness, restarts, node) for a Kubernetes cluster. " +
      "Connects to a real cluster when KUBECONFIG or MCP_K8S_IN_CLUSTER is set; otherwise returns " +
      "realistic mock data for a telecom provisioning platform so the tool is demoable without infra.",
    inputSchema: {
      namespace: z.string().optional().describe("Restrict results to this namespace."),
    },
  },
  async ({ namespace }) => {
    const result = await getPodStatus(namespace);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "prometheus_query",
  {
    title: "Prometheus Instant Query",
    description:
      "Run a PromQL instant query against Prometheus. Connects to a real Prometheus instance when " +
      "MCP_PROMETHEUS_URL is set (optionally MCP_PROMETHEUS_TOKEN for bearer auth); otherwise returns " +
      "mock latency/error-rate/resource metrics so the tool is demoable without infra.",
    inputSchema: {
      query: z.string().describe("PromQL expression, e.g. histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"),
    },
  },
  async ({ query }) => {
    const result = await queryPrometheus(query);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "grafana_dashboard_summary",
  {
    title: "Grafana Dashboard Summary",
    description:
      "Fetch a Grafana dashboard's title and panel list by UID. Connects to a real Grafana instance when " +
      "MCP_GRAFANA_URL and MCP_GRAFANA_API_KEY are set; otherwise returns mock dashboards " +
      '("telecom-provisioning", "k8s-cluster-overview") so the tool is demoable without infra.',
    inputSchema: {
      uid: z.string().describe("Dashboard UID, e.g. telecom-provisioning"),
    },
  },
  async ({ uid }) => {
    const result = await getDashboardSummary(uid);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-server-devops running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting mcp-server-devops:", err);
  process.exit(1);
});
