import type { Edge, Node } from 'reactflow';

export type NodeSize = {
  width: number;
  height: number;
};

export type ChildGraphLayout = {
  path: string;
  width: number;
  height: number;
  minX: number;
  minY: number;
};

export type NestableNodeData = {
  label: string;
  childGraph?: GraphData | GraphData[];
  onExpand?: () => void;
  isExpanded?: boolean;
  isPrimaryExpanded?: boolean;
  path?: string;
  size?: NodeSize;
  primarySize?: NodeSize;
  childLayouts?: ChildGraphLayout[];
};

export type GraphData = {
  nodes: Node<NestableNodeData>[];
  edges: Edge[];
};

const ROOT_NODE_SIZE: NodeSize = { width: 200, height: 90 };
const ROOT_PRIMARY_NODE_SIZE: NodeSize = { width: 260, height: 120 };
const CHILD_NODE_SIZE: NodeSize = { width: 180, height: 70 };
const GRANDCHILD_NODE_SIZE: NodeSize = { width: 150, height: 55 };
const GREAT_GRANDCHILD_NODE_SIZE: NodeSize = { width: 120, height: 45 };

const hearingDrillDownGraph: GraphData = {
  nodes: [
    {
      id: 'stakeholder-map',
      position: { x: 0, y: 0 },
      data: {
        label: '意思決定者整理',
        size: GREAT_GRANDCHILD_NODE_SIZE,
      },
    },
    {
      id: 'pain-deep-dive',
      position: { x: 160, y: 0 },
      data: {
        label: '課題深掘り',
        size: GREAT_GRANDCHILD_NODE_SIZE,
      },
    },
    {
      id: 'next-action',
      position: { x: 160, y: 160 },
      data: {
        label: '次アクション共有',
        size: GREAT_GRANDCHILD_NODE_SIZE,
      },
    },
  ],
  edges: [
    { id: 'stakeholder-pain', source: 'stakeholder-map', target: 'pain-deep-dive' },
    { id: 'pain-action', source: 'pain-deep-dive', target: 'next-action' },
  ],
};

const qualifyChecklistGraph: GraphData = {
  nodes: [
    {
      id: 'research',
      position: { x: 0, y: 0 },
      data: {
        label: '課題ヒアリング',
        childGraph: hearingDrillDownGraph,
        size: GREAT_GRANDCHILD_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'budget',
      position: { x: 180, y: 0 },
      data: { label: '予算確認', size: GREAT_GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'timeline',
      position: { x: 90, y: 160 },
      data: { label: 'スケジュール確認', size: GREAT_GRANDCHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'research-budget', source: 'research', target: 'budget' },
    { id: 'budget-timeline', source: 'budget', target: 'timeline' },
  ],
};

const leadJourneyGraph: GraphData = {
  nodes: [
    {
      id: 'capture',
      position: { x: 0, y: 0 },
      data: { label: 'フォーム入力', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'enrich',
      position: { x: 180, y: 0 },
      data: { label: '属性付与', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'assign',
      position: { x: 0, y: 170 },
      data: { label: '担当者アサイン', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'qualify',
      position: { x: 180, y: 170 },
      data: {
        label: 'ニーズ確認',
        childGraph: qualifyChecklistGraph,
        size: GRANDCHILD_NODE_SIZE,
      },
      type: 'nestable',
    },
  ],
  edges: [
    { id: 'capture-enrich', source: 'capture', target: 'enrich' },
    { id: 'enrich-assign', source: 'enrich', target: 'assign' },
    { id: 'assign-qualify', source: 'assign', target: 'qualify' },
  ],
};

const adsOpsGraph: GraphData = {
  nodes: [
    {
      id: 'brief',
      position: { x: 0, y: 0 },
      data: { label: '企画', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'creative',
      position: { x: 180, y: 0 },
      data: { label: 'クリエイティブ', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'launch',
      position: { x: 0, y: 170 },
      data: { label: '出稿', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'optimize',
      position: { x: 180, y: 170 },
      data: { label: '最適化', size: GRANDCHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'brief-creative', source: 'brief', target: 'creative' },
    { id: 'creative-launch', source: 'creative', target: 'launch' },
    { id: 'launch-optimize', source: 'launch', target: 'optimize' },
  ],
};

const etlPipelineGraph: GraphData = {
  nodes: [
    {
      id: 'ingest',
      position: { x: 0, y: 0 },
      data: { label: '取り込み', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'transform',
      position: { x: 180, y: 0 },
      data: { label: '変換', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'load',
      position: { x: 0, y: 170 },
      data: { label: 'ロード', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'validate',
      position: { x: 180, y: 170 },
      data: { label: '検証', size: GRANDCHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'ingest-transform', source: 'ingest', target: 'transform' },
    { id: 'transform-load', source: 'transform', target: 'load' },
    { id: 'load-validate', source: 'load', target: 'validate' },
  ],
};

const playbookGraph: GraphData = {
  nodes: [
    {
      id: 'triage',
      position: { x: 0, y: 0 },
      data: { label: '優先度判定', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'assign-owner',
      position: { x: 180, y: 0 },
      data: { label: 'オーナー設定', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'notify',
      position: { x: 90, y: 160 },
      data: { label: '通知', size: GRANDCHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'triage-assign-owner', source: 'triage', target: 'assign-owner' },
    { id: 'assign-owner-notify', source: 'assign-owner', target: 'notify' },
  ],
};

const devCycleGraph: GraphData = {
  nodes: [
    {
      id: 'planning',
      position: { x: 0, y: 0 },
      data: { label: '計画', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'coding',
      position: { x: 200, y: 0 },
      data: { label: '実装', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'code-review',
      position: { x: 0, y: 180 },
      data: { label: 'コードレビュー', size: GRANDCHILD_NODE_SIZE },
    },
    {
      id: 'qa',
      position: { x: 200, y: 180 },
      data: { label: 'QA', size: GRANDCHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'planning-coding', source: 'planning', target: 'coding' },
    { id: 'coding-code-review', source: 'coding', target: 'code-review' },
    { id: 'code-review-qa', source: 'code-review', target: 'qa' },
  ],
};

const marketingGraph: GraphData = {
  nodes: [
    {
      id: 'campaigns',
      position: { x: 180, y: 0 },
      data: { label: 'キャンペーン', size: CHILD_NODE_SIZE },
    },
    {
      id: 'ads',
      position: { x: 0, y: 180 },
      data: {
        label: '広告運用',
        childGraph: adsOpsGraph,
        size: CHILD_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'webinar',
      position: { x: 180, y: 180 },
      data: { label: 'ウェビナー', size: CHILD_NODE_SIZE },
    },
    {
      id: 'seo',
      position: { x: 360, y: 180 },
      data: { label: 'SEO', size: CHILD_NODE_SIZE },
    },
    {
      id: 'nurture',
      position: { x: 180, y: 360 },
      data: { label: 'リード育成', size: CHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'campaigns-nurture', source: 'campaigns', target: 'nurture' },
    { id: 'ads-nurture', source: 'ads', target: 'nurture' },
    { id: 'webinar-nurture', source: 'webinar', target: 'nurture' },
    { id: 'seo-nurture', source: 'seo', target: 'nurture' },
    { id: 'campaigns-ads', source: 'campaigns', target: 'ads' },
    { id: 'campaigns-webinar', source: 'campaigns', target: 'webinar' },
    { id: 'campaigns-seo', source: 'campaigns', target: 'seo' },
  ],
};

const analyticsGraph: GraphData = {
  nodes: [
    {
      id: 'etl',
      position: { x: 200, y: 0 },
      data: {
        label: 'ETL',
        childGraph: etlPipelineGraph,
        size: CHILD_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'warehouse',
      position: { x: 400, y: 200 },
      data: { label: 'DWH', size: CHILD_NODE_SIZE },
    },
    {
      id: 'dashboard',
      position: { x: 200, y: 400 },
      data: { label: 'Dashboard', size: CHILD_NODE_SIZE },
    },
    {
      id: 'tracking',
      position: { x: 0, y: 200 },
      data: { label: '計測タグ', size: CHILD_NODE_SIZE },
    },
    {
      id: 'model',
      position: { x: 0, y: 400 },
      data: { label: 'スコアリング', size: CHILD_NODE_SIZE },
    },
    {
      id: 'experiment',
      position: { x: 400, y: 400 },
      data: { label: 'ABテスト', size: CHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'etl-warehouse', source: 'etl', target: 'warehouse' },
    { id: 'warehouse-dashboard', source: 'warehouse', target: 'dashboard' },
    { id: 'tracking-etl', source: 'tracking', target: 'etl' },
    { id: 'warehouse-model', source: 'warehouse', target: 'model' },
    { id: 'dashboard-experiment', source: 'dashboard', target: 'experiment' },
    { id: 'model-experiment', source: 'model', target: 'experiment' },
  ],
};

const salesGraph: GraphData = {
  nodes: [
    {
      id: 'prospect',
      position: { x: 0, y: 0 },
      data: { label: 'Prospect', size: CHILD_NODE_SIZE },
    },
    {
      id: 'lead',
      position: { x: 220, y: 0 },
      data: {
        label: 'Lead',
        childGraph: leadJourneyGraph,
        size: CHILD_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'mql',
      position: { x: 440, y: 0 },
      data: { label: 'MQL', size: CHILD_NODE_SIZE },
    },
    {
      id: 'sql',
      position: { x: 0, y: 220 },
      data: { label: 'SQL', size: CHILD_NODE_SIZE },
    },
    {
      id: 'demo',
      position: { x: 220, y: 220 },
      data: { label: 'デモ', size: CHILD_NODE_SIZE },
    },
    {
      id: 'close',
      position: { x: 440, y: 220 },
      data: { label: '契約', size: CHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'prospect-lead', source: 'prospect', target: 'lead' },
    { id: 'lead-mql', source: 'lead', target: 'mql' },
    { id: 'mql-sql', source: 'mql', target: 'sql' },
    { id: 'sql-demo', source: 'sql', target: 'demo' },
    { id: 'demo-close', source: 'demo', target: 'close' },
  ],
};

const insightGraph: GraphData = {
  nodes: [
    {
      id: 'report',
      position: { x: 150, y: 0 },
      data: { label: 'レポート', size: CHILD_NODE_SIZE },
    },
    {
      id: 'alert',
      position: { x: 0, y: 180 },
      data: { label: 'アラート', size: CHILD_NODE_SIZE },
    },
    {
      id: 'playbook',
      position: { x: 300, y: 180 },
      data: {
        label: '対応手順',
        childGraph: playbookGraph,
        size: CHILD_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'ticket',
      position: { x: 150, y: 360 },
      data: { label: '改善チケット', size: CHILD_NODE_SIZE },
    },
    {
      id: 'feedback',
      position: { x: 300, y: 0 },
      data: { label: 'フィードバック', size: CHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'report-alert', source: 'report', target: 'alert' },
    { id: 'alert-playbook', source: 'alert', target: 'playbook' },
    { id: 'playbook-ticket', source: 'playbook', target: 'ticket' },
    { id: 'ticket-feedback', source: 'ticket', target: 'feedback' },
    { id: 'alert-feedback', source: 'alert', target: 'feedback' },
  ],
};

const productGraph: GraphData = {
  nodes: [
    {
      id: 'backlog',
      position: { x: 0, y: 0 },
      data: { label: 'Backlog', size: CHILD_NODE_SIZE },
    },
    {
      id: 'spec',
      position: { x: 220, y: 0 },
      data: { label: '仕様', size: CHILD_NODE_SIZE },
    },
    {
      id: 'design',
      position: { x: 440, y: 0 },
      data: { label: 'デザイン', size: CHILD_NODE_SIZE },
    },
    {
      id: 'dev',
      position: { x: 220, y: 220 },
      data: {
        label: '開発',
        childGraph: devCycleGraph,
        size: CHILD_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'release',
      position: { x: 440, y: 220 },
      data: { label: 'リリース', size: CHILD_NODE_SIZE },
    },
  ],
  edges: [
    { id: 'backlog-spec', source: 'backlog', target: 'spec' },
    { id: 'spec-design', source: 'spec', target: 'design' },
    { id: 'design-dev', source: 'design', target: 'dev' },
    { id: 'dev-release', source: 'dev', target: 'release' },
  ],
};

export const rootGraph: GraphData = {
  nodes: [
    {
      id: 'sales',
      position: { x: 0, y: 0 },
      data: {
        label: 'Sales',
        childGraph: salesGraph,
        size: ROOT_NODE_SIZE,
        primarySize: ROOT_PRIMARY_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'marketing',
      position: { x: 260, y: 0 },
      data: {
        label: 'Marketing',
        childGraph: marketingGraph,
        size: ROOT_NODE_SIZE,
        primarySize: ROOT_PRIMARY_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'analytics',
      position: { x: 520, y: 0 },
      data: {
        label: 'Analytics',
        childGraph: analyticsGraph,
        size: ROOT_NODE_SIZE,
        primarySize: ROOT_PRIMARY_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'insight',
      position: { x: 0, y: 260 },
      data: {
        label: 'Insights',
        childGraph: insightGraph,
        size: ROOT_NODE_SIZE,
        primarySize: ROOT_PRIMARY_NODE_SIZE,
      },
      type: 'nestable',
    },
    {
      id: 'product',
      position: { x: 260, y: 260 },
      data: {
        label: 'Product',
        childGraph: productGraph,
        size: ROOT_NODE_SIZE,
        primarySize: ROOT_PRIMARY_NODE_SIZE,
      },
      type: 'nestable',
    },
  ],
  edges: [
    { id: 'sales-marketing', source: 'sales', target: 'marketing' },
    { id: 'marketing-analytics', source: 'marketing', target: 'analytics' },
    { id: 'analytics-insight', source: 'analytics', target: 'insight' },
    { id: 'insight-product', source: 'insight', target: 'product' },
  ],
};
