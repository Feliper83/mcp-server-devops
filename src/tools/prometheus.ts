export interface PrometheusResult {
  source: "live" | "mock";
  query: string;
  resultType: string;
  result: unknown;
}

function mockResultFor(query: string): unknown {
  const lower = query.toLowerCase();
  if (lower.includes("latency") || lower.includes("duration")) {
    return [
      { metric: { service: "provisioning-api" }, value: [Math.floor(Date.now() / 1000), "0.182"] },
      { metric: { service: "auth-service" }, value: [Math.floor(Date.now() / 1000), "0.091"] },
    ];
  }
  if (lower.includes("error") || lower.includes("5xx")) {
    return [{ metric: { service: "nokia-adapter" }, value: [Math.floor(Date.now() / 1000), "0.027"] }];
  }
  if (lower.includes("cpu") || lower.includes("memory")) {
    return [
      { metric: { pod: "provisioning-api-7f9c6d-abc12" }, value: [Math.floor(Date.now() / 1000), "0.64"] },
      { metric: { pod: "nokia-adapter-6c8b5f-ghi56" }, value: [Math.floor(Date.now() / 1000), "0.97"] },
    ];
  }
  return [{ metric: {}, value: [Math.floor(Date.now() / 1000), "1"] }];
}

export async function queryPrometheus(query: string): Promise<PrometheusResult> {
  const baseUrl = process.env.MCP_PROMETHEUS_URL;

  if (!baseUrl) {
    return { source: "mock", query, resultType: "vector", result: mockResultFor(query) };
  }

  const url = new URL("/api/v1/query", baseUrl);
  url.searchParams.set("query", query);

  const headers: Record<string, string> = {};
  if (process.env.MCP_PROMETHEUS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.MCP_PROMETHEUS_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Prometheus query failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as {
    status: string;
    data: { resultType: string; result: unknown };
    error?: string;
  };
  if (body.status !== "success") {
    throw new Error(`Prometheus returned an error: ${body.error ?? "unknown error"}`);
  }

  return { source: "live", query, resultType: body.data.resultType, result: body.data.result };
}
