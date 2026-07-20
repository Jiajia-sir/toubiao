'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './index.less';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Row,
  Col,
  Tabs,
  Divider,
  Progress,
  Timeline,
  Alert,
  Badge,
  Statistic,
  Upload,
  Tree,
  Spin,
  Empty,
  Tooltip,
  Drawer,
  Collapse,
  Popover,
  Slider,
  Descriptions,
} from 'antd';
import type { TabsProps } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  SyncOutlined,
  ApiOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  MailOutlined,
  GlobalOutlined,
  WarningOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  BarChartOutlined,
  LoadingOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  ForkOutlined,
  DashboardOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CloudServerOutlined,
  AimOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import EntityRelationGraph, {
  type EntityRelationGraphRef,
} from '@/components/Graph/EntityRelationGraph';
import type { KnowledgeGraphData } from '@/data/documentGraph';
import type { EntityGraphData, EntityGraphNodeType } from '@/data/entityGraphMock';
import {
  getDataSourcePage,
  listDataSourceFields,
  listDataSourceObjects,
  previewDataSourceObject,
  type DataSourceRecord,
} from '@/services/biz/data-source';
import {
  getImportRunPage,
  getImportStatsOverview,
  retryImportRun,
  stopImportRun,
  triggerImportTask,
  getImportTaskPage,
  getImportTaskResult,
  type ImportRunRecord,
  type ImportStatsOverview,
  type ImportTaskResult,
} from '@/services/biz/structured-import';
import dayjs from 'dayjs';

const { Search } = Input;
const { Dragger } = Upload;

const compactMetricCardStyle = {
  padding: '10px 12px',
  borderRadius: 14,
} as const;

function CompactGraphPreviewToolbar({
  graphName,
  onZoomIn,
  onZoomOut,
  onReset,
  nodeScale = 0.9,
  onNodeScaleChange,
  showLabels = true,
  onShowLabelsChange,
  isFullscreen,
  onFullscreenToggle,
  labelMaxLength = 7,
  onLabelMaxLengthChange,
  linkWidth = 1.35,
  onLinkWidthChange,
}: GraphToolbarProps) {
  const settingsContent = (
    <div style={{ width: 260, padding: '8px 4px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#475569' }}>节点大小</span>
          <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
            {Math.round(nodeScale * 100)}%
          </span>
        </div>
        <Slider
          min={0.3}
          max={2.0}
          step={0.1}
          value={nodeScale}
          onChange={onNodeScaleChange}
          tooltip={{ formatter: (val) => `${Math.round((val || 0) * 100)}%` }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#475569' }}>连线粗细</span>
          <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
            {linkWidth.toFixed(2)}
          </span>
        </div>
        <Slider min={0.5} max={5.0} step={0.1} value={linkWidth} onChange={onLinkWidthChange} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#475569' }}>节点文字截断长度</span>
          <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{labelMaxLength}</span>
        </div>
        <Slider
          min={1}
          max={20}
          step={1}
          value={labelMaxLength}
          onChange={onLabelMaxLengthChange}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#475569' }}>强制显示所有节点文字</span>
        <Button
          size="small"
          type={showLabels ? 'primary' : 'default'}
          onClick={() => onShowLabelsChange?.(!showLabels)}
        >
          {showLabels ? '隐藏节点文字' : '显示节点文字'}
        </Button>
      </div>
    </div>
  );
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
        {graphName || '图谱预览'}
      </div>
      <Space size={8} wrap>
        <Popover
          content={settingsContent}
          title="图谱外观设置"
          trigger="click"
          placement="bottomRight"
        >
          <Button size="small" icon={<SettingOutlined />}>
            设置
          </Button>
        </Popover>
        <Button size="small" icon={<ZoomInOutlined />} onClick={onZoomIn}>
          放大
        </Button>
        <Button size="small" icon={<ZoomOutOutlined />} onClick={onZoomOut}>
          缩小
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={onReset}>
          重置
        </Button>
        {onFullscreenToggle && (
          <Button
            size="small"
            icon={isFullscreen ? <ZoomOutOutlined /> : <ZoomInOutlined />}
            onClick={onFullscreenToggle}
          >
            {isFullscreen ? '退出全屏' : '全屏'}
          </Button>
        )}
      </Space>
    </div>
  );
}

function expandGraphPreview(graph: KnowledgeGraphData): KnowledgeGraphData {
  const nextNodes = [...graph.nodes];
  const nextLinks = [...graph.links];
  const existingIds = new Set(nextNodes.map((node) => node.id));

  const additions = graph.nodes.flatMap((node, index) => {
    const expansionCount = node.type === 'organization' || node.type === 'product' ? 2 : 1;
    return Array.from({ length: expansionCount }, (_, offset) => {
      const id = `${node.id}-ext-${offset + 1}`;
      if (existingIds.has(id)) return null;

      const type =
        node.type === 'organization'
          ? offset === 0
            ? 'person'
            : 'project'
          : node.type === 'product'
            ? offset === 0
              ? 'term'
              : 'organization'
            : node.type === 'project'
              ? 'term'
              : 'time';

      return {
        node: {
          id,
          name: `${node.name}-${index + 1}-${offset + 1}`,
          type,
        },
        link: {
          source: node.id,
          target: id,
          relation: offset === 0 ? '关联' : node.type === 'organization' ? '协同' : '扩展',
        },
      };
    }).filter(Boolean) as Array<{
      node: KnowledgeGraphData['nodes'][number];
      link: KnowledgeGraphData['links'][number];
    }>;
  });

  additions.forEach(({ node, link }) => {
    if (!existingIds.has(node.id)) {
      existingIds.add(node.id);
      nextNodes.push(node);
      nextLinks.push(link);
    }
  });

  return {
    nodes: nextNodes,
    links: nextLinks,
  };
}

function toEntityPreviewGraph(graph: KnowledgeGraphData): EntityGraphData {
  const centerId = graph.nodes[0]?.id || 'preview-center';
  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();
  const firstParent = new Map<string, { parentId: string; relation: string }>();

  graph.links.forEach((link) => {
    outgoingCount.set(link.source, (outgoingCount.get(link.source) || 0) + 1);
    incomingCount.set(link.target, (incomingCount.get(link.target) || 0) + 1);
    if (!firstParent.has(link.target)) {
      firstParent.set(link.target, { parentId: link.source, relation: link.relation });
    }
  });

  const resolveType = (nodeId: string): EntityGraphNodeType => {
    if (nodeId === centerId) return 'center';
    return (outgoingCount.get(nodeId) || 0) > 0 ? 'entity' : 'value';
  };

  return {
    centerId,
    nodes: graph.nodes.map((node) => {
      const parent = firstParent.get(node.id);
      return {
        id: node.id,
        name: node.name,
        type: resolveType(node.id),
        desc: node.description,
        expandable: (outgoingCount.get(node.id) || 0) > 0,
        relationCount: (incomingCount.get(node.id) || 0) + (outgoingCount.get(node.id) || 0),
        parentId: node.id === centerId ? undefined : parent?.parentId || centerId,
        relationFromParent: parent?.relation,
        depth: node.id === centerId ? 0 : parent?.parentId === centerId ? 1 : 2,
        branchId: parent?.parentId || node.id,
      };
    }),
    links: graph.links.map((link) => ({
      source: link.source,
      target: link.target,
      relation: link.relation,
    })),
  };
}

interface DataSource {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'sqlite' | 'neo4j' | 'nebula' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  recordCount: number;
  isGraph: boolean;
  category: 'relational' | 'document' | 'graph';
  env: '生产' | '分析' | '测试' | '知识';
  latency: number;
  owner: string;
  syncMode: 'full' | 'incremental';
  syncFrequency: string;
  exceptionPolicy: 'retry' | 'skip' | 'pause';
  description: string;
}

interface SyncPolicy {
  mode: 'full' | 'incremental';
  frequency: 'manual' | 'hourly' | 'daily';
  incrementalField?: string;
  batchSize: number;
  exceptionPolicy: 'retry' | 'skip' | 'pause';
  maxRetries: number;
  notify: boolean;
}

interface StructuredPreviewColumn {
  title: string;
  dataIndex: string;
  width?: number;
  renderType?: 'tag' | 'json' | 'trend';
}

interface StructuredPreviewTable {
  title: string;
  subtitle: string;
  columns: StructuredPreviewColumn[];
  rows: Array<Record<string, string | number>>;
}

interface StructuredPreview {
  table?: StructuredPreviewTable;
  graph?: KnowledgeGraphData;
}

interface DatabaseObjectField {
  name: string;
  type: string;
  nullable?: boolean;
  keyRole?: 'PK' | 'FK' | 'UK' | 'EDGE' | 'VERTEX';
  indexName?: string;
  description: string;
  sample: string;
}

interface DatabaseObjectIndex {
  name: string;
  type: string;
  fields: string[];
}

interface DatabaseObjectDetail {
  id: string;
  name: string;
  kind: 'table' | 'view' | 'collection' | 'vertex' | 'edge';
  rowCount: string;
  storage: string;
  updatedAt: string;
  description: string;
  fields: DatabaseObjectField[];
  indexes: DatabaseObjectIndex[];
  sampleRows: Array<Record<string, string | number>>;
  graph?: KnowledgeGraphData;
}

interface DatabaseCatalog {
  id: string;
  name: string;
  engine: string;
  description: string;
  owner: string;
  tables: DatabaseObjectDetail[];
}

interface GraphToolbarProps {
  graphName?: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  nodeScale?: number;
  onNodeScaleChange?: (scale: number) => void;
  showLabels?: boolean;
  onShowLabelsChange?: (show: boolean) => void;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
  labelMaxLength?: number;
  onLabelMaxLengthChange?: (max: number) => void;
  linkWidth?: number;
  onLinkWidthChange?: (width: number) => void;
}

interface DocFileInTask {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  status: 'pending' | 'importing' | 'completed' | 'error';
  importTime?: string;
  recordCount?: number;
  error?: string;
}

interface DocImportTask {
  id: string;
  name: string;
  serverIP: string;
  serverPort: number;
  readPath: string;
  backupPath: string;
  targetKnowledgeBase?: string;
  targetCatalog?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  totalFiles: number;
  importedFiles: number;
  successFiles: number;
  errorFiles: number;
  totalSize: number;
  importedSize: number;
  startTime?: string;
  endTime?: string;
  error?: string;
  files: DocFileInTask[];
}

interface DocumentFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  status: 'pending' | 'importing' | 'completed' | 'error';
  importTime?: string;
  recordCount?: number;
  error?: string;
}

interface ImportJob {
  id: string;
  taskId?: number;
  name: string;
  source: string;
  type: 'document' | 'database';
  status: 'running' | 'paused' | 'completed' | 'error' | 'waiting';
  progress: number;
  startTime: string;
  endTime?: string;
  recordsTotal: number;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsError: number;
  /** 真实落地字节量（来自后端 byteCount，单位 Byte） */
  dataSent: number;
  /** 当前与 dataSent 同口径：平台入库字节量（Bronze payload） */
  dataReceived: number;
  error?: string;
  alerts: ImportAlert[];
}

interface ImportAlert {
  id: string;
  time: string;
  level: 'info' | 'warning' | 'error';
  content: string;
}

const typeConfig: Record<
  string,
  {
    color: string;
    icon: React.ReactNode;
    label: string;
    category: 'relational' | 'document' | 'graph';
    port: number;
    accent: string;
    description: string;
  }
> = {
  mysql: {
    color: 'blue',
    icon: <DatabaseOutlined />,
    label: 'MySQL',
    category: 'relational',
    port: 3306,
    accent: '#2563eb',
    description: '核心业务库，适合事务明细、订单与主数据接入。',
  },
  postgresql: {
    color: 'cyan',
    icon: <DatabaseOutlined />,
    label: 'PostgreSQL',
    category: 'relational',
    port: 5432,
    accent: '#0891b2',
    description: '分析仓与主题域数据，适合高一致性结构化场景。',
  },
  sqlite: {
    color: 'geekblue',
    icon: <DatabaseOutlined />,
    label: 'SQLite',
    category: 'relational',
    port: 0,
    accent: '#4f46e5',
    description: '轻量本地库，适合边缘采集样本和离线分析。',
  },
  neo4j: {
    color: 'purple',
    icon: <ForkOutlined />,
    label: 'Neo4j',
    category: 'graph',
    port: 7687,
    accent: '#7c3aed',
    description: '实体关系网络、路径推理和知识图谱首选。',
  },
  nebula: {
    color: 'magenta',
    icon: <ForkOutlined />,
    label: 'Nebula',
    category: 'graph',
    port: 9669,
    accent: '#db2777',
    description: '超大规模图数据接入与图计算分析场景。',
  },
  mongodb: {
    color: 'green',
    icon: <DatabaseOutlined />,
    label: 'MongoDB',
    category: 'document',
    port: 27017,
    accent: '#16a34a',
    description: '文档型与半结构化数据接入，适合画像和日志。',
  },
};

const syncModeConfig = {
  full: { label: '全量同步', color: 'processing' },
  incremental: { label: '增量同步', color: 'success' },
};

const exceptionPolicyConfig = {
  retry: { label: '自动重试', color: 'warning' },
  skip: { label: '跳过异常', color: 'default' },
  pause: { label: '记录告警', color: 'warning' },
};

const frequencyOptions = [
  { label: '手动触发', value: 'manual' },
  { label: '每小时', value: 'hourly' },
  { label: '每天 02:00', value: 'daily' },
];

const databaseTypeOptions = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'Neo4j', value: 'neo4j' },
  { label: 'Nebula', value: 'nebula' },
  { label: 'MongoDB', value: 'mongodb' },
];

const docTypeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  docx: { color: 'blue', icon: <FileWordOutlined />, label: 'Word文档' },
  xlsx: { color: 'green', icon: <FileExcelOutlined />, label: 'Excel表格' },
  pptx: { color: 'orange', icon: <FilePptOutlined />, label: 'PPT演示' },
  md: { color: 'purple', icon: <FileTextOutlined />, label: 'Markdown' },
  txt: { color: 'default', icon: <FileTextOutlined />, label: '文本文件' },
  pdf: { color: 'red', icon: <FilePdfOutlined />, label: 'PDF文档' },
  html: { color: 'cyan', icon: <GlobalOutlined />, label: 'HTML网页' },
  eml: { color: 'gold', icon: <MailOutlined />, label: '邮件' },
};

const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  connected: {
    color: 'success',
    text: '已连接',
    icon: <CheckCircleOutlined />,
  },
  disconnected: {
    color: 'default',
    text: '未连接',
    icon: <CloseCircleOutlined />,
  },
  error: { color: 'error', text: '连接错误', icon: <CloseCircleOutlined /> },
  running: {
    color: 'processing',
    text: '运行中',
    icon: <LoadingOutlined spin />,
  },
  paused: {
    color: 'warning',
    text: '已暂停',
    icon: <PauseCircleOutlined />,
  },
  completed: {
    color: 'success',
    text: '已完成',
    icon: <CheckCircleOutlined />,
  },
  waiting: {
    color: 'default',
    text: '等待中',
    icon: <ClockCircleOutlined />,
  },
  pending: {
    color: 'default',
    text: '待导入',
    icon: <ClockCircleOutlined />,
  },
  importing: {
    color: 'processing',
    text: '导入中',
    icon: <LoadingOutlined spin />,
  },
};

const initialDataSources: DataSource[] = [
  {
    id: '1',
    name: '订单中心 MySQL',
    type: 'mysql',
    host: '10.10.20.31',
    port: 3306,
    database: 'order_center',
    username: 'sync_rw',
    status: 'connected',
    lastSync: '2026-06-08 14:30:00',
    recordCount: 12854280,
    isGraph: false,
    category: 'relational',
    env: '生产',
    latency: 18,
    owner: '交易数据组',
    syncMode: 'incremental',
    syncFrequency: '每小时',
    exceptionPolicy: 'retry',
    description: '承载订单、客户、支付流水等核心业务事实表。',
  },
  {
    id: '2',
    name: '经营分析 PostgreSQL',
    type: 'postgresql',
    host: '10.10.30.18',
    port: 5432,
    database: 'analytics_dw',
    username: 'dw_reader',
    status: 'connected',
    lastSync: '2026-06-08 13:50:00',
    recordCount: 45820412,
    isGraph: false,
    category: 'relational',
    env: '分析',
    latency: 24,
    owner: '经营分析组',
    syncMode: 'full',
    syncFrequency: '每天 02:00',
    exceptionPolicy: 'pause',
    description: '汇总经营指标、分区宽表与多主题域分析数据。',
  },
  {
    id: '3',
    name: '边缘样本 SQLite',
    type: 'sqlite',
    host: 'F:\\samples',
    port: 0,
    database: 'edge_capture.db',
    username: 'local',
    status: 'connected',
    lastSync: '2026-06-08 11:18:00',
    recordCount: 118664,
    isGraph: false,
    category: 'relational',
    env: '测试',
    latency: 6,
    owner: '边缘采集组',
    syncMode: 'incremental',
    syncFrequency: '手动触发',
    exceptionPolicy: 'skip',
    description: '本地缓存与轻量分析样本库，适合快速验证接入链路。',
  },
  {
    id: '4',
    name: '画像中心 MongoDB',
    type: 'mongodb',
    host: '10.10.40.26',
    port: 27017,
    database: 'profile_hub',
    username: 'profile_sync',
    status: 'connected',
    lastSync: '2026-06-08 14:12:00',
    recordCount: 9204882,
    isGraph: false,
    category: 'document',
    env: '生产',
    latency: 32,
    owner: '用户运营组',
    syncMode: 'incremental',
    syncFrequency: '每小时',
    exceptionPolicy: 'retry',
    description: '用户画像、行为事件和标签文档的主接入源。',
  },
  {
    id: '5',
    name: '知识关系 Neo4j',
    type: 'neo4j',
    host: '10.10.50.12',
    port: 7687,
    database: 'knowledge_graph',
    username: 'neo4j',
    status: 'connected',
    lastSync: '2026-06-08 14:26:00',
    recordCount: 1260044,
    isGraph: true,
    category: 'graph',
    env: '知识',
    latency: 20,
    owner: '知识工程组',
    syncMode: 'full',
    syncFrequency: '每天 02:00',
    exceptionPolicy: 'pause',
    description: '面向知识图谱实体关系抽取、路径分析和关联检索。',
  },
  {
    id: '6',
    name: '运维网络 Nebula',
    type: 'nebula',
    host: '10.10.60.7',
    port: 9669,
    database: 'ops_topology',
    username: 'graph_reader',
    status: 'connected',
    lastSync: '2026-06-08 12:40:00',
    recordCount: 8422216,
    isGraph: true,
    category: 'graph',
    env: '生产',
    latency: 46,
    owner: '基础设施组',
    syncMode: 'incremental',
    syncFrequency: '手动触发',
    exceptionPolicy: 'pause',
    description: '主机、服务、依赖链路与故障关系的图数据库接入。',
  },
];

const initialSyncPolicies: Record<string, SyncPolicy> = {
  '1': {
    mode: 'incremental',
    frequency: 'hourly',
    incrementalField: 'updated_at',
    batchSize: 5000,
    exceptionPolicy: 'retry',
    maxRetries: 3,
    notify: true,
  },
  '2': {
    mode: 'full',
    frequency: 'daily',
    batchSize: 10000,
    exceptionPolicy: 'pause',
    maxRetries: 1,
    notify: true,
  },
  '3': {
    mode: 'incremental',
    frequency: 'manual',
    incrementalField: 'mtime',
    batchSize: 1000,
    exceptionPolicy: 'skip',
    maxRetries: 1,
    notify: false,
  },
  '4': {
    mode: 'incremental',
    frequency: 'hourly',
    incrementalField: '_id',
    batchSize: 8000,
    exceptionPolicy: 'retry',
    maxRetries: 4,
    notify: true,
  },
  '5': {
    mode: 'full',
    frequency: 'daily',
    batchSize: 12000,
    exceptionPolicy: 'pause',
    maxRetries: 1,
    notify: true,
  },
  '6': {
    mode: 'incremental',
    frequency: 'manual',
    incrementalField: 'event_time',
    batchSize: 3000,
    exceptionPolicy: 'pause',
    maxRetries: 2,
    notify: true,
  },
};

const structuredPreviewMap: Record<string, StructuredPreview> = {
  '1': {
    table: {
      title: '订单事实表预览',
      subtitle: '事务型结构适合以表格呈现业务主键、维度字段与同步状态。',
      columns: [
        { title: '订单ID', dataIndex: 'orderId', width: 140 },
        { title: '客户名称', dataIndex: 'customer', width: 140 },
        { title: '业务线', dataIndex: 'segment', renderType: 'tag', width: 100 },
        { title: '金额', dataIndex: 'amount', width: 110 },
        { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
        { title: '同步状态', dataIndex: 'syncStatus', renderType: 'tag', width: 110 },
      ],
      rows: [
        {
          orderId: 'SO-240608-0192',
          customer: '华东城运集团',
          segment: '政企',
          amount: '¥182,400',
          updatedAt: '2026-06-08 14:22',
          syncStatus: '已同步',
        },
        {
          orderId: 'SO-240608-0208',
          customer: '星云物流',
          segment: '供应链',
          amount: '¥64,920',
          updatedAt: '2026-06-08 14:30',
          syncStatus: '校验中',
        },
        {
          orderId: 'SO-240608-0216',
          customer: '智算研究院',
          segment: '科研',
          amount: '¥298,000',
          updatedAt: '2026-06-08 14:33',
          syncStatus: '待回写',
        },
      ],
    },
  },
  '2': {
    table: {
      title: '经营分析宽表',
      subtitle: '仓库型数据强调指标列、区域维度和批次刷新信息。',
      columns: [
        { title: '统计日', dataIndex: 'dt', width: 110 },
        { title: '区域', dataIndex: 'region', renderType: 'tag', width: 100 },
        { title: '营收', dataIndex: 'revenue', width: 110 },
        { title: '订单量', dataIndex: 'orders', width: 100 },
        { title: '毛利率', dataIndex: 'margin', width: 100 },
        { title: '刷新批次', dataIndex: 'batchNo', width: 120 },
      ],
      rows: [
        {
          dt: '2026-06-08',
          region: '华东',
          revenue: '¥860万',
          orders: '12,403',
          margin: '32.8%',
          batchNo: 'DW-2981',
        },
        {
          dt: '2026-06-08',
          region: '华北',
          revenue: '¥645万',
          orders: '9,801',
          margin: '28.4%',
          batchNo: 'DW-2981',
        },
        {
          dt: '2026-06-08',
          region: '华南',
          revenue: '¥712万',
          orders: '10,992',
          margin: '30.1%',
          batchNo: 'DW-2981',
        },
      ],
    },
  },
  '3': {
    table: {
      title: '本地样本库预览',
      subtitle: '本地文件型库适合突出路径来源、样本量和校验结果。',
      columns: [
        { title: '文件名', dataIndex: 'file', width: 180 },
        { title: '表名', dataIndex: 'table', width: 140 },
        { title: '样本量', dataIndex: 'records', width: 100 },
        { title: '来源路径', dataIndex: 'path', width: 220 },
        { title: '校验结果', dataIndex: 'check', renderType: 'tag', width: 100 },
      ],
      rows: [
        {
          file: 'market_snapshot.db',
          table: 'leads_sample',
          records: '18,240',
          path: 'F:/samples/market_snapshot.db',
          check: '通过',
        },
        {
          file: 'market_snapshot.db',
          table: 'intent_events',
          records: '92,004',
          path: 'F:/samples/market_snapshot.db',
          check: '通过',
        },
        {
          file: 'edge_capture.db',
          table: 'device_packets',
          records: '8,420',
          path: 'F:/samples/edge_capture.db',
          check: '待补齐',
        },
      ],
    },
  },
  '4': {
    table: {
      title: '用户画像文档预览',
      subtitle: '文档型库突出 JSON 标签、行为事件与最近更新时间。',
      columns: [
        { title: '用户ID', dataIndex: 'userId', width: 120 },
        { title: '最近行为', dataIndex: 'event', width: 160 },
        { title: '画像标签', dataIndex: 'tags', renderType: 'json', width: 220 },
        { title: '偏好分层', dataIndex: 'tier', renderType: 'tag', width: 100 },
        { title: '最近更新', dataIndex: 'updatedAt', width: 160 },
      ],
      rows: [
        {
          userId: 'U-110238',
          event: '浏览知识图谱专题',
          tags: '["高价值","制造业","需求挖掘"]',
          tier: 'A1',
          updatedAt: '2026-06-08 14:32',
        },
        {
          userId: 'U-219984',
          event: '下载项目方案',
          tags: '["教育","招投标","二次触达"]',
          tier: 'B2',
          updatedAt: '2026-06-08 14:11',
        },
        {
          userId: 'U-882145',
          event: '提交接口申请',
          tags: '["金融","API","深度意向"]',
          tier: 'S',
          updatedAt: '2026-06-08 13:49',
        },
      ],
    },
  },
  '5': {
    graph: {
      nodes: [
        { id: 'n1', name: '企业客户', type: 'organization' },
        { id: 'n2', name: '项目群', type: 'project' },
        { id: 'n3', name: '专家团队', type: 'organization' },
        { id: 'n4', name: '交付经理', type: 'person' },
        { id: 'n5', name: '行业知识库', type: 'product' },
        { id: 'n6', name: '知识图谱', type: 'term' },
        { id: 'n7', name: '2026-06-08', type: 'time' },
      ],
      links: [
        { source: 'n1', target: 'n2', relation: '签约项目' },
        { source: 'n2', target: 'n3', relation: '由...执行' },
        { source: 'n3', target: 'n4', relation: '负责人' },
        { source: 'n2', target: 'n5', relation: '沉淀到' },
        { source: 'n5', target: 'n6', relation: '核心能力' },
        { source: 'n2', target: 'n7', relation: '最近同步' },
      ],
    },
  },
  '6': {
    graph: {
      nodes: [
        { id: 'g1', name: '设备主机', type: 'product' },
        { id: 'g2', name: '应用服务', type: 'organization' },
        { id: 'g3', name: '访问链路', type: 'term' },
        { id: 'g4', name: '运维团队', type: 'organization' },
        { id: 'g5', name: '故障工单', type: 'project' },
        { id: 'g6', name: '值班工程师', type: 'person' },
      ],
      links: [
        { source: 'g1', target: 'g2', relation: '承载' },
        { source: 'g2', target: 'g3', relation: '依赖' },
        { source: 'g3', target: 'g5', relation: '关联工单' },
        { source: 'g5', target: 'g6', relation: '处理人' },
        { source: 'g6', target: 'g4', relation: '所属团队' },
      ],
    },
  },
};

const databaseCatalogMap: Record<string, DatabaseCatalog[]> = {
  '1': [
    {
      id: 'db1-order-center',
      name: 'order_center',
      engine: 'MySQL 8.0',
      description: '订单主业务库，承载订单、客户和支付主链路。',
      owner: '交易数据组',
      tables: [
        {
          id: 'tbl-sales-order',
          name: 'sales_order',
          kind: 'table',
          rowCount: '1,285 万',
          storage: '12.4 GB',
          updatedAt: '2026-06-10 09:12',
          description: '订单主表，记录订单状态、客户和金额信息。',
          fields: [
            {
              name: 'order_id',
              type: 'varchar(32)',
              keyRole: 'PK',
              indexName: 'PRIMARY',
              nullable: false,
              description: '订单唯一编号',
              sample: 'SO-240608-0192',
            },
            {
              name: 'customer_id',
              type: 'varchar(24)',
              keyRole: 'FK',
              indexName: 'idx_customer_status',
              nullable: false,
              description: '客户编号',
              sample: 'CU-10239',
            },
            {
              name: 'order_status',
              type: 'varchar(16)',
              indexName: 'idx_customer_status',
              nullable: false,
              description: '订单状态',
              sample: 'PAID',
            },
            {
              name: 'amount',
              type: 'decimal(18,2)',
              nullable: false,
              description: '订单金额',
              sample: '182400.00',
            },
            {
              name: 'updated_at',
              type: 'datetime',
              indexName: 'idx_updated_at',
              nullable: false,
              description: '最近更新时间',
              sample: '2026-06-08 14:22:19',
            },
          ],
          indexes: [
            { name: 'PRIMARY', type: 'BTREE', fields: ['order_id'] },
            { name: 'idx_customer_status', type: 'BTREE', fields: ['customer_id', 'order_status'] },
            { name: 'idx_updated_at', type: 'BTREE', fields: ['updated_at'] },
          ],
          sampleRows: [
            {
              order_id: 'SO-240608-0192',
              customer_id: 'CU-10239',
              order_status: 'PAID',
              amount: '182400.00',
              updated_at: '2026-06-08 14:22:19',
            },
            {
              order_id: 'SO-240608-0208',
              customer_id: 'CU-18420',
              order_status: 'SYNCING',
              amount: '64920.00',
              updated_at: '2026-06-08 14:30:42',
            },
            {
              order_id: 'SO-240608-0216',
              customer_id: 'CU-22011',
              order_status: 'PENDING',
              amount: '298000.00',
              updated_at: '2026-06-08 14:33:15',
            },
          ],
        },
        {
          id: 'tbl-payment-ledger',
          name: 'payment_ledger',
          kind: 'table',
          rowCount: '2,904 万',
          storage: '18.7 GB',
          updatedAt: '2026-06-10 09:08',
          description: '支付流水表，记录交易回执、渠道和回写状态。',
          fields: [
            {
              name: 'payment_id',
              type: 'varchar(32)',
              keyRole: 'PK',
              indexName: 'PRIMARY',
              nullable: false,
              description: '支付流水ID',
              sample: 'PM-883012',
            },
            {
              name: 'order_id',
              type: 'varchar(32)',
              keyRole: 'FK',
              indexName: 'idx_order_channel',
              nullable: false,
              description: '关联订单ID',
              sample: 'SO-240608-0192',
            },
            {
              name: 'channel',
              type: 'varchar(24)',
              indexName: 'idx_order_channel',
              nullable: false,
              description: '支付渠道',
              sample: 'BANK_TRANSFER',
            },
            {
              name: 'receipt_status',
              type: 'varchar(16)',
              nullable: false,
              description: '回执状态',
              sample: 'SUCCESS',
            },
            {
              name: 'settled_at',
              type: 'datetime',
              nullable: true,
              description: '清算时间',
              sample: '2026-06-08 14:31:02',
            },
          ],
          indexes: [
            { name: 'PRIMARY', type: 'BTREE', fields: ['payment_id'] },
            { name: 'idx_order_channel', type: 'BTREE', fields: ['order_id', 'channel'] },
          ],
          sampleRows: [
            {
              payment_id: 'PM-883012',
              order_id: 'SO-240608-0192',
              channel: 'BANK_TRANSFER',
              receipt_status: 'SUCCESS',
              settled_at: '2026-06-08 14:31:02',
            },
            {
              payment_id: 'PM-883418',
              order_id: 'SO-240608-0208',
              channel: 'ALIPAY',
              receipt_status: 'VERIFYING',
              settled_at: '',
            },
          ],
        },
      ],
    },
    {
      id: 'db1-customer-360',
      name: 'customer_360',
      engine: 'MySQL 8.0',
      description: '客户主数据及客户标签库。',
      owner: '客户运营组',
      tables: [
        {
          id: 'tbl-customer-profile',
          name: 'customer_profile',
          kind: 'table',
          rowCount: '423 万',
          storage: '6.2 GB',
          updatedAt: '2026-06-10 08:54',
          description: '客户主档，包含行业、等级和负责人信息。',
          fields: [
            {
              name: 'customer_id',
              type: 'varchar(24)',
              keyRole: 'PK',
              indexName: 'PRIMARY',
              nullable: false,
              description: '客户编号',
              sample: 'CU-10239',
            },
            {
              name: 'customer_name',
              type: 'varchar(128)',
              nullable: false,
              description: '客户名称',
              sample: '华东城运集团',
            },
            {
              name: 'industry',
              type: 'varchar(32)',
              indexName: 'idx_industry_level',
              nullable: false,
              description: '所属行业',
              sample: '政企服务',
            },
            {
              name: 'customer_level',
              type: 'varchar(8)',
              indexName: 'idx_industry_level',
              nullable: false,
              description: '客户等级',
              sample: 'A',
            },
            {
              name: 'owner_name',
              type: 'varchar(32)',
              nullable: false,
              description: '客户负责人',
              sample: '李彬',
            },
          ],
          indexes: [
            { name: 'PRIMARY', type: 'BTREE', fields: ['customer_id'] },
            { name: 'idx_industry_level', type: 'BTREE', fields: ['industry', 'customer_level'] },
          ],
          sampleRows: [
            {
              customer_id: 'CU-10239',
              customer_name: '华东城运集团',
              industry: '政企服务',
              customer_level: 'A',
              owner_name: '李彬',
            },
            {
              customer_id: 'CU-18420',
              customer_name: '星云物流',
              industry: '供应链',
              customer_level: 'B',
              owner_name: '张尧',
            },
          ],
        },
      ],
    },
  ],
  '2': [
    {
      id: 'db2-analytics-dw',
      name: 'analytics_dw',
      engine: 'PostgreSQL 15',
      description: '经营分析主仓库。',
      owner: '经营分析组',
      tables: [
        {
          id: 'tbl-revenue-wide',
          name: 'ads_revenue_wide',
          kind: 'table',
          rowCount: '8.1 亿',
          storage: '1.8 TB',
          updatedAt: '2026-06-10 02:08',
          description: '营收分析宽表，按日和区域聚合。',
          fields: [
            {
              name: 'dt',
              type: 'date',
              keyRole: 'PK',
              nullable: false,
              description: '统计日期',
              sample: '2026-06-08',
            },
            {
              name: 'region',
              type: 'varchar(16)',
              keyRole: 'PK',
              nullable: false,
              description: '区域维度',
              sample: '华东',
            },
            {
              name: 'revenue',
              type: 'numeric(18,2)',
              nullable: false,
              description: '营收',
              sample: '8600000.00',
            },
            {
              name: 'orders',
              type: 'integer',
              nullable: false,
              description: '订单量',
              sample: '12403',
            },
            {
              name: 'margin',
              type: 'numeric(5,2)',
              nullable: false,
              description: '毛利率',
              sample: '32.80',
            },
          ],
          indexes: [{ name: 'pk_ads_revenue_wide', type: 'BTREE', fields: ['dt', 'region'] }],
          sampleRows: [
            {
              dt: '2026-06-08',
              region: '华东',
              revenue: '8600000.00',
              orders: 12403,
              margin: '32.80',
            },
            {
              dt: '2026-06-08',
              region: '华北',
              revenue: '6450000.00',
              orders: 9801,
              margin: '28.40',
            },
          ],
        },
        {
          id: 'tbl-order-funnel',
          name: 'dws_order_funnel',
          kind: 'view',
          rowCount: '4,812',
          storage: 'View',
          updatedAt: '2026-06-10 02:10',
          description: '订单转化漏斗视图。',
          fields: [
            {
              name: 'channel',
              type: 'varchar(32)',
              nullable: false,
              description: '来源渠道',
              sample: '官网直销',
            },
            {
              name: 'visit_uv',
              type: 'integer',
              nullable: false,
              description: '访问人数',
              sample: '120332',
            },
            {
              name: 'lead_count',
              type: 'integer',
              nullable: false,
              description: '线索数',
              sample: '8421',
            },
            {
              name: 'deal_count',
              type: 'integer',
              nullable: false,
              description: '成交数',
              sample: '894',
            },
          ],
          indexes: [],
          sampleRows: [
            { channel: '官网直销', visit_uv: 120332, lead_count: 8421, deal_count: 894 },
            { channel: '合作伙伴', visit_uv: 48211, lead_count: 3602, deal_count: 512 },
          ],
        },
      ],
    },
    {
      id: 'db2-finance-mart',
      name: 'finance_mart',
      engine: 'PostgreSQL 15',
      description: '财务专题数据集市。',
      owner: '财务数仓组',
      tables: [
        {
          id: 'tbl-ar-aging',
          name: 'dm_ar_aging',
          kind: 'table',
          rowCount: '32.4 万',
          storage: '42 GB',
          updatedAt: '2026-06-10 02:06',
          description: '应收账龄专题表。',
          fields: [
            {
              name: 'customer_name',
              type: 'varchar(128)',
              nullable: false,
              description: '客户名称',
              sample: '智算研究院',
            },
            {
              name: 'aging_bucket',
              type: 'varchar(16)',
              nullable: false,
              description: '账龄区间',
              sample: '30-60天',
            },
            {
              name: 'receivable_amount',
              type: 'numeric(18,2)',
              nullable: false,
              description: '应收金额',
              sample: '298000.00',
            },
            {
              name: 'owner_dept',
              type: 'varchar(32)',
              nullable: false,
              description: '归属部门',
              sample: '华东大区',
            },
          ],
          indexes: [{ name: 'idx_aging_bucket', type: 'BTREE', fields: ['aging_bucket'] }],
          sampleRows: [
            {
              customer_name: '智算研究院',
              aging_bucket: '30-60天',
              receivable_amount: '298000.00',
              owner_dept: '华东大区',
            },
            {
              customer_name: '华东城运集团',
              aging_bucket: '0-30天',
              receivable_amount: '182400.00',
              owner_dept: '政企事业部',
            },
          ],
        },
      ],
    },
  ],
  '3': [
    {
      id: 'db3-market-snapshot',
      name: 'market_snapshot.db',
      engine: 'SQLite 3',
      description: '离线市场样本数据库。',
      owner: '增长分析组',
      tables: [
        {
          id: 'tbl-leads-sample',
          name: 'leads_sample',
          kind: 'table',
          rowCount: '18,240',
          storage: '128 MB',
          updatedAt: '2026-06-09 18:42',
          description: '线索样本表。',
          fields: [
            {
              name: 'lead_id',
              type: 'text',
              keyRole: 'PK',
              nullable: false,
              description: '线索ID',
              sample: 'LD-20301',
            },
            {
              name: 'company',
              type: 'text',
              nullable: false,
              description: '企业名称',
              sample: '星云物流',
            },
            {
              name: 'intent_level',
              type: 'text',
              indexName: 'idx_intent_level',
              nullable: false,
              description: '意向等级',
              sample: '高',
            },
            {
              name: 'captured_at',
              type: 'text',
              nullable: false,
              description: '抓取时间',
              sample: '2026-06-08 10:20:11',
            },
          ],
          indexes: [{ name: 'idx_intent_level', type: 'BTREE', fields: ['intent_level'] }],
          sampleRows: [
            {
              lead_id: 'LD-20301',
              company: '星云物流',
              intent_level: '高',
              captured_at: '2026-06-08 10:20:11',
            },
            {
              lead_id: 'LD-20342',
              company: '南方智教',
              intent_level: '中',
              captured_at: '2026-06-08 10:23:44',
            },
          ],
        },
      ],
    },
    {
      id: 'db3-edge-capture',
      name: 'edge_capture.db',
      engine: 'SQLite 3',
      description: '边缘采集设备离线缓存库。',
      owner: '边缘采集组',
      tables: [
        {
          id: 'tbl-device-packets',
          name: 'device_packets',
          kind: 'table',
          rowCount: '8,420',
          storage: '86 MB',
          updatedAt: '2026-06-09 17:31',
          description: '设备报文采样表。',
          fields: [
            {
              name: 'packet_id',
              type: 'text',
              keyRole: 'PK',
              nullable: false,
              description: '报文ID',
              sample: 'PK-99101',
            },
            {
              name: 'device_id',
              type: 'text',
              nullable: false,
              description: '设备编号',
              sample: 'DV-0028',
            },
            {
              name: 'protocol',
              type: 'text',
              nullable: false,
              description: '协议类型',
              sample: 'MQTT',
            },
            {
              name: 'payload_size',
              type: 'integer',
              nullable: false,
              description: '负载大小',
              sample: '384',
            },
          ],
          indexes: [
            { name: 'idx_device_protocol', type: 'BTREE', fields: ['device_id', 'protocol'] },
          ],
          sampleRows: [
            { packet_id: 'PK-99101', device_id: 'DV-0028', protocol: 'MQTT', payload_size: 384 },
            { packet_id: 'PK-99132', device_id: 'DV-0041', protocol: 'HTTP', payload_size: 512 },
          ],
        },
      ],
    },
  ],
  '4': [
    {
      id: 'db4-profile-hub',
      name: 'profile_hub',
      engine: 'MongoDB 7',
      description: '用户画像中心。',
      owner: '用户运营组',
      tables: [
        {
          id: 'col-user-profile',
          name: 'user_profile',
          kind: 'collection',
          rowCount: '920 万',
          storage: '240 GB',
          updatedAt: '2026-06-10 09:01',
          description: '用户画像主集合。',
          fields: [
            {
              name: '_id',
              type: 'ObjectId',
              keyRole: 'PK',
              nullable: false,
              description: '文档主键',
              sample: '665f14d1c0a2c1a8',
            },
            {
              name: 'user_id',
              type: 'string',
              indexName: 'idx_user_id',
              nullable: false,
              description: '用户编号',
              sample: 'U-110238',
            },
            {
              name: 'tier',
              type: 'string',
              indexName: 'idx_tier_updated',
              nullable: false,
              description: '用户分层',
              sample: 'A1',
            },
            {
              name: 'tags',
              type: 'array<string>',
              nullable: false,
              description: '画像标签',
              sample: '["高价值","制造业"]',
            },
            {
              name: 'updated_at',
              type: 'date',
              indexName: 'idx_tier_updated',
              nullable: false,
              description: '最近更新时间',
              sample: '2026-06-08T14:32:00Z',
            },
          ],
          indexes: [
            { name: '_id_', type: 'HASHED', fields: ['_id'] },
            { name: 'idx_user_id', type: 'BTREE', fields: ['user_id'] },
            { name: 'idx_tier_updated', type: 'BTREE', fields: ['tier', 'updated_at'] },
          ],
          sampleRows: [
            {
              _id: '665f14d1c0a2c1a8',
              user_id: 'U-110238',
              tier: 'A1',
              tags: '["高价值","制造业"]',
              updated_at: '2026-06-08T14:32:00Z',
            },
            {
              _id: '665f19b1f1d239ab',
              user_id: 'U-219984',
              tier: 'B2',
              tags: '["教育","招投标"]',
              updated_at: '2026-06-08T14:11:00Z',
            },
          ],
        },
      ],
    },
    {
      id: 'db4-behavior-stream',
      name: 'behavior_stream',
      engine: 'MongoDB 7',
      description: '行为事件采集库。',
      owner: '埋点平台组',
      tables: [
        {
          id: 'col-visit-events',
          name: 'visit_events',
          kind: 'collection',
          rowCount: '1.8 亿',
          storage: '1.2 TB',
          updatedAt: '2026-06-10 09:06',
          description: '站内访问事件集合。',
          fields: [
            {
              name: '_id',
              type: 'ObjectId',
              keyRole: 'PK',
              nullable: false,
              description: '文档主键',
              sample: '665f1d98a123c8de',
            },
            {
              name: 'event_name',
              type: 'string',
              indexName: 'idx_event_time',
              nullable: false,
              description: '事件名称',
              sample: 'view_knowledge_graph',
            },
            {
              name: 'user_id',
              type: 'string',
              nullable: false,
              description: '用户编号',
              sample: 'U-882145',
            },
            {
              name: 'event_time',
              type: 'date',
              indexName: 'idx_event_time',
              nullable: false,
              description: '事件时间',
              sample: '2026-06-08T13:49:00Z',
            },
          ],
          indexes: [
            { name: 'idx_event_time', type: 'BTREE', fields: ['event_name', 'event_time'] },
          ],
          sampleRows: [
            {
              _id: '665f1d98a123c8de',
              event_name: 'view_knowledge_graph',
              user_id: 'U-882145',
              event_time: '2026-06-08T13:49:00Z',
            },
            {
              _id: '665f1dd8be43f991',
              event_name: 'apply_api',
              user_id: 'U-120390',
              event_time: '2026-06-08T13:51:00Z',
            },
          ],
        },
      ],
    },
  ],
  '5': [
    {
      id: 'db5-customer-space',
      name: 'customer_space',
      engine: 'Neo4j 5',
      description: '客户、项目、知识沉淀空间。',
      owner: '知识工程组',
      tables: [
        {
          id: 'graph-customer-entity',
          name: 'customer_entity_graph',
          kind: 'vertex',
          rowCount: '126 万边 / 42 万节点',
          storage: '图空间',
          updatedAt: '2026-06-10 08:58',
          description: '客户关系图，展示客户、项目、团队与知识资产关联。',
          fields: [
            {
              name: 'entity_id',
              type: 'string',
              keyRole: 'VERTEX',
              nullable: false,
              description: '实体编号',
              sample: 'ENT-00021',
            },
            {
              name: 'entity_type',
              type: 'string',
              indexName: 'idx_entity_type',
              nullable: false,
              description: '实体类型',
              sample: 'organization',
            },
            {
              name: 'entity_name',
              type: 'string',
              nullable: false,
              description: '实体名称',
              sample: '企业客户',
            },
            {
              name: 'updated_at',
              type: 'datetime',
              nullable: false,
              description: '最近同步时间',
              sample: '2026-06-08 14:26:00',
            },
          ],
          indexes: [
            { name: 'idx_entity_type', type: 'RANGE', fields: ['entity_type'] },
            { name: 'idx_entity_id', type: 'UNIQUE', fields: ['entity_id'] },
          ],
          sampleRows: [
            {
              entity_id: 'ENT-00021',
              entity_type: 'organization',
              entity_name: '企业客户',
              updated_at: '2026-06-08 14:26:00',
            },
            {
              entity_id: 'ENT-00102',
              entity_type: 'project',
              entity_name: '项目群',
              updated_at: '2026-06-08 14:26:00',
            },
          ],
          graph: structuredPreviewMap['5'].graph,
        },
        {
          id: 'graph-project-relation',
          name: 'project_relation_edge',
          kind: 'edge',
          rowCount: '84 万边',
          storage: '图空间',
          updatedAt: '2026-06-10 08:57',
          description: '项目关系边模式，展示签约、执行、沉淀等边类型。',
          fields: [
            {
              name: 'source_id',
              type: 'string',
              keyRole: 'EDGE',
              nullable: false,
              description: '起点实体',
              sample: 'ENT-00021',
            },
            {
              name: 'target_id',
              type: 'string',
              keyRole: 'EDGE',
              nullable: false,
              description: '终点实体',
              sample: 'ENT-00102',
            },
            {
              name: 'relation_type',
              type: 'string',
              indexName: 'idx_relation_type',
              nullable: false,
              description: '关系类型',
              sample: '签约项目',
            },
            {
              name: 'confidence',
              type: 'float',
              nullable: false,
              description: '关系置信度',
              sample: '0.94',
            },
          ],
          indexes: [{ name: 'idx_relation_type', type: 'RANGE', fields: ['relation_type'] }],
          sampleRows: [
            {
              source_id: 'ENT-00021',
              target_id: 'ENT-00102',
              relation_type: '签约项目',
              confidence: '0.94',
            },
            {
              source_id: 'ENT-00102',
              target_id: 'ENT-00156',
              relation_type: '沉淀到',
              confidence: '0.88',
            },
          ],
        },
      ],
    },
    {
      id: 'db5-knowledge-space',
      name: 'knowledge_space',
      engine: 'Neo4j 5',
      description: '行业术语、知识点与文档引用空间。',
      owner: '知识工程组',
      tables: [
        {
          id: 'graph-term-reference',
          name: 'term_reference_graph',
          kind: 'vertex',
          rowCount: '18 万节点',
          storage: '图空间',
          updatedAt: '2026-06-10 08:42',
          description: '术语引用图。',
          fields: [
            {
              name: 'term_id',
              type: 'string',
              keyRole: 'VERTEX',
              nullable: false,
              description: '术语编号',
              sample: 'TR-0092',
            },
            {
              name: 'term_name',
              type: 'string',
              nullable: false,
              description: '术语名称',
              sample: '知识图谱',
            },
            {
              name: 'doc_refs',
              type: 'integer',
              nullable: false,
              description: '引用文档数',
              sample: '284',
            },
          ],
          indexes: [{ name: 'idx_term_name', type: 'UNIQUE', fields: ['term_name'] }],
          sampleRows: [
            { term_id: 'TR-0092', term_name: '知识图谱', doc_refs: 284 },
            { term_id: 'TR-0101', term_name: '实体抽取', doc_refs: 126 },
          ],
        },
      ],
    },
  ],
  '6': [
    {
      id: 'db6-topology-space',
      name: 'ops_topology',
      engine: 'Nebula Graph',
      description: '运维拓扑与依赖图空间。',
      owner: '基础设施组',
      tables: [
        {
          id: 'graph-service-topology',
          name: 'service_topology_graph',
          kind: 'vertex',
          rowCount: '842 万边 / 230 万节点',
          storage: '图空间',
          updatedAt: '2026-06-10 08:40',
          description: '服务依赖拓扑图。',
          fields: [
            {
              name: 'service_id',
              type: 'fixed_string(32)',
              keyRole: 'VERTEX',
              nullable: false,
              description: '服务编号',
              sample: 'SRV-0211',
            },
            {
              name: 'service_name',
              type: 'string',
              nullable: false,
              description: '服务名称',
              sample: '应用服务',
            },
            {
              name: 'layer',
              type: 'string',
              nullable: false,
              description: '所属层级',
              sample: '应用层',
            },
            {
              name: 'owner_team',
              type: 'string',
              nullable: false,
              description: '负责团队',
              sample: '运维团队',
            },
          ],
          indexes: [{ name: 'tagidx_service_name', type: 'TAG INDEX', fields: ['service_name'] }],
          sampleRows: [
            {
              service_id: 'SRV-0211',
              service_name: '应用服务',
              layer: '应用层',
              owner_team: '运维团队',
            },
            {
              service_id: 'SRV-0314',
              service_name: '设备主机',
              layer: '基础层',
              owner_team: '平台组',
            },
          ],
          graph: structuredPreviewMap['6'].graph,
        },
        {
          id: 'graph-ticket-link',
          name: 'incident_ticket_edge',
          kind: 'edge',
          rowCount: '92 万边',
          storage: '图空间',
          updatedAt: '2026-06-10 08:39',
          description: '故障工单关联边。',
          fields: [
            {
              name: 'src_service',
              type: 'fixed_string(32)',
              keyRole: 'EDGE',
              nullable: false,
              description: '源服务ID',
              sample: 'SRV-0314',
            },
            {
              name: 'dst_ticket',
              type: 'fixed_string(32)',
              keyRole: 'EDGE',
              nullable: false,
              description: '目标工单ID',
              sample: 'TCK-8841',
            },
            {
              name: 'severity',
              type: 'string',
              nullable: false,
              description: '故障级别',
              sample: 'P1',
            },
            {
              name: 'created_at',
              type: 'timestamp',
              nullable: false,
              description: '创建时间',
              sample: '2026-06-08 16:12:00',
            },
          ],
          indexes: [{ name: 'edgeidx_severity', type: 'EDGE INDEX', fields: ['severity'] }],
          sampleRows: [
            {
              src_service: 'SRV-0314',
              dst_ticket: 'TCK-8841',
              severity: 'P1',
              created_at: '2026-06-08 16:12:00',
            },
            {
              src_service: 'SRV-0211',
              dst_ticket: 'TCK-8859',
              severity: 'P2',
              created_at: '2026-06-08 17:03:00',
            },
          ],
        },
      ],
    },
    {
      id: 'db6-host-space',
      name: 'host_asset',
      engine: 'Nebula Graph',
      description: '主机、机房、网络设备图空间。',
      owner: '基础设施组',
      tables: [
        {
          id: 'graph-host-asset',
          name: 'host_asset_graph',
          kind: 'vertex',
          rowCount: '52 万节点',
          storage: '图空间',
          updatedAt: '2026-06-10 08:20',
          description: '主机资产主图。',
          fields: [
            {
              name: 'host_id',
              type: 'fixed_string(32)',
              keyRole: 'VERTEX',
              nullable: false,
              description: '主机编号',
              sample: 'HOST-9921',
            },
            {
              name: 'hostname',
              type: 'string',
              nullable: false,
              description: '主机名',
              sample: 'prod-edge-01',
            },
            {
              name: 'idc',
              type: 'string',
              nullable: false,
              description: '机房',
              sample: '南京一号机房',
            },
            {
              name: 'status',
              type: 'string',
              nullable: false,
              description: '运行状态',
              sample: 'RUNNING',
            },
          ],
          indexes: [{ name: 'tagidx_hostname', type: 'TAG INDEX', fields: ['hostname'] }],
          sampleRows: [
            {
              host_id: 'HOST-9921',
              hostname: 'prod-edge-01',
              idc: '南京一号机房',
              status: 'RUNNING',
            },
            {
              host_id: 'HOST-9928',
              hostname: 'prod-edge-02',
              idc: '南京二号机房',
              status: 'RUNNING',
            },
          ],
        },
      ],
    },
  ],
};

const initialDocImportTasks: DocImportTask[] = [
  {
    id: 'task1',
    name: '文档批量导入',
    serverIP: '192.168.1.200',
    serverPort: 8080,
    readPath: '/data/finance/docs',
    backupPath: '/backup/finance/docs',
    targetKnowledgeBase: '财务知识库',
    targetCatalog: '财务报表',
    status: 'running',
    progress: 45,
    totalFiles: 150,
    importedFiles: 68,
    successFiles: 67,
    errorFiles: 1,
    totalSize: 52428800,
    importedSize: 23592960,
    startTime: '2024-01-15 10:00:00',
    files: [],
  },
  {
    id: 'task2',
    name: '技术文档归档任务',
    serverIP: '192.168.1.201',
    serverPort: 8080,
    readPath: '/data/tech/docs',
    backupPath: '/backup/tech/docs',
    targetKnowledgeBase: '技术知识库',
    targetCatalog: '技术文档',
    status: 'completed',
    progress: 100,
    totalFiles: 80,
    importedFiles: 80,
    successFiles: 80,
    errorFiles: 0,
    totalSize: 31457280,
    importedSize: 31457280,
    startTime: '2024-01-14 09:00:00',
    endTime: '2024-01-14 11:30:00',
    files: [],
  },
  {
    id: 'task3',
    name: '合同文件同步任务',
    serverIP: '192.168.1.202',
    serverPort: 8080,
    readPath: '/data/legal/contracts',
    backupPath: '/backup/legal/contracts',
    targetKnowledgeBase: '法律知识库',
    targetCatalog: '合同文档',
    status: 'error',
    progress: 30,
    totalFiles: 200,
    importedFiles: 60,
    successFiles: 59,
    errorFiles: 1,
    totalSize: 104857600,
    importedSize: 31457280,
    startTime: '2024-01-15 13:00:00',
    error: '服务器连接超时',
    files: [],
  },
];

const sampleDocumentFiles: DocumentFile[] = [
  {
    id: '1',
    name: '产品需求文档.docx',
    path: 'D:\\文档\\产品需求文档.docx',
    type: 'docx',
    size: 245760,
    status: 'completed',
    importTime: '2024-01-15 10:30:00',
    recordCount: 156,
  },
  {
    id: '2',
    name: '客户数据.xlsx',
    path: 'D:\\文档\\客户数据.xlsx',
    type: 'xlsx',
    size: 524288,
    status: 'completed',
    importTime: '2024-01-15 11:00:00',
    recordCount: 2340,
  },
  {
    id: '3',
    name: '项目计划.pptx',
    path: 'D:\\文档\\项目计划.pptx',
    type: 'pptx',
    size: 1048576,
    status: 'completed',
    importTime: '2024-01-15 14:20:00',
    recordCount: 45,
  },
];

const initialImportJobs: ImportJob[] = [
  {
    id: '1',
    name: 'MySQL客户数据导入',
    source: '生产MySQL数据库',
    type: 'database',
    status: 'running',
    progress: 65,
    startTime: '2024-01-15 14:30:00',
    recordsTotal: 10000,
    recordsProcessed: 6500,
    recordsSuccess: 6480,
    recordsError: 20,
    dataSent: 1250000,
    dataReceived: 2560000,
    alerts: [],
  },
  {
    id: '4',
    name: 'PostgreSQL数据同步',
    source: 'PostgreSQL数据仓库',
    type: 'database',
    status: 'running',
    progress: 35,
    startTime: '2024-01-15 15:00:00',
    recordsTotal: 20000,
    recordsProcessed: 7000,
    recordsSuccess: 6980,
    recordsError: 20,
    dataSent: 2100000,
    dataReceived: 3200000,
    alerts: [],
  },
  {
    id: '2',
    name: '文档批量导入',
    source: 'D:\\文档',
    type: 'document',
    status: 'completed',
    progress: 100,
    startTime: '2024-01-15 10:00:00',
    endTime: '2024-01-15 11:30:00',
    recordsTotal: 2541,
    recordsProcessed: 2541,
    recordsSuccess: 2535,
    recordsError: 6,
    dataSent: 5200000,
    dataReceived: 8200000,
    alerts: [
      {
        id: 'a1',
        time: '2024-01-15 10:15:00',
        level: 'warning',
        content: '检测到格式不兼容的行，已跳过3条记录',
      },
      {
        id: 'a2',
        time: '2024-01-15 11:20:00',
        level: 'error',
        content: '文件损坏：合同模板.pdf 无法解析',
      },
    ],
  },
  {
    id: '3',
    name: 'Oracle关系数据同步',
    source: 'Oracle企业库',
    type: 'database',
    status: 'error',
    progress: 30,
    startTime: '2024-01-15 13:00:00',
    recordsTotal: 50000,
    recordsProcessed: 15000,
    recordsSuccess: 14950,
    recordsError: 50,
    dataSent: 3200000,
    dataReceived: 4800000,
    error: '连接超时：远程服务器无响应',
    alerts: [
      {
        id: 'a3',
        time: '2024-01-15 13:05:00',
        level: 'warning',
        content: '网络延迟过高 (>2000ms)',
      },
      {
        id: 'a4',
        time: '2024-01-15 13:30:00',
        level: 'error',
        content: '连接超时：远程服务器无响应',
      },
    ],
  },
];

const knowledgeBaseOptions = [
  { label: '财务知识库', value: '财务知识库' },
  { label: '技术知识库', value: '技术知识库' },
  { label: '法律知识库', value: '法律知识库' },
  { label: '人力资源库', value: '人力资源库' },
  { label: '产品知识库', value: '产品知识库' },
  { label: '市场营销库', value: '市场营销库' },
];

const catalogOptions = [
  { label: '财务报表', value: '财务报表' },
  { label: '技术文档', value: '技术文档' },
  { label: '合同文档', value: '合同文档' },
  { label: '人事档案', value: '人事档案' },
  { label: '产品资料', value: '产品资料' },
  { label: '市场分析', value: '市场分析' },
];

export default function MonitorPage() {
  const [activeTab, setActiveTab] = useState<string>('monitor');
  const [activeAlertKey, setActiveAlertKey] = useState<string[]>(
    initialImportJobs.length > 0 ? [initialImportJobs[0].id] : [],
  );
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFile[]>(sampleDocumentFiles);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [docImportTasks, setDocImportTasks] = useState<DocImportTask[]>(initialDocImportTasks);

  const [loading, setLoading] = useState(false);
  const [statsOverview, setStatsOverview] = useState<ImportStatsOverview | null>(null);
  const [taskResultDrawer, setTaskResultDrawer] = useState(false);
  const [taskResultLoading, setTaskResultLoading] = useState(false);
  const [taskResultDetail, setTaskResultDetail] = useState<ImportTaskResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [docFolderModalVisible, setDocFolderModalVisible] = useState(false);
  const [docTaskModalVisible, setDocTaskModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<DataSource | null>(null);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<string | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [tableDetailSearch, setTableDetailSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [objectSearch, setObjectSearch] = useState('');
  const [objectKindFilter, setObjectKindFilter] = useState<string>('all');
  const [detailTab, setDetailTab] = useState('fields');

  const [form] = Form.useForm();
  const [docForm] = Form.useForm();
  const [docTaskForm] = Form.useForm();
  const [syncForm] = Form.useForm();


  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [liveCatalogMap, setLiveCatalogMap] = useState<Record<string, DatabaseCatalog[]>>({});

  const mapStatusFromLastTest = (status?: number | null): DataSource['status'] => {
    if (status === 1) return 'connected';
    if (status === 0) return 'error';
    return 'disconnected';
  };

  const mapCategory = (category?: string): DataSource['category'] => {
    if (category === 'graph' || category === 'document' || category === 'relational') return category;
    return 'relational';
  };

  const formatDataSize = (bytes?: number) => {
    const n = Number(bytes || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const mapRunStatus = (status?: string): ImportJob['status'] => {
    switch ((status || '').toUpperCase()) {
      case 'RUNNING':
      case 'PENDING':
        return status?.toUpperCase() === 'PENDING' ? 'waiting' : 'running';
      case 'SUCCESS':
        return 'completed';
      case 'FAILED':
      case 'PARTIAL':
        return 'error';
      case 'CANCELLED':
        return 'paused';
      case 'CANCELING':
        return 'paused';
      default:
        return 'waiting';
    }
  };

  /**
   * 统一把后端时间字段转成可展示字符串。
   * 兼容：string / number / Date / LocalDateTime 数组 [y,m,d,h,mi,s]。
   */
  const formatDateTime = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') {
      const d = dayjs(value);
      return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : value;
    }
    if (typeof value === 'number') {
      const d = dayjs(value);
      return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(value);
    }
    if (value instanceof Date) {
      return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
    }
    // Jackson 可能把 LocalDateTime 序列化成数组: [2026,7,17,14,30,0,123456789]
    if (Array.isArray(value) && value.length >= 3) {
      const [y, m, d, h = 0, mi = 0, s = 0] = value;
      const parsed = dayjs(new Date(y, (m || 1) - 1, d || 1, h, mi, s));
      return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : String(value);
    }
    try {
      const d = dayjs(value);
      if (d.isValid()) return d.format('YYYY-MM-DD HH:mm:ss');
    } catch {
      // ignore
    }
    return String(value);
  };

  const toMonitorDataSource = (item: DataSourceRecord): DataSource => {
    const type = (item.type || 'mysql') as DataSource['type'];
    return {
      id: String(item.id),
      name: item.name,
      type: (['mysql', 'postgresql', 'sqlite', 'neo4j', 'nebula', 'mongodb'].includes(type)
        ? type
        : 'mysql') as DataSource['type'],
      host: item.host || '-',
      port: Number(item.port || 0),
      database: item.databaseName || item.properties?.spaceName || item.properties?.filePath || '-',
      username: item.username,
      password: item.password,
      status: mapStatusFromLastTest(item.lastTestStatus),
      lastSync: item.lastTestTime ? dayjs(item.lastTestTime).format('YYYY-MM-DD HH:mm:ss') : '-',
      recordCount: 0,
      isGraph: item.category === 'graph',
      category: mapCategory(item.category),
      env: '分析',
      latency: 0,
      owner: '系统',
      syncMode: 'full',
      syncFrequency: 'manual',
      exceptionPolicy: 'retry',
      description: item.description || item.lastTestMessage || '',
    };
  };

  const toImportJob = (run: ImportRunRecord): ImportJob => {
    const read = Number(run.readCount || 0);
    const write = Number(run.writeCount || 0);
    const fail = Number(run.failCount || 0);
    const processed = write + fail;
    return {
      id: String(run.id),
      taskId: run.taskId ? Number(run.taskId) : undefined,
      name: run.taskName || `运行#${run.id}`,
      source: `${run.sourceType || '-'} / 数据源${run.dataSourceId || ''}`,
      type: 'database',
      status: mapRunStatus(run.status),
      progress: Number(run.progressPercent || 0),
      startTime: formatDateTime(run.startedAt || run.createTime) || '-',
      endTime: formatDateTime(run.finishedAt) || undefined,
      recordsTotal: Math.max(read, processed),
      recordsProcessed: processed,
      recordsSuccess: write,
      recordsError: fail,
      // byteCount 为真实 payload 写入字节累计，不是前端 mock
      dataSent: Number(run.byteCount || 0),
      dataReceived: Number(run.byteCount || 0),
      error: run.errorMessage,
      alerts: run.errorMessage
        ? [
            {
              id: `run-${run.id}-err`,
              time: formatDateTime(run.finishedAt || run.startedAt) || formatDateTime(new Date()),
              level: 'error',
              content: run.errorMessage,
            },
          ]
        : [],
    };
  };

  const loadMonitorRealtimeData = async () => {
    setLoading(true);
    try {
      const [dsRes, runRes, statsRes]: any[] = await Promise.all([
        getDataSourcePage({ pageNo: 1, pageSize: 100 }),
        getImportRunPage({ pageNo: 1, pageSize: 50 }),
        getImportStatsOverview(),
      ]);
      const dsList = (dsRes?.data?.list || dsRes?.list || []).map(toMonitorDataSource);
      const runList = (runRes?.data?.list || runRes?.list || []).map(toImportJob);
      setDataSources(dsList);
      setImportJobs(runList);
      setStatsOverview(statsRes?.data || statsRes || null);
      if (!selectedSource && dsList.length) {
        setSelectedSource(dsList[0]);
      } else if (selectedSource) {
        const refreshed = dsList.find((item: DataSource) => item.id === selectedSource.id);
        if (refreshed) setSelectedSource(refreshed);
      }
    } catch (error) {
      console.error(error);
      message.error('加载监控数据失败，请确认后端服务已启动且已执行 SQL');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitorRealtimeData();
    const timer = setInterval(() => {
      loadMonitorRealtimeData();
    }, 5000);
    return () => clearInterval(timer);
  }, []);


  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [syncDrawerVisible, setSyncDrawerVisible] = useState(false);
  const [syncPolicies, setSyncPolicies] = useState<Record<string, SyncPolicy>>(initialSyncPolicies);

  const [statsUpdated, setStatsUpdated] = useState(0);
  const [currentTime, setCurrentTime] = useState('');

  const [selectedDocTask, setSelectedDocTask] = useState<DocImportTask | null>(null);
  const [taskDetailDrawerVisible, setTaskDetailDrawerVisible] = useState(false);
  const graphPreviewRef = useRef<EntityRelationGraphRef>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const [graphNodeScale, setGraphNodeScale] = useState<number>(0.9);
  const [showGraphLabels, setShowGraphLabels] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [labelMaxLength, setLabelMaxLength] = useState<number>(7);
  const [linkWidth, setLinkWidth] = useState<number>(1.35);

  useEffect(() => {
    if (!selectedSource) {
      setSelectedCatalogId(null);
      setSelectedObjectId(null);
      setTableDetailSearch('');
      setCatalogSearch('');
      setObjectSearch('');
      setObjectKindFilter('all');
      setDetailTab('fields');
      return;
    }

    let cancelled = false;
    const loadCatalog = async () => {
      try {
        const res: any = await listDataSourceObjects(selectedSource.id);
        const objects = (res?.data || res || []) as Array<any>;
        const tables: DatabaseObjectDetail[] = objects.slice(0, 200).map((obj: any) => {
          const kindRaw = String(obj.objectKind || 'table').toLowerCase();
          const kind = (
            ['table', 'view', 'collection', 'vertex', 'edge'].includes(kindRaw)
              ? kindRaw
              : kindRaw === 'node'
                ? 'vertex'
                : kindRaw === 'tag'
                  ? 'vertex'
                  : 'table'
          ) as DatabaseObjectDetail['kind'];
          return {
            id: obj.objectName,
            name: obj.objectName,
            kind,
            rowCount: '-',
            storage: selectedSource.type,
            updatedAt: '-',
            description: obj.remark || '',
            fields: [],
            indexes: [],
            sampleRows: [],
          };
        });
        if (cancelled) return;
        const catalog: DatabaseCatalog = {
          id: `live-${selectedSource.id}`,
          name: selectedSource.database || selectedSource.name,
          engine: selectedSource.type,
          description: selectedSource.description || '实时探查',
          owner: selectedSource.owner,
          tables,
        };
        setLiveCatalogMap((prev) => ({ ...prev, [selectedSource.id]: [catalog] }));
        setSelectedCatalogId(catalog.id);
        setSelectedObjectId(tables[0]?.id || null);
        setDetailTab('fields');
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          // 回退 mock 结构，保证页面仍可浏览
          const catalogs = databaseCatalogMap[selectedSource.id] || [];
          const firstCatalog = catalogs[0] || null;
          const firstObject = firstCatalog?.tables[0] || null;
          setSelectedCatalogId(firstCatalog?.id || null);
          setSelectedObjectId(firstObject?.id || null);
        }
      }
    };

    loadCatalog();
    setTableDetailSearch('');
    setCatalogSearch('');
    setObjectSearch('');
    setObjectKindFilter('all');

    return () => {
      cancelled = true;
    };
  }, [selectedSource]);

  useEffect(() => {
    if (!selectedSource || !selectedObjectId) return;
    let cancelled = false;
    const loadObjectDetail = async () => {
      try {
        const [fieldRes, previewRes]: any[] = await Promise.all([
          listDataSourceFields(selectedSource.id, selectedObjectId),
          previewDataSourceObject(selectedSource.id, selectedObjectId, 10),
        ]);
        if (cancelled) return;
        const fields: DatabaseObjectField[] = (fieldRes?.data || fieldRes || []).map((f: any) => ({
          name: f.fieldName,
          type: f.fieldType || '-',
          nullable: f.nullable,
          keyRole: f.primaryKey ? 'PK' : undefined,
          description: f.remark || '',
          sample: '',
        }));
        const sampleRows = (previewRes?.data?.rows || previewRes?.rows || []) as Array<
          Record<string, string | number>
        >;
        setLiveCatalogMap((prev) => {
          const catalogs = prev[selectedSource.id] || [];
          if (!catalogs.length) return prev;
          const nextCatalogs = catalogs.map((catalog) => ({
            ...catalog,
            tables: catalog.tables.map((table) =>
              table.id === selectedObjectId
                ? {
                    ...table,
                    fields,
                    sampleRows,
                  }
                : table,
            ),
          }));
          return { ...prev, [selectedSource.id]: nextCatalogs };
        });
      } catch (error) {
        console.error(error);
      }
    };
    loadObjectDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedSource, selectedObjectId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      graphContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentTime) {
      setCurrentTime(new Date().toLocaleTimeString());
    }
  }, [currentTime]);

  useEffect(() => {
    if (activeTab === 'monitor') {
      intervalRef.current = setInterval(() => {
        setStatsUpdated((prev) => prev + 1);
        setCurrentTime(new Date().toLocaleTimeString());

        setImportJobs((prev) =>
          prev.map((job) => {
            // 结构化导入由后端真实轮询刷新，禁止前端 mock 改写进度和字节量。
            if (job.type === 'database') {
              return job;
            }
            if (job.status === 'running') {
              const processed = Math.min(
                job.recordsProcessed + Math.floor(Math.random() * 100),
                job.recordsTotal,
              );
              const success = Math.floor(processed * (0.98 + Math.random() * 0.02));
              const randomAlertChance = Math.random();

              const newAlerts = [...job.alerts];
              if (randomAlertChance < 0.15) {
                const alertMessages = [
                  {
                    level: 'info',
                    content: `正在同步第 ${processed} 条记录`,
                  },
                  {
                    level: 'info',
                    content: `数据传输速率: ${Math.floor(Math.random() * 2000 + 1000)} 条/秒`,
                  },
                  {
                    level: 'warning',
                    content: `检测到重复数据，已自动去重 ${Math.floor(Math.random() * 10) + 1} 条`,
                  },
                  {
                    level: 'warning',
                    content: `网络延迟: ${Math.floor(Math.random() * 500 + 100)}ms，传输速度略有下降`,
                  },
                  {
                    level: 'error',
                    content: `字段格式异常：第 ${Math.floor(Math.random() * processed)} 条记录的日期字段无法解析`,
                  },
                  {
                    level: 'info',
                    content: `已完成 ${((processed / job.recordsTotal) * 100).toFixed(1)}% 数据同步`,
                  },
                  {
                    level: 'warning',
                    content: `内存使用率较高: ${(75 + Math.random() * 20).toFixed(1)}%`,
                  },
                ];
                const randomMessage =
                  alertMessages[Math.floor(Math.random() * alertMessages.length)];
                newAlerts.unshift({
                  id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  time: new Date().toLocaleString(),
                  level: randomMessage.level as 'info' | 'warning' | 'error',
                  content: randomMessage.content,
                });
                if (newAlerts.length > 10) {
                  newAlerts.pop();
                }
              }

              return {
                ...job,
                recordsProcessed: processed,
                recordsSuccess: success,
                recordsError: processed - success,
                progress: Math.round((processed / job.recordsTotal) * 100),
                dataSent: job.dataSent + Math.floor(Math.random() * 50000),
                dataReceived: job.dataReceived + Math.floor(Math.random() * 100000),
                alerts: newAlerts,
                status: 'running',
              };
            }
            return job;
          }),
        );

        setDocImportTasks((prev) =>
          prev.map((task) => {
            // if (
            //   task.status === "running" &&
            //   task.importedFiles < task.totalFiles
            // ) {
            //   const fileIncrement = Math.floor(Math.random() * 3) + 1;
            //   const newImportedFiles = Math.min(
            //     task.importedFiles + fileIncrement,
            //     task.totalFiles,
            //   );
            //   const newSuccessFiles = newImportedFiles - task.errorFiles;
            //   const newSizeIncrement =
            //     fileIncrement * (500000 + Math.random() * 1000000);
            //   const newImportedSize = Math.min(
            //     task.importedSize + newSizeIncrement,
            //     task.totalSize,
            //   );
            //   const progress = Math.round(
            //     (newImportedFiles / task.totalFiles) * 100,
            //   );

            //   const updatedFiles = task.files.map((file, index) => {
            //     if (index < newImportedFiles && file.status === "pending") {
            //       const isSuccess = Math.random() > 0.1;
            //       return {
            //         ...file,
            //         status: isSuccess
            //           ? ("completed" as const)
            //           : ("error" as const),
            //         importTime: new Date().toLocaleString(),
            //         recordCount: Math.floor(Math.random() * 500) + 50,
            //         error: isSuccess ? undefined : "文件解析失败",
            //       };
            //     }
            //     return file;
            //   });

            //   const newErrorFiles = updatedFiles.filter(
            //     (f) => f.status === "error",
            //   ).length;

            //   return {
            //     ...task,
            //     importedFiles: newImportedFiles,
            //     successFiles:
            //       newSuccessFiles - newErrorFiles + task.successFiles,
            //     errorFiles: task.errorFiles + newErrorFiles,
            //     importedSize: newImportedSize,
            //     progress,
            //     files: updatedFiles,
            //     status:
            //       newImportedFiles === task.totalFiles
            //         ? "completed"
            //         : "running",
            //     endTime:
            //       newImportedFiles === task.totalFiles
            //         ? new Date().toLocaleString()
            //         : undefined,
            //   };
            // }
            return task;
          }),
        );
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTab]);

  const filteredDataSources = dataSources.filter((item) => {
    if (typeFilter && item.type !== typeFilter) return false;
    if (searchText && !item.name.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredDocTasks = docImportTasks.filter((item) => {
    if (typeFilter && item.status !== typeFilter) return false;
    if (searchText && !item.name.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredDocuments = documentFiles.filter((item) => {
    if (docTypeFilter && item.type !== docTypeFilter) return false;
    if (searchText && !item.name.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    return true;
  });

  const alertCount = importJobs.reduce((sum, j) => sum + j.alerts.length, 0);

  const handleAddDataSource = () => {
    setEditRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditDataSource = (record: DataSource) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDeleteDataSource = (id: string) => {
    setDataSources(dataSources.filter((item) => item.id !== id));
    message.success('删除成功');
  };

  const handleSelectSource = (record: DataSource) => {
    setSelectedSource(record);
  };

  const handleOpenSyncDrawer = (record: DataSource) => {
    setSelectedSource(record);
    syncForm.setFieldsValue(syncPolicies[record.id]);
    setSyncDrawerVisible(true);
  };

  const handleRunSync = (record: DataSource, policy: SyncPolicy) => {
    setLoading(true);
    message.loading(`正在执行${syncModeConfig[policy.mode].label}: ${record.name}...`, 2);
    setTimeout(() => {
      setDataSources(
        dataSources.map((item) =>
          item.id === record.id
            ? {
                ...item,
                lastSync: new Date().toLocaleString(),
                recordCount:
                  item.recordCount +
                  (policy.mode === 'full'
                    ? Math.floor(Math.random() * 5000)
                    : Math.floor(Math.random() * 1200)),
                syncMode: policy.mode,
                syncFrequency:
                  policy.frequency === 'manual'
                    ? '手动触发'
                    : policy.frequency === 'hourly'
                      ? '每小时'
                      : '每天 02:00',
                exceptionPolicy: policy.exceptionPolicy,
              }
            : item,
        ),
      );
      setLoading(false);
      message.success('同步成功');
    }, 2000);
  };

  const handleSaveSyncPolicy = async () => {
    if (!selectedSource) return;
    try {
      const values = await syncForm.validateFields();
      const nextPolicy: SyncPolicy = values;
      setSyncPolicies((prev) => ({
        ...prev,
        [selectedSource.id]: nextPolicy,
      }));
      setDataSources((prev) =>
        prev.map((item) =>
          item.id === selectedSource.id
            ? {
                ...item,
                syncMode: nextPolicy.mode,
                syncFrequency:
                  nextPolicy.frequency === 'manual'
                    ? '手动触发'
                    : nextPolicy.frequency === 'hourly'
                      ? '每小时'
                      : '每天 02:00',
                exceptionPolicy: nextPolicy.exceptionPolicy,
              }
            : item,
        ),
      );
      setSyncDrawerVisible(false);
      handleRunSync(selectedSource, nextPolicy);
    } catch (error) {
      console.error('Sync validation failed:', error);
    }
  };

  const handleDataSourceSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        setDataSources(
          dataSources.map((item) =>
            item.id === editRecord.id
              ? {
                  ...item,
                  ...values,
                  category: typeConfig[values.type].category,
                  isGraph: typeConfig[values.type].category === 'graph',
                }
              : item,
          ),
        );
        message.success('更新成功');
      } else {
        const category = typeConfig[values.type].category;
        const newSource: DataSource = {
          ...values,
          id: Date.now().toString(),
          status: 'connected',
          lastSync: new Date().toLocaleString(),
          recordCount: 0,
          isGraph: category === 'graph',
          category,
          env: values.env,
          latency: Math.floor(Math.random() * 40) + 8,
          owner: values.owner,
          syncMode: 'full',
          syncFrequency: '手动触发',
          exceptionPolicy: 'retry',
          description: values.description,
        };
        setDataSources([newSource, ...dataSources]);
        setSyncPolicies((prev) => ({
          ...prev,
          [newSource.id]: {
            mode: 'full',
            frequency: 'manual',
            batchSize: 5000,
            exceptionPolicy: 'retry',
            maxRetries: 3,
            notify: true,
          },
        }));
        message.success('添加成功');
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleTestConnection = () => {
    message.loading('正在测试连接...', 1.5);
    setTimeout(() => {
      message.success('连接测试成功!');
    }, 1500);
  };

  const handleScanFolder = async () => {
    try {
      const folderPath = docForm.getFieldValue('folderPath');
      if (!folderPath) {
        message.warning('请输入文件夹路径');
        return;
      }
      setSelectedFolder(folderPath);
      setLoading(true);

      const mockFiles: DocumentFile[] = [
        {
          id: 'd1',
          name: '年度报告2023.docx',
          path: `${folderPath}\\年度报告2023.docx`,
          type: 'docx',
          size: 512000,
          status: 'pending',
        },
        {
          id: 'd2',
          name: '财务数据表.xlsx',
          path: `${folderPath}\\财务数据表.xlsx`,
          type: 'xlsx',
          size: 768000,
          status: 'pending',
        },
        {
          id: 'd3',
          name: '技术方案.md',
          path: `${folderPath}\\技术方案.md`,
          type: 'md',
          size: 45056,
          status: 'pending',
        },
        {
          id: 'd4',
          name: '会议纪要.txt',
          path: `${folderPath}\\会议纪要.txt`,
          type: 'txt',
          size: 8192,
          status: 'pending',
        },
        {
          id: 'd5',
          name: '产品手册.pdf',
          path: `${folderPath}\\产品手册.pdf`,
          type: 'pdf',
          size: 2097152,
          status: 'pending',
        },
        {
          id: 'd6',
          name: '官网首页.html',
          path: `${folderPath}\\官网首页.html`,
          type: 'html',
          size: 32768,
          status: 'pending',
        },
        {
          id: 'd7',
          name: '客户往来.eml',
          path: `${folderPath}\\客户往来.eml`,
          type: 'eml',
          size: 12288,
          status: 'pending',
        },
        {
          id: 'd8',
          name: '项目路演.pptx',
          path: `${folderPath}\\项目路演.pptx`,
          type: 'pptx',
          size: 1572864,
          status: 'pending',
        },
      ];

      setTimeout(() => {
        setDocumentFiles([...mockFiles, ...documentFiles]);
        setLoading(false);
        setDocFolderModalVisible(false);
        message.success(`扫描完成，发现 ${mockFiles.length} 个文件`);
      }, 1500);
    } catch (error) {
      setLoading(false);
      message.error('扫描文件夹失败');
    }
  };

  const handleImportDocument = (file: DocumentFile) => {
    setDocumentFiles(
      documentFiles.map((item) =>
        item.id === file.id ? { ...item, status: 'importing' as const } : item,
      ),
    );

    message.loading(`正在导入: ${file.name}...`, 2);

    setTimeout(() => {
      const success = Math.random() > 0.1;
      setDocumentFiles(
        documentFiles.map((item) =>
          item.id === file.id
            ? {
                ...item,
                status: success ? ('completed' as const) : ('error' as const),
                importTime: new Date().toLocaleString(),
                recordCount: Math.floor(Math.random() * 1000) + 100,
                error: success ? undefined : '文件编码不支持',
              }
            : item,
        ),
      );
      if (success) {
        message.success(`${file.name} 导入成功`);
      } else {
        message.error(`${file.name} 导入失败：文件编码不支持`);
      }
    }, 2000);
  };

  const handleImportAllDocuments = () => {
    const pendingDocs = documentFiles.filter((d) => d.status === 'pending');
    if (pendingDocs.length === 0) {
      message.info('没有待导入的文件');
      return;
    }

    let index = 0;
    const importNext = () => {
      if (index >= pendingDocs.length) {
        message.success('批量导入完成');
        return;
      }

      const file = pendingDocs[index];
      handleImportDocument(file);
      index++;
      setTimeout(importNext, 2500);
    };

    message.loading(`开始批量导入 ${pendingDocs.length} 个文件...`, 1);
    setTimeout(importNext, 1500);
  };

  const handleDeleteDocument = (id: string) => {
    setDocumentFiles(documentFiles.filter((item) => item.id !== id));
    message.success('删除成功');
  };

  const handleSelectFolder = () => {
    setDocTaskModalVisible(true);
  };

  const handleCreateDocImportTask = async () => {
    try {
      const values = await docTaskForm.validateFields();
      setLoading(true);

      const mockFiles: DocFileInTask[] = [
        {
          id: `file_${Date.now()}_1`,
          name: '年度报告2023.docx',
          path: `${values.readPath}/年度报告2023.docx`,
          type: 'docx',
          size: 512000,
          status: 'pending',
        },
        {
          id: `file_${Date.now()}_2`,
          name: '财务数据表.xlsx',
          path: `${values.readPath}/财务数据表.xlsx`,
          type: 'xlsx',
          size: 768000,
          status: 'pending',
        },
        {
          id: `file_${Date.now()}_3`,
          name: '技术方案.md',
          path: `${values.readPath}/技术方案.md`,
          type: 'md',
          size: 45056,
          status: 'pending',
        },
        {
          id: `file_${Date.now()}_4`,
          name: '会议纪要.txt',
          path: `${values.readPath}/会议纪要.txt`,
          type: 'txt',
          size: 8192,
          status: 'pending',
        },
        {
          id: `file_${Date.now()}_5`,
          name: '产品手册.pdf',
          path: `${values.readPath}/产品手册.pdf`,
          type: 'pdf',
          size: 2097152,
          status: 'pending',
        },
        {
          id: `file_${Date.now()}_6`,
          name: '官网首页.html',
          path: `${values.readPath}/官网首页.html`,
          type: 'html',
          size: 32768,
          status: 'pending',
        },
        {
          id: `file_${Date.now()}_7`,
          name: '客户往来.eml',
          path: `${values.readPath}/客户往来.eml`,
          type: 'eml',
          size: 12288,
          status: 'pending',
        },
        {
          id: `file_${Date.now()}_8`,
          name: '项目路演.pptx',
          path: `${values.readPath}/项目路演.pptx`,
          type: 'pptx',
          size: 1572864,
          status: 'pending',
        },
      ];

      const totalSize = mockFiles.reduce((sum, file) => sum + file.size, 0);

      const newTask: DocImportTask = {
        id: `task_${Date.now()}`,
        name: values.taskName,
        serverIP: values.serverIP,
        serverPort: values.serverPort,
        readPath: values.readPath,
        backupPath: values.backupPath,
        targetKnowledgeBase: values.targetKnowledgeBase,
        targetCatalog: values.targetCatalog,
        status: 'pending',
        progress: 0,
        totalFiles: mockFiles.length,
        importedFiles: 0,
        successFiles: 0,
        errorFiles: 0,
        totalSize: totalSize,
        importedSize: 0,
        startTime: new Date().toLocaleString(),
        files: mockFiles,
      };

      setTimeout(() => {
        setDocImportTasks([newTask, ...docImportTasks]);
        setLoading(false);
        setDocTaskModalVisible(false);
        docTaskForm.resetFields();
        message.success(`任务创建成功，共发现 ${mockFiles.length} 个文件`);
      }, 1500);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleStartDocTask = (task: DocImportTask) => {
    setDocImportTasks(
      docImportTasks.map((item) =>
        item.id === task.id ? { ...item, status: 'running' as const } : item,
      ),
    );
    message.success(`任务 "${task.name}" 已启动`);
  };

  const handleRetryDocTask = (task: DocImportTask) => {
    setDocImportTasks(
      docImportTasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: 'pending' as const,
              progress: 0,
              importedFiles: 0,
              successFiles: 0,
              errorFiles: 0,
              error: undefined,
              startTime: undefined,
              endTime: undefined,
              files:
                item.files?.map((f) => ({
                  ...f,
                  status: 'pending' as const,
                })) || [],
            }
          : item,
      ),
    );
    setTimeout(() => {
      setDocImportTasks(
        docImportTasks.map((item) =>
          item.id === task.id ? { ...item, status: 'running' as const } : item,
        ),
      );
      message.success(`任务 "${task.name}" 已重新开始执行`);
    }, 500);
  };

  const handlePauseDocTask = (task: DocImportTask) => {
    setDocImportTasks(
      docImportTasks.map((item) =>
        item.id === task.id ? { ...item, status: 'paused' as const } : item,
      ),
    );
    message.success(`任务 "${task.name}" 已暂停`);
  };

  const handleDeleteDocTask = (taskId: string) => {
    setDocImportTasks(docImportTasks.filter((item) => item.id !== taskId));
    message.success('任务已删除');
  };

  const handleViewDocTaskDetail = (task: DocImportTask) => {
    setSelectedDocTask(task);
    setTaskDetailDrawerVisible(true);
  };

  const handleStartImportJob = (job: ImportJob) => {
    setImportJobs(
      importJobs.map((item) =>
        item.id === job.id
          ? {
              ...item,
              status: 'running' as const,
              startTime: new Date().toLocaleString(),
            }
          : item,
      ),
    );
    message.success('导入任务已启动');
  };

  const openImportJobResult = async (job: ImportJob) => {
    if (!job.taskId) {
      message.warning('当前运行缺少任务ID，无法查看结果');
      return;
    }
    setTaskResultDrawer(true);
    setTaskResultLoading(true);
    setTaskResultDetail(null);
    try {
      const res: any = await getImportTaskResult(job.taskId);
      setTaskResultDetail(res?.data || res || null);
    } catch (error) {
      console.error(error);
      message.error('加载导入结果失败');
    } finally {
      setTaskResultLoading(false);
    }
  };

  const handlePauseImportJob = (job: ImportJob) => {
    setImportJobs(
      importJobs.map((item) =>
        item.id === job.id ? { ...item, status: 'paused' as const } : item,
      ),
    );
    message.success('导入任务已暂停');
  };

  const handleStopImportJob = async (job: ImportJob) => {
    if (job.type === 'database') {
      try {
        const res: any = await stopImportRun(Number(job.id));
        if (res?.code === 200 || res?.code === 0 || res?.success === true) {
          message.success('已发送停止请求，运行线程将尽快结束');
          await loadMonitorRealtimeData();
        } else {
          message.error(res?.msg || '停止失败');
        }
      } catch (error) {
        console.error(error);
        message.error('停止失败');
      }
      return;
    }
    setImportJobs(
      importJobs.map((item) =>
        item.id === job.id
          ? {
              ...item,
              status: 'error' as const,
              endTime: new Date().toLocaleString(),
              error: '用户手动停止',
            }
          : item,
      ),
    );
    message.warning('导入任务已停止');
  };

  const handleRestartImportJob = async (job: ImportJob) => {
    if (job.type === 'database') {
      try {
        await retryImportRun(job.id);
        message.success('已提交重跑');
        await loadMonitorRealtimeData();
      } catch (error) {
        console.error(error);
        message.error('重跑失败');
      }
      return;
    }
    setImportJobs(
      importJobs.map((item) =>
        item.id === job.id
          ? {
              ...item,
              status: 'running' as const,
              progress: 0,
              recordsProcessed: 0,
              recordsSuccess: 0,
              recordsError: 0,
              dataSent: 0,
              dataReceived: 0,
              startTime: new Date().toLocaleString(),
              endTime: undefined,
              error: undefined,
              alerts: [],
            }
          : item,
      ),
    );
    message.success('导入任务已重启');
  };

  const handleCreateNewJob = () => {
    const newJob: ImportJob = {
      id: Date.now().toString(),
      name: '新导入任务',
      source: '生产MySQL数据库',
      type: 'database',
      status: 'waiting',
      progress: 0,
      startTime: new Date().toLocaleString(),
      recordsTotal: 10000,
      recordsProcessed: 0,
      recordsSuccess: 0,
      recordsError: 0,
      dataSent: 0,
      dataReceived: 0,
      alerts: [],
    };
    setImportJobs([newJob, ...importJobs]);
    message.success('新导入任务已创建');
  };

  const selectedPreview = selectedSource ? structuredPreviewMap[selectedSource.id] : undefined;
  const selectedCatalogs = selectedSource ? (liveCatalogMap[selectedSource.id] || databaseCatalogMap[selectedSource.id] || []) : [];
  const selectedCatalog =
    selectedCatalogs.find((item) => item.id === selectedCatalogId) || selectedCatalogs[0] || null;
  const selectedDatabaseObject =
    selectedCatalog?.tables.find((item) => item.id === selectedObjectId) ||
    selectedCatalog?.tables[0] ||
    null;
  const filteredCatalogs = selectedCatalogs.filter((catalog) =>
    !catalogSearch.trim()
      ? true
      : [catalog.name, catalog.engine, catalog.description, catalog.owner]
          .join(' ')
          .toLowerCase()
          .includes(catalogSearch.trim().toLowerCase()),
  );
  const visibleCatalog =
    filteredCatalogs.find((item) => item.id === selectedCatalog?.id) ||
    filteredCatalogs[0] ||
    (!catalogSearch.trim() ? selectedCatalog : null) ||
    null;
  const filteredDatabaseObjects = (visibleCatalog?.tables || []).filter((item) => {
    const matchesKind = objectKindFilter === 'all' ? true : item.kind === objectKindFilter;
    const matchesSearch = !objectSearch.trim()
      ? true
      : [item.name, item.kind, item.description, item.updatedAt]
          .join(' ')
          .toLowerCase()
          .includes(objectSearch.trim().toLowerCase());
    return matchesKind && matchesSearch;
  });
  const visibleDatabaseObject =
    filteredDatabaseObjects.find((item) => item.id === selectedDatabaseObject?.id) ||
    filteredDatabaseObjects[0] ||
    (!objectSearch.trim() && objectKindFilter === 'all' ? selectedDatabaseObject : null) ||
    null;
  const isGraphPreview = selectedSource?.category === 'graph' && Boolean(selectedPreview?.graph);
  const expandedGraphPreview =
    isGraphPreview && selectedPreview?.graph
      ? expandGraphPreview(selectedPreview.graph)
      : undefined;
  const entityGraphPreview =
    isGraphPreview && selectedPreview?.graph
      ? toEntityPreviewGraph(expandedGraphPreview || selectedPreview.graph)
      : undefined;
  useEffect(() => {
    if (!visibleDatabaseObject) {
      setDetailTab('fields');
      return;
    }
    setDetailTab(visibleDatabaseObject.graph ? 'graph' : 'fields');
  }, [visibleDatabaseObject]);

  const selectedObjectGraph = visibleDatabaseObject?.graph
    ? expandGraphPreview(visibleDatabaseObject.graph)
    : undefined;
  const selectedObjectEntityGraph = selectedObjectGraph
    ? toEntityPreviewGraph(selectedObjectGraph)
    : undefined;
  const normalizedTableDetailSearch = tableDetailSearch.trim().toLowerCase();
  const filteredObjectFields = visibleDatabaseObject
    ? visibleDatabaseObject.fields.filter((field) => {
        if (!normalizedTableDetailSearch) return true;
        return [
          field.name,
          field.type,
          field.description,
          field.sample,
          field.keyRole || '',
          field.indexName || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedTableDetailSearch);
      })
    : [];
  const filteredObjectIndexes = visibleDatabaseObject
    ? visibleDatabaseObject.indexes.filter((index) => {
        if (!normalizedTableDetailSearch) return true;
        return [index.name, index.type, ...index.fields]
          .join(' ')
          .toLowerCase()
          .includes(normalizedTableDetailSearch);
      })
    : [];
  const filteredObjectSampleRows = visibleDatabaseObject
    ? visibleDatabaseObject.sampleRows.filter((row) => {
        if (!normalizedTableDetailSearch) return true;
        return Object.values(row).join(' ').toLowerCase().includes(normalizedTableDetailSearch);
      })
    : [];

  const renderPreviewValue = (column: StructuredPreviewColumn, value: string | number) => {
    if (column.renderType === 'tag') {
      return <Tag color="blue">{String(value)}</Tag>;
    }
    if (column.renderType === 'json') {
      return (
        <code
          style={{
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 8,
            background: 'rgba(15,23,42,0.06)',
            color: '#334155',
          }}
        >
          {String(value)}
        </code>
      );
    }
    return value;
  };

  const renderDatabaseExplorer = (inDrawer = false) => {
    if (!selectedSource) {
      return (
        <Empty
          description="请选择一个数据源开始浏览数据库结构"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    if (selectedCatalogs.length === 0) {
      return (
        <Empty
          description="当前数据源暂无可预览的数据库结构"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: inDrawer ? '280px minmax(0, 1fr)' : '260px minmax(0, 1fr)',
          gap: 16,
          minHeight: 0,
        }}
      >
        <Card size="small" title="资源浏览" style={{ borderRadius: 16, minHeight: 0 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>数据库</div>
            <Search
              allowClear
              placeholder="搜索数据库名/引擎/团队"
              value={catalogSearch}
              onChange={(event) => setCatalogSearch(event.target.value)}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: inDrawer ? 240 : 220,
              overflowY: 'auto',
              paddingRight: 2,
            }}
          >
            {filteredCatalogs.map((catalog) => {
              const active = catalog.id === visibleCatalog?.id;
              return (
                <div
                  key={catalog.id}
                  onClick={() => {
                    setSelectedCatalogId(catalog.id);
                    setSelectedObjectId(catalog.tables[0]?.id || null);
                    setTableDetailSearch('');
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: 12,
                    borderRadius: 14,
                    border: `1px solid ${active ? '#2563eb' : '#dbe7f3'}`,
                    background: active ? 'rgba(37,99,235,0.08)' : '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                      {catalog.name}
                    </div>
                    <Tag color={active ? 'blue' : 'default'}>{catalog.tables.length}</Tag>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    {catalog.description}
                  </div>
                  <Tag color="default">{catalog.engine}</Tag>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #edf2f7', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>对象</div>
            <Search
              allowClear
              placeholder="搜索表/集合/图对象"
              value={objectSearch}
              onChange={(event) => setObjectSearch(event.target.value)}
            />
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 10 }}
            >
              {['all', 'table', 'view', 'collection', 'vertex', 'edge'].map((kind) => {
                const active = objectKindFilter === kind;
                return (
                  <Button
                    key={kind}
                    size="small"
                    type={active ? 'primary' : 'default'}
                    onClick={() => setObjectKindFilter(kind)}
                    style={{ borderRadius: 999 }}
                  >
                    {kind === 'all' ? '全部' : kind}
                  </Button>
                );
              })}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: inDrawer ? 420 : 380,
                overflowY: 'auto',
                paddingRight: 2,
              }}
            >
              {filteredDatabaseObjects.map((item) => {
                const active = item.id === visibleDatabaseObject?.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedObjectId(item.id);
                      setTableDetailSearch('');
                    }}
                    style={{
                      cursor: 'pointer',
                      padding: 12,
                      borderRadius: 14,
                      border: `1px solid ${active ? '#0f766e' : '#dbe7f3'}`,
                      background: active ? 'rgba(15,118,110,0.08)' : '#fff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {item.name}
                      </div>
                      <Tag color={item.graph ? 'purple' : 'geekblue'}>{item.kind}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                      {item.description}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.rowCount}</div>
                  </div>
                );
              })}
              {filteredDatabaseObjects.length === 0 ? (
                <Empty description="没有匹配的对象" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : null}
            </div>
          </div>
        </Card>

        <Card size="small" title="对象详情" style={{ borderRadius: 16, minHeight: 0 }}>
          {visibleDatabaseObject ? (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    {visibleDatabaseObject.name}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', maxWidth: 720 }}>
                    {visibleDatabaseObject.description}
                  </div>
                </div>
                <Space size={[8, 8]} wrap>
                  <Tag color="blue">{visibleCatalog?.name}</Tag>
                  <Tag color={visibleDatabaseObject.graph ? 'purple' : 'geekblue'}>
                    {visibleDatabaseObject.kind}
                  </Tag>
                  <Tag>{visibleDatabaseObject.rowCount}</Tag>
                  <Tag color="default">{visibleDatabaseObject.updatedAt}</Tag>
                </Space>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    ...compactMetricCardStyle,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>字段数</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1d4ed8' }}>
                    {visibleDatabaseObject.fields.length}
                  </div>
                </div>
                <div
                  style={{
                    ...compactMetricCardStyle,
                    background: '#ecfeff',
                    border: '1px solid #a5f3fc',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>索引数</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f766e' }}>
                    {visibleDatabaseObject.indexes.length}
                  </div>
                </div>
                <div
                  style={{
                    ...compactMetricCardStyle,
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>存储占用</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>
                    {visibleDatabaseObject.storage}
                  </div>
                </div>
                <div
                  style={{
                    ...compactMetricCardStyle,
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>对象类型</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#c2410c' }}>
                    {visibleDatabaseObject.kind}
                  </div>
                </div>
              </div>

              <Search
                allowClear
                placeholder="在当前对象内检索字段、类型、索引、示例值"
                value={tableDetailSearch}
                onChange={(event) => setTableDetailSearch(event.target.value)}
              />

              <Tabs
                activeKey={detailTab}
                onChange={setDetailTab}
                items={[
                  ...(selectedObjectEntityGraph
                    ? [
                        {
                          key: 'graph',
                          label: '图谱视图',
                          children: (
                            <div
                              style={{
                                borderRadius: 16,
                                overflow: 'hidden',
                                border: '1px solid #e5edf8',
                                background: '#f8fafc',
                              }}
                            >
                              <div style={{ padding: 12, borderBottom: '1px solid #e5edf8' }}>
                                <CompactGraphPreviewToolbar
                                  graphName={visibleDatabaseObject.name}
                                  onZoomIn={() => graphPreviewRef.current?.zoomIn()}
                                  onZoomOut={() => graphPreviewRef.current?.zoomOut()}
                                  onReset={() => graphPreviewRef.current?.resetZoom()}
                                  nodeScale={graphNodeScale}
                                  onNodeScaleChange={setGraphNodeScale}
                                  showLabels={showGraphLabels}
                                  onShowLabelsChange={setShowGraphLabels}
                                  isFullscreen={isFullscreen}
                                  onFullscreenToggle={inDrawer ? undefined : handleFullscreenToggle}
                                  labelMaxLength={labelMaxLength}
                                  onLabelMaxLengthChange={setLabelMaxLength}
                                  linkWidth={linkWidth}
                                  onLinkWidthChange={setLinkWidth}
                                />
                              </div>
                              <div
                                ref={inDrawer ? undefined : graphContainerRef}
                                style={{ height: inDrawer ? 420 : 520 }}
                              >
                                <EntityRelationGraph
                                  actionRef={graphPreviewRef}
                                  data={selectedObjectEntityGraph}
                                  selectedNodeId={selectedObjectEntityGraph.centerId}
                                  height="100%"
                                  nodeScale={graphNodeScale}
                                  linkWidth={linkWidth}
                                  labelMaxLength={labelMaxLength}
                                  showNodes
                                  showLabels={showGraphLabels}
                                  showLinks
                                  maxVisibleLabels={32}
                                />
                              </div>
                            </div>
                          ),
                        },
                      ]
                    : []),
                  {
                    key: 'fields',
                    label: `字段 (${filteredObjectFields.length})`,
                    children: (
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="name"
                        scroll={{ x: 900 }}
                        columns={[
                          { title: '字段名', dataIndex: 'name', key: 'name', width: 180 },
                          { title: '类型', dataIndex: 'type', key: 'type', width: 140 },
                          {
                            title: '主键/约束',
                            dataIndex: 'keyRole',
                            key: 'keyRole',
                            width: 100,
                            render: (value?: string) =>
                              value ? <Tag color="blue">{value}</Tag> : '-',
                          },
                          {
                            title: '索引',
                            dataIndex: 'indexName',
                            key: 'indexName',
                            width: 150,
                            render: (value?: string) => value || '-',
                          },
                          {
                            title: '可空',
                            dataIndex: 'nullable',
                            key: 'nullable',
                            width: 90,
                            render: (value?: boolean) => (value ? 'YES' : 'NO'),
                          },
                          {
                            title: '说明',
                            dataIndex: 'description',
                            key: 'description',
                            width: 220,
                          },
                          { title: '示例', dataIndex: 'sample', key: 'sample', width: 180 },
                        ]}
                        dataSource={filteredObjectFields}
                      />
                    ),
                  },
                  {
                    key: 'indexes',
                    label: `索引 (${filteredObjectIndexes.length})`,
                    children:
                      filteredObjectIndexes.length > 0 ? (
                        <Table
                          size="small"
                          pagination={false}
                          rowKey="name"
                          columns={[
                            { title: '索引名', dataIndex: 'name', key: 'name', width: 220 },
                            { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
                            {
                              title: '字段',
                              dataIndex: 'fields',
                              key: 'fields',
                              render: (fields: string[]) => (
                                <Space size={[6, 6]} wrap>
                                  {fields.map((field) => (
                                    <Tag key={field}>{field}</Tag>
                                  ))}
                                </Space>
                              ),
                            },
                          ]}
                          dataSource={filteredObjectIndexes}
                        />
                      ) : (
                        <Empty
                          description="当前对象没有索引信息"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                  },
                  {
                    key: 'samples',
                    label: `示例数据 (${filteredObjectSampleRows.length})`,
                    children: (
                      <Table
                        size="small"
                        pagination={false}
                        scroll={{ x: 960 }}
                        rowKey={(_, index) => `${visibleDatabaseObject.id}-${index}`}
                        columns={visibleDatabaseObject.fields.map((field) => ({
                          title: field.name,
                          dataIndex: field.name,
                          key: field.name,
                          width: 160,
                        }))}
                        dataSource={filteredObjectSampleRows}
                      />
                    ),
                  },
                ]}
              />
            </>
          ) : (
            <Empty description="请选择具体表或图对象" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </div>
    );
  };

  const renderOptimizedStructuredPreview = () => {
    if (!selectedSource || !selectedPreview) {
      return (
        <Empty
          description="请选择一个数据源以查看结构化预览与同步策略"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }
    return renderDatabaseExplorer(false);
  };

  const renderStructuredPreview = () => {
    if (!selectedSource || !selectedPreview) {
      return (
        <Empty
          description="请选择一个数据源以查看结构化预览与同步策略"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    if (selectedSource.category === 'graph' && selectedPreview.graph) {
      const compactEntityGraph = toEntityPreviewGraph(selectedPreview.graph);
      return (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: 6,
              }}
            >
              图谱预览
            </div>
            <div style={{ color: '#64748b', fontSize: 13 }}>
              图数据库以关系网络方式展示实体、边和关联路径。
            </div>
          </div>
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #e5edf8',
              background: '#f8fafc',
              height: 420,
            }}
          >
            <EntityRelationGraph
              data={compactEntityGraph}
              selectedNodeId={compactEntityGraph.centerId}
              height="100%"
              nodeScale={0.82}
              linkWidth={1.25}
              labelMaxLength={6}
              maxVisibleLabels={32}
            />
          </div>
        </div>
      );
    }

    if (!selectedPreview.table) return null;

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#0f172a',
              marginBottom: 6,
            }}
          >
            {selectedPreview.table.title}
          </div>
          <div style={{ color: '#64748b', fontSize: 13 }}>{selectedPreview.table.subtitle}</div>
        </div>
        <Table
          columns={selectedPreview.table.columns.map((column) => ({
            title: column.title,
            dataIndex: column.dataIndex,
            key: column.dataIndex,
            width: column.width,
            render: (value: string | number) => renderPreviewValue(column, value),
          }))}
          dataSource={selectedPreview.table.rows.map((row, index) => ({
            key: `${selectedSource.id}-${index}`,
            ...row,
          }))}
          pagination={false}
          scroll={{ x: 760 }}
          size="small"
        />
      </div>
    );
  };

  const dataSourceColumns = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, record: DataSource) => (
        <Space direction="vertical" size={2}>
          <Space>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{name}</span>
            {record.category === 'graph' && (
              <Tag color="purple" icon={<ForkOutlined />}>
                图数据库
              </Tag>
            )}
          </Space>
          <span style={{ fontSize: 12, color: '#64748b' }}>{record.description}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type: string) => {
        const config = typeConfig[type];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: '接入信息',
      key: 'connection',
      width: 250,
      render: (_: any, record: DataSource) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#334155' }}>
            {record.type === 'sqlite'
              ? `${record.host}\\${record.database}`
              : `${record.host}:${record.port}/${record.database}`}
          </span>
          <Space size={6}>
            <Tag>{record.env}</Tag>
            <Tag color="default">{record.owner}</Tag>
          </Space>
        </Space>
      ),
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      width: 100,
      render: (latency: number) => `${latency} ms`,
    },
    {
      title: '同步策略',
      key: 'syncPolicy',
      width: 190,
      render: (_: any, record: DataSource) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <Tag color={syncModeConfig[record.syncMode].color}>
              {syncModeConfig[record.syncMode].label}
            </Tag>
            <Tag color={exceptionPolicyConfig[record.exceptionPolicy].color}>
              {exceptionPolicyConfig[record.exceptionPolicy].label}
            </Tag>
          </Space>
          <span style={{ fontSize: 12, color: '#64748b' }}>{record.syncFrequency}</span>
        </Space>
      ),
    },
    {
      title: '数据规模',
      key: 'volume',
      width: 130,
      render: (_: any, record: DataSource) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {record.recordCount.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{record.lastSync}</span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_: any, record: DataSource) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined />}
            onClick={() => handleOpenSyncDrawer(record)}
            loading={loading}
          >
            配置并同步
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              handleSelectSource(record);
              setDetailDrawerVisible(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditDataSource(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={() => handleDeleteDataSource(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const documentColumns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, record: DocumentFile) => {
        const config = docTypeConfig[record.type] || docTypeConfig.txt;
        return (
          <Space>
            <Tag color={config.color} icon={config.icon}>
              {config.label}
            </Tag>
            <span style={{ fontWeight: 500 }}>{name}</span>
          </Space>
        );
      },
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: 280,
      render: (path: string) => (
        <Tooltip title={path}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#999' }}>
            {path.length > 40 ? '...' + path.slice(-40) : path}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / 1024 / 1024).toFixed(1)} MB`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '记录数',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 100,
      render: (count: number | undefined) => count?.toLocaleString() || '-',
    },
    {
      title: '导入时间',
      dataIndex: 'importTime',
      key: 'importTime',
      width: 160,
      render: (time: string | undefined) => time || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: DocumentFile) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleImportDocument(record)}
            >
              导入
            </Button>
          )}
          {record.status === 'error' && (
            <Button type="link" size="small" onClick={() => handleImportDocument(record)}>
              重试
            </Button>
          )}
          <Popconfirm
            title="确认删除?"
            onConfirm={() => handleDeleteDocument(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const docTaskColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: DocImportTask) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500, color: '#1890ff' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#999' }}>
            {record.serverIP}:{record.serverPort}
          </span>
        </Space>
      ),
    },
    {
      title: '目标知识库',
      dataIndex: 'targetKnowledgeBase',
      key: 'targetKnowledgeBase',
      width: 120,
      render: (targetKnowledgeBase: string) => <Tag color="blue">{targetKnowledgeBase}</Tag>,
    },
    {
      title: '目标编目',
      dataIndex: 'targetCatalog',
      key: 'targetCatalog',
      width: 120,
      render: (targetCatalog: string) => <Tag color="green">{targetCatalog}</Tag>,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: DocImportTask) => (
        <div>
          <Progress
            percent={progress}
            size="small"
            status={
              record.status === 'error'
                ? 'exception'
                : record.status === 'completed'
                  ? 'success'
                  : 'active'
            }
          />
          <span style={{ fontSize: 11, color: '#999' }}>
            {record.importedFiles}/{record.totalFiles} 文件
          </span>
        </div>
      ),
    },
    {
      title: '成功/失败',
      key: 'status',
      width: 120,
      render: (_: any, record: DocImportTask) => (
        <Space>
          <span style={{ color: '#52c41a' }}>{record.successFiles}</span>
          <span>/</span>
          <span style={{ color: '#ff4d4f' }}>{record.errorFiles}</span>
        </Space>
      ),
    },
    {
      title: '数据量',
      key: 'size',
      width: 120,
      render: (_: any, record: DocImportTask) => (
        <span style={{ fontSize: 12 }}>
          {(record.importedSize / 1024 / 1024).toFixed(1)}/
          {(record.totalSize / 1024 / 1024).toFixed(1)} MB
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const config = statusConfig[status] || statusConfig.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
      render: (time: string | undefined) => time || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_: any, record: DocImportTask) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDocTaskDetail(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartDocTask(record)}
            >
              启动
            </Button>
          )}
          {(record.status === 'completed' || record.status === 'error') && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetryDocTask(record)}
            >
              重试
            </Button>
          )}
          {/* {record.status === "running" && (
            <Button
              type="link"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handlePauseDocTask(record)}
            >
              暂停
            </Button>
          )} */}
          <Popconfirm
            title="确认删除任务?"
            onConfirm={() => handleDeleteDocTask(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const monitorColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record: ImportJob) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>{name}</span>

        // <Space>
        //   <span style={{ fontWeight: 500 }}>{name}</span>
        //   {record.alerts.filter((a) => a.level === "error").length > 0 && (
        //     <Badge
        //       count={record.alerts.filter((a) => a.level === "error").length}
        //     />
        //   )}
        // </Space>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag icon={type === 'document' ? <FileOutlined /> : <DatabaseOutlined />}>
          {type === 'document' ? '文档' : '数据库'}
        </Tag>
      ),
    },
    {
      title: '数据源',
      dataIndex: 'source',
      key: 'source',
      width: 160,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: ImportJob) => (
        <Progress
          percent={progress}
          size="small"
          status={
            record.status === 'error'
              ? 'exception'
              : record.status === 'completed'
                ? 'success'
                : 'active'
          }
        />
      ),
    },
    {
      title: '已同步/总量',
      key: 'records',
      width: 120,
      render: (_: any, record: ImportJob) => (
        <span style={{ fontSize: 12 }}>
          {record.recordsProcessed.toLocaleString()}/{record.recordsTotal.toLocaleString()}
        </span>
      ),
    },
    {
      title: '数据量',
      key: 'data',
      width: 150,
      render: (_: any, record: ImportJob) => (
        <Space direction="vertical" size={0}>
          <Tooltip title="入库字节量：后端累计 payload JSON 字节（byteCount）">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowUpOutlined style={{ color: '#16a34a', fontSize: 13 }} />
              <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 500 }}>
                {formatDataSize(record.dataSent)}
              </span>
            </div>
          </Tooltip>
          <Tooltip title="当前架构下与入库量同口径（Bronze 落地层）">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowDownOutlined style={{ color: '#2563eb', fontSize: 13 }} />
              <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 500 }}>
                {formatDataSize(record.dataReceived)}
              </span>
            </div>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
      render: (time: string, record: ImportJob) => (
        <span style={{ fontSize: 12 }}>
          {time}
          {record.endTime && <br />}
          {record.endTime}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: ImportJob) => (
        <Space size="small" wrap>
          {record.type === 'database' && (
            <Button type="link" size="small" onClick={() => openImportJobResult(record)}>
              结果
            </Button>
          )}
          {(record.status === 'running' || record.status === 'waiting') && (
            <Popconfirm
              title="确认停止该导入运行？"
              onConfirm={() => handleStopImportJob(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                停止
              </Button>
            </Popconfirm>
          )}
          {['completed', 'error', 'paused'].includes(record.status) && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRestartImportJob(record)}
            >
              重启
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // const renderKnowledgeGraph = () => {
  //   const nodes = [
  //     { id: "1", name: "客户表", type: "entity" },
  //     { id: "2", name: "订单表", type: "entity" },
  //     { id: "3", name: "产品表", type: "entity" },
  //     { id: "4", name: "员工表", type: "entity" },
  //     { id: "5", name: "供应商表", type: "entity" },
  //     { id: "6", name: "客户ID", type: "attribute" },
  //     { id: "7", name: "姓名", type: "attribute" },
  //     { id: "8", name: "电话", type: "attribute" },
  //     { id: "9", name: "订单ID", type: "attribute" },
  //     { id: "10", name: "金额", type: "attribute" },
  //   ];

  //   const links = [
  //     { source: "1", target: "6", relation: "has" },
  //     { source: "1", target: "7", relation: "has" },
  //     { source: "1", target: "8", relation: "has" },
  //     { source: "2", target: "9", relation: "has" },
  //     { source: "2", target: "10", relation: "has" },
  //     { source: "2", target: "1", relation: "belongs_to" },
  //     { source: "2", target: "3", relation: "contains" },
  //     { source: "2", target: "4", relation: "handled_by" },
  //     { source: "3", target: "5", relation: "supplied_by" },
  //   ];

  //   return (
  //     <D3KnowledgeGraph
  //       data={{ nodes: nodes as any[], links: links as any[] }}
  //     />
  //   );
  // };

  const renderDataStats = () => {
    const runningJobs = importJobs.filter((j) => j.status === 'running');
    const failedJobs = importJobs.filter((j) => j.status === 'error');
    const totalDataSent = runningJobs.reduce((sum, j) => sum + j.dataSent, 0);
    const totalDataReceived = runningJobs.reduce((sum, j) => sum + j.dataReceived, 0);

    const statCardStyle: React.CSSProperties = {
      borderRadius: 18,
      boxShadow: '0 8px 28px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden',
    };

    const runningCardBgStyle: React.CSSProperties = {
      background: '#f0f5ff',
      position: 'relative',
    };

    const failedCardBgStyle: React.CSSProperties = {
      background: '#fff5f5',
      position: 'relative',
    };

    const statHeaderStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px 12px',
      borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
    };

    const statValueStyle: React.CSSProperties = {
      fontSize: 32,
      fontWeight: 700,
    };

    const statLabelStyle: React.CSSProperties = {
      fontSize: 13,
      color: '#64748b',
      marginTop: 4,
    };

    const dataTransferCardStyle: React.CSSProperties = {
      borderRadius: 18,
      boxShadow: '0 8px 28px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden',
    };

    const dataTransferBgStyle: React.CSSProperties = {
      background: '#f3f3f3',
    };

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card
            style={{ ...statCardStyle, ...runningCardBgStyle }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={statHeaderStyle}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>运行中任务</span>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 10,
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LoadingOutlined spin style={{ color: '#2563eb', fontSize: 18 }} />
              </div>
            </div>
            <div style={{ padding: '16px 20px 20px' }}>
              <div style={{ ...statValueStyle, color: '#333' }}>{runningJobs.length}</div>
              <div style={{ ...statLabelStyle, color: '#666' }}>个任务正在执行</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            style={{ ...statCardStyle, ...failedCardBgStyle }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={statHeaderStyle}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>失败任务</span>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 10,
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloseCircleOutlined style={{ color: '#dc2626', fontSize: 18 }} />
              </div>
            </div>
            <div style={{ padding: '16px 20px 20px' }}>
              <div style={{ ...statValueStyle, color: '#333' }}>{failedJobs.length}</div>
              <div style={{ ...statLabelStyle, color: '#666' }}>个任务执行失败</div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            style={{ ...dataTransferCardStyle, ...dataTransferBgStyle }}
            styles={{ body: { padding: 0 } }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px 12px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>数据传输</span>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ArrowUpOutlined style={{ color: '#16a34a', fontSize: 12 }} />
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>发送</span>
                </div>
                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ArrowDownOutlined style={{ color: '#2563eb', fontSize: 12 }} />
                  <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 500 }}>接收</span>
                </div>
              </div>
            </div>
            <Row>
              <Col span={12}>
                <div
                  style={{
                    padding: '20px 20px 16px',
                    borderRight: '1px solid rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ ...statValueStyle, color: '#16a34a' }}>
                    {(totalDataSent / 1024 / 1024).toFixed(2)}
                    <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>MB</span>
                  </div>
                  <div style={statLabelStyle}>数据发送量</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '20px 20px 16px' }}>
                  <div style={{ ...statValueStyle, color: '#2563eb' }}>
                    {(totalDataReceived / 1024 / 1024).toFixed(2)}
                    <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>MB</span>
                  </div>
                  <div style={statLabelStyle}>数据接收量</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    );
  };

  const renderAlerts = () => {
    const runningJobs = importJobs.filter(
      (job) => job.status === 'running' || job.status === 'paused',
    );

    if (runningJobs.length === 0) {
      return (
        <Empty
          description="暂无正在执行的任务"
          style={{ padding: '60px 0' }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    const items = runningJobs.map((job) => {
      const errorCount = job.alerts.filter((a) => a.level === 'error').length;
      const warningCount = job.alerts.filter((a) => a.level === 'warning').length;
      const infoCount = job.alerts.filter((a) => a.level === 'info').length;
      const totalCount = job.alerts.length;

      return {
        key: job.id,
        label: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '6px 4px',
            }}
          >
            <Space size={8}>
              {job.status === 'running' ? (
                <LoadingOutlined spin style={{ color: '#1890ff', fontSize: 14 }} />
              ) : (
                <PauseCircleOutlined style={{ color: '#faad14', fontSize: 14 }} />
              )}
              <span style={{ fontWeight: 600, fontSize: 13 }}>{job.name}</span>
            </Space>
            <Space size={4}>
              {errorCount > 0 && (
                <Tag
                  color="error"
                  style={{
                    margin: 0,
                    padding: '0 6px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {errorCount} 错误
                </Tag>
              )}
              {warningCount > 0 && (
                <Tag
                  color="warning"
                  style={{
                    margin: 0,
                    padding: '0 6px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {warningCount} 警告
                </Tag>
              )}
              {infoCount > 0 && (
                <Tag
                  color="processing"
                  style={{
                    margin: 0,
                    padding: '0 6px',
                    fontSize: 11,
                  }}
                >
                  {infoCount} 信息
                </Tag>
              )}
              {totalCount === 0 && (
                <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
                  正常
                </Tag>
              )}
            </Space>
          </div>
        ),
        children:
          job.alerts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '30px 20px',
                background: 'rgba(82, 196, 26, 0.05)',
                borderRadius: 8,
                margin: 8,
              }}
            >
              <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
              <div style={{ color: '#52c41a', fontWeight: 500 }}>运行正常，暂无告警</div>
            </div>
          ) : (
            <div style={{ padding: 4 }}>
              {job.alerts
                .sort((a, b) => dayjs(formatDateTime(b.time)).valueOf() - dayjs(formatDateTime(a.time)).valueOf())
                .slice(0, 8)
                .map((alert, idx) => {
                  const colors =
                    alert.level === 'error'
                      ? { bg: '#fff7f7', dot: '#ff4d4f', border: '#ffd6d6', label: '错误' }
                      : alert.level === 'warning'
                        ? { bg: '#fffaf0', dot: '#faad14', border: '#ffe7a3', label: '警告' }
                        : { bg: '#f5f9ff', dot: '#1890ff', border: '#cfe4ff', label: '信息' };

                  return (
                    <div
                      key={alert.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        marginBottom: 8,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderLeft: `3px solid ${colors.dot}`,
                        borderRadius: 6,
                        fontSize: 13,
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: colors.dot,
                          boxShadow: `0 0 0 3px ${colors.dot}1f`,
                          flexShrink: 0,
                        }}
                      />
                      <Tag
                        color={
                          alert.level === 'error'
                            ? 'error'
                            : alert.level === 'warning'
                              ? 'warning'
                              : 'processing'
                        }
                        style={{
                          margin: 0,
                          borderRadius: 4,
                          fontSize: 11,
                          lineHeight: '18px',
                          flexShrink: 0,
                        }}
                      >
                        {colors.label}
                      </Tag>
                      <span style={{ flex: 1, color: '#333' }}>{alert.content}</span>
                      <span style={{ color: '#94a3b8', fontSize: 12, flexShrink: 0 }}>
                        {(() => { const t = formatDateTime(alert.time); return (t.split(' ')[1] || t || '-'); })()}
                      </span>
                    </div>
                  );
                })}
            </div>
          ),
      };
    });

    return (
      <Collapse
        accordion
        items={items}
        activeKey={activeAlertKey}
        onChange={(keys) => setActiveAlertKey(keys as string[])}
        style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
        }}
        expandIcon={({ isActive }) => (
          <ArrowDownOutlined
            rotate={isActive ? 180 : 0}
            style={{
              color: '#000',
              fontSize: 12,
              marginTop: '16px',
              transition: 'transform 0.3s ease',
            }}
          />
        )}
      />
    );
  };

  return (
    <div className={styles.monitorPage}>
      {activeTab === 'monitor' && (
        <div key="monitor" className="slide-in-right">
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={18}>
              <Card
                style={{
                  borderRadius: 8,
                  border: '1px solid #edf0f5',
                }}
                styles={{
                  body: { padding: 20 },
                }}
              >
                {renderDataStats()}

                <Table
                  columns={monitorColumns}
                  dataSource={importJobs}
                  rowKey="id"
                  pagination={{ pageSize: 6 }}
                  size="middle"
                  style={{ minHeight: '60vh' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card
                title={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      width: '100%',
                    }}
                  >
                    <Space size={8}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: alertCount > 0 ? '#faad14' : '#52c41a',
                          boxShadow:
                            alertCount > 0
                              ? '0 0 0 4px rgba(250, 173, 20, 0.14), 0 0 12px rgba(250, 173, 20, 0.45)'
                              : '0 0 0 4px rgba(82, 196, 26, 0.12)',
                          animation: 'pulse 1.6s ease-in-out infinite',
                        }}
                      />
                      <WarningOutlined style={{ color: alertCount > 0 ? '#d48806' : '#64748b' }} />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 15,
                          color: '#1f2937',
                        }}
                      >
                        实时告警
                      </span>
                    </Space>
                    <Space size={6}>
                      <Tag
                        color={alertCount > 0 ? 'warning' : 'success'}
                        style={{ margin: 0, fontWeight: 600, fontSize: 12 }}
                      >
                        {alertCount > 0 ? `${alertCount} 条` : '正常'}
                      </Tag>
                      <Tag color="processing" style={{ margin: 0, fontSize: 12 }}>
                        实时
                      </Tag>
                    </Space>
                  </div>
                }
                style={{
                  borderRadius: 8,
                  border:
                    alertCount > 0 ? '1px solid rgba(250, 173, 20, 0.36)' : '1px solid #edf0f5',
                  background: '#f8fafc',
                  boxShadow: alertCount > 0 ? '0 8px 24px rgba(250, 173, 20, 0.10)' : 'none',
                  minHeight: 'calc(90vh - 80px)',
                }}
                bodyStyle={{ background: '#f8fafc', padding: 12 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    padding: '6px 8px',
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                    color: '#64748b',
                    fontSize: 12,
                  }}
                >
                  <span>监听中</span>
                  <span>更新 {currentTime || '--:--:--'}</span>
                </div>
                {renderAlerts()}
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {activeTab === 'document' && (
        <div key="document" className="slide-in-right">
          <Card>
            <Alert
              message={<span style={{ fontWeight: 600, fontSize: 15 }}>异构文档导入任务管理</span>}
              description={
                <div>
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>
                    创建文档导入任务，指定文件采集服务器IP和端口、读取路径、备份路径。
                    导入的文档将自动归入指定的
                    <span
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 600,
                        margin: '0 2px',
                      }}
                    >
                      知识库
                    </span>
                    和
                    <span
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 600,
                        margin: '0 2px',
                      }}
                    >
                      编目
                    </span>
                    。
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <strong>支持的格式：</strong>
                    <Tag color="default">docx</Tag>
                    <Tag color="default">xlsx</Tag>
                    <Tag color="default">pptx</Tag>
                    <Tag color="default">md</Tag>
                    <Tag color="default">txt</Tag>
                    <Tag color="default">pdf</Tag>
                    <Tag color="default">html</Tag>
                    <Tag color="default">eml</Tag>
                  </div>
                </div>
              }
              type="info"
              showIcon
              closable
              style={{
                marginBottom: 20,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #93c5fd',
                borderRadius: 8,
                boxShadow: '0 2px 12px rgba(59, 130, 246, 0.15)',
              }}
              icon={<InfoCircleOutlined style={{ color: '#2563eb', fontSize: 16 }} />}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Space size={12}>
                <Search
                  placeholder="搜索任务..."
                  allowClear
                  onSearch={setSearchText}
                  style={{ width: 200 }}
                />
                <Select
                  placeholder="筛选状态"
                  allowClear
                  onChange={setTypeFilter}
                  style={{ width: 120 }}
                  options={[
                    { label: '待导入', value: 'pending' },
                    { label: '运行中', value: 'running' },
                    { label: '已暂停', value: 'paused' },
                    { label: '已完成', value: 'completed' },
                    { label: '错误', value: 'error' },
                  ]}
                />
              </Space>
              <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleSelectFolder}>
                创建导入任务
              </Button>
            </div>

            <Table
              columns={docTaskColumns}
              dataSource={filteredDocTasks}
              rowKey="id"
              pagination={{ pageSize: 6 }}
            />
          </Card>
        </div>
      )}

      {activeTab === 'database' && (
        <div
          key="database"
          className="slide-in-right"
          style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)' }}
        >
          <div
            style={{
              padding: 24,
              borderRadius: 24,
              background: 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, #ffffff 55%)',
              border: '1px solid rgba(148,163,184,0.16)',
              boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 20,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '0.02em',
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 14,
                    }}
                  >
                    {databaseTypeOptions.map((option) => {
                      const config = typeConfig[option.value];
                      const count = dataSources.filter((item) => item.type === option.value).length;
                      const active = typeFilter === option.value;

                      return (
                        <Button
                          key={option.value}
                          size="small"
                          type={active ? 'primary' : 'default'}
                          icon={config.icon}
                          onClick={() => setTypeFilter(active ? null : option.value)}
                          style={{
                            height: 30,
                            borderRadius: 999,
                            paddingInline: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            borderColor: active ? config.accent : 'rgba(148,163,184,0.28)',
                            background: active ? config.accent : '#fff',
                            boxShadow: 'none',
                          }}
                        >
                          {config.label}
                          <span style={{ opacity: 0.78 }}>{count}</span>
                        </Button>
                      );
                    })}
                  </div>
                  {/* 结构化数据接入工作台 */}
                </div>
              </div>
              <Button
                type="primary"
                icon={<DatabaseOutlined />}
                onClick={handleAddDataSource}
                style={{
                  height: 42,
                  borderRadius: 12,
                  paddingInline: 18,
                  border: 'none',
                  boxShadow: '0 12px 24px rgba(37,99,235,0.24)',
                }}
              >
                新增数据源
              </Button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <Space size={12} wrap>
                <Search
                  placeholder="搜索数据源名称或用途"
                  allowClear
                  onSearch={setSearchText}
                  style={{ width: 260 }}
                />
                <Select
                  placeholder="筛选数据库类型"
                  allowClear
                  value={typeFilter || undefined}
                  onChange={setTypeFilter}
                  style={{ width: 180 }}
                  options={databaseTypeOptions}
                />
                <Button onClick={() => setTypeFilter(null)}>查看全部</Button>
              </Space>
            </div>

            <Row
              gutter={16}
              style={{ display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0 }}
            >
              <Col
                xs={24}
                xl={isGraphPreview ? 9 : 14}
                style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
              >
                <Card
                  title="数据源资产清单"
                  extra={
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                      共 {filteredDataSources.length} 个数据源
                    </span>
                  }
                  style={{
                    borderRadius: 20,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                  }}
                  styles={{ body: { flex: 1, overflow: 'auto' } }}
                >
                  <Table
                    columns={dataSourceColumns}
                    dataSource={filteredDataSources}
                    rowKey="id"
                    pagination={{ pageSize: 6 }}
                    scroll={{ x: 1100 }}
                    rowClassName={(record) =>
                      record.id === selectedSource?.id
                        ? 'source-asset-row source-asset-row-selected'
                        : 'source-asset-row'
                    }
                    onRow={(record) => ({
                      onClick: () => handleSelectSource(record),
                    })}
                  />
                </Card>
              </Col>
              <Col
                xs={24}
                xl={isGraphPreview ? 15 : 10}
                style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
              >
                <Card
                  title={selectedSource ? `${selectedSource.name} 预览` : '智能预览'}
                  extra={
                    selectedSource ? (
                      <Space size={8}>
                        <Tag color={typeConfig[selectedSource.type].color}>
                          {typeConfig[selectedSource.type].label}
                        </Tag>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleOpenSyncDrawer(selectedSource)}
                        >
                          配置同步
                        </Button>
                      </Space>
                    ) : null
                  }
                  style={{
                    borderRadius: 20,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                  }}
                  styles={{
                    body: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      flex: 1,
                      overflow: 'auto',
                    },
                  }}
                >
                  {renderOptimizedStructuredPreview()}
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      )}

      <Modal
        title={editRecord ? '编辑数据源' : '添加数据源'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleDataSourceSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="数据源名称"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="例如: 生产MySQL数据库" />
          </Form.Item>
          <Form.Item
            name="type"
            label="数据源类型"
            rules={[{ required: true, message: '请选择数据源类型' }]}
          >
            <Select
              placeholder="选择数据源类型"
              options={databaseTypeOptions}
              onChange={(value) => form.setFieldValue('port', typeConfig[value].port)}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="env"
                label="环境"
                rules={[{ required: true, message: '请选择环境' }]}
              >
                <Select
                  options={[
                    { label: '生产', value: '生产' },
                    { label: '分析', value: '分析' },
                    { label: '测试', value: '测试' },
                    { label: '知识', value: '知识' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="owner"
                label="归属团队"
                rules={[{ required: true, message: '请输入归属团队' }]}
              >
                <Input placeholder="例如：知识工程组" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="host"
                label="主机地址"
                rules={[{ required: true, message: '请输入主机地址' }]}
              >
                <Input placeholder="如 10.10.20.31 或 F:\\samples" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="port"
                label="端口"
                rules={[{ required: true, message: '请输入端口' }]}
              >
                <Input type="number" placeholder="3306 / 7687 / 0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="database" label="数据库/路径">
            <Input placeholder="数据库名、space 名或 sqlite 文件名" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="username" label="用户名">
                <Input placeholder="数据库用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="密码">
                <Input.Password placeholder="数据库密码" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="description"
            label="数据源说明"
            rules={[{ required: true, message: '请输入数据源说明' }]}
          >
            <Input.TextArea rows={3} placeholder="描述该数据源承载的数据、接入用途和展示重点" />
          </Form.Item>
          <Divider />
          <Button icon={<ApiOutlined />} onClick={handleTestConnection}>
            测试连接
          </Button>
        </Form>
      </Modal>

      <Modal
        title="创建文档导入任务"
        open={docTaskModalVisible}
        onCancel={() => setDocTaskModalVisible(false)}
        onOk={handleCreateDocImportTask}
        width={600}
        confirmLoading={loading}
      >
        <Form form={docTaskForm} layout="vertical">
          <Form.Item
            name="taskName"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如: 财务文档批量导入任务" />
          </Form.Item>

          <div
            style={{
              background: '#fafafa',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid #e0e0e0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                color: '#262626',
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              <CloudServerOutlined
                style={{
                  fontSize: '18px',
                  color: '#1890ff',
                  marginRight: '8px',
                }}
              />
              <span>文件采集服务器配置</span>
            </div>

            <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  name="serverIP"
                  label="服务器IP"
                  rules={[{ required: true, message: '请输入服务器IP' }]}
                >
                  <Input placeholder="例如: 192.168.1.200" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="serverPort"
                  label="端口"
                  rules={[{ required: true, message: '请输入端口' }]}
                >
                  <Input type="number" placeholder="8080" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="readPath"
              label="读取路径"
              rules={[{ required: true, message: '请输入读取路径' }]}
            >
              <Input
                placeholder="例如: /data/finance/docs"
                addonAfter={
                  <Tooltip title="预览文件夹信息">
                    <Button
                      type="text"
                      size="small"
                      icon={<FolderOpenOutlined />}
                      onClick={() => {
                        const path = docTaskForm.getFieldValue('readPath');
                        if (!path) {
                          message.warning('请先输入读取路径');
                          return;
                        }
                        message.loading({
                          content: '正在扫描文件夹...',
                          key: 'scanFolder',
                        });
                        setTimeout(() => {
                          message.success({
                            content: (
                              <div>
                                扫描完成：发现 <strong>23</strong> 个文件， 共{' '}
                                <strong>156.8 MB</strong>
                              </div>
                            ),
                            key: 'scanFolder',
                          });
                        }, 1500);
                      }}
                      style={{
                        color: '#1890ff',
                        cursor: 'pointer',
                        padding: '0 4px',
                      }}
                    />
                  </Tooltip>
                }
              />
            </Form.Item>

            <Form.Item
              name="backupPath"
              label="备份路径"
              rules={[{ required: true, message: '请输入备份路径' }]}
            >
              <Input placeholder="例如: /backup/finance/docs" />
            </Form.Item>
          </div>

          <div
            style={{
              background: '#fafafa',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid #e0e0e0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                color: '#262626',
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              <AimOutlined
                style={{
                  fontSize: '18px',
                  color: '#52c41a',
                  marginRight: '8px',
                }}
              />
              <span>目标配置</span>
            </div>

            <Form.Item name="targetKnowledgeBase" label="目标知识库">
              <Select placeholder="选择目标知识库" options={knowledgeBaseOptions} />
            </Form.Item>

            <Form.Item name="targetCatalog" label="目标编目">
              <Select placeholder="选择目标编目" options={catalogOptions} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Drawer
        title={selectedSource ? `${selectedSource.name} - 数据预览` : '数据预览'}
        placement="right"
        width={1080}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {selectedSource && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card
              style={{
                borderRadius: 20,
                background: `linear-gradient(135deg, ${typeConfig[selectedSource.type].accent}16 0%, rgba(255,255,255,0.96) 72%)`,
              }}
              extra={
                <Button
                  type="link"
                  icon={<SyncOutlined />}
                  onClick={() => handleOpenSyncDrawer(selectedSource)}
                >
                  调整同步策略
                </Button>
              }
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="记录总数"
                    value={selectedSource.recordCount}
                    prefix={<DatabaseOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="接入延迟"
                    value={selectedSource.latency}
                    suffix="ms"
                    prefix={<AimOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="同步策略"
                    value={syncModeConfig[selectedSource.syncMode].label}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Col>
              </Row>
              <Space size={[8, 8]} wrap style={{ marginTop: 16 }}>
                <Tag color={typeConfig[selectedSource.type].color}>
                  {typeConfig[selectedSource.type].label}
                </Tag>
                <Tag>{selectedSource.database}</Tag>
                <Tag color="default">{selectedSource.owner}</Tag>
                <Tag>{selectedSource.env}</Tag>
                <Tag>{selectedSource.lastSync}</Tag>
              </Space>
            </Card>
            {renderDatabaseExplorer(true)}
          </div>
        )}
      </Drawer>

      <Drawer
        title={selectedSource ? `${selectedSource.name} - 同步策略` : '同步策略'}
        placement="right"
        width={520}
        open={syncDrawerVisible}
        onClose={() => setSyncDrawerVisible(false)}
      >
        {selectedSource && (
          <Form form={syncForm} layout="vertical">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="同步策略配置"
              description="支持全量同步、增量同步，以及异常重试、跳过、记录告警等策略组合。"
            />
            <Form.Item
              name="mode"
              label="同步模式"
              rules={[{ required: true, message: '请选择同步模式' }]}
            >
              <Select
                options={[
                  { label: '全量同步', value: 'full' },
                  { label: '增量同步', value: 'incremental' },
                ]}
              />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, current) => prev.mode !== current.mode}>
              {({ getFieldValue }) =>
                getFieldValue('mode') === 'incremental' ? (
                  <Form.Item
                    name="incrementalField"
                    label="增量字段"
                    rules={[{ required: true, message: '请输入增量字段' }]}
                  >
                    <Input placeholder="如 updated_at / _id / event_time" />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
            <Form.Item
              name="frequency"
              label="触发频率"
              rules={[{ required: true, message: '请选择触发频率' }]}
            >
              <Select options={frequencyOptions} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="batchSize"
                  label="批处理大小"
                  rules={[{ required: true, message: '请输入批处理大小' }]}
                >
                  <Input type="number" placeholder="5000" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="maxRetries"
                  label="最大重试次数"
                  rules={[{ required: true, message: '请输入最大重试次数' }]}
                >
                  <Input type="number" placeholder="3" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="exceptionPolicy"
              label="异常策略"
              rules={[{ required: true, message: '请选择异常策略' }]}
            >
              <Select
                options={[
                  { label: '自动重试', value: 'retry' },
                  { label: '跳过异常', value: 'skip' },
                  { label: '记录告警', value: 'pause' },
                ]}
              />
            </Form.Item>
            <Form.Item name="notify" label="通知策略">
              <Select
                options={[
                  { label: '发送通知', value: true },
                  { label: '不发送通知', value: false },
                ]}
              />
            </Form.Item>
            <Space>
              <Button type="primary" onClick={handleSaveSyncPolicy}>
                保存并执行同步
              </Button>
              <Button onClick={() => setSyncDrawerVisible(false)}>取消</Button>
            </Space>
          </Form>
        )}
      </Drawer>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#262626' }}>任务详情</span>
          </div>
        }
        open={taskDetailDrawerVisible}
        onClose={() => {
          setTaskDetailDrawerVisible(false);
          setSelectedDocTask(null);
        }}
        width={900}
      >
        {selectedDocTask && (
          <div>
            <Card
              style={{
                marginBottom: 20,
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}
            >
              <Row gutter={24} align="middle">
                <Col span={16}>
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#595959',
                        marginBottom: 6,
                      }}
                    >
                      任务进度
                    </div>
                    <Progress
                      percent={selectedDocTask.progress}
                      status={
                        selectedDocTask.status === 'error'
                          ? 'exception'
                          : selectedDocTask.status === 'completed'
                            ? 'success'
                            : 'active'
                      }
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                    />
                  </div>
                </Col>
                <Col span={8}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '16px 0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: '#595959',
                        marginBottom: 8,
                      }}
                    >
                      当前状态
                    </div>
                    <Tag
                      color={statusConfig[selectedDocTask.status].color}
                      icon={statusConfig[selectedDocTask.status].icon}
                      style={{
                        fontSize: 14,
                        padding: '4px 16px',
                        borderRadius: '16px',
                      }}
                    >
                      {statusConfig[selectedDocTask.status].text}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card
              style={{
                marginBottom: 20,
                border: '1px solid #f0f0f0',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 20,
                  padding: '0 4px',
                }}
              >
                <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#262626',
                  }}
                >
                  基本信息
                </span>
              </div>
              <Row gutter={[24, 20]}>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <FileOutlined
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          marginBottom: 4,
                        }}
                      >
                        任务名称
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#262626',
                          fontWeight: 500,
                        }}
                      >
                        {selectedDocTask.name}
                      </div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <CloudServerOutlined
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          marginBottom: 4,
                        }}
                      >
                        服务器地址
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#262626',
                          fontWeight: 500,
                        }}
                      >
                        {selectedDocTask.serverIP}:{selectedDocTask.serverPort}
                      </div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <FolderOutlined
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          marginBottom: 4,
                        }}
                      >
                        读取路径
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#262626',
                          fontWeight: 500,
                          fontFamily: 'monospace',
                        }}
                      >
                        {selectedDocTask.readPath}
                      </div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <DatabaseOutlined
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          marginBottom: 4,
                        }}
                      >
                        备份路径
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#262626',
                          fontWeight: 500,
                          fontFamily: 'monospace',
                        }}
                      >
                        {selectedDocTask.backupPath}
                      </div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <DatabaseOutlined
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          marginBottom: 4,
                        }}
                      >
                        目标知识库
                      </div>
                      <Tag
                        color="blue"
                        style={{
                          fontSize: 13,
                          padding: '2px 12px',
                          borderRadius: '4px',
                        }}
                      >
                        {selectedDocTask.targetKnowledgeBase}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <AppstoreOutlined
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          marginBottom: 4,
                        }}
                      >
                        目标编目
                      </div>
                      <Tag
                        color="green"
                        style={{
                          fontSize: 13,
                          padding: '2px 12px',
                          borderRadius: '4px',
                        }}
                      >
                        {selectedDocTask.targetCatalog}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <ClockCircleOutlined
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          marginBottom: 4,
                        }}
                      >
                        开始时间
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#262626',
                          fontWeight: 500,
                        }}
                      >
                        {selectedDocTask.startTime}
                      </div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <CheckCircleOutlined
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8c8c8c',
                          marginBottom: 4,
                        }}
                      >
                        结束时间
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#262626',
                          fontWeight: 500,
                        }}
                      >
                        {selectedDocTask.endTime || '-'}
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {selectedDocTask.error && (
              <Alert
                message={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <WarningOutlined style={{ fontSize: 18 }} />
                    <span style={{ fontWeight: 500 }}>任务错误</span>
                  </div>
                }
                description={selectedDocTask.error}
                type="error"
                showIcon={false}
                style={{
                  marginBottom: 20,
                  border: '1px solid #ffccc7',
                  background: '#fff2f0',
                  borderRadius: '8px',
                }}
              />
            )}

            <Card
              style={{
                border: '1px solid #f0f0f0',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UnorderedListOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#262626',
                    }}
                  >
                    文件列表
                  </span>
                  <div
                    style={{
                      marginLeft: 'auto',
                      background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                      borderRadius: '16px',
                      padding: '6px 16px',
                      fontSize: 13,
                      color: '#0050b3',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <FileOutlined />
                    <span>{selectedDocTask.totalFiles}</span>
                    <span style={{ opacity: 0.7 }}>个文件</span>
                  </div>
                </div>
              }
            >
              <Table
                columns={[
                  {
                    title: '文件名',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string, record: DocFileInTask) => {
                      const config = docTypeConfig[record.type] || docTypeConfig.txt;
                      return (
                        <Space>
                          <Tag color={config.color} icon={config.icon}>
                            {config.label}
                          </Tag>
                          <span>{name}</span>
                        </Space>
                      );
                    },
                  },
                  {
                    title: '路径',
                    dataIndex: 'path',
                    key: 'path',
                    ellipsis: true,
                    render: (path: string) => (
                      <Tooltip title={path}>
                        <span style={{ fontSize: 12, color: '#999' }}>
                          {path.length > 30 ? '...' + path.slice(-30) : path}
                        </span>
                      </Tooltip>
                    ),
                  },
                  {
                    title: '大小',
                    dataIndex: 'size',
                    key: 'size',
                    width: 100,
                    render: (size: number) => {
                      if (size < 1024) return `${size} B`;
                      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
                      return `${(size / 1024 / 1024).toFixed(1)} MB`;
                    },
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    width: 110,
                    render: (status: string) => {
                      const config = statusConfig[status];
                      return (
                        <Tag color={config.color} icon={config.icon}>
                          {config.text}
                        </Tag>
                      );
                    },
                  },
                ]}
                dataSource={selectedDocTask.files}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </Card>
          </div>
        )}
      </Drawer>

      
      <Drawer
        title="导入结果汇总"
        width={720}
        open={taskResultDrawer}
        onClose={() => {
          setTaskResultDrawer(false);
          setTaskResultDetail(null);
        }}
      >
        <Spin spinning={taskResultLoading}>
          {taskResultDetail ? (
            <>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="任务">{taskResultDetail.taskName}</Descriptions.Item>
                <Descriptions.Item label="数据源">{taskResultDetail.dataSourceName || '-'}</Descriptions.Item>
                <Descriptions.Item label="累计落地条数">{taskResultDetail.totalRecordCount || 0}</Descriptions.Item>
                <Descriptions.Item label="最近状态">{taskResultDetail.lastRunStatus || '-'}</Descriptions.Item>
                <Descriptions.Item label="最近读取">{taskResultDetail.lastReadCount || 0}</Descriptions.Item>
                <Descriptions.Item label="最近写入">{taskResultDetail.lastWriteCount || 0}</Descriptions.Item>
                <Descriptions.Item label="最近失败">{taskResultDetail.lastFailCount || 0}</Descriptions.Item>
                <Descriptions.Item label="落地字节">{formatDataSize(taskResultDetail.lastByteCount)}</Descriptions.Item>
              </Descriptions>
              <Divider>按对象统计</Divider>
              <Table
                size="small"
                rowKey={(r) => `${r.objectName}-${r.objectKind}`}
                pagination={false}
                dataSource={taskResultDetail.objectStats || []}
                columns={[
                  { title: '对象', dataIndex: 'objectName' },
                  { title: '类型', dataIndex: 'objectKind', width: 100 },
                  { title: '条数', dataIndex: 'recordCount', width: 100 },
                  { title: '最近抽取', dataIndex: 'lastExtractedAt' },
                ]}
              />
            </>
          ) : (
            !taskResultLoading && <Empty description="暂无结果" />
          )}
        </Spin>
      </Drawer>

<style>{`
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-2px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(2px);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        .slide-in-right {
          animation: slideInFromRight 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ant-tabs-nav {
          margin-bottom: 16px;
        }
        .ant-statistic-title {
          font-size: 14px;
          color: #666;
        }
        .ant-statistic-content {
          font-size: 24px;
        }
        .source-asset-row {
          cursor: pointer;
          transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .source-asset-row:hover > td {
          background: rgba(37, 99, 235, 0.08) !important;
        }
        .source-asset-row-selected > td {
          background: rgba(37, 99, 235, 0.14) !important;
          box-shadow: inset 3px 0 0 #2563eb;
        }
      `}</style>
    </div>
  );
}
