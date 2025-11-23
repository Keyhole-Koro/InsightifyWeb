import type { CSSProperties } from 'react';
import type { XYPosition } from 'reactflow';

import type { GraphData } from '../graphData';
import {
  BASE_NODE_HEIGHT,
  BASE_NODE_WIDTH,
  CHILD_NODE_HEIGHT,
  CHILD_NODE_WIDTH,
  CHILD_PADDING,
  PRIMARY_NODE_HEIGHT,
  PRIMARY_NODE_WIDTH,
  ROOT_LAYOUT_COLUMN_GAP,
  ROOT_LAYOUT_ROW_GAP,
  ROOT_ROW_GROUP_TOLERANCE,
} from './constants';

export type GraphDimensions = {
  width: number;
  height: number;
  minX: number;
  minY: number;
};

type LayoutCandidate = {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
};

const toNumeric = (value?: CSSProperties['width']): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const planRootNodePositions = (
  nodes: GraphData['nodes'],
): Record<string, XYPosition> | null => {
  if (nodes.length === 0) {
    return null;
  }

  const candidates: LayoutCandidate[] = nodes.map((node) => {
    const width =
      toNumeric(node.style?.width) ??
      node.data.size?.width ??
      BASE_NODE_WIDTH;
    const height =
      toNumeric(node.style?.height) ??
      node.data.size?.height ??
      BASE_NODE_HEIGHT;

    return {
      id: node.id,
      width,
      height,
      x: node.position.x,
      y: node.position.y,
      originalX: node.position.x,
      originalY: node.position.y,
    };
  });

  const rows: LayoutCandidate[][] = [];
  candidates
    .slice()
    .sort((a, b) =>
      a.y === b.y ? a.x - b.x : a.y - b.y,
    )
    .forEach((candidate) => {
      const lastRow = rows[rows.length - 1];
      if (
        !lastRow ||
        Math.abs(candidate.y - lastRow[0].y) > ROOT_ROW_GROUP_TOLERANCE
      ) {
        rows.push([candidate]);
      } else {
        lastRow.push(candidate);
      }
    });

  let changed = false;

  rows.forEach((row) => {
    row.sort((a, b) => a.x - b.x);
    let cursorX: number | null = null;

    row.forEach((node) => {
      if (cursorX === null) {
        cursorX = node.x + node.width + ROOT_LAYOUT_COLUMN_GAP;
        return;
      }

      const requiredX = cursorX;
      if (node.x < requiredX) {
        node.x = requiredX;
        changed = true;
      }
      cursorX = node.x + node.width + ROOT_LAYOUT_COLUMN_GAP;
    });
  });

  let previousBottom = -Infinity;

  rows.forEach((row, index) => {
    const rowTop = Math.min(...row.map((node) => node.y));
    const rowBottom = Math.max(...row.map((node) => node.y + node.height));

    if (index === 0) {
      previousBottom = rowBottom;
      return;
    }

    const requiredTop = previousBottom + ROOT_LAYOUT_ROW_GAP;
    if (rowTop < requiredTop) {
      const delta = requiredTop - rowTop;
      row.forEach((node) => {
        node.y += delta;
      });
      previousBottom = rowBottom + delta;
      changed = true;
    } else {
      previousBottom = rowBottom;
    }
  });

  const updates = candidates.reduce<Record<string, XYPosition>>((acc, node) => {
    if (node.x !== node.originalX || node.y !== node.originalY) {
      acc[node.id] = { x: node.x, y: node.y };
    }
    return acc;
  }, {});

  if (!changed || Object.keys(updates).length === 0) {
    return null;
  }

  return updates;
};

export const computeGraphDimensions = (
  graph?: GraphData,
  nodesOverride?: GraphData['nodes'],
): GraphDimensions => {
  const nodes = nodesOverride ?? graph?.nodes;

  if (!nodes || nodes.length === 0) {
    return {
      width: BASE_NODE_WIDTH,
      height: BASE_NODE_HEIGHT,
      minX: 0,
      minY: 0,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const { x, y } = node.position;
    const nodeWidth =
      typeof node.style?.width === 'number'
        ? (node.style.width as number)
        : node.data.size?.width ?? CHILD_NODE_WIDTH;
    const nodeHeight =
      typeof node.style?.height === 'number'
        ? (node.style.height as number)
        : node.data.size?.height ?? CHILD_NODE_HEIGHT;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + nodeWidth);
    maxY = Math.max(maxY, y + nodeHeight);
  });

  const width = Math.max(maxX - minX + CHILD_PADDING, BASE_NODE_WIDTH);
  const height = Math.max(maxY - minY + CHILD_PADDING, BASE_NODE_HEIGHT);

  return { width, height, minX, minY };
};

export const resolveCollapsedSize = (
  node: GraphData['nodes'][number],
  isRoot: boolean,
  isPrimary: boolean,
) => {
  const fallbackWidth = isRoot
    ? isPrimary
      ? PRIMARY_NODE_WIDTH
      : BASE_NODE_WIDTH
    : CHILD_NODE_WIDTH;
  const fallbackHeight = isRoot
    ? isPrimary
      ? PRIMARY_NODE_HEIGHT
      : BASE_NODE_HEIGHT
    : CHILD_NODE_HEIGHT;

  const primaryWidth =
    isRoot && isPrimary ? node.data.primarySize?.width : undefined;
  const primaryHeight =
    isRoot && isPrimary ? node.data.primarySize?.height : undefined;

  const width =
    primaryWidth ??
    node.data.size?.width ??
    (typeof node.style?.width === 'number'
      ? (node.style.width as number)
      : undefined) ??
    fallbackWidth;
  const height =
    primaryHeight ??
    node.data.size?.height ??
    (typeof node.style?.height === 'number'
      ? (node.style.height as number)
      : undefined) ??
    fallbackHeight;

  return { width, height };
};

export const extractChildGraphs = (
  childGraph?: GraphData | GraphData[],
): GraphData[] => {
  if (!childGraph) {
    return [];
  }

  return Array.isArray(childGraph) ? childGraph : [childGraph];
};

export const buildChildGraphPath = (nodePath: string, index: number) =>
  `${nodePath}::${index}`;
