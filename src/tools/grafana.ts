export interface DashboardSummary {
  source: "live" | "mock";
  uid: string;
  title: string;
  panels: { title: string; type: string }[];
  url?: string;
}

const MOCK_DASHBOARDS: Record<string, DashboardSummary> = {
  "telecom-provisioning": {
    source: "mock",
    uid: "telecom-provisioning",
    title: "Telecom Provisioning - Health Overview",
    panels: [
      { title: "Request latency (p50/p95/p99)", type: "timeseries" },
      { title: "Error rate by carrier adapter", type: "timeseries" },
      { title: "Pod CPU / memory saturation", type: "heatmap" },
      { title: "Active provisioning jobs", type: "stat" },
    ],
  },
  "k8s-cluster-overview": {
    source: "mock",
    uid: "k8s-cluster-overview",
    title: "Kubernetes Cluster Overview",
    panels: [
      { title: "Node capacity vs. requested", type: "gauge" },
      { title: "Pod restarts (last 1h)", type: "timeseries" },
      { title: "Deployment rollout status", type: "table" },
    ],
  },
};

export async function getDashboardSummary(uid: string): Promise<DashboardSummary> {
  const baseUrl = process.env.MCP_GRAFANA_URL;
  const apiKey = process.env.MCP_GRAFANA_API_KEY;

  if (!baseUrl || !apiKey) {
    const mock = MOCK_DASHBOARDS[uid];
    if (!mock) {
      const available = Object.keys(MOCK_DASHBOARDS).join(", ");
      throw new Error(`Unknown mock dashboard uid "${uid}". Available: ${available}`);
    }
    return mock;
  }

  const url = new URL(`/api/dashboards/uid/${uid}`, baseUrl);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) {
    throw new Error(`Grafana request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as {
    dashboard: { uid: string; title: string; panels?: { title: string; type: string }[] };
    meta?: { url?: string };
  };

  return {
    source: "live",
    uid: body.dashboard.uid,
    title: body.dashboard.title,
    panels: (body.dashboard.panels ?? []).map((p) => ({ title: p.title, type: p.type })),
    url: body.meta?.url ? new URL(body.meta.url, baseUrl).toString() : undefined,
  };
}
