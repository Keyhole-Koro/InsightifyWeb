import { type MutableRefObject } from "react";
import { type Node } from "reactflow";

import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";

export interface UseHomeBootstrapRunnerOptions {
  setNodes: React.Dispatch<React.SetStateAction<Node<LLMInputNodeData>[]>>;
  nodeSeq: MutableRefObject<number>;
  msgSeq: MutableRefObject<number>;
  projectId: string | null;
  setProjectId: (value: string | null) => void;
  setInitError: (value: string | null) => void;
  isProjectNotFoundError: (message: string) => boolean;
  ensureActiveProject: () => Promise<{ projectId?: string }>;
}

export interface RestoreLatestTabResult {
  restored: boolean;
  runId: string;
  tabId: string;
  source: "server" | "local_cache";
}
