import { createContext } from 'react';
import type { NodeChange, NodeMouseHandler } from 'reactflow';

import type { ChildGraphLayout, GraphData } from '../graphData';

export type NestedGraphContextValue = {
  buildNodes: (graph: GraphData, parentPath: string) => GraphData['nodes'];
  onNodeClick: NodeMouseHandler;
  onNestedNodesChange?: (
    parentPath: string,
    changes: NodeChange[],
    layout?: ChildGraphLayout,
  ) => void;
};

export const NestedGraphContext =
  createContext<NestedGraphContextValue | null>(null);
