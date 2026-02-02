// Define types based on insightify/v1/pipeline.proto
export interface StartRunRequest {
  /**
   * The ID of the pipeline to start.
   * Corresponds to `pipeline_id` in proto.
   */
  pipelineId: string;

  /**
   * Parameters for the pipeline run.
   * Corresponds to `params` map<string, string> in proto.
   */
  params?: Record<string, string>;
}

export interface StartRunResponse {
  /**
   * The initial client view of the pipeline run.
   * Corresponds to `client_view` in proto.
   */
  clientView?: any; // Using any as ClientView structure is complex and defined in another file
}

const defaultBase =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8080";
const base = defaultBase.replace(/\/$/, "");

// Service: insightify.v1.PipelineService
// Method: StartRun
export const START_RUN_ENDPOINT = `${base}/insightify.v1.PipelineService/StartRun`;

/**
 * Starts a pipeline run using the Connect protocol.
 */
export async function startRun(
  request: StartRunRequest,
): Promise<StartRunResponse> {
  const res = await fetch(START_RUN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      // Try to parse JSON error details if available (common in Connect RPC)
      const errorJson = await res.json();
      detail = JSON.stringify(errorJson);
    } catch {
      // Fallback to text if JSON parsing fails
      const text = await res.text();
      if (text) detail = text;
    }
    throw new Error(`StartRun failed (${res.status}): ${detail}`);
  }

  const resJson = await res.json();
  console.log("startRun response:", resJson);

  return resJson as StartRunResponse;
}
