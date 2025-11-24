import React, { CSSProperties } from 'react';
import { memo, PointerEvent as ReactPointerEvent, MouseEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CustomNodeData, NodeHandleConfig } from '@/types/graphTypes';
import { NestedGraphEditor } from '@/components/NestedGraphEditor/NestedGraphEditor';

import './CustomNode.css';

const buildDefaultHandles = (nodeId: string): NodeHandleConfig[] => [
  {
    id: `${nodeId}-default-target`,
    type: 'target',
    position: Position.Top,
    style: { left: '50%', transform: 'translateX(-50%)' },
  },
  {
    id: `${nodeId}-default-source`,
    type: 'source',
    position: Position.Bottom,
    style: { left: '50%', transform: 'translateX(-50%)' },
  },
];

export const CustomNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const { label, description, isExpanded, onExpand, innerGraph, path, handles, id } = data;
  const resolvedHandles = handles?.length ? handles : buildDefaultHandles(id);

  const handleInnerPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const wrapper = event.currentTarget;
    const interactedPane = target?.closest('.react-flow__pane');
    const interactedNode = target?.closest('.react-flow__node');
    const isInnerNode = Boolean(
      interactedNode && wrapper.contains(interactedNode as HTMLElement),
    );
    const isInnerPane = Boolean(
      interactedPane && wrapper.contains(interactedPane as HTMLElement),
    );
    const shouldStop = isInnerNode || isInnerPane;

    if (shouldStop) {
      event.stopPropagation();
    }
  };

  const handleHeaderClick = (event: MouseEvent) => {
    event.stopPropagation();
    // Only call the expand handler if innerGraph exists
    if (onExpand && innerGraph) {
      onExpand(path);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const renderHandles = () =>
    resolvedHandles.map((handleConfig) => (
      <Handle
        key={handleConfig.id}
        id={handleConfig.id}
        type={handleConfig.type}
        position={handleConfig.position ?? Position.Bottom}
        style={handleConfig.style as CSSProperties | undefined}
      />
    ));

  return (
    <div className={`custom-node-body ${isExpanded ? 'expanded' : ''}`}>
      {renderHandles()}
      <div
        className={`node-header ${isExpanded ? 'expanded' : ''}`}
        onClick={handleHeaderClick}
        style={{ cursor: innerGraph ? 'pointer' : 'default' }}
      >
        {label}
      </div>
      {description && <div className="node-description">{description}</div>}
      <div className={`node-content ${isExpanded ? 'expanded' : ''}`} aria-hidden={!isExpanded}>
        <div
          className={`inner-flow-wrapper ${isExpanded ? 'expanded' : ''}`}
          onPointerDown={handleInnerPointerDown}
          onWheel={handleWheel}
        >
          {innerGraph && (
            <NestedGraphEditor initialGraph={innerGraph} parentPath={data.path} />
          )}
        </div>
      </div>
    </div>
  );
});
