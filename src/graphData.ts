import type { Edge, Node } from 'reactflow';

export type NestableNodeData = {
  label: string;
  childGraph?: GraphData;
  onExpand?: () => void;
  isExpanded?: boolean;
  isPrimaryExpanded?: boolean;
  path?: string;
};

export type GraphData = {
  nodes: Node<NestableNodeData>[];
  edges: Edge[];
};

const qualifyChecklistGraph: GraphData = {
  nodes: [
    {
      id: 'research',
      position: { x: 0, y: 0 },
      data: { label: '課題ヒアリング' },
    },
    {
      id: 'budget',
      position: { x: 160, y: 60 },
      data: { label: '予算確認' },
    },
    {
      id: 'timeline',
      position: { x: 320, y: -20 },
      data: { label: 'スケジュール確認' },
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
      data: { label: 'フォーム入力' },
    },
    {
      id: 'enrich',
      position: { x: 160, y: 80 },
      data: { label: '属性付与' },
    },
    {
      id: 'assign',
      position: { x: 320, y: 0 },
      data: { label: '担当者アサイン' },
    },
    {
      id: 'qualify',
      position: { x: 500, y: 20 },
      data: { label: 'ニーズ確認', childGraph: qualifyChecklistGraph },
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
      data: { label: '企画' },
    },
    {
      id: 'creative',
      position: { x: 150, y: 70 },
      data: { label: 'クリエイティブ' },
    },
    {
      id: 'launch',
      position: { x: 310, y: 0 },
      data: { label: '出稿' },
    },
    {
      id: 'optimize',
      position: { x: 480, y: 50 },
      data: { label: '最適化' },
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
      data: { label: '取り込み' },
    },
    {
      id: 'transform',
      position: { x: 160, y: 80 },
      data: { label: '変換' },
    },
    {
      id: 'load',
      position: { x: 320, y: 0 },
      data: { label: 'ロード' },
    },
    {
      id: 'validate',
      position: { x: 480, y: 70 },
      data: { label: '検証' },
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
      data: { label: '優先度判定' },
    },
    {
      id: 'assign-owner',
      position: { x: 160, y: 70 },
      data: { label: 'オーナー設定' },
    },
    {
      id: 'notify',
      position: { x: 320, y: 0 },
      data: { label: '通知' },
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
      data: { label: '計画' },
    },
    {
      id: 'coding',
      position: { x: 160, y: 70 },
      data: { label: '実装' },
    },
    {
      id: 'code-review',
      position: { x: 320, y: 0 },
      data: { label: 'コードレビュー' },
    },
    {
      id: 'qa',
      position: { x: 480, y: 80 },
      data: { label: 'QA' },
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
      position: { x: 0, y: 0 },
      data: { label: 'キャンペーン' },
    },
    {
      id: 'ads',
      position: { x: 160, y: -40 },
      data: { label: '広告運用', childGraph: adsOpsGraph },
      type: 'nestable',
    },
    {
      id: 'webinar',
      position: { x: 160, y: 60 },
      data: { label: 'ウェビナー' },
    },
    {
      id: 'seo',
      position: { x: 320, y: 0 },
      data: { label: 'SEO' },
    },
    {
      id: 'nurture',
      position: { x: 500, y: 20 },
      data: { label: 'リード育成' },
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
      position: { x: 0, y: 0 },
      data: { label: 'ETL', childGraph: etlPipelineGraph },
      type: 'nestable',
    },
    {
      id: 'warehouse',
      position: { x: 160, y: 60 },
      data: { label: 'DWH' },
    },
    {
      id: 'dashboard',
      position: { x: 320, y: 0 },
      data: { label: 'Dashboard' },
    },
    {
      id: 'tracking',
      position: { x: 0, y: 120 },
      data: { label: '計測タグ' },
    },
    {
      id: 'model',
      position: { x: 320, y: 100 },
      data: { label: 'スコアリング' },
    },
    {
      id: 'experiment',
      position: { x: 480, y: 40 },
      data: { label: 'ABテスト' },
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
      position: { x: -80, y: -20 },
      data: { label: 'Prospect' },
    },
    {
      id: 'lead',
      position: { x: 80, y: 0 },
      data: { label: 'Lead', childGraph: leadJourneyGraph },
      type: 'nestable',
    },
    {
      id: 'mql',
      position: { x: 240, y: 100 },
      data: { label: 'MQL' },
    },
    {
      id: 'sql',
      position: { x: 400, y: 10 },
      data: { label: 'SQL' },
    },
    {
      id: 'demo',
      position: { x: 560, y: 80 },
      data: { label: 'デモ' },
    },
    {
      id: 'close',
      position: { x: 720, y: 0 },
      data: { label: '契約' },
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
      position: { x: 0, y: 0 },
      data: { label: 'レポート' },
    },
    {
      id: 'alert',
      position: { x: 160, y: 80 },
      data: { label: 'アラート' },
    },
    {
      id: 'playbook',
      position: { x: 320, y: 0 },
      data: { label: '対応手順', childGraph: playbookGraph },
      type: 'nestable',
    },
    {
      id: 'ticket',
      position: { x: 480, y: 70 },
      data: { label: '改善チケット' },
    },
    {
      id: 'feedback',
      position: { x: 320, y: 140 },
      data: { label: 'フィードバック' },
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
      data: { label: 'Backlog' },
    },
    {
      id: 'spec',
      position: { x: 160, y: 60 },
      data: { label: '仕様' },
    },
    {
      id: 'design',
      position: { x: 320, y: 0 },
      data: { label: 'デザイン' },
    },
    {
      id: 'dev',
      position: { x: 480, y: 80 },
      data: { label: '開発', childGraph: devCycleGraph },
      type: 'nestable',
    },
    {
      id: 'release',
      position: { x: 640, y: 0 },
      data: { label: 'リリース' },
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
      position: { x: 0, y: 50 },
      data: { label: 'Sales', childGraph: salesGraph },
      type: 'nestable',
    },
    {
      id: 'marketing',
      position: { x: 220, y: 0 },
      data: { label: 'Marketing', childGraph: marketingGraph },
      type: 'nestable',
    },
    {
      id: 'analytics',
      position: { x: 440, y: 70 },
      data: { label: 'Analytics', childGraph: analyticsGraph },
      type: 'nestable',
    },
    {
      id: 'insight',
      position: { x: 700, y: 10 },
      data: { label: 'Insights', childGraph: insightGraph },
      type: 'nestable',
    },
    {
      id: 'product',
      position: { x: 920, y: 60 },
      data: { label: 'Product', childGraph: productGraph },
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
