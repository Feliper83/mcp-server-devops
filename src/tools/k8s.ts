import * as k8s from "@kubernetes/client-node";

export interface PodStatus {
  name: string;
  namespace: string;
  phase: string;
  ready: string;
  restarts: number;
  node: string;
}

const MOCK_PODS: PodStatus[] = [
  { name: "provisioning-api-7f9c6d-abc12", namespace: "telecom", phase: "Running", ready: "1/1", restarts: 0, node: "ip-10-0-1-21" },
  { name: "provisioning-api-7f9c6d-def34", namespace: "telecom", phase: "Running", ready: "1/1", restarts: 2, node: "ip-10-0-1-45" },
  { name: "nokia-adapter-6c8b5f-ghi56", namespace: "telecom", phase: "CrashLoopBackOff", ready: "0/1", restarts: 14, node: "ip-10-0-1-21" },
  { name: "auth-service-9d4e2a-jkl78", namespace: "auth", phase: "Running", ready: "1/1", restarts: 0, node: "ip-10-0-1-33" },
];

function isRealClusterConfigured(): boolean {
  return Boolean(process.env.KUBECONFIG) || Boolean(process.env.MCP_K8S_IN_CLUSTER);
}

async function listPodsFromCluster(namespace?: string): Promise<PodStatus[]> {
  const kc = new k8s.KubeConfig();
  if (process.env.MCP_K8S_IN_CLUSTER) {
    kc.loadFromCluster();
  } else {
    kc.loadFromDefault();
  }
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const res = namespace
    ? await api.listNamespacedPod({ namespace })
    : await api.listPodForAllNamespaces();

  return res.items.map((pod) => {
    const containerStatuses = pod.status?.containerStatuses ?? [];
    const readyCount = containerStatuses.filter((c) => c.ready).length;
    const restarts = containerStatuses.reduce((sum, c) => sum + (c.restartCount ?? 0), 0);
    return {
      name: pod.metadata?.name ?? "unknown",
      namespace: pod.metadata?.namespace ?? "unknown",
      phase: pod.status?.phase ?? "Unknown",
      ready: `${readyCount}/${containerStatuses.length}`,
      restarts,
      node: pod.spec?.nodeName ?? "unknown",
    };
  });
}

export async function getPodStatus(namespace?: string): Promise<{ source: "cluster" | "mock"; pods: PodStatus[] }> {
  if (isRealClusterConfigured()) {
    try {
      const pods = await listPodsFromCluster(namespace);
      return { source: "cluster", pods };
    } catch (err) {
      throw new Error(
        `Failed to query Kubernetes cluster (KUBECONFIG is set but connection failed): ${(err as Error).message}`
      );
    }
  }
  const pods = namespace ? MOCK_PODS.filter((p) => p.namespace === namespace) : MOCK_PODS;
  return { source: "mock", pods };
}
