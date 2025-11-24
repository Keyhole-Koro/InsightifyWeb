import { NestedGraph } from '@/types/graphTypes';

export const sampleGraph: NestedGraph = {
  id: 'root',
  nodes: [
    {
      id: 'root-1',
      label: 'Root Node 1',
      position: { x: 50, y: 50 },
      innerGraph: {
        id: 'graph-1',
        nodes: [
          {
            id: 'child-1a',
            label: 'Child 1-A',
            position: { x: 20, y: 20 },
            innerGraph: {
              id: 'graph-1a',
              nodes: [
                { id: 'grandchild-1', label: 'Grandchild 1', position: { x: 10, y: 10 } },
              ],
              edges: [],
            },
          },
          { id: 'child-1b', label: 'Child 1-B', position: { x: 150, y: 100 } },
        ],
        edges: [{ id: 'e1a-1b', source: 'child-1a', target: 'child-1b' }],
      },
    },
    { id: 'root-2', label: 'Root Node 2', position: { x: 300, y: 150 } },
    { id: 'root-3', label: 'Root Node 3', position: { x: 100, y: 250 } },
  ],
  edges: [
    { id: 'e1-2', source: 'root-1', target: 'root-2', label: 'to node 2' },
    { id: 'e1-3', source: 'root-1', target: 'root-3', label: 'to node 3' },
  ],
};
