import { memo, PointerEvent as ReactPointerEvent, MouseEvent } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CustomNodeData } from '@/types/graphTypes';
import { NestedGraphEditor } from '@/components/NestedGraphEditor/NestedGraphEditor';
import './CustomNode.css';

export const CustomNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const { label, isExpanded, onExpand, innerGraph, path } = data;

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
    console.log('[CustomNode] inner pointer down', {
      path,
      targetClass: target?.className ?? 'unknown',
      paneHit: Boolean(interactedPane),
      nodeHit: Boolean(interactedNode),
      innerNode: isInnerNode,
      innerPane: isInnerPane,
      stopped: shouldStop,
    });
    if (shouldStop) {
      event.stopPropagation();
    }
  };

  const handleHeaderClick = (event: MouseEvent) => {
    event.stopPropagation();
    console.log('[CustomNode] Header clicked:', data);
    if (onExpand) {
      onExpand();
    }
  };

  return (
    <div className={`custom-node-body ${isExpanded ? 'expanded' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div
        className={`node-header ${isExpanded ? 'expanded' : ''}`}
        onClick={handleHeaderClick}
        style={{ cursor: 'pointer' }}
      >
        {label}
      </div>
      <div className={`node-content ${isExpanded ? 'expanded' : ''}`} aria-hidden={!isExpanded}>
        <div
          className={`inner-flow-wrapper ${isExpanded ? 'expanded' : ''}`}
          onPointerDown={handleInnerPointerDown}
        >
          {innerGraph && (
            <NestedGraphEditor initialGraph={innerGraph} parentPath={data.path} />
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
