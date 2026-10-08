import React, { useEffect, useMemo, useRef, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  AlignCenterOutlined,
  ApartmentOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloudOutlined,
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  FormOutlined,
  HistoryOutlined,
  LinkOutlined,
  LockOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RedoOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  StopOutlined,
  SyncOutlined,
  ToolOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import './index.less';

type NodeStatus = 'completed' | 'current' | 'pending';

type WorkflowNode = {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  status: NodeStatus;
};

type WorkflowEdge = {
  source: string;
  target: string;
  label?: string;
};

type WorkflowSnapshot = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

type AgentWorkflowConfig = {
  agentName: string;
  workflowName: string;
  nodeLabels: Partial<Record<string, string>>;
  edgeLabels?: Partial<Record<string, string>>;
};

type NodeDragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  initialNodes: WorkflowNode[];
  initialEdges: WorkflowEdge[];
};

type CanvasPanState = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
};

type DebugStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success';
  detail: string;
};

type WorkflowRunRecord = {
  id: string;
  workflowName: string;
  startedAt: string;
  duration: string;
  trigger: string;
  detail: string;
  status: 'success' | 'failed';
};

type WorkflowRiskLevel = 'high' | 'medium' | 'low';

type WorkflowReviewRisk = {
  id: string;
  level: WorkflowRiskLevel;
  clause: string;
  title: string;
  description: string;
  suggestion: string;
  source: string;
};

type WorkflowRunResult = {
  id: string;
  completedAt: string;
  duration: string;
  documentName: string;
  documentMeta: string;
  summary: string;
  conclusion: string;
  reportName: string;
  nextAction: string;
  riskCounts: Record<WorkflowRiskLevel, number>;
  risks: WorkflowReviewRisk[];
};

type StoredWorkflow = WorkflowSnapshot & {
  agentId: string;
  agentName: string;
  workflowName: string;
  savedAt: string;
};

type NodeConfig = {
  label: string;
  group: string;
  color: string;
  background: string;
  icon: React.ReactNode;
};

const NODE_CONFIG: Record<string, NodeConfig> = {
  start: { label: '开始', group: '基础与逻辑', color: '#059669', background: '#d1fae5', icon: <PlayCircleOutlined /> },
  input: { label: '输入', group: '基础与逻辑', color: '#64748b', background: '#f1f5f9', icon: <FormOutlined /> },
  condition: { label: '条件分支', group: '基础与逻辑', color: '#d97706', background: '#fef3c7', icon: <ApartmentOutlined /> },
  loop: { label: '循环 / 迭代', group: '基础与逻辑', color: '#0284c7', background: '#e0f2fe', icon: <SyncOutlined /> },
  llm: { label: 'LLM 大模型', group: '模型节点', color: '#4f46e5', background: '#e0e7ff', icon: <RobotOutlined /> },
  knowledge: { label: '知识库检索', group: '知识节点', color: '#059669', background: '#d1fae5', icon: <BookOutlined /> },
  document: { label: '文档解析', group: '知识节点', color: '#0284c7', background: '#e0f2fe', icon: <FileTextOutlined /> },
  api: { label: 'API 调用', group: '工具与智能体', color: '#0284c7', background: '#e0f2fe', icon: <CloudOutlined /> },
  mcp: { label: 'MCP 服务', group: '工具与智能体', color: '#0f766e', background: '#ccfbf1', icon: <ToolOutlined /> },
  agent: { label: '智能体 Agent', group: '工具与智能体', color: '#e11d48', background: '#ffe4e6', icon: <RobotOutlined /> },
  code: { label: '代码执行', group: '工具与智能体', color: '#334155', background: '#e2e8f0', icon: <CodeOutlined /> },
  output: { label: '文本输出', group: '输出节点', color: '#059669', background: '#d1fae5', icon: <SendOutlined /> },
  approval: { label: '人工确认', group: '输出节点', color: '#be123c', background: '#ffe4e6', icon: <SafetyCertificateOutlined /> },
};

const PALETTE_GROUPS = ['基础与逻辑', '模型节点', '知识节点', '工具与智能体', '输出节点'];

const INITIAL_NODES: WorkflowNode[] = [
  { id: 'wf1', type: 'start', label: '流程开始', x: 60, y: 120, status: 'completed' },
  { id: 'wf2', type: 'input', label: '合同文件输入', x: 350, y: 120, status: 'completed' },
  { id: 'wf3', type: 'llm', label: '意图识别与路由', x: 640, y: 120, status: 'current' },
  { id: 'wf4', type: 'knowledge', label: '金融合同知识库检索', x: 930, y: 120, status: 'pending' },
  { id: 'wf5', type: 'condition', label: '风险等级判断', x: 1220, y: 120, status: 'pending' },
  { id: 'wf6', type: 'agent', label: '合同审查 Agent', x: 930, y: 360, status: 'pending' },
  { id: 'wf7', type: 'mcp', label: '内部风险 API', x: 1220, y: 360, status: 'pending' },
  { id: 'wf8', type: 'loop', label: '多轮校验循环', x: 930, y: 590, status: 'pending' },
  { id: 'wf9', type: 'agent', label: '多智能体协同编排', x: 930, y: 820, status: 'pending' },
  { id: 'wf10', type: 'llm', label: '生成审查报告', x: 930, y: 1050, status: 'pending' },
  { id: 'wf11', type: 'code', label: '结构化输出格式化', x: 930, y: 1280, status: 'pending' },
  { id: 'wf12', type: 'output', label: '返回结果', x: 930, y: 1510, status: 'pending' },
  { id: 'wf13', type: 'approval', label: '人工复核闸门', x: 1510, y: 360, status: 'pending' },
];

const INITIAL_EDGES: WorkflowEdge[] = [
  { source: 'wf1', target: 'wf2' },
  { source: 'wf2', target: 'wf3' },
  { source: 'wf3', target: 'wf4' },
  { source: 'wf4', target: 'wf5' },
  { source: 'wf5', target: 'wf6', label: '高风险' },
  { source: 'wf5', target: 'wf7', label: '低风险' },
  { source: 'wf6', target: 'wf8' },
  { source: 'wf7', target: 'wf13', label: '需人工确认' },
  { source: 'wf13', target: 'wf8' },
  { source: 'wf8', target: 'wf9' },
  { source: 'wf9', target: 'wf10' },
  { source: 'wf10', target: 'wf11' },
  { source: 'wf11', target: 'wf12' },
];

const AGENT_WORKFLOW_CONFIGS: Record<string, AgentWorkflowConfig> = {
  AG001: {
    agentName: '政务问答智能体',
    workflowName: '政务问答服务编排',
    nodeLabels: {
      wf2: '用户问题输入',
      wf3: '问题意图识别',
      wf4: '政务知识库检索',
      wf5: '是否需要办理引导',
      wf6: '政务问答 Agent',
      wf7: '办事指南 API',
      wf8: '答案质量校验',
      wf9: '政务服务协同',
      wf10: '生成答复',
      wf11: '引用与格式化',
      wf12: '返回政务答复',
      wf13: '人工转接',
    },
    edgeLabels: { 'wf5-wf6': '需要引导', 'wf5-wf7': '直接问答', 'wf7-wf13': '需人工确认' },
  },
  AG002: {
    agentName: '客户服务智能体',
    workflowName: '客户服务工单编排',
    nodeLabels: {
      wf2: '客户问题输入',
      wf3: '意图分类与优先级',
      wf4: '客服知识库检索',
      wf5: '是否需要转人工',
      wf6: '客服 Agent',
      wf7: 'CRM 工单 API',
      wf8: '回复质量校验',
      wf9: '多轮客服协同',
      wf10: '生成服务回复',
      wf11: '工单格式化',
      wf12: '返回客户回复',
      wf13: '人工客服接管',
    },
    edgeLabels: { 'wf5-wf6': '自动处理', 'wf5-wf7': '需要建单', 'wf7-wf13': '高优先级' },
  },
  AG003: {
    agentName: '数据分析智能体',
    workflowName: '数据分析报告编排',
    nodeLabels: {
      wf2: '数据文件输入',
      wf3: '分析指标识别',
      wf4: '行业报告检索',
      wf5: '是否需要计算',
      wf6: '数据分析 Agent',
      wf7: '数据分析 API',
      wf8: '分析结果校验',
      wf9: '分析任务协同',
      wf10: '生成分析报告',
      wf11: '图表与格式化',
      wf12: '返回分析结果',
      wf13: '人工复核闸门',
    },
    edgeLabels: { 'wf5-wf6': '已有指标', 'wf5-wf7': '需要计算', 'wf7-wf13': '异常数据' },
  },
  AG004: {
    agentName: '风险预警智能体',
    workflowName: '企业风险预警编排',
    nodeLabels: {
      wf2: '企业数据输入',
      wf3: '风险事件识别',
      wf4: '法规政策库检索',
      wf5: '风险等级判断',
      wf6: '风险研判 Agent',
      wf7: '风险处置 API',
      wf8: '预警结果校验',
      wf9: '风险处置协同',
      wf10: '生成预警报告',
      wf11: '预警信息格式化',
      wf12: '推送风险预警',
      wf13: '人工复核闸门',
    },
    edgeLabels: { 'wf5-wf6': '高风险', 'wf5-wf7': '低风险', 'wf7-wf13': '需人工确认' },
  },
  AG005: {
    agentName: '代码生成智能体',
    workflowName: '代码生成与校验编排',
    nodeLabels: {
      wf2: '开发需求输入',
      wf3: '需求意图识别',
      wf4: '技术文档检索',
      wf5: '是否需要执行验证',
      wf6: '代码生成 Agent',
      wf7: '代码执行 API',
      wf8: '代码质量校验',
      wf9: '多智能体代码协同',
      wf10: '生成代码说明',
      wf11: '代码结构化输出',
      wf12: '返回代码结果',
      wf13: '人工复核闸门',
    },
    edgeLabels: { 'wf5-wf6': '无需执行', 'wf5-wf7': '需要验证', 'wf7-wf13': '验证失败' },
  },
  AG006: {
    agentName: '合同审查智能体',
    workflowName: '合同审查与风险识别编排',
    nodeLabels: {
      wf2: '合同文件输入',
      wf3: '合同结构解析',
      wf4: '合同条款知识库检索',
      wf5: '合同风险等级判断',
      wf6: '合同审查 Agent',
      wf7: '合同风险 API',
      wf8: '条款一致性校验',
      wf9: '法务多智能体协同',
      wf10: '生成合同审查意见',
      wf11: '风险清单结构化',
      wf12: '返回合同审查报告',
      wf13: '法务人工复核',
    },
    edgeLabels: { 'wf5-wf6': '低风险', 'wf5-wf7': '高风险', 'wf7-wf13': '需人工确认' },
  },
};

const INITIAL_WORKFLOW_RECORDS: Record<string, WorkflowRunRecord[]> = {
  AG006: [
    {
      id: 'RUN-AG006-003',
      workflowName: '合同审查与风险识别编排',
      startedAt: '2026-09-14 11:18:32',
      duration: '18.6s',
      trigger: '手动运行',
      detail: '采购合同-华东区域服务协议.docx，识别 3 项高风险条款，已生成审查报告。',
      status: 'success',
    },
    {
      id: 'RUN-AG006-002',
      workflowName: '合同审查与风险识别编排',
      startedAt: '2026-09-14 10:42:16',
      duration: '21.3s',
      trigger: 'API 调用',
      detail: '供应商年度采购合同.pdf，完成 28 个条款比对，进入法务人工复核。',
      status: 'success',
    },
    {
      id: 'RUN-AG006-001',
      workflowName: '合同审查与风险识别编排',
      startedAt: '2026-09-13 16:07:45',
      duration: '8.1s',
      trigger: '手动运行',
      detail: '劳动合同模板.docx，文件解析失败，未生成审查结果。',
      status: 'failed',
    },
  ],
};

const CONTRACT_REVIEW_RISKS: WorkflowReviewRisk[] = [
  {
    id: 'risk-payment-condition',
    level: 'high',
    clause: '第 4.2 条 · 付款条件',
    title: '付款触发条件不够明确',
    description: '合同约定“验收合格后付款”，但未明确验收材料、审批时限及付款起算时间，可能引发付款争议。',
    suggestion: '补充验收单、发票及付款申请为付款前置材料，并明确审批完成后 30 日内付款。',
    source: '《民法典》合同编 · 第五百零九条',
  },
  {
    id: 'risk-delivery-breach',
    level: 'medium',
    clause: '第 7.1 条 · 违约责任',
    title: '逾期交付责任边界不清',
    description: '仅约定按日计收违约金，未区分不可抗力、采购方原因和供应商原因导致的延期情形。',
    suggestion: '增加延期原因认定、通知时限和违约金上限，避免责任条款执行口径不一致。',
    source: '《民法典》合同编 · 第五百九十条',
  },
  {
    id: 'risk-acceptance-standard',
    level: 'medium',
    clause: '第 9.3 条 · 验收标准',
    title: '技术指标与验收口径存在缺口',
    description: '技术附件列明了性能指标，但验收条款未说明检测方法、样本数量和不合格处理方式。',
    suggestion: '按技术响应表补充检测工具、测试场景、合格阈值及整改复验流程。',
    source: '合同技术附件 · 验收要求第 3.2 款',
  },
];

function createWorkflowRunResult(agentId: string, runId: string, nodeCount: number): WorkflowRunResult {
  const completedAt = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/\//g, '-');

  if (agentId === 'AG006') {
    return {
      id: runId,
      completedAt,
      duration: '1.6s',
      documentName: '采购合同-华东区域服务协议.docx',
      documentMeta: 'DOCX · 2.4 MB · 已解析 28 个条款',
      summary: '已完成合同结构解析、条款比对和风险识别，发现 3 项需要人工复核的风险事项。',
      conclusion: '建议修订后再签署',
      reportName: '采购合同-华东区域服务协议-审查报告.docx',
      nextAction: '请先处理高风险付款条款，再提交法务人工复核；修改内容会自动留痕并回写运行记录。',
      riskCounts: { high: 1, medium: 2, low: 0 },
      risks: CONTRACT_REVIEW_RISKS,
    };
  }

  return {
    id: runId,
    completedAt,
    duration: '1.6s',
    documentName: `${agentId} 工作流输入`,
    documentMeta: `已执行 ${nodeCount} 个节点 · 输出节点已完成`,
    summary: '工作流已执行完成，输出内容已生成，可在运行记录中继续追踪本次执行。',
    conclusion: '执行成功',
    reportName: `${agentId}-workflow-output.json`,
    nextAction: '可打开调试面板查看节点执行轨迹，或保存当前工作流版本。',
    riskCounts: { high: 0, medium: 0, low: 0 },
    risks: [],
  };
}

const EMPTY_WORKFLOW: WorkflowSnapshot = { nodes: [], edges: [] };
const SAVED_WORKFLOWS_STORAGE_KEY = 'ai-agent-saved-workflows';
const SAVED_WORKFLOW_RECORDS_STORAGE_KEY = 'ai-agent-saved-workflow-records';

function readStorageMap<T>(key: string): Record<string, T> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Record<string, T> : {};
  } catch {
    return {};
  }
}

function cloneWorkflowSnapshot(snapshot: WorkflowSnapshot): WorkflowSnapshot {
  return {
    nodes: snapshot.nodes.map((node) => ({ ...node })),
    edges: snapshot.edges.map((edge) => ({ ...edge })),
  };
}

function readSavedWorkflow(agentId: string): StoredWorkflow | null {
  const workflow = readStorageMap<StoredWorkflow>(SAVED_WORKFLOWS_STORAGE_KEY)[agentId];
  if (!workflow || !Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) return null;
  return {
    ...workflow,
    ...cloneWorkflowSnapshot(workflow),
  };
}

function persistSavedWorkflow(workflow: StoredWorkflow) {
  if (typeof window === 'undefined') return;
  try {
    const workflows = readStorageMap<StoredWorkflow>(SAVED_WORKFLOWS_STORAGE_KEY);
    workflows[workflow.agentId] = workflow;
    window.localStorage.setItem(SAVED_WORKFLOWS_STORAGE_KEY, JSON.stringify(workflows));
  } catch {
    // 浏览器存储不可用时仍保留当前页面内的工作流状态。
  }
}

function readSavedWorkflowRecords(agentId: string) {
  const records = readStorageMap<WorkflowRunRecord[]>(SAVED_WORKFLOW_RECORDS_STORAGE_KEY)[agentId];
  return Array.isArray(records) ? records : [];
}

function persistSavedWorkflowRecords(agentId: string, records: WorkflowRunRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    const recordMap = readStorageMap<WorkflowRunRecord[]>(SAVED_WORKFLOW_RECORDS_STORAGE_KEY);
    recordMap[agentId] = records;
    window.localStorage.setItem(SAVED_WORKFLOW_RECORDS_STORAGE_KEY, JSON.stringify(recordMap));
  } catch {
    // 浏览器存储不可用时仍保留当前页面内的记录。
  }
}

function getAgentWorkflowConfig(agentId: string) {
  return AGENT_WORKFLOW_CONFIGS[agentId] || null;
}

function createWorkflowSnapshot(config: AgentWorkflowConfig): WorkflowSnapshot {
  return {
    nodes: INITIAL_NODES.map((node) => ({
      ...node,
      label: config.nodeLabels[node.id] || node.label,
    })),
    edges: INITIAL_EDGES.map((edge) => ({
      ...edge,
      label: config.edgeLabels?.[`${edge.source}-${edge.target}`] || edge.label,
    })),
  };
}

const MCP_SERVERS = [
  { name: 'CRM 数据服务', protocol: 'Streamable HTTP', status: '已连接', latency: '42ms', tools: 8, desc: '客户、合同与风险对象查询及更新' },
  { name: '风险处置平台', protocol: 'SSE', status: '已连接', latency: '68ms', tools: 5, desc: '风险研判、处置流程与回写行动' },
  { name: '文件解析服务', protocol: 'stdio', status: '待检查', latency: '-', tools: 3, desc: 'PDF、Word、Excel 文档解析与抽取' },
];

const NODE_WIDTH = 246;
const CANVAS_WIDTH = 1850;
const CANVAS_HEIGHT = 1740;

function nextNodeId(items: WorkflowNode[]) {
  return `custom-${Date.now()}-${items.length}`;
}

export default function WorkflowPage() {
  const location = useLocation();
  const agentId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search || '');
    return searchParams.get('agentId') || 'AG001';
  }, [location.search]);
  const queryAgentName = useMemo(() => {
    const searchParams = new URLSearchParams(location.search || '');
    return searchParams.get('agentName') || '';
  }, [location.search]);
  const configuredWorkflow = useMemo(() => getAgentWorkflowConfig(agentId), [agentId]);
  const savedWorkflow = useMemo(() => readSavedWorkflow(agentId), [agentId]);
  const workflowConfig = useMemo<AgentWorkflowConfig>(() => {
    if (configuredWorkflow) return configuredWorkflow;
    const agentName = savedWorkflow?.agentName || queryAgentName || `智能体 ${agentId}`;
    return {
      agentName,
      workflowName: savedWorkflow?.workflowName || `${agentName}工作流编排`,
      nodeLabels: {},
    };
  }, [agentId, configuredWorkflow, queryAgentName, savedWorkflow]);
  const initialWorkflow = useMemo(() => {
    if (savedWorkflow) return cloneWorkflowSnapshot(savedWorkflow);
    return configuredWorkflow ? createWorkflowSnapshot(configuredWorkflow) : EMPTY_WORKFLOW;
  }, [configuredWorkflow, savedWorkflow]);
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => initialWorkflow.nodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => initialWorkflow.edges);
  const [selectedNodeId, setSelectedNodeId] = useState('wf3');
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(0.82);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<WorkflowSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<WorkflowSnapshot[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [customNodeOpen, setCustomNodeOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<WorkflowRunResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [riskResolveOpen, setRiskResolveOpen] = useState(false);
  const [activeRisk, setActiveRisk] = useState<WorkflowReviewRisk | null>(null);
  const [resolvedRiskKeys, setResolvedRiskKeys] = useState<Record<string, boolean>>({});
  const [riskResolutionNotes, setRiskResolutionNotes] = useState<Record<string, string>>({});
  const [riskResolutionNote, setRiskResolutionNote] = useState('');
  const [runRecords, setRunRecords] = useState<WorkflowRunRecord[]>(() => [
    ...(INITIAL_WORKFLOW_RECORDS[agentId] || readSavedWorkflowRecords(agentId)),
  ]);
  const [savedAt, setSavedAt] = useState('10:42');
  const [workflowSaved, setWorkflowSaved] = useState(() => Boolean(savedWorkflow || configuredWorkflow));
  const [customForm] = Form.useForm<{ type: string; label: string }>();
  const nodeDragRef = useRef<NodeDragState | null>(null);
  const canvasPanRef = useRef<CanvasPanState | null>(null);
  const runTimerRef = useRef<number | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);

  useEffect(() => {
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    setNodes(initialWorkflow.nodes);
    setEdges(initialWorkflow.edges);
    setSelectedNodeId(initialWorkflow.nodes.find((node) => node.status === 'current')?.id || initialWorkflow.nodes[0]?.id || '');
    setUndoStack([]);
    setRedoStack([]);
    setConnectMode(false);
    setConnectSource(null);
    setDebugSteps([]);
    setResultOpen(false);
    setWorkflowResult(null);
    setPreviewOpen(false);
    setRiskResolveOpen(false);
    setActiveRisk(null);
    setResolvedRiskKeys({});
    setRiskResolutionNotes({});
    setRiskResolutionNote('');
    setRecordOpen(false);
    setRunRecords([...(INITIAL_WORKFLOW_RECORDS[agentId] || readSavedWorkflowRecords(agentId))]);
    setWorkflowSaved(Boolean(savedWorkflow || configuredWorkflow));
    setRunning(false);
    setCanvasOffset({ x: 0, y: 0 });
    setDraggingNodeId(null);
    setSavedAt('10:42');

    return () => {
      if (runTimerRef.current !== null) {
        window.clearTimeout(runTimerRef.current);
        runTimerRef.current = null;
      }
    };
  }, [agentId, initialWorkflow]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const unresolvedRiskCounts: Record<WorkflowRiskLevel, number> = workflowResult?.risks.reduce((counts, risk) => {
    if (!resolvedRiskKeys[risk.id]) counts[risk.level] += 1;
    return counts;
  }, { high: 0, medium: 0, low: 0 }) || { high: 0, medium: 0, low: 0 };
  const resolvedRiskCount = workflowResult?.risks.filter((risk) => resolvedRiskKeys[risk.id]).length || 0;
  const allRisksResolved = Boolean(workflowResult?.risks.length && resolvedRiskCount === workflowResult.risks.length);
  const groupedPalette = useMemo(() => PALETTE_GROUPS.map((group) => ({
    group,
    items: Object.entries(NODE_CONFIG).filter(([, config]) => config.group === group && config.label.toLowerCase().includes(search.toLowerCase())),
  })), [search]);

  const commitGraph = (nextNodes: WorkflowNode[], nextEdges: WorkflowEdge[]) => {
    setUndoStack((current) => [...current, { nodes, edges }]);
    setRedoStack([]);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
  };

  const addNodeAt = (type: string, label?: string, x?: number, y?: number) => {
    const config = NODE_CONFIG[type] || NODE_CONFIG.code;
    const nextNode: WorkflowNode = {
      id: nextNodeId(nodes),
      type: NODE_CONFIG[type] ? type : 'code',
      label: label?.trim() || config.label,
      x: x ?? 80 + (nodes.length % 4) * 290,
      y: y ?? 1640,
      status: 'pending',
    };
    commitGraph([...nodes, nextNode], edges);
    setSelectedNodeId(nextNode.id);
    message.success(`已添加「${nextNode.label}」节点`);
  };

  const handlePaletteClick = (type: string) => addNodeAt(type);

  const handlePaletteDragStart = (event: React.DragEvent<HTMLButtonElement>, type: string) => {
    event.dataTransfer.setData('workflow-type', type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleNodePointerDown = (event: React.PointerEvent<HTMLDivElement>, node: WorkflowNode) => {
    if (event.button !== 0 || connectMode) return;
    event.stopPropagation();
    nodeDragRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      lastX: node.x,
      lastY: node.y,
      moved: false,
      initialNodes: nodes,
      initialEdges: edges,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingNodeId(node.id);
  };

  const handleNodePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = (event.clientX - drag.startX) / zoom;
    const deltaY = (event.clientY - drag.startY) / zoom;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 2) return;
    drag.moved = true;
    drag.lastX = Math.max(20, drag.originX + deltaX);
    drag.lastY = Math.max(68, drag.originY + deltaY);
    event.preventDefault();
    setNodes((current) => current.map((node) => node.id === drag.id ? { ...node, x: drag.lastX, y: drag.lastY } : node));
  };

  const finishNodePointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) {
      setNodes((current) => current.map((node) => node.id === drag.id ? { ...node, x: drag.lastX, y: drag.lastY } : node));
      setUndoStack((current) => [...current, { nodes: drag.initialNodes, edges: drag.initialEdges }]);
      setRedoStack([]);
      setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      message.success('节点位置已更新，连线已同步调整');
    }
    nodeDragRef.current = null;
    setDraggingNodeId(null);
  };

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.workflow-node-card') || target.closest('.workflow-canvas-badge')) return;
    const canvas = event.currentTarget;
    canvasPanRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: canvasOffset.x,
      offsetY: canvasOffset.y,
    };
    canvas.setPointerCapture(event.pointerId);
    setIsCanvasPanning(true);
    event.preventDefault();
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = canvasPanRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setCanvasOffset({
      x: pan.offsetX + event.clientX - pan.startX,
      y: pan.offsetY + event.clientY - pan.startY,
    });
    event.preventDefault();
  };

  const finishCanvasPointerPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = canvasPanRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    canvasPanRef.current = null;
    setIsCanvasPanning(false);
  };

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const nextZoom = Number(Math.min(1.2, Math.max(0.55, zoom + (event.deltaY < 0 ? 0.1 : -0.1))).toFixed(2));
    if (nextZoom === zoom) return;
    const pointX = (event.clientX - rect.left - canvasOffset.x) / zoom;
    const pointY = (event.clientY - rect.top - canvasOffset.y) / zoom;
    setCanvasOffset({
      x: event.clientX - rect.left - pointX * nextZoom,
      y: event.clientY - rect.top - pointY * nextZoom,
    });
    setZoom(nextZoom);
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(20, (event.clientX - rect.left - canvasOffset.x) / zoom - NODE_WIDTH / 2);
    const y = Math.max(68, (event.clientY - rect.top - canvasOffset.y) / zoom - 45);
    const paletteType = event.dataTransfer.getData('workflow-type');
    if (paletteType) addNodeAt(paletteType, undefined, x, y);
  };

  const handleNodeClick = (event: React.MouseEvent, node: WorkflowNode) => {
    event.stopPropagation();
    if (!connectMode) {
      setSelectedNodeId(node.id);
      return;
    }
    if (!connectSource) {
      setConnectSource(node.id);
      setSelectedNodeId(node.id);
      message.info(`已选择「${node.label}」，请继续选择目标节点`);
      return;
    }
    if (connectSource === node.id) {
      message.warning('起点和目标节点不能相同');
      return;
    }
    if (edges.some((edge) => edge.source === connectSource && edge.target === node.id)) {
      message.warning('这条连线已经存在');
      return;
    }
    commitGraph(nodes, [...edges, { source: connectSource, target: node.id }]);
    setConnectSource(null);
    setSelectedNodeId(node.id);
    message.success(`已连接：${nodes.find((item) => item.id === connectSource)?.label} → ${node.label}`);
  };

  const removeSelected = () => {
    if (!selectedNode) {
      message.warning('请先选择一个节点');
      return;
    }
    commitGraph(
      nodes.filter((node) => node.id !== selectedNode.id),
      edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
    );
    setSelectedNodeId(nodes.find((node) => node.id !== selectedNode.id)?.id || '');
    message.success(`已删除「${selectedNode.label}」节点`);
  };

  const duplicateSelected = () => {
    if (!selectedNode) return;
    addNodeAt(selectedNode.type, `${selectedNode.label}（副本）`, selectedNode.x + 30, selectedNode.y + 120);
  };

  const resetLayout = () => {
    const positions: Record<string, { x: number; y: number }> = {
      wf1: { x: 60, y: 120 }, wf2: { x: 350, y: 120 }, wf3: { x: 640, y: 120 }, wf4: { x: 930, y: 120 }, wf5: { x: 1220, y: 120 },
      wf6: { x: 930, y: 360 }, wf7: { x: 1220, y: 360 }, wf8: { x: 930, y: 590 }, wf9: { x: 930, y: 820 }, wf10: { x: 930, y: 1050 }, wf11: { x: 930, y: 1280 }, wf12: { x: 930, y: 1510 }, wf13: { x: 1510, y: 360 },
    };
    commitGraph(nodes.map((node) => positions[node.id] ? { ...node, ...positions[node.id] } : node), edges);
    message.success('已恢复推荐布局');
  };

  const alignSelected = () => {
    if (!selectedNode) return message.warning('请先选择一个节点');
    const sameRow = nodes.find((node) => node.id !== selectedNode.id && Math.abs(node.y - selectedNode.y) < 120);
    if (!sameRow) return message.info('当前节点没有可对齐的流程行');
    commitGraph(nodes.map((node) => node.id === selectedNode.id ? { ...node, y: sameRow.y } : node), edges);
    message.success('节点已对齐');
  };

  const undo = () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return message.info('没有可撤销的操作');
    setRedoStack((current) => [...current, { nodes, edges }]);
    setUndoStack((current) => current.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
  };

  const redo = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return message.info('没有可重做的操作');
    setUndoStack((current) => [...current, { nodes, edges }]);
    setRedoStack((current) => current.slice(0, -1));
    setNodes(next.nodes);
    setEdges(next.edges);
  };

  const saveWorkflow = () => {
    const savedTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const savedWorkflowData: StoredWorkflow = {
      agentId,
      agentName: workflowConfig.agentName,
      workflowName: workflowConfig.workflowName,
      savedAt: savedTime,
      ...cloneWorkflowSnapshot({ nodes, edges }),
    };
    persistSavedWorkflow(savedWorkflowData);
    setSavedAt(savedTime);
    setWorkflowSaved(true);

    if (!configuredWorkflow) {
      const savedRecord: WorkflowRunRecord = {
        id: `SAVE-${agentId}-${Date.now()}`,
        workflowName: workflowConfig.workflowName,
        startedAt: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).replace(/\//g, '-'),
        duration: '-',
        trigger: '保存工作流',
        detail: `已保存 ${nodes.length} 个节点和 ${edges.length} 条连线，可在智能体管理中查看。`,
        status: 'success',
      };
      const nextRecords = [savedRecord, ...runRecords].slice(0, 20);
      setRunRecords(nextRecords);
      persistSavedWorkflowRecords(agentId, nextRecords);
    }

    message.success(`工作流已保存（${nodes.length} 个节点，${edges.length} 条连线）`);
  };

  const openRiskResolve = (risk: WorkflowReviewRisk) => {
    setActiveRisk(risk);
    setRiskResolutionNote(riskResolutionNotes[risk.id] || '');
    setRiskResolveOpen(true);
  };

  const resolveActiveRisk = () => {
    if (!activeRisk) return;
    const note = riskResolutionNote.trim();
    if (!note) {
      message.warning('请填写处理说明后再标记为已解决');
      return;
    }
    setResolvedRiskKeys((current) => ({ ...current, [activeRisk.id]: true }));
    setRiskResolutionNotes((current) => ({ ...current, [activeRisk.id]: note }));
    setRiskResolveOpen(false);
    message.success(`已完成「${activeRisk.title}」的处理登记`);
  };

  const reopenRisk = (risk: WorkflowReviewRisk) => {
    setResolvedRiskKeys((current) => ({ ...current, [risk.id]: false }));
    message.info(`已将「${risk.title}」恢复为待处理`);
  };

  const runWorkflow = () => {
    if (running) return;
    if (!workflowSaved) {
      message.warning('请先保存工作流，再运行并查看记录');
      return;
    }
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    const startedAt = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\//g, '-');
    const runRecord: WorkflowRunRecord = {
      id: `RUN-${agentId}-${Date.now()}`,
      workflowName: workflowConfig.workflowName,
      startedAt,
      duration: '1.6s',
      trigger: '手动运行',
      detail: agentId === 'AG006'
        ? '合同审查流程执行完成，已输出风险清单与合同审查报告。'
        : `${nodes.length} 个节点执行成功，工作流输出已生成。`,
      status: 'success',
    };
    const resultId = `RESULT-${agentId}-${Date.now()}`;
    const steps: DebugStep[] = nodes.slice(0, 8).map((node, index) => ({
      id: node.id,
      label: node.label,
      status: index === 0 ? 'running' : 'pending',
      detail: index === 0 ? '执行中' : '等待执行',
    }));
    setDebugSteps(steps);
    setDebugOpen(true);
    setResultOpen(false);
    setWorkflowResult(null);
    setResolvedRiskKeys({});
    setRiskResolutionNotes({});
    setRiskResolutionNote('');
    setNodes((current) => current.map((node, index) => ({
      ...node,
      status: index === 0 ? 'current' : 'pending',
    })));
    setRunning(true);
    message.info('工作流开始执行');
    runTimerRef.current = window.setTimeout(() => {
      setDebugSteps((current) => current.map((step) => ({ ...step, status: 'success', detail: '执行成功' })));
      setNodes((current) => current.map((node) => ({ ...node, status: 'completed' })));
      setRunRecords((current) => {
        const nextRecords = [runRecord, ...current].slice(0, 20);
        if (!configuredWorkflow) persistSavedWorkflowRecords(agentId, nextRecords);
        return nextRecords;
      });
      setWorkflowResult(createWorkflowRunResult(agentId, resultId, nodes.length));
      setSelectedNodeId(nodes.find((node) => node.type === 'output')?.id || nodes[nodes.length - 1]?.id || '');
      setRunning(false);
      setDebugOpen(false);
      setResultOpen(true);
      runTimerRef.current = null;
      message.success('工作流执行完成');
    }, 1600);
  };

  const handleCustomNode = (values: { type: string; label: string }) => {
    addNodeAt(values.type, values.label);
    setCustomNodeOpen(false);
    customForm.resetFields();
  };

  const updateSelectedLabel = (label: string) => {
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, label } : node));
  };

  const renderEdges = () => (
    <svg className="workflow-edge-layer" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-hidden="true">
      <defs>
        <marker id="workflow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 z" fill="#aab7c8" />
        </marker>
      </defs>
      {edges.map((edge, index) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        if (!source || !target) return null;
        const sourceX = source.x + NODE_WIDTH;
        const targetX = target.x;
        const sourceY = source.y + 48;
        const targetY = target.y + 48;
        const bend = Math.max(70, Math.abs(targetX - sourceX) * 0.35);
        const path = `M ${sourceX} ${sourceY} C ${sourceX + bend} ${sourceY}, ${targetX - bend} ${targetY}, ${targetX} ${targetY}`;
        return <g key={`${edge.source}-${edge.target}-${index}`}><path d={path} fill="none" stroke="#c3cfdd" strokeWidth="2" markerEnd="url(#workflow-arrow)" />{edge.label && <text x={(sourceX + targetX) / 2} y={(sourceY + targetY) / 2 - 8} textAnchor="middle" className="workflow-edge-label">{edge.label}</text>}</g>;
      })}
    </svg>
  );

  return (
    <div className="ai-workflow-page">
      <div className="workflow-agent-context">
        <div className="workflow-agent-context-main">
          <span className="workflow-agent-context-label">当前智能体</span>
          <strong>{workflowConfig.agentName}</strong>
          <span className="workflow-agent-context-divider">/</span>
          <span>{workflowConfig.workflowName}</span>
        </div>
        <Space size={8}>
          <Tag color="blue">{agentId}</Tag>
          <Tag color={workflowSaved ? 'success' : 'default'}>{workflowSaved ? '已保存' : '未保存'}</Tag>
        </Space>
      </div>
      <div className="ai-workflow-body">
        <aside className="ai-workflow-palette">
          <div className="workflow-panel-heading"><strong>节点库</strong><Tooltip title="点击节点可快速添加，也可以拖动到画布"><span>?</span></Tooltip></div>
          <div className="workflow-palette-search"><Input prefix={<SearchOutlined />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索节点" allowClear /><p>点击快速添加，拖动节点到画布可自由排版</p></div>
          <div className="workflow-palette-list">
            {groupedPalette.map(({ group, items }) => items.length > 0 && <div key={group} className="workflow-palette-group"><div className="workflow-group-title">{group}</div>{items.map(([type, config]) => <button key={type} type="button" draggable onDragStart={(event) => handlePaletteDragStart(event, type)} onClick={() => handlePaletteClick(type)}><span style={{ color: config.color, background: config.background }}>{config.icon}</span><em>{config.label}</em><span className="workflow-drag-handle">⋮⋮</span></button>)}</div>)}
          </div>
          <div className="workflow-palette-footer"><Button block icon={<PlusOutlined />} onClick={() => { customForm.setFieldsValue({ type: 'llm', label: '' }); setCustomNodeOpen(true); }}>自定义节点</Button><Button type="link" icon={<ToolOutlined />} onClick={() => setMcpOpen(true)}>MCP 服务 2/3 在线</Button></div>
        </aside>

        <main className="ai-workflow-canvas-area">
          <div className="workflow-toolbar">
            <Space size={4} wrap><Button type="text" icon={<ArrowLeftOutlined />} onClick={() => history.back()} title="返回" /><Divider type="vertical" /><Button type="text" icon={<UndoOutlined />} disabled={!undoStack.length} onClick={undo} title="撤销" /><Button type="text" icon={<RedoOutlined />} disabled={!redoStack.length} onClick={redo} title="重做" /><Divider type="vertical" /><Button icon={<AlignCenterOutlined />} onClick={resetLayout}>自动布局</Button><Button icon={<AlignCenterOutlined />} onClick={alignSelected}>对齐</Button><Button type={connectMode ? 'primary' : 'default'} icon={<LinkOutlined />} onClick={() => { setConnectMode((current) => !current); setConnectSource(null); }}>{connectMode ? '退出连线' : '连线'}</Button></Space>
            <Space size={4} wrap><Button icon={<SyncOutlined />} onClick={() => message.info('当前版本为 v1.8.0，可从版本中心切换')}>版本</Button><Button icon={<SettingOutlined />} onClick={() => setDebugOpen(true)}>调试</Button><Button icon={<HistoryOutlined />} onClick={() => setRecordOpen(true)}>运行记录{runRecords.length ? ` ${runRecords.length}` : ''}</Button><Button icon={<FileTextOutlined />} disabled={!workflowResult} onClick={() => setResultOpen(true)}>查看结果</Button><Button type="primary" icon={running ? <StopOutlined /> : <PlayCircleOutlined />} loading={running} onClick={runWorkflow}>{running ? '运行中' : '运行'}</Button><Button icon={<SendOutlined />} onClick={() => message.success('已生成 API 发布申请')}>发布为 API</Button><Divider type="vertical" /><Button type="text" icon={<SaveOutlined />} onClick={saveWorkflow}>保存</Button></Space>
          </div>
          <div
            className={`workflow-canvas-scroll ${isCanvasPanning ? 'is-panning' : ''}`}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={finishCanvasPointerPan}
            onPointerCancel={finishCanvasPointerPan}
            onWheel={handleCanvasWheel}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleCanvasDrop}
          >
            <div className="workflow-canvas-inner" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `translate3d(${canvasOffset.x}px, ${canvasOffset.y}px, 0) scale(${zoom})` }}>
              <div className="workflow-canvas-badge"><ApartmentOutlined /> 自由画布 · 滚轮缩放 · 拖动卡片排版 · 拖动空白区域平移</div>
              {renderEdges()}
              {nodes.map((node) => {
                const config = NODE_CONFIG[node.type] || NODE_CONFIG.code;
                const isSelected = selectedNodeId === node.id;
                return <div key={node.id} className={`workflow-node-card ${isSelected ? 'selected' : ''} ${connectSource === node.id ? 'connect-source' : ''} ${draggingNodeId === node.id ? 'dragging' : ''}`} style={{ left: node.x, top: node.y }} onPointerDown={(event) => handleNodePointerDown(event, node)} onPointerMove={handleNodePointerMove} onPointerUp={finishNodePointerDrag} onPointerCancel={finishNodePointerDrag} onClick={(event) => handleNodeClick(event, node)}>
                  <div className="workflow-node-head"><span className="workflow-node-icon" style={{ color: config.color, background: config.background }}>{config.icon}</span><div><strong>{node.label}</strong><small>{config.label}</small></div><span className={`workflow-node-status ${node.status}`} /></div>
                  <div className="workflow-node-foot"><Tag color={node.status === 'completed' ? 'success' : node.status === 'current' ? 'processing' : 'default'}>{node.status === 'completed' ? '已完成' : node.status === 'current' ? '当前节点' : '待执行'}</Tag><span>{node.type === 'agent' ? 'Agent' : node.type === 'mcp' ? 'MCP' : '节点配置'}</span></div>
                </div>;
              })}
            </div>
            <div className="workflow-canvas-zoom-control" onPointerDown={(event) => event.stopPropagation()}>
              <Button type="text" icon={<ZoomOutOutlined />} onClick={() => setZoom((current) => Math.max(0.55, current - 0.1))} title="缩小画布" />
              <span className="workflow-zoom-value" title="双击重置缩放" onDoubleClick={() => setZoom(0.82)}>{Math.round(zoom * 100)}%</span>
              <Button type="text" icon={<ZoomInOutlined />} onClick={() => setZoom((current) => Math.min(1.2, current + 0.1))} title="放大画布" />
            </div>
          </div>
          <div className="workflow-statusbar"><Space><span className="workflow-success"><CheckCircleOutlined /> 校验通过 · 无孤立节点</span><span>节点 {nodes.length} · 连线 {edges.length}</span></Space><Space><span>自动保存于 {savedAt}</span><span>缩放 {Math.round(zoom * 100)}%</span></Space></div>
        </main>

        <aside className="ai-workflow-inspector">
          <div className="workflow-inspector-heading"><strong>节点属性</strong><Button type="text" icon={<SettingOutlined />} /></div>
          {selectedNode ? <div className="workflow-inspector-content"><div className="inspector-node-title"><span className="workflow-node-icon" style={{ color: (NODE_CONFIG[selectedNode.type] || NODE_CONFIG.code).color, background: (NODE_CONFIG[selectedNode.type] || NODE_CONFIG.code).background }}>{(NODE_CONFIG[selectedNode.type] || NODE_CONFIG.code).icon}</span><div><strong>{selectedNode.label}</strong><span>{(NODE_CONFIG[selectedNode.type] || NODE_CONFIG.code).label}</span></div></div><Divider /><div className="inspector-section"><label>节点名称</label><Input value={selectedNode.label} onChange={(event) => updateSelectedLabel(event.target.value)} /></div><div className="inspector-section"><label>执行状态</label><Tag color={selectedNode.status === 'completed' ? 'success' : selectedNode.status === 'current' ? 'processing' : 'default'}>{selectedNode.status === 'completed' ? '已完成' : selectedNode.status === 'current' ? '当前节点' : '待执行'}</Tag></div><div className="inspector-section"><label>节点说明</label><Input.TextArea rows={3} defaultValue={`配置${(NODE_CONFIG[selectedNode.type] || NODE_CONFIG.code).label}的输入、输出和执行参数。`} /></div><Alert type="info" showIcon message="配置变更会自动保存到当前工作流版本。" /><div className="inspector-actions"><Button icon={<CopyOutlined />} onClick={duplicateSelected}>复制节点</Button><Button danger icon={<DeleteOutlined />} onClick={removeSelected}>删除节点</Button></div></div> : <div className="workflow-empty-inspector">请从画布中选择一个节点</div>}
          <div className="workflow-inspector-mcp"><div className="workflow-inspector-heading"><strong>MCP 服务</strong><Tag color="success">2/3 在线</Tag></div><p>工作流当前可调用的工具服务</p><Button block icon={<ToolOutlined />} onClick={() => setMcpOpen(true)}>查看服务与工具</Button></div>
        </aside>
      </div>

      <Drawer
        title={`${workflowConfig.workflowName} · 运行记录`}
        placement="right"
        width={430}
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
      >
        {runRecords.length ? (
          <List
            itemLayout="vertical"
            dataSource={runRecords}
            renderItem={(record) => (
              <List.Item key={record.id}>
                <List.Item.Meta
                  title={<Space size={8}><strong>{record.startedAt}</strong><Tag color={record.status === 'success' ? 'success' : 'error'}>{record.status === 'success' ? '成功' : '失败'}</Tag></Space>}
                  description={record.workflowName}
                />
                <div className="workflow-record-detail">{record.detail}</div>
                <div className="workflow-record-meta"><span>{record.trigger}</span><span>{record.duration}</span></div>
              </List.Item>
            )}
          />
        ) : (
          <div className="workflow-record-empty"><HistoryOutlined /><p>暂无运行记录</p></div>
        )}
      </Drawer>

      <Drawer
        title={<Space size={8}><FileTextOutlined /><span>工作流输出结果</span></Space>}
        placement="right"
        width={620}
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        extra={workflowResult ? <Tag color="success">运行成功</Tag> : null}
        className="workflow-result-drawer"
      >
        {workflowResult ? (
          <div className="workflow-result-content">
            <div className="workflow-result-summary">
              <div className="workflow-result-summary-icon"><CheckCircleOutlined /></div>
              <div>
                <strong>{allRisksResolved ? '风险已全部处理，待人工复核' : workflowResult.conclusion}</strong>
                <p>{workflowResult.summary}{resolvedRiskCount > 0 ? ` 已完成 ${resolvedRiskCount} 项风险处理登记。` : ''}</p>
              </div>
            </div>

            <div className="workflow-result-file">
              <div className="workflow-result-file-main">
                <span className="workflow-result-file-icon"><FileTextOutlined /></span>
                <div>
                  <strong>{workflowResult.documentName}</strong>
                  <span>{workflowResult.documentMeta}</span>
                </div>
              </div>
              <Tag color="blue">已解析</Tag>
            </div>

            <div className="workflow-result-stat-grid">
              <div className="workflow-result-stat high"><span>待处理高风险</span><strong>{unresolvedRiskCounts.high}</strong><small>需优先处理</small></div>
              <div className="workflow-result-stat medium"><span>待处理中风险</span><strong>{unresolvedRiskCounts.medium}</strong><small>建议人工复核</small></div>
              <div className="workflow-result-stat low"><span>待处理低风险</span><strong>{unresolvedRiskCounts.low}</strong><small>持续关注</small></div>
              <div className="workflow-result-stat duration"><span>执行耗时</span><strong>{workflowResult.duration}</strong><small>{workflowResult.completedAt}</small></div>
            </div>

            {workflowResult.risks.length > 0 ? (
              <div className="workflow-result-section">
                <div className="workflow-result-section-title"><strong>风险清单</strong><span>{resolvedRiskCount}/{workflowResult.risks.length} 项已处理</span></div>
                <div className="workflow-result-risk-list">
                  {workflowResult.risks.map((risk) => (
                    <div className={`workflow-result-risk ${risk.level} ${resolvedRiskKeys[risk.id] ? 'resolved' : ''}`} key={risk.id}>
                      <div className="workflow-result-risk-head">
                        <Tag color={risk.level === 'high' ? 'error' : risk.level === 'medium' ? 'warning' : 'success'}>{risk.level === 'high' ? '高风险' : risk.level === 'medium' ? '中风险' : '低风险'}</Tag>
                        <strong>{risk.title}</strong>
                        {resolvedRiskKeys[risk.id] && <Tag color="success">已解决</Tag>}
                      </div>
                      <span className="workflow-result-risk-clause">{risk.clause}</span>
                      <p>{risk.description}</p>
                      <div className="workflow-result-suggestion"><span>修改建议</span>{risk.suggestion}</div>
                      <div className="workflow-result-source"><LinkOutlined /> 依据：{risk.source}</div>
                      {resolvedRiskKeys[risk.id] && riskResolutionNotes[risk.id] && <div className="workflow-result-resolution-note"><span>处理说明</span>{riskResolutionNotes[risk.id]}</div>}
                      <div className="workflow-result-risk-actions">
                        {resolvedRiskKeys[risk.id] ? <Button type="link" size="small" onClick={() => reopenRisk(risk)}>撤销处理</Button> : <Button type="primary" ghost size="small" onClick={() => openRiskResolve(risk)}>处理风险</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="workflow-result-section workflow-result-generic-output">
                <div className="workflow-result-section-title"><strong>执行输出</strong><span>所有节点均已完成</span></div>
                <Alert type="success" showIcon message={workflowResult.summary} />
              </div>
            )}

            <div className="workflow-result-section">
              <div className="workflow-result-section-title"><strong>生成文件</strong><span>已关联本次运行</span></div>
              <div className="workflow-result-output-file">
                <FileTextOutlined />
                <span>{workflowResult.reportName}</span>
                <Tag color="success">已生成</Tag>
                <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>预览</Button>
              </div>
            </div>
            <Alert type="info" showIcon message="下一步建议" description={workflowResult.nextAction} />
          </div>
        ) : (
          <div className="workflow-debug-empty"><PlayCircleOutlined /><p>运行完成后将在这里展示输出结果</p></div>
        )}
      </Drawer>

      <Modal
        title={<Space size={8}><FileTextOutlined /><span>{workflowResult?.risks.length ? '合同审查报告预览' : '工作流输出报告预览'}</span></Space>}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width={900}
        className="workflow-report-preview-modal"
        footer={<Button onClick={() => setPreviewOpen(false)}>关闭</Button>}
      >
        {workflowResult ? (
          <div className="workflow-report-preview">
            <div className="workflow-report-header">
              <div>
                <span>AI 智能体工作流输出</span>
                <h2>{workflowResult.risks.length ? '合同审查报告' : '工作流执行报告'}</h2>
              </div>
              <Tag color={allRisksResolved ? 'success' : 'processing'}>{allRisksResolved ? '风险已处理' : '待人工复核'}</Tag>
            </div>
            <div className="workflow-report-meta-grid">
              <div><span>分析文件</span><strong>{workflowResult.documentName}</strong></div>
              <div><span>完成时间</span><strong>{workflowResult.completedAt}</strong></div>
              <div><span>运行耗时</span><strong>{workflowResult.duration}</strong></div>
              <div><span>输出文件</span><strong>{workflowResult.reportName}</strong></div>
            </div>
            <div className="workflow-report-section">
              <h3>一、审查结论</h3>
              <Alert type={allRisksResolved ? 'success' : 'warning'} showIcon message={allRisksResolved ? '风险项已完成处理登记，等待人工复核确认。' : workflowResult.conclusion} description={workflowResult.summary} />
            </div>
            {workflowResult.risks.length > 0 ? (
              <div className="workflow-report-section">
                <h3>二、风险清单</h3>
                <div className="workflow-report-table-wrap">
                  <table className="workflow-report-table">
                    <thead><tr><th>风险等级</th><th>定位条款</th><th>风险说明</th><th>处理状态</th></tr></thead>
                    <tbody>
                      {workflowResult.risks.map((risk) => (
                        <tr key={risk.id} className={resolvedRiskKeys[risk.id] ? 'resolved' : ''}>
                          <td><Tag color={risk.level === 'high' ? 'error' : risk.level === 'medium' ? 'warning' : 'success'}>{risk.level === 'high' ? '高风险' : risk.level === 'medium' ? '中风险' : '低风险'}</Tag></td>
                          <td>{risk.clause}</td>
                          <td><strong>{risk.title}</strong><span>{risk.description}</span><em>依据：{risk.source}</em></td>
                          <td>{resolvedRiskKeys[risk.id] ? <Tag color="success">已解决</Tag> : <Tag color="warning">待处理</Tag>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="workflow-report-section"><h3>二、执行输出</h3><Alert type="success" showIcon message={workflowResult.summary} /></div>
            )}
            <div className="workflow-report-section">
              <h3>{workflowResult.risks.length ? '三、处理建议' : '三、后续操作'}</h3>
              <p className="workflow-report-advice">{workflowResult.nextAction}</p>
            </div>
            <div className="workflow-report-footer">本报告由工作流「{workflowConfig.workflowName}」生成 · 运行编号 {workflowResult.id}</div>
          </div>
        ) : <div className="workflow-debug-empty"><FileTextOutlined /><p>暂无可预览的结果文档</p></div>}
      </Modal>

      <Modal
        title={activeRisk ? `处理风险 · ${activeRisk.clause}` : '处理风险'}
        open={riskResolveOpen}
        onCancel={() => setRiskResolveOpen(false)}
        onOk={resolveActiveRisk}
        okText="标记为已解决"
        cancelText="取消"
        width={560}
      >
        {activeRisk && (
          <div className="workflow-risk-resolve-form">
            <div className="workflow-risk-resolve-summary">
              <Tag color={activeRisk.level === 'high' ? 'error' : activeRisk.level === 'medium' ? 'warning' : 'success'}>{activeRisk.level === 'high' ? '高风险' : activeRisk.level === 'medium' ? '中风险' : '低风险'}</Tag>
              <strong>{activeRisk.title}</strong>
              <p>{activeRisk.description}</p>
            </div>
            <label htmlFor="workflow-risk-resolution-note">处理说明 <span>（必填）</span></label>
            <Input.TextArea id="workflow-risk-resolution-note" rows={5} value={riskResolutionNote} onChange={(event) => setRiskResolutionNote(event.target.value)} placeholder="请填写已采取的修改措施、依据或复核结论，例如：已补充付款材料及审批时限，并同步修改合同第 4.2 条。" />
            <div className="workflow-risk-resolve-tip"><SafetyCertificateOutlined /> 标记后将从待处理风险统计中移除，并同步更新报告预览；如需重新处理，可在风险卡片中撤销。</div>
          </div>
        )}
      </Modal>

      <Drawer title="运行调试 · MCP 调用追踪" placement="bottom" height={310} open={debugOpen} onClose={() => setDebugOpen(false)} extra={<Tag color={running ? 'processing' : 'success'}>{running ? '执行中' : debugSteps.length ? '已完成' : '未运行'}</Tag>}>
        {debugSteps.length ? <List size="small" dataSource={debugSteps} renderItem={(step, index) => <List.Item><Space><span className={`debug-step-dot ${step.status}`} /> <span className="debug-step-index">{String(index + 1).padStart(2, '0')}</span><strong>{step.label}</strong></Space><span className="muted-text">{step.detail}</span></List.Item>} /> : <div className="workflow-debug-empty"><PlayCircleOutlined /><p>点击右上角“运行”开始调试工作流</p></div>}
      </Drawer>

      <Modal title="MCP 服务与工具目录" open={mcpOpen} onCancel={() => setMcpOpen(false)} width={820} footer={[<Button key="close" onClick={() => setMcpOpen(false)}>关闭</Button>, <Button key="manage" type="primary" icon={<SettingOutlined />} onClick={() => { setMcpOpen(false); history.push('/ai-agent/skills'); }}>进入工具授权管理</Button>]}> 
        <Alert type="info" showIcon message="服务连接、工具清单和授权范围会同步到当前工作流。" description="当前工作流可以按节点配置选择 MCP 服务和工具。" className="mcp-modal-alert" />
        <Row gutter={[12, 12]}>{MCP_SERVERS.map((server) => <Col span={8} key={server.name}><Card size="small" className="mcp-server-card"><div className="mcp-server-title"><ToolOutlined /><strong>{server.name}</strong><span className={server.status === '已连接' ? 'online-dot' : 'warning-dot'} /></div><span className="mcp-server-protocol">{server.protocol}</span><p>{server.desc}</p><div className="mcp-server-meta"><span>{server.tools} 个工具</span><span>{server.status === '已连接' ? `延迟 ${server.latency}` : '待检查连接'}</span></div><Button type="link" size="small" onClick={() => message.success(`${server.name} 已执行 tools/list`)}>查看工具</Button></Card></Col>)}</Row>
        <Card size="small" title="当前可用工具" className="mcp-tools-card"><Row gutter={[8, 8]}>{['客户查询 · customer.search', '创建风险处置任务 · risk.create_task', '文档实体抽取 · file.extract'].map((tool) => <Col span={8} key={tool}><div className="mcp-tool-item"><LockOutlined />{tool}</div></Col>)}</Row></Card>
      </Modal>

      <Modal title="添加工作流节点" open={customNodeOpen} onCancel={() => setCustomNodeOpen(false)} onOk={() => customForm.submit()} okText="添加" cancelText="取消">
        <Form form={customForm} layout="vertical" onFinish={handleCustomNode} initialValues={{ type: 'llm', label: '' }}><Form.Item label="节点类型" name="type" rules={[{ required: true }]}><Select options={Object.entries(NODE_CONFIG).map(([value, config]) => ({ value, label: config.label }))} /></Form.Item><Form.Item label="节点名称" name="label"><Input placeholder="留空使用默认名称" /></Form.Item><Alert type="info" showIcon message="节点添加后会出现在画布下方，可继续拖动到任意位置。" /></Form>
      </Modal>
    </div>
  );
}
