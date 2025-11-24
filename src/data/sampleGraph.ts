import { NestedGraph } from '@/types/graphTypes';
import { Position } from 'reactflow';

export const sampleGraph: NestedGraph = {
  id: 'root',
  nodes: [
    {
      id: 'root-1',
      label: 'Root Node 1',
      description: 'Top-level entry point of the system',
      position: { x: 50, y: 50 },
      innerGraph: {
        id: 'graph-1',
        nodes: [
          {
            id: 'child-1a',
            label: 'Child 1-A',
            description: 'Handles primary business logic',
            position: { x: 20, y: 20 },
            handles: [
              {
                id: 'child-1a-in',
                type: 'target',
                position: Position.Left,
                style: { top: 60 },
                label: 'Input',
              },
              {
                id: 'child-1a-out',
                type: 'source',
                position: Position.Right,
                style: { top: 20 },
                label: 'Primary Output',
              },
              {
                id: 'child-1a-out-2',
                type: 'source',
                position: Position.Right,
                style: { top: 100 },
                label: 'Secondary Output',
              },
            ],
            innerGraph: {
              id: 'graph-1a',
              nodes: [
                {
                  id: 'grandchild-1',
                  label: 'Grandchild 1',
                  description: 'Leaf node that fetches analytics',
                  position: { x: 10, y: 10 },
                  handles: [
                    {
                      id: 'grandchild-1-input',
                      type: 'target',
                      position: Position.Left,
                      style: { top: 30 },
                      label: 'Input',
                    },
                    {
                      id: 'grandchild-1-output',
                      type: 'source',
                      position: Position.Right,
                      style: { top: 30 },
                      label: 'Output',
                    },
                  ],
                },
              ],
              edges: [],
            },
          },
          {
            id: 'child-1b',
            label: 'Child 1-B',
            description: 'Secondary flow without children',
            position: { x: 150, y: 100 },
            handles: [
              {
                id: 'child-1b-in-top',
                type: 'target',
                position: Position.Top,
                style: { left: '30%' },
                label: 'Upper In',
              },
              {
                id: 'child-1b-in-bottom',
                type: 'target',
                position: Position.Bottom,
                style: { left: '70%' },
                label: 'Lower In',
              },
              {
                id: 'child-1b-out',
                type: 'source',
                position: Position.Right,
                style: { top: 80 },
                label: 'Dispatch',
              },
            ],
          },
        ],
        edges: [{ id: 'e1a-1b', source: 'child-1a', target: 'child-1b' }],
      },
      handles: [
        {
          id: 'root-1-target',
          type: 'target',
          position: Position.Left,
          style: { top: 50 },
          label: 'Inbound',
        },
        {
          id: 'root-1-source-primary',
          type: 'source',
          position: Position.Right,
          style: { top: 20 },
          label: 'Primary Out',
        },
        {
          id: 'root-1-source-secondary',
          type: 'source',
          position: Position.Right,
          style: { top: 90 },
          label: 'Secondary Out',
        },
      ],
    },
    {
      id: 'root-2',
      label: 'Root Node 2',
      description: 'Acts as the orchestrator',
      position: { x: 300, y: 150 },
      handles: [
        {
          id: 'root-2-in',
          type: 'target',
          position: Position.Left,
          style: { top: 40 },
          label: 'Input',
        },
        {
          id: 'root-2-out',
          type: 'source',
          position: Position.Right,
          style: { top: 40 },
          label: 'Output',
        },
      ],
    },
    {
      id: 'root-3',
      label: 'Root Node 3',
      description: 'Represents an experimental branch',
      position: { x: 100, y: 250 },
      handles: [
        {
          id: 'root-3-in',
          type: 'target',
          position: Position.Top,
          label: 'Top In',
        },
        {
          id: 'root-3-out-top',
          type: 'source',
          position: Position.Right,
          style: { top: 20 },
          label: 'Top Out',
        },
        {
          id: 'root-3-out-bottom',
          type: 'source',
          position: Position.Bottom,
          style: { left: '60%' },
          label: 'Bottom Out',
        },
      ],
    },
  ],
  edges: [
    { id: 'e1-2', source: 'root-1', target: 'root-2', label: 'to node 2' },
    { id: 'e1-3', source: 'root-1', target: 'root-3', label: 'to node 3' },
  ],
};
