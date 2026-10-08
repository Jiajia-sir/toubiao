import React, { useEffect, useMemo, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  AuditOutlined,
  BankOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  DiffOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FormOutlined,
  FundOutlined,
  GlobalOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  LockOutlined,
  MoreOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  ShopOutlined,
  StarOutlined,
  SyncOutlined,
  TeamOutlined,
  ThunderboltFilled,
  ToolOutlined,
  UploadOutlined,
  UserOutlined,
  WarningFilled,
} from '@ant-design/icons';
import DocumentFilePreview from '@/components/DocumentFilePreview';
import './index.less';

type ModalKey =
  | 'new-project'
  | 'recommend'
  | 'missing'
  | 'upload'
  | 'acceptance-upload'
  | 'similar'
  | 'reference'
  | 'ignore'
  | 'add-company'
  | 'risk-node'
  | 'warning'
  | 'version'
  | 'ai-record'
  | null;

type Project = {
  id: string;
  name: string;
  category: string;
  budget: string;
  stage: string;
  stageIndex: number;
  progress: number;
  color: string;
  unit: string;
  status: '进行中' | '已完成' | '待审核';
};

type NewProjectFormValues = {
  name: string;
  type: '货物' | '服务' | '工程';
  category: string;
  owner: string;
  department: string;
  funding?: string;
  budget: string;
  quantity?: string;
  planDate?: unknown;
  urgency: 'normal' | 'urgent' | 'critical';
  intention?: string;
};

type ProjectDetailData = {
  id: string;
  name: string;
  type: '货物' | '服务' | '工程';
  category: string;
  budget: string;
  usedBudget: string;
  budgetUsedPercent: number;
  method: string;
  planDate: string;
  owner: string;
  department: string;
  funding: string;
  quantity: string;
  intention: string;
  urgency: 'normal' | 'urgent' | 'critical';
  createdAt: string;
};

const PROCUREMENT_METHOD_OPTIONS = [
  { value: '公开招标', match: 96, description: '预算金额达到公开招标限额，竞争充分且符合制度要求。' },
  { value: '竞争性磋商', match: 68, description: '适用于技术方案需要进一步磋商、比选的采购项目。' },
  { value: '询价采购', match: 52, description: '适用于标准明确、市场价格相对透明的采购项目。' },
  { value: '单一来源采购', match: 36, description: '仅在符合单一来源法定条件时采用，需补充专项依据。' },
] as const;

const RECOMMENDED_METHOD = PROCUREMENT_METHOD_OPTIONS[0].value;

const DEFAULT_PROJECT_DETAIL: ProjectDetailData = {
  id: 'PRJ-2024-012',
  name: '2024年度办公设备集中采购',
  type: '货物',
  category: '计算机及办公设备',
  budget: '¥280,000',
  usedBudget: '¥182,000',
  budgetUsedPercent: 65,
  method: '公开招标',
  planDate: '2024-08-30',
  owner: '张明',
  department: '行政部',
  funding: '年度财政预算',
  quantity: '120 台 / 套',
  intention: '拟采购一批办公电脑、打印机及配套设备，用于新办公区员工办公使用。要求主流品牌、整机三年质保，支持批量部署与统一管理，交付周期不超过 45 天。',
  urgency: 'urgent',
  createdAt: '2024-05-08',
};

function parseBudget(value: unknown) {
  const amount = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function formatBudget(value: unknown) {
  const amount = parseBudget(value);
  return amount > 0 ? `¥${amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '¥0';
}

function formatDateValue(value: unknown) {
  if (value && typeof value === 'object' && 'format' in value && typeof value.format === 'function') {
    return value.format('YYYY-MM-DD');
  }
  return typeof value === 'string' ? value : '';
}

function urgencyLabel(value: ProjectDetailData['urgency']) {
  return value === 'critical' ? '特急' : value === 'urgent' ? '紧急' : '普通';
}

function createProjectDetail(values: NewProjectFormValues, method: string): ProjectDetailData {
  const budget = parseBudget(values.budget);
  const projectNumber = String(Date.now()).slice(-4).padStart(4, '0');
  return {
    id: `PRJ-${new Date().getFullYear()}-${projectNumber}`,
    name: values.name.trim(),
    type: values.type,
    category: values.category,
    budget: formatBudget(budget),
    usedBudget: '¥0',
    budgetUsedPercent: 0,
    method,
    planDate: formatDateValue(values.planDate),
    owner: values.owner,
    department: values.department,
    funding: values.funding || '未填写',
    quantity: values.quantity || '未填写',
    intention: values.intention?.trim() || '暂未填写采购意向',
    urgency: values.urgency,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

type WorkflowStage = {
  key: string;
  title: string;
  route: string;
  summary: string;
  action: string;
};

const workflowStageTitles = ['项目启动', '需求拟制', '文件形成', '供应商核查', '合同建议', '履约验收', '数据复盘'];

const workflowStages: WorkflowStage[] = [
  { key: 'startup', title: workflowStageTitles[0], route: '/procurement/projects/detail', summary: '项目基础信息、预算与负责人已确认。', action: '查看项目基础信息' },
  { key: 'requirement', title: workflowStageTitles[1], route: '/procurement/requirements', summary: '完善采购需求，完成 AI 合规检查并提交审核。', action: '进入需求拟制' },
  { key: 'documents', title: workflowStageTitles[2], route: '/procurement/documents', summary: '补齐立项材料，形成采购文件并提交审核。', action: '进入文件编制' },
  { key: 'suppliers', title: workflowStageTitles[3], route: '/procurement/suppliers', summary: '完成候选供应商添加、联合核查与风险确认。', action: '进入供应商核查' },
  { key: 'contract', title: workflowStageTitles[4], route: '/procurement/contracts', summary: '确认合同条款建议，生成合同草案并进入履约。', action: '进入合同建议' },
  { key: 'fulfillment', title: workflowStageTitles[5], route: '/procurement/contracts/fulfillment', summary: '跟进交付节点，完成现场验收并生成评价。', action: '进入履约验收' },
  { key: 'review', title: workflowStageTitles[6], route: '/procurement/records', summary: '归档全流程记录，完成项目复盘与数据沉淀。', action: '进入数据复盘' },
];

const workflowProgressByStage = [15, 30, 55, 68, 80, 92, 100];

function normalizeStageIndex(stageIndex: number) {
  return Math.min(Math.max(stageIndex, 0), workflowStages.length - 1);
}

function getWorkflowStage(stageIndex: number) {
  return workflowStages[normalizeStageIndex(stageIndex)];
}

function getStageColor(stageIndex: number, status: Project['status']) {
  if (status === '已完成' || stageIndex === workflowStages.length - 1) return '#10b981';
  if (stageIndex >= 4) return '#f59e0b';
  if (stageIndex === 0) return '#94a3b8';
  return '#2f66eb';
}

function getStageTone(stageIndex: number, status: Project['status']): 'blue' | 'green' | 'orange' | 'gray' {
  if (status === '已完成' || stageIndex === workflowStages.length - 1) return 'green';
  if (stageIndex >= 4) return 'orange';
  if (stageIndex === 0) return 'gray';
  return 'blue';
}

const projectRows: Project[] = [
  {
    id: 'PRJ-2024-012',
    name: '2024年度办公设备集中采购',
    category: '货物类',
    budget: '¥280,000',
    stage: workflowStageTitles[2],
    stageIndex: 2,
    progress: workflowProgressByStage[2],
    color: getStageColor(2, '进行中'),
    unit: '行政部',
    status: '进行中',
  },
  {
    id: 'PRJ-2024-009',
    name: '数据中心服务器扩容项目',
    category: '货物类',
    budget: '¥1,200,000',
    stage: workflowStageTitles[4],
    stageIndex: 4,
    progress: workflowProgressByStage[4],
    color: getStageColor(4, '进行中'),
    unit: '信息技术部',
    status: '进行中',
  },
  {
    id: 'PRJ-2024-018',
    name: '厂区绿化养护服务采购',
    category: '服务类',
    budget: '¥150,000',
    stage: workflowStageTitles[1],
    stageIndex: 1,
    progress: workflowProgressByStage[1],
    color: getStageColor(1, '进行中'),
    unit: '后勤保障部',
    status: '进行中',
  },
  {
    id: 'PRJ-2024-021',
    name: '办公楼装修改造工程',
    category: '工程类',
    budget: '¥860,000',
    stage: workflowStageTitles[0],
    stageIndex: 0,
    progress: workflowProgressByStage[0],
    color: getStageColor(0, '待审核'),
    unit: '行政部',
    status: '待审核',
  },
  {
    id: 'PRJ-2024-006',
    name: '年度法律咨询服务采购',
    category: '服务类',
    budget: '¥120,000',
    stage: workflowStageTitles[6],
    stageIndex: 6,
    progress: workflowProgressByStage[6],
    color: getStageColor(6, '已完成'),
    unit: '法务部',
    status: '已完成',
  },
];

const initialWorkflow: ProjectWorkflow = {
  currentStage: 2,
  completedStages: [0, 1],
  materialsReady: false,
};

type ProjectContextKey = string;

type ProjectRuntimeContext = {
  project: ProjectDetailData;
  workflow: ProjectWorkflow;
};

type ProcurementRuntime = {
  projects: Project[];
  contexts: Record<string, ProjectRuntimeContext>;
  newProjectId?: string;
};

function createProjectDetailFromRow(row: Project): ProjectDetailData {
  const type = row.category.replace(/类$/, '') as ProjectDetailData['type'];
  const budget = parseBudget(row.budget);
  return {
    id: row.id,
    name: row.name,
    type,
    category: row.category.replace(/类$/, ''),
    budget: row.budget,
    usedBudget: formatBudget(budget * row.progress / 100),
    budgetUsedPercent: row.progress,
    method: '公开招标',
    planDate: '待定',
    owner: '待分配',
    department: row.unit,
    funding: '未填写',
    quantity: '未填写',
    intention: `${row.name}的采购需求及履约信息。`,
    urgency: 'normal',
    createdAt: '2024-05-08',
  };
}

function createWorkflowForStage(stageIndex: number, status: Project['status'] = '进行中'): ProjectWorkflow {
  const normalizedStageIndex = normalizeStageIndex(stageIndex);
  return {
    currentStage: normalizedStageIndex,
    completedStages: Array.from({ length: normalizedStageIndex + (status === '已完成' ? 1 : 0) }, (_, index) => index),
    materialsReady: normalizedStageIndex > 2,
  };
}

function createInitialProjectContexts() {
  return projectRows.reduce<Record<string, ProjectRuntimeContext>>((contexts, row) => {
    contexts[row.id] = {
      project: row.id === DEFAULT_PROJECT_DETAIL.id ? DEFAULT_PROJECT_DETAIL : createProjectDetailFromRow(row),
      workflow: row.id === DEFAULT_PROJECT_DETAIL.id ? initialWorkflow : createWorkflowForStage(row.stageIndex, row.status),
    };
    return contexts;
  }, {});
}

// Each project keeps its own workflow snapshot so a list row cannot open another project's current stage.
let activeProjectContextKey: ProjectContextKey = DEFAULT_PROJECT_DETAIL.id;
let procurementRuntime: ProcurementRuntime = {
  projects: projectRows,
  contexts: createInitialProjectContexts(),
};

const processSteps = [
  { title: '立项审批', count: 3, percent: 72, color: '#2f66eb', desc: '平均耗时 2.1 天' },
  { title: '需求确认', count: 3, percent: 62, color: '#2f66eb', desc: '平均耗时 1.4 天' },
  { title: '采购执行', count: 3, percent: 45, color: '#7c5cff', desc: '平均耗时 3.6 天' },
  { title: '合同签订', count: 2, percent: 30, color: '#f59e0b', desc: '平均耗时 2.8 天' },
  { title: '验收结算', count: 1, percent: 18, color: '#10b981', desc: '平均耗时 4.2 天' },
];

type ProjectWorkflow = {
  currentStage: number;
  completedStages: number[];
  materialsReady: boolean;
};

type LegalWorkflowNode = {
  key: string;
  title: string;
  stageIndex: number;
  route: string;
  legalName: string;
  clause: string;
  gate: string;
  owner: string;
  requiredFiles: string[];
  optionalFiles: string[];
};

const legalWorkflowNodes: LegalWorkflowNode[] = [
  {
    key: 'project-initiation',
    title: '立项资料核验',
    stageIndex: 0,
    route: '/procurement/projects/detail',
    legalName: '政府采购需求管理办法',
    clause: '第十一条',
    gate: '项目名称、采购单位、预算与负责人已确认',
    owner: '采购人员',
    requiredFiles: ['项目立项申请表.pdf', '预算审批文件.pdf', '项目立项依据.pdf'],
    optionalFiles: ['资金来源说明.xlsx'],
  },
  {
    key: 'requirement-confirmation',
    title: '需求方案定稿',
    stageIndex: 1,
    route: '/procurement/requirements',
    legalName: '政府采购需求管理办法',
    clause: '第十二条、第十三条',
    gate: '采购意向已结构化，需求要素完整且通过 AI 合规检查',
    owner: '需求部门 / 采购人员',
    requiredFiles: ['采购需求说明.docx', '技术参数与验收标准.xlsx'],
    optionalFiles: ['市场调研记录.pdf', '历史相似项目对比.xlsx'],
  },
  {
    key: 'document-drafting',
    title: '采购文件起草',
    stageIndex: 2,
    route: '/procurement/documents/draft',
    legalName: '政府采购货物和服务招标投标管理办法',
    clause: '第十五条',
    gate: '需求审核通过，标准模板与采购方式匹配',
    owner: '采购人员',
    requiredFiles: ['采购文件初稿.docx', '评分标准.xlsx'],
    optionalFiles: ['采购文件模板.docx'],
  },
  {
    key: 'document-review',
    title: '采购文件合规会审',
    stageIndex: 2,
    route: '/procurement/documents/draft',
    legalName: '政府采购法实施条例',
    clause: '第三十四条',
    gate: '需求、评分标准、采购方式和法规引用一致',
    owner: '审核人员',
    requiredFiles: ['采购文件审核意见表.pdf'],
    optionalFiles: ['AI 文件质量检查报告.pdf'],
  },
  {
    key: 'announcement',
    title: '公告发布与留痕',
    stageIndex: 2,
    route: '/procurement/documents',
    legalName: '政府采购信息发布管理办法',
    clause: '第八条、第九条',
    gate: '采购文件正式定稿，公告信息经复核后发布',
    owner: '采购服务站',
    requiredFiles: ['采购公告.pdf', '正式采购文件.pdf'],
    optionalFiles: ['公告发布截图.png'],
  },
  {
    key: 'supplier-signup',
    title: '供应商资格预登记',
    stageIndex: 3,
    route: '/procurement/suppliers',
    legalName: '政府采购法',
    clause: '第二十二条',
    gate: '报名供应商完成资格材料提交与基础核验',
    owner: '采购服务站',
    requiredFiles: ['供应商报名清单.xlsx'],
    optionalFiles: ['供应商资格证明.zip'],
  },
  {
    key: 'site-qa',
    title: '现场踏勘及统一澄清',
    stageIndex: 3,
    route: '/procurement/suppliers',
    legalName: '政府采购货物和服务招标投标管理办法',
    clause: '第二十七条',
    gate: '答疑问题统一收集，澄清文件对所有供应商公开',
    owner: '采购人员',
    requiredFiles: ['答疑纪要.pdf'],
    optionalFiles: ['现场踏勘签到表.xlsx', '现场照片.zip'],
  },
  {
    key: 'bid-opening',
    title: '投标文件接收开标',
    stageIndex: 3,
    route: '/procurement/suppliers',
    legalName: '政府采购法实施条例',
    clause: '第三十四条',
    gate: '截止时间已到，投标文件接收记录完整且不可篡改',
    owner: '采购服务站',
    requiredFiles: ['开标记录表.pdf', '投标文件接收记录.xlsx'],
    optionalFiles: ['开标现场照片.zip'],
  },
  {
    key: 'evaluation',
    title: '专家评审与评分汇总',
    stageIndex: 3,
    route: '/procurement/suppliers',
    legalName: '政府采购评审专家管理办法',
    clause: '第二十条、第二十一条',
    gate: '评审专家回避检查通过，评分项与采购文件一致',
    owner: '评审人员',
    requiredFiles: ['评审报告.pdf', '评分汇总表.xlsx'],
    optionalFiles: ['专家签到表.pdf', '评审现场记录.zip'],
  },
  {
    key: 'result-announcement',
    title: '定标结果公示',
    stageIndex: 3,
    route: '/procurement/suppliers',
    legalName: '政府采购信息发布管理办法',
    clause: '第十五条',
    gate: '评审报告完成审核，结果公示内容与评审结论一致',
    owner: '采购服务站',
    requiredFiles: ['中标（成交）结果公告.pdf'],
    optionalFiles: ['结果公告发布截图.png'],
  },
  {
    key: 'contract-signing',
    title: '合同条款确认',
    stageIndex: 4,
    route: '/procurement/contracts/proposal',
    legalName: '政府采购法',
    clause: '第四十六条',
    gate: '合同条款与采购文件、响应承诺和评审澄清一致',
    owner: '采购人员 / 法务',
    requiredFiles: ['合同建议方案.docx', '正式合同.pdf'],
    optionalFiles: ['履约保证金凭证.pdf'],
  },
  {
    key: 'contract-fulfillment',
    title: '交付履约跟踪',
    stageIndex: 5,
    route: '/procurement/contracts/fulfillment',
    legalName: '政府采购法',
    clause: '第四十九条、第五十条',
    gate: '合同已生效，履约节点与付款计划已建立',
    owner: '采购人员 / 供应商',
    requiredFiles: ['履约计划.xlsx'],
    optionalFiles: ['交付计划确认单.pdf'],
  },
  {
    key: 'acceptance',
    title: '到货验收与结算',
    stageIndex: 5,
    route: '/procurement/acceptance',
    legalName: '政府采购法',
    clause: '第四十一条',
    gate: '合同约定的技术、合规、风险和时间要点均有验收记录',
    owner: '验收组',
    requiredFiles: ['验收申请单.pdf', '检测 / 测试报告.pdf', '验收报告.pdf'],
    optionalFiles: ['现场照片.zip', '验收签到表.xlsx'],
  },
  {
    key: 'archive',
    title: '项目资料归档',
    stageIndex: 6,
    route: '/procurement/records',
    legalName: '政府采购法',
    clause: '第四十二条',
    gate: '全流程必传文件齐全，操作日志和审核记录完整',
    owner: '采购服务站',
    requiredFiles: ['项目档案目录.xlsx', '全流程记录.pdf'],
    optionalFiles: ['项目复盘报告.pdf'],
  },
];

const statutoryStepTitles: Record<string, string> = {
  'project-initiation': '项目立项',
  'requirement-confirmation': '需求确定',
  'document-drafting': '文件编制',
  'document-review': '文件审核',
  announcement: '发布公告',
  'supplier-signup': '供应商报名',
  'site-qa': '踏勘 / 答疑',
  'bid-opening': '开标',
  evaluation: '评审',
  'result-announcement': '结果公示',
  'contract-signing': '合同签订',
  'contract-fulfillment': '合同履约',
  acceptance: '验收',
  archive: '资料归档',
};

function getStatutoryStepTitle(node: LegalWorkflowNode) {
  return statutoryStepTitles[node.key] || node.title;
}

const LEGAL_NODE_STAGE_MAP = legalWorkflowNodes.map((node) => node.stageIndex);

type LegalNodeIndicator = {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'orange' | 'purple';
};

const legalNodeIndicators: Record<string, LegalNodeIndicator> = {
  'project-initiation': { label: '预算锁定', value: '¥28万', hint: '负责人：张明', tone: 'blue' },
  'requirement-confirmation': { label: '需求完整度', value: '85%', hint: '技术 / 商务 / 验收', tone: 'purple' },
  'document-drafting': { label: '章节完成', value: '6 / 8', hint: 'AI 已生成初稿', tone: 'purple' },
  'document-review': { label: '待复核项', value: '3项', hint: '一致性与法规引用', tone: 'orange' },
  announcement: { label: '法定公示期', value: '7天', hint: '公告信息待发布', tone: 'blue' },
  'supplier-signup': { label: '已报名供应商', value: '12家', hint: '资格材料待核验', tone: 'green' },
  'site-qa': { label: '待答疑问题', value: '2条', hint: '1 条需统一澄清', tone: 'orange' },
  'bid-opening': { label: '接收投标文件', value: '8份', hint: '截止时间 09:30', tone: 'blue' },
  evaluation: { label: '评审专家', value: '5名', hint: '回避检查已通过', tone: 'green' },
  'result-announcement': { label: '公示剩余', value: '3天', hint: '结果公告待确认', tone: 'orange' },
  'contract-signing': { label: '差异待确认', value: '4项', hint: '付款与交付条款', tone: 'orange' },
  'contract-fulfillment': { label: '履约节点', value: '3 / 8', hint: '1 项即将超期', tone: 'blue' },
  acceptance: { label: '验收指标', value: '6 / 8', hint: '技术指标已映射', tone: 'green' },
  archive: { label: '档案完整度', value: '72%', hint: '缺 3 份归档材料', tone: 'purple' },
};

function getLegalNodeIndicator(node: LegalWorkflowNode) {
  return legalNodeIndicators[node.key] || { label: '节点进度', value: '—', hint: '待配置指标', tone: 'blue' as const };
}

function getLegalNodeStatus(index: number, workflow: ProjectWorkflow): 'done' | 'current' | 'pending' {
  const stageIndex = LEGAL_NODE_STAGE_MAP[index];
  if (workflow.completedStages.includes(stageIndex) || stageIndex < workflow.currentStage) return 'done';
  const currentStageFirstNode = LEGAL_NODE_STAGE_MAP.findIndex((item) => item === workflow.currentStage);
  return index === currentStageFirstNode ? 'current' : 'pending';
}

function getLegalNodeFileCount(node: LegalWorkflowNode, status: 'done' | 'current' | 'pending', workflow: ProjectWorkflow) {
  if (node.key === 'project-initiation') return workflow.materialsReady ? node.requiredFiles.length : node.requiredFiles.length - 1;
  if (status === 'done') return node.requiredFiles.length;
  if (status === 'current') return Math.min(1, node.requiredFiles.length);
  return 0;
}

function getProjectStageStatus(stageIndex: number, workflow: ProjectWorkflow): 'done' | 'current' | 'pending' {
  if (workflow.completedStages.includes(stageIndex) || stageIndex < workflow.currentStage) return 'done';
  return stageIndex === workflow.currentStage ? 'current' : 'pending';
}

type ProjectStageFileSummary = {
  requiredCount: number;
  uploadedCount: number;
  missingRequired: number;
  optionalCount: number;
  nodes: LegalWorkflowNode[];
};

function getProjectStageFileSummary(stageIndex: number, workflow: ProjectWorkflow): ProjectStageFileSummary {
  const nodes = legalWorkflowNodes.filter((node) => node.stageIndex === stageIndex);
  return nodes.reduce<ProjectStageFileSummary>((summary, node) => {
    const nodeIndex = legalWorkflowNodes.findIndex((item) => item.key === node.key);
    const nodeStatus = getLegalNodeStatus(nodeIndex, workflow);
    const uploadedCount = getLegalNodeFileCount(node, nodeStatus, workflow);
    return {
      ...summary,
      requiredCount: summary.requiredCount + node.requiredFiles.length,
      uploadedCount: summary.uploadedCount + uploadedCount,
      missingRequired: summary.missingRequired + node.requiredFiles.length - uploadedCount,
      optionalCount: summary.optionalCount + node.optionalFiles.length,
    };
  }, { requiredCount: 0, uploadedCount: 0, missingRequired: 0, optionalCount: 0, nodes });
}

type ProjectWorkflowContextValue = {
  workflow: ProjectWorkflow;
  project: ProjectDetailData;
  markMaterialsReady: () => void;
  completeStage: (stageIndex?: number) => boolean;
};

const ProjectWorkflowContext = React.createContext<ProjectWorkflowContextValue | null>(null);

function useProjectWorkflow() {
  const context = React.useContext(ProjectWorkflowContext);
  if (!context) {
    throw new Error('useProjectWorkflow must be used inside ProcurementPortal');
  }
  return context;
}

const requirementCards = [
  { title: '续航能力', text: '续航不少于 12 小时（连续巡检模式）', tone: 'purple' },
  { title: '防护等级', text: '防护等级不低于 IP67（防尘防水）', tone: 'purple' },
  { title: '数据接口', text: '支持标准数据接口，可与现有巡检系统对接', tone: 'purple' },
  { title: '其他要求', text: '屏幕尺寸不小于 6 英寸，支持手套触控；整机重量不超过 320g。', tone: 'gray' },
];

const auditProblems = [
  {
    title: '品牌倾向',
    level: '高风险',
    original: '要求采用华为、联想等同档次品牌产品',
    reason: '直接列举特定品牌名称，构成倾向性条款，可能限制潜在供应商参与竞争。',
    suggestion: '删除品牌名称，改为“同等性能的通用配置，需提供第三方检测报告佐证指标”。',
  },
  {
    title: '供应商业绩门槛过高',
    level: '高风险',
    original: '投标人须具备近 3 年不少于 5 个同类项目业绩，单个合同金额不低于 200 万元',
    reason: '本项目预算 48 万元，却要求单个合同金额不低于 200 万元，门槛显著高于项目规模。',
    suggestion: '建议调整为“近 3 年不少于 2 个同类项目业绩，单个合同金额不低于 50 万元”。',
  },
  {
    title: '技术要求与验收标准不一致',
    level: '中风险',
    original: '技术要求：续航不少于 12 小时；验收要求：仅进行开机功能测试',
    reason: '技术要求提出性能指标，但验收环节未设置对应检测项，指标无法被有效验证。',
    suggestion: '在验收要求中补充“续航实测（抽检 5 台，连续巡检模式不少于 12 小时）”。',
  },
  {
    title: '缺失安装调试完成时间',
    level: '中风险',
    original: '商务要求中约定“报价含运输、安装、调试”，但未明确完成时间',
    reason: '缺少时间节点约定，履约过程中容易产生交付延期争议。',
    suggestion: '补充“到货后 7 个工作日内完成安装调试并通过初步验收”。',
  },
];

const fileMaterials = [
  { name: '项目立项申请表', file: '项目立项申请表.pdf', size: '2.4 MB', status: '已上传', required: true },
  { name: '预算审批文件', file: '预算审批文件.pdf', size: '1.8 MB', status: '已上传', required: true },
  { name: '项目立项依据', file: '', size: '', status: '缺失', required: true },
  { name: '采购需求说明', file: '采购需求说明_v0.2.docx', size: '', status: '待完善', required: false },
];

const contracts = [
  { title: '交付周期', source: '采购需求·商务要求·第 2 条', sourceValue: '30 天交付', result: '25 天交付', kind: '优于原要求', color: 'green' },
  { title: '培训服务', source: '采购文件未要求培训', sourceValue: '采购文件未要求培训', result: '提供 2 天驻场培训', kind: '新增承诺', color: 'blue' },
  { title: '质保期限', source: '采购需求·商务要求·第 1 条', sourceValue: '整机质保 3 年', result: '整机质保 3 年 + 电池质保 5 年', kind: '优于原要求', color: 'green' },
  { title: '付款条件', source: '采购需求·商务要求·第 4 条', sourceValue: '验收合格后 30 日内支付 90%', result: '要求合同签订后预付 30%', kind: '存在偏离', color: 'orange' },
];

const supplierCards = [
  { name: '华科智能设备有限公司', code: '91440300MA5F8K2X3D', capital: '2,000 万元', founded: '2015-03-12', risk: 62, tone: 'orange', relation: '2 项司法提示' },
  { name: '中联数字科技有限公司', code: '91440300MA5G7T9L2K', capital: '5,000 万元', founded: '2018-07-25', risk: 22, tone: 'green', relation: '无司法记录' },
];

type ProcurementRecord = {
  title: string;
  type: string;
  tone: 'blue' | 'green' | 'purple' | 'orange';
  detail: string;
  date: string;
  user: string;
  files: string[];
};

const recordItems: ProcurementRecord[] = [
  { title: '创建项目', type: '项目启动', tone: 'blue', detail: '创建采购项目「2024年度办公设备集中采购」，预算金额 ¥480,000，采购方式：公开招标。', date: '2024-05-08 09:20', user: '张明', files: ['项目基础信息表.pdf', '采购方式推荐报告.pdf'] },
  { title: '文件上传', type: '需求拟制', tone: 'green', detail: '上传「项目立项申请表.pdf」，并提交「预算审批文件.pdf」，材料清单更新为必备 2/3 已上传。', date: '2024-05-09 11:05', user: '李静', files: ['项目立项申请表.pdf', '预算审批文件.pdf'] },
  { title: '文件审核', type: '需求拟制', tone: 'green', detail: '审核立项材料与预算审批文件，核对无误后审核通过，允许进入需求拟制环节。', date: '2024-05-16 14:30', user: '王强', files: ['立项材料审核意见.pdf'] },
  { title: 'AI 智能检查', type: '需求拟制', tone: 'purple', detail: 'AI 对采购需求执行合规检查，共发现 4 项问题：品牌倾向、供应商业绩门槛过高、技术要求与验收标准不一致、缺失安装调试完成时间。', date: '2024-05-18 10:12', user: 'AI 系统', files: ['AI需求合规检查报告.pdf'] },
  { title: '建议采纳 / 忽略', type: '需求拟制', tone: 'purple', detail: '针对 AI 检查结果处理：采纳 2 项、人工修改 1 项、忽略（人工保留）1 项，并填写人工处理意见留痕。', date: '2024-05-21 10:58', user: '张明', files: ['需求问题处理记录.pdf'] },
  { title: '采购文件生成', type: '文件形成', tone: 'blue', detail: '基于《货物类公开招标标准采购文件》生成正式采购文件，版本更新至 V1.3，共 8 个标准章节。', date: '2024-06-05 16:40', user: '张明', files: ['公开招标采购文件_V1.3.docx', '采购文件质量检查报告.pdf'] },
  { title: '风险核查', type: '供应商核查', tone: 'orange', detail: '对华科智能设备有限公司与中联数字科技有限公司发起联合核查，识别出两家供应商存在交叉任职线索。', date: '2024-06-15 10:22', user: '张明', files: ['供应商联合核查报告.pdf', '企业关系图谱.png'] },
  { title: '合同确认', type: '合同建议', tone: 'green', detail: '确认合同条款，将「25 天交付」「电池质保 5 年」等供应商承诺写入合同，生成 HT-2024-0126 并完成签订。', date: '2024-06-18 09:15', user: '张明', files: ['合同草案_HT-2024-0126.docx', '合同签署版.pdf'] },
  { title: '履约预警', type: '履约验收', tone: 'orange', detail: '系统检测「设备到货」节点距计划日期仅剩 3 天未完成交付，自动触发预警并推送至责任人李强。', date: '2024-08-17 08:00', user: '系统', files: ['履约预警通知.pdf'] },
  { title: '验收完成', type: '履约验收', tone: 'green', detail: '完成现场验收：到货 120 台、续航实测 12.5 小时、IP67 通过，验收结论合格，并生成验收报告与供应商履约评价。', date: '2024-08-18 15:30', user: '张明、王强', files: ['验收报告_YS-2024-0126.pdf', '现场验收照片.zip', '供应商履约评价表.pdf'] },
];

let procurementRuntimeAuditRecords: ProcurementRecord[] = [];

const recordFilePreviewDetails: Record<string, string> = {
  '项目基础信息表.pdf': '项目名称：2024年度办公设备集中采购\n采购单位：南京市政务服务中心\n采购方式：公开招标\n预算金额：人民币 480,000 元\n项目负责人：张明\n项目概况：统一采购办公终端设备 120 台，满足办公、巡检和数据接入场景。',
  '采购方式推荐报告.pdf': '推荐采购方式：公开招标\n推荐依据：项目预算、采购品类和市场供应情况满足公开竞争条件。\n风险提示：不得通过拆分采购标的规避公开招标，应在采购文件中留存方式论证和审批依据。',
  '项目立项申请表.pdf': '立项事项：2024年度办公设备集中采购\n申请部门：综合管理部\n申请金额：人民币 480,000 元\n立项结论：同意进入需求确定阶段。',
  '预算审批文件.pdf': '资金来源：部门年度采购预算\n批复预算：人民币 480,000 元\n预算科目：办公设备购置\n审批状态：已审批。',
  '立项材料审核意见.pdf': '审核结论：通过\n审核范围：项目基础信息、立项申请、预算审批文件\n审核意见：项目名称、采购单位、预算金额和资金来源已核对一致，允许进入需求拟制环节。',
  'AI需求合规检查报告.pdf': 'AI 检查结论：发现 4 项待处理问题\n1. 品牌倾向性表述\n2. 供应商业绩门槛与项目规模不匹配\n3. 技术要求与验收标准不一致\n4. 缺少安装调试完成时间\n处理要求：由采购人员逐项确认并保留修改留痕。',
  '需求问题处理记录.pdf': '问题处理汇总：采纳建议 2 项、人工修改 1 项、人工保留 1 项\n处理人：张明\n处理说明：已删除品牌限定，调整业绩门槛，补充续航检测和安装调试完成时间。',
  '公开招标采购文件_V1.3.docx': '采购文件版本：V1.3\n采购方式：公开招标\n章节：投标邀请、供应商须知、采购需求、评审标准、合同条款、投标文件格式\n定稿状态：已完成 AI 质量检查，待正式发布。',
  '采购文件质量检查报告.pdf': '检查范围：需求一致性、评分对应性、格式规范性、法规完整性\n检查结果：通过\n待人工确认：付款条款、交付节点和验收标准的最终表述。',
  '供应商联合核查报告.pdf': '核查对象：华科智能设备有限公司、中联数字科技有限公司\n核查范围：信用、处罚、失信、股权关联、法人及高管交叉任职\n核查结论：发现 1 条交叉任职线索，已提交人工复核。',
  '企业关系图谱.png': '关系图谱说明\n华科智能设备有限公司 —— 张伟（董事） —— 中联数字科技有限公司\n关系类型：高管交叉任职\n数据状态：第三方关联信息，需结合工商公示信息复核。',
  '合同草案_HT-2024-0126.docx': '合同编号：HT-2024-0126\n供应商：华科智能设备有限公司\n合同金额：人民币 462,000 元\n交付周期：25 天\n质保期限：整机 3 年，电池 5 年\n验收标准：续航实测不少于 12 小时，防护等级达到 IP67。',
  '合同签署版.pdf': '合同状态：已签署\n签订日期：2024-06-18\n合同金额：人民币 462,000 元\n核心承诺：25 天交付、电池质保 5 年、提供 2 天驻场培训。',
  '履约预警通知.pdf': '预警类型：设备到货即将超期\n计划日期：2024-08-20\n当前状态：距离计划日期 3 天\n责任人：李强（供应商）\n处理要求：及时反馈交付计划并上传物流或到货证明。',
  '验收报告_YS-2024-0126.pdf': '验收报告编号：YS-2024-0126\n验收日期：2024-08-18\n到货数量：120 台\n续航实测：12.5 小时\n防护等级：IP67 通过\n验收结论：合格。',
  '现场验收照片.zip': '现场验收影像资料清单\n1. 厂区外观照片\n2. 设备配件照片\n3. 安装环境照片\n资料状态：已归档，关联验收报告 YS-2024-0126。',
  '供应商履约评价表.pdf': '供应商：华科智能设备有限公司\n综合得分：88 分\n交付及时性：90 分\n产品质量：92 分\n服务响应：82 分\n评价结论：履约表现良好，服务响应仍有提升空间。',
};

const buildRecordFilePreviewContent = (record: ProcurementRecord, name: string) => {
  const detail = recordFilePreviewDetails[name] || `${record.detail}\n\n该文件为本条全过程记录的关联材料，已按项目内置演示数据归档。`;
  return [
    name,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `所属记录：${record.title}`,
    `记录类型：${record.type}`,
    `归档时间：${record.date}`,
    `归档人：${record.user}`,
    '',
    detail,
  ].join('\n');
};

const buildRecordFilePreviewUrl = (record: ProcurementRecord, name: string) =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(buildRecordFilePreviewContent(record, name))}`;

function getProjectContextKey(search: string): ProjectContextKey {
  const params = new URLSearchParams(search);
  const projectId = params.get('projectId');
  if (projectId && procurementRuntime.contexts[projectId]) return projectId;
  if (params.get('context') === 'new' && procurementRuntime.newProjectId) return procurementRuntime.newProjectId;
  return DEFAULT_PROJECT_DETAIL.id;
}

function getRuntimeContext(contextKey: ProjectContextKey): ProjectRuntimeContext {
  return procurementRuntime.contexts[contextKey] || procurementRuntime.contexts[DEFAULT_PROJECT_DETAIL.id];
}

const projectWorkflowRoutes = [
  '/procurement/projects/detail',
  '/procurement/requirements',
  '/procurement/documents',
  '/procurement/suppliers',
  '/procurement/contracts',
  '/procurement/acceptance',
  '/procurement/records',
];

function go(path: string) {
  const isWorkflowRoute = projectWorkflowRoutes.some((route) => path === route || path.startsWith(`${route}/`));
  if (isWorkflowRoute && activeProjectContextKey !== DEFAULT_PROJECT_DETAIL.id && !path.includes('projectId=')) {
    const separator = path.includes('?') ? '&' : '?';
    history.push(`${path}${separator}projectId=${encodeURIComponent(activeProjectContextKey)}`);
    return;
  }
  history.push(path);
}

function getProjectDetailPath(project: Project) {
  const stage = getWorkflowStage(project.stageIndex);
  return `/procurement/projects/detail?projectId=${encodeURIComponent(project.id)}&stage=${stage.key}`;
}

function syncProjectRowWithWorkflow(projects: Project[], projectId: string, workflow: ProjectWorkflow): Project[] {
  const stageIndex = normalizeStageIndex(workflow.currentStage);
  const isCompleted = workflow.completedStages.includes(workflowStages.length - 1);
  return projects.map((item): Project => {
    if (item.id !== projectId) return item;
    const status: Project['status'] = isCompleted ? '已完成' : item.status === '待审核' && stageIndex === 0 ? '待审核' : '进行中';
    return {
      ...item,
      stage: getWorkflowStage(stageIndex).title,
      stageIndex,
      progress: workflowProgressByStage[stageIndex],
      color: getStageColor(stageIndex, status),
      status,
    };
  });
}

function PageTitle({
  breadcrumb,
  title,
  subtitle,
  actions,
}: {
  breadcrumb?: string[];
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="procurement-title-row">
      <div>
        {breadcrumb && (
          <div className="procurement-breadcrumb">
            {breadcrumb.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && <ArrowRightOutlined />}
                <span className={index === breadcrumb.length - 1 ? 'current' : ''}>{item}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <div className="procurement-title-main">
          <div className="procurement-title-icon"><ProjectOutlined /></div>
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <Space className="procurement-title-actions">{actions}</Space>}
    </div>
  );
}

function Panel({
  title,
  extra,
  children,
  className = '',
}: {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`procurement-panel ${className}`} bordered={false}>
      {(title || extra) && (
        <div className="panel-title-row">
          <h2>{title}</h2>
          {extra && <div>{extra}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}

function MetricCard({
  icon,
  value,
  label,
  accent = 'blue',
  badge,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: 'blue' | 'orange' | 'purple' | 'red' | 'green';
  badge?: string;
}) {
  return (
    <Card className="metric-card" bordered={false}>
      <div className={`metric-icon ${accent}`}>{icon}</div>
      {badge && <span className={`metric-badge ${accent}`}>{badge}</span>}
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </Card>
  );
}

function StatusPill({
  children,
  tone = 'blue',
}: {
  children: React.ReactNode;
  tone?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray';
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function PageTabs({
  active,
  onChange,
  items,
}: {
  active: string;
  onChange: (key: string) => void;
  items: Array<{ key: string; label: string }>;
}) {
  return (
    <div className="page-tabs">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={active === item.key ? 'active' : ''}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Workbench({ onOpenModal, projects }: { onOpenModal: (key: ModalKey) => void; projects: Project[] }) {
  const [projectFilter, setProjectFilter] = useState<'all' | 'doing' | 'done'>('all');
  const visibleProjects = useMemo(() => projectFilter === 'all' ? projects : projects.filter((item) => projectFilter === 'doing' ? item.status === '进行中' : item.status === '已完成'), [projectFilter, projects]);
  return (
    <>
      <PageTitle
        title="早上好，张明 👋"
        subtitle="今天是 2024年6月15日 星期六，您有 8 项待办事项等待处理"
        actions={
          <>
            <Button icon={<TeamOutlined />} onClick={() => go('/procurement/roles')}>切换角色</Button>
            <Button icon={<FundOutlined />} onClick={() => go('/procurement-cockpit')}>数据驾驶舱</Button>
            <Button icon={<DownloadOutlined />} onClick={() => message.success('报表已生成，正在下载')}>导出报表</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => onOpenModal('new-project')}>
              新建采购项目
            </Button>
          </>
        }
      />
      <Row gutter={[16, 16]} className="metric-grid">
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<ProjectOutlined />} value="12" label="在办项目" badge="↑ 2" /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<AuditOutlined />} value="8" label="我的待办" accent="orange" badge="3项紧急" /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<FileTextOutlined />} value="5" label="待审核" accent="purple" badge="待处理" /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<WarningFilled />} value="3" label="风险提醒" accent="red" badge="需关注" /></Col>
      </Row>
      <Panel
        title={<><ProjectOutlined /> 项目阶段进度 <span className="panel-count">共 12 个在办</span></>}
        extra={<Button type="link" onClick={() => go('/procurement/projects')}>查看全部项目 <ArrowRightOutlined /></Button>}
        className="process-panel"
      >
        <div className="process-track">
          {processSteps.map((step, index) => (
            <React.Fragment key={step.title}>
              <div className="process-step">
                <div className="process-step-head">
                  <span className="process-index">0{index + 1}</span>
                  <strong>{step.title}</strong>
                  <b>{step.count}</b>
                </div>
                <Progress percent={step.percent} showInfo={false} strokeColor={step.color} trailColor="#e8edf5" />
                <span>{step.desc}</span>
              </div>
              {index < processSteps.length - 1 && <ArrowRightOutlined className="process-arrow" />}
            </React.Fragment>
          ))}
        </div>
      </Panel>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Panel
            title={<><FolderOpenOutlined /> 我的项目列表</>}
            extra={<Space><Button type={projectFilter === 'all' ? 'primary' : 'default'} size="small" onClick={() => setProjectFilter('all')}>全部</Button><Button type={projectFilter === 'doing' ? 'primary' : 'default'} size="small" onClick={() => setProjectFilter('doing')}>进行中</Button><Button type={projectFilter === 'done' ? 'primary' : 'default'} size="small" onClick={() => setProjectFilter('done')}>已完成</Button></Space>}
          >
            <Table<Project>
              rowKey="id"
              pagination={false}
              columns={projectColumns}
              dataSource={visibleProjects}
              onRow={(record) => ({ onClick: () => go(getProjectDetailPath(record)) })}
              className="clickable-table"
            />
          </Panel>
        </Col>
        <Col xs={24} xl={7}>
          <Panel title={<><AuditOutlined /> 我的待办 <Badge count={8} /></>} extra={<Button type="link" onClick={() => go('/procurement/projects')}>查看全部</Button>}>
            <div className="todo-list">
              {['审批《办公设备采购申请》', '确认供应商资质审核结果', '填写第三季度采购计划', '审阅服务器采购合同条款'].map((item, index) => (
                <div className="todo-item" key={item}>
                  <Checkbox />
                  <div><strong>{item}</strong><span><ClockCircleOutlined /> {index + 2} 小时前 · {index % 2 ? '供应商管理' : '待我审批'}</span></div>
                  <StatusPill tone={index === 0 || index === 3 ? 'red' : index === 1 ? 'orange' : 'gray'}>{index === 0 || index === 3 ? '紧急' : index === 1 ? '中等' : '普通'}</StatusPill>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title={<><WarningFilled /> 风险提醒 <Badge count={3} /></>} className="risk-panel">
            <div className="risk-list">
              <div className="risk-item red"><strong>预算超支风险</strong><span>厂区绿化养护项目已使用预算 112%，超出计划 ¥18,000</span></div>
              <div className="risk-item orange"><strong>供应商资质即将到期</strong><span>深圳市华创科技有限公司资质将于 15 天后到期</span></div>
              <div className="risk-item orange"><strong>交付进度延期</strong><span>数据中心扩容项目交付延期 3 天，需协调供应商</span></div>
            </div>
          </Panel>
        </Col>
      </Row>
    </>
  );
}

const projectColumns: ColumnsType<Project> = [
  { title: '项目名称', dataIndex: 'name', render: (_, record) => <div className="project-name-cell"><strong>{record.name}</strong><span>{record.id} · {record.unit}</span></div> },
  { title: '品类', dataIndex: 'category', render: (value) => <StatusPill tone="blue">{value}</StatusPill> },
  { title: '预算金额', dataIndex: 'budget', render: (value) => <strong>{value}</strong> },
  { title: '当前阶段', dataIndex: 'stage', render: (_, record) => <div className="project-stage-cell"><StatusPill tone={getStageTone(record.stageIndex, record.status)}>{getWorkflowStage(record.stageIndex).title}</StatusPill><span>第 {record.stageIndex + 1} / {workflowStages.length} 阶段</span></div> },
  { title: '进度', dataIndex: 'progress', render: (value, record) => <div className="table-progress"><Progress percent={value} showInfo={false} strokeColor={record.color} /><span>{value}%</span></div> },
  { title: '操作', render: (_, record) => <Button type="link" onClick={(event) => { event.stopPropagation(); go(getProjectDetailPath(record)); }}>查看当前阶段</Button> },
];

function ProjectsPage({ onOpenModal, projects, onUpdateStatus }: { onOpenModal: (key: ModalKey) => void; projects: Project[]; onUpdateStatus?: (projectId: string, status: Project['status']) => void }) {
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const data = useMemo(() => projects.filter((item) => {
    const matchKeyword = !keyword || `${item.name}${item.id}${item.unit}`.includes(keyword);
    const matchStatus = filter === 'all' || (filter === 'doing' && item.status === '进行中') || (filter === 'done' && item.status === '已完成') || (filter === 'review' && item.status === '待审核');
    const matchCategory = categoryFilter === 'all' || item.category.includes(categoryFilter === 'goods' ? '货物' : categoryFilter === 'service' ? '服务' : '工程');
    return matchKeyword && matchStatus && matchCategory;
  }), [categoryFilter, filter, keyword, projects]);
  const columns = useMemo<ColumnsType<Project>>(() => [
    ...projectColumns.slice(0, 4),
    {
      title: '状态管理',
      dataIndex: 'status',
      render: (value: Project['status'], record) => (
        <Select
          size="small"
          value={value}
          options={[{ value: '进行中', label: '进行中' }, { value: '已完成', label: '已完成' }, { value: '待审核', label: '待审核' }]}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(nextValue) => onUpdateStatus?.(record.id, nextValue as Project['status'])}
        />
      ),
    },
    ...projectColumns.slice(4),
  ], [onUpdateStatus]);
  return (
    <>
      <PageTitle title="项目管理" subtitle="统一管理采购项目全生命周期，实时掌握项目进度与风险" actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => onOpenModal('new-project')}>新建采购项目</Button>} />
      <Panel>
        <div className="filter-bar">
          <Input prefix={<SearchOutlined />} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索项目名称 / 编号 / 部门" allowClear />
          <Select value={filter} onChange={setFilter} options={[{ value: 'all', label: '全部状态' }, { value: 'doing', label: '进行中' }, { value: 'review', label: '待审核' }, { value: 'done', label: '已完成' }]} />
          <Select value={categoryFilter} onChange={setCategoryFilter} options={[{ value: 'all', label: '全部品类' }, { value: 'goods', label: '货物类' }, { value: 'service', label: '服务类' }, { value: 'engineering', label: '工程类' }]} />
          <Button icon={<DownloadOutlined />} onClick={() => message.success(`已导出 ${data.length} 个项目`)}>导出列表</Button>
        </div>
        <Table<Project> rowKey="id" columns={columns} dataSource={data} pagination={{ pageSize: 8, showTotal: (total) => `共 ${total} 个项目` }} onRow={(record) => ({ onClick: () => go(getProjectDetailPath(record)) })} className="clickable-table" />
      </Panel>
    </>
  );
}

function ProjectDetailStageTimeline() {
  const { workflow, project } = useProjectWorkflow();
  const currentStage = normalizeStageIndex(workflow.currentStage);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById(`project-detail-stage-${workflowStages[currentStage].key}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    return () => window.clearTimeout(timer);
  }, [currentStage, project.id]);
  return (
    <Panel className="detail-stage-panel" title={<><SyncOutlined /> 项目阶段时间线</>} extra={<StatusPill tone="blue">已定位：{workflowStages[currentStage].title}</StatusPill>}>
      <div className="detail-stage-timeline" role="list" aria-label="项目阶段时间线">
        {workflowStages.map((stage, index) => {
          const isDone = workflow.completedStages.includes(index) || index < currentStage;
          const isCurrent = index === currentStage && !workflow.completedStages.includes(index);
          const status = isDone ? '已完成' : isCurrent ? '当前办理' : '待开始';
          return (
            <div id={`project-detail-stage-${stage.key}`} data-project-stage={stage.key} className={`detail-stage-item ${isDone ? 'done' : isCurrent ? 'current' : 'pending'} ${index < workflowStages.length - 1 ? 'has-connector' : ''}`} role="listitem" aria-current={isCurrent ? 'step' : undefined} key={stage.key}>
              <span className="detail-stage-node">{isDone ? <CheckOutlined /> : isCurrent ? <i /> : ''}</span>
              <strong>{stage.title}</strong>
              <small>{status}</small>
              {index < workflowStages.length - 1 && <span className={`detail-stage-connector ${index < currentStage ? 'done' : ''}`} aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

type StageGateFileRow = {
  key: string;
  name: string;
  nodeTitle: string;
  required: boolean;
  status: string;
  version: string;
  source: string;
};

function ProjectStageFileGatePage({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  const { workflow, project } = useProjectWorkflow();
  const [selectedStageIndex, setSelectedStageIndex] = useState(() => normalizeStageIndex(workflow.currentStage));
  const selectedStage = workflowStages[selectedStageIndex];
  const selectedStageStatus = getProjectStageStatus(selectedStageIndex, workflow);
  const selectedSummary = useMemo(() => getProjectStageFileSummary(selectedStageIndex, workflow), [selectedStageIndex, workflow]);
  const files = useMemo<StageGateFileRow[]>(() => selectedSummary.nodes.flatMap((node) => {
    const nodeIndex = legalWorkflowNodes.findIndex((item) => item.key === node.key);
    const nodeStatus = getLegalNodeStatus(nodeIndex, workflow);
    const allFiles = [...node.requiredFiles.map((name) => ({ name, required: true })), ...node.optionalFiles.map((name) => ({ name, required: false }))];
    return allFiles.map((file, index) => {
      const uploaded = node.key === 'project-initiation'
        ? index < 2 || workflow.materialsReady
        : nodeStatus === 'done' || (nodeStatus === 'current' && index === 0);
      return {
        key: `${node.key}-${file.name}`,
        name: file.name,
        nodeTitle: node.title,
        required: file.required,
        status: uploaded ? '已上传 / 已校验' : file.required ? '缺失' : '待补充',
        version: uploaded ? (nodeStatus === 'done' ? 'V1.0' : 'V0.2') : '—',
        source: uploaded ? '项目资料库' : '待上传',
      };
    });
  }), [selectedSummary, workflow]);
  const gateLabel = selectedSummary.missingRequired
    ? `${selectedSummary.missingRequired} 项缺失`
    : selectedStageStatus === 'pending'
      ? '待前置阶段完成'
      : selectedStageStatus === 'done'
        ? '阶段已完成'
        : '门控可提交';

  return <>
    <PageTitle
      breadcrumb={['项目管理', project.name, '文件门控']}
      title="文件门控中心"
      subtitle="按项目阶段汇总检查必传材料、格式完整性与版本有效性"
      actions={<><Button icon={<ArrowLeftOutlined />} onClick={() => go('/procurement/projects/detail')}>返回项目详情</Button><Button icon={<DownloadOutlined />} onClick={() => message.success('文件清单已导出为 Excel')}>导出清单</Button><Button type="primary" icon={<UploadOutlined />} onClick={() => onOpenModal('upload')}>上传材料</Button></>}
    />
    <Alert
      type={selectedSummary.missingRequired ? 'warning' : 'success'}
      showIcon
      message={selectedSummary.missingRequired ? `当前阶段“${selectedStage.title}”还有 ${selectedSummary.missingRequired} 项必传文件缺失，系统将禁止进入下一阶段。` : `当前阶段“${selectedStage.title}”的必传文件已齐全，可提交阶段门控校验。`}
      description={`${selectedStage.summary} 阶段内的材料规则由系统自动汇总校验。`}
    />
    <Row gutter={[16, 16]} className="file-gate-layout">
      <Col xs={24} xl={8}>
        <Panel title={<><SafetyCertificateOutlined /> 项目阶段门控清单</>} extra={<StatusPill tone="blue">7 个项目阶段</StatusPill>}>
          <div className="file-gate-node-list" role="list" aria-label="项目阶段文件门控">
            {workflowStages.map((stage, index) => {
              const status = getProjectStageStatus(index, workflow);
              const stageSummary = getProjectStageFileSummary(index, workflow);
              return <button type="button" key={stage.key} className={selectedStageIndex === index ? 'active' : ''} onClick={() => setSelectedStageIndex(index)}>
                <span className={`file-gate-node-icon ${status}`}>{status === 'done' ? <CheckOutlined /> : status === 'current' ? <SyncOutlined /> : index + 1}</span>
                <div><strong>{stage.title}</strong><small>{stage.summary}</small></div>
                <em>{stageSummary.uploadedCount}/{stageSummary.requiredCount}</em>
              </button>;
            })}
          </div>
        </Panel>
      </Col>
      <Col xs={24} xl={16}>
        <Panel title={<><FolderOpenOutlined /> {selectedStage.title} · 文件清单</>} extra={<Space><StatusPill tone={selectedSummary.missingRequired ? 'red' : selectedStageStatus === 'done' ? 'green' : 'blue'}>{gateLabel}</StatusPill><Button type="link" onClick={() => go('/procurement/records')}>查看操作留痕</Button></Space>}>
          <Table<StageGateFileRow>
            rowKey="key"
            pagination={false}
            dataSource={files}
            columns={[
              { title: '文件名称', dataIndex: 'name', render: (value: string, record) => <div className="gate-file-name"><FileTextOutlined /><div><strong>{value}</strong><span>{record.nodeTitle} · {record.required ? '必传文件' : '选传文件'}</span></div></div> },
              { title: '状态', dataIndex: 'status', render: (value: string) => <StatusPill tone={value === '缺失' ? 'red' : value.startsWith('已上传') ? 'green' : 'orange'}>{value}</StatusPill> },
              { title: '版本', dataIndex: 'version' },
              { title: '来源', dataIndex: 'source' },
              { title: '操作', render: (_, record) => <Space size="small"><Button type="link" size="small" disabled={record.status === '缺失' || record.status === '待补充'} onClick={() => message.success(`已打开 ${record.name} 预览`)}>预览</Button><Button type="link" size="small" onClick={() => onOpenModal('upload')}>{record.status === '缺失' ? '上传' : '新版本'}</Button></Space> },
            ]}
          />
        </Panel>
        <Panel title={<><LockOutlined /> 自动校验规则</>}>
          <div className="gate-rule-grid"><div><CheckCircleFilled /><strong>格式校验</strong><span>PDF、Word、Excel、图片格式可识别</span></div><div><CheckCircleFilled /><strong>完整性校验</strong><span>缺少必传文件不得提交下一阶段</span></div><div><CheckCircleFilled /><strong>版本校验</strong><span>仅当前有效版本进入正式档案</span></div><div><CheckCircleFilled /><strong>法规校验</strong><span>阶段规则与采购方式自动匹配</span></div></div>
          <Alert type="info" showIcon message={`前置条件：${selectedStage.summary}`} />
        </Panel>
      </Col>
    </Row>
  </>;
}

function ProjectInitialStatePage({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  const { workflow, project, completeStage } = useProjectWorkflow();
  const handleProcessStageChange = (stageIndex: number) => {
    if (stageIndex > workflow.currentStage) {
      message.info(`请先完成“${workflowStages[workflow.currentStage].title}”，再进入下一阶段`);
      return;
    }
    if (stageIndex === workflow.currentStage) {
      message.info(`当前正在办理：${workflowStages[stageIndex].title}`);
      return;
    }
    if (stageIndex < workflow.currentStage) go(workflowStages[stageIndex].route);
  };
  return (
    <>
      <PageTitle
        breadcrumb={['项目管理', '我的项目', project.name]}
        title={project.name}
        subtitle={`${project.id} · ${project.department} · 预算 ${project.budget} · 负责人：${project.owner}`}
        actions={<><Button icon={<ArrowLeftOutlined />} onClick={() => go('/procurement/projects')}>返回列表</Button><Button icon={<FolderOpenOutlined />} onClick={() => go('/procurement/records')}>项目档案</Button></>}
      />
      <ProjectProcessTimeline onStageChange={handleProcessStageChange} />
      <Row gutter={[16, 16]} className="initial-state-grid">
        <Col xs={24} xl={6}><InitialTaskCard onOpenModal={onOpenModal} onCompleteStage={completeStage} /></Col>
        <Col xs={24} xl={12}><InitialMaterialsCard onOpenModal={onOpenModal} /></Col>
        <Col xs={24} xl={6}><InitialGuidance /></Col>
      </Row>
    </>
  );
}

function InitialTaskCard({ onOpenModal, onCompleteStage }: { onOpenModal: (key: ModalKey) => void; onCompleteStage: (stageIndex?: number) => boolean }) {
  const { workflow, project } = useProjectWorkflow();
  const currentStage = workflowStages[workflow.currentStage];
  const taskNodes = workflow.currentStage === 0
    ? [{ label: '确认项目基础信息', status: 'current' }, { label: '完成项目启动', status: 'pending' }, { label: '进入需求拟制', status: 'pending' }]
    : workflow.currentStage === 1
      ? [{ label: '填写采购需求说明', status: 'done' }, { label: '上传项目立项依据', status: workflow.materialsReady ? 'done' : 'current' }, { label: '提交需求准备', status: workflow.materialsReady ? 'current' : 'pending' }]
      : workflow.currentStage === 2
        ? [{ label: '补充项目立项依据', status: workflow.materialsReady ? 'done' : 'current' }, { label: '编制采购文件', status: workflow.materialsReady ? 'current' : 'pending' }, { label: '提交采购文件', status: 'pending' }]
        : [{ label: currentStage.title, status: 'current' }, { label: currentStage.action, status: 'pending' }, { label: '完成本阶段', status: 'pending' }];
  const handlePrimaryAction = () => {
    if (workflow.currentStage === 0) {
      if (onCompleteStage(0)) go('/procurement/requirements');
      return;
    }
    if (workflow.currentStage === 2 && !workflow.materialsReady) {
      onOpenModal('upload');
      return;
    }
    go(currentStage.route);
  };
  const actionLabel = workflow.currentStage === 0
    ? '确认项目启动并进入需求拟制'
    : workflow.currentStage === 2 && !workflow.materialsReady
      ? '补充项目立项依据'
      : currentStage.action;
  return (
    <Panel className="initial-task-panel" title={<><SettingOutlined /> 当前任务</>}>
      <div className="initial-task-focus">
        <span>第 {String(workflow.currentStage + 1).padStart(2, '0')} 阶段 · 进行中</span>
        <h2>{currentStage.title}</h2>
        <p>{workflow.currentStage === 0 ? '请确认项目基础信息，完成项目启动后进入需求拟制。' : currentStage.summary}</p>
      </div>
      <div className="initial-task-meta">
        <div><CalendarOutlined /><span>办理时限</span><strong>{project.planDate || '待定'}</strong></div>
        <div><ClockCircleOutlined /><span>剩余时间</span><strong className="warning-text">待办理</strong></div>
        <div><UserOutlined /><span>任务负责人</span><strong><Avatar size="small">{project.owner.slice(0, 1)}</Avatar>{project.owner}</strong></div>
      </div>
      <div className="initial-task-nodes">
        {taskNodes.map((node) => <div className={node.status} key={node.label}><span>{node.status === 'done' ? <CheckCircleFilled /> : node.status === 'current' ? <i /> : ''}</span>{node.label}</div>)}
      </div>
      <Button block type="primary" onClick={handlePrimaryAction}>{actionLabel}</Button>
      {workflow.currentStage === 2 && !workflow.materialsReady && <div className="initial-task-error"><WarningFilled /> 必备材料缺失 1 项，暂时无法提交</div>}
    </Panel>
  );
}

function InitialMaterialsCard({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  const { workflow } = useProjectWorkflow();
  const uploadedCount = workflow.materialsReady ? 3 : 2;
  const progress = Math.round((uploadedCount / 3) * 100);
  return (
    <Panel className="initial-material-panel" title={<><FolderOpenOutlined /> 材料清单</>} extra={<StatusPill tone={workflow.materialsReady ? 'green' : 'orange'}>必备材料 {uploadedCount} / 3 已上传</StatusPill>}>
      <div className="initial-material-progress"><Progress percent={progress} showInfo={false} /><span>{progress}%</span></div>
      <div className="initial-material-summary">共 4 项材料 · 已上传 {uploadedCount} 项 · 缺失 {workflow.materialsReady ? 0 : 1} 项 · 待完善 1 项</div>
      <div className="initial-material-list">
        {fileMaterials.map((item) => {
          const isUploaded = item.status === '已上传' || (item.name === '项目立项依据' && workflow.materialsReady);
          const isMissing = item.name === '项目立项依据' && !workflow.materialsReady;
          return <div className={`initial-material-item ${isMissing ? 'missing' : item.status === '待完善' ? 'incomplete' : ''}`} key={item.name}>
            <span className="initial-material-icon">{isMissing ? <FileProtectOutlined /> : item.status === '待完善' ? <EditOutlined /> : <FileTextOutlined />}</span>
            <div><strong>{item.name} {item.required && <em>必备</em>}</strong><small>{isUploaded ? `${item.file || '项目立项依据.pdf'} · 已上传` : isMissing ? '尚未上传 · 请上传正式批复文件或立项决议原件扫描件' : `${item.file} · 已填写 60%，待补充技术参数`}</small></div>
            {isUploaded ? <StatusPill tone="green">已上传</StatusPill> : isMissing ? <><StatusPill tone="red">缺失</StatusPill><Button size="small" type="primary" onClick={() => onOpenModal('upload')}>补充材料</Button></> : <><StatusPill tone="orange">待完善</StatusPill><Button size="small" onClick={() => workflow.currentStage >= 1 ? go('/procurement/requirements') : message.info('请先完成项目启动，再继续完善采购需求')}>继续完善</Button></>}
          </div>;
        })}
      </div>
    </Panel>
  );
}

function InitialGuidance() {
  const policies = ['集团采购管理办法', '采购需求管理规定', '供应商准入与核查办法', '招标文件编制指引'];
  return (
    <div className="initial-guidance-column">
      <Panel title={<><InfoCircleOutlined /> 办理提示</>}>
        <ul className="initial-guidance-list"><li>请确保所有必备材料完整有效后再提交需求准备</li><li>项目立项依据需为正式批复文件或立项决议原件扫描件</li><li>支持 PDF、Word、Excel、JPG、PNG 格式，单个文件不超过 50 MB</li><li>上传新版本时可勾选“设为当前版本”，将替换原有材料</li></ul>
        <div className="initial-average-time"><ClockCircleOutlined /> 本阶段平均办理时长约 1.4 天</div>
      </Panel>
      <Panel title={<><FileTextOutlined /> 相关制度</>}>
        <div className="initial-policy-list">{policies.map((policy) => <button type="button" key={policy} onClick={() => go('/procurement/policy-assistant')}><FileTextOutlined />{policy}<ArrowRightOutlined /></button>)}</div>
        <Button type="link" block onClick={() => go('/procurement/knowledge-base')}>查看知识库全部制度 <ArrowRightOutlined /></Button>
      </Panel>
    </div>
  );
}

function ProjectProcessTimeline({ onStageChange }: { onStageChange: (stageIndex: number) => void }) {
  const { workflow, project } = useProjectWorkflow();
  const currentStageStatus = ['进行中 · 待确认', '进行中 · 待提交', '进行中 · 待补材料', '进行中 · 待核查', '进行中 · 待确认', '进行中 · 待验收', '进行中 · 待复盘'];
  const getStageStatus = (stageIndex: number) => {
    if (stageIndex < workflow.currentStage) return '已完成';
    if (stageIndex === workflow.currentStage) return currentStageStatus[stageIndex];
    return '待开始';
  };

  return (
    <Panel
      className="project-workflow-panel"
      title={<><SyncOutlined /> 项目流程</>}
      extra={<div className="workflow-panel-extra"><StatusPill tone="blue">当前：第 {workflow.currentStage + 1} / {workflowStages.length} 阶段</StatusPill><span>预计 {project.planDate || '待定'} 完成全部流程</span></div>}
    >
      <div className="project-stage-timeline" role="list" aria-label="项目阶段时间线">
        {workflowStages.map((stage, index) => {
          const isDone = index < workflow.currentStage;
          const isStageCurrent = index === workflow.currentStage;
          return (
            <button
              type="button"
              role="listitem"
              key={stage.key}
              className={`project-stage-item ${isDone ? 'done' : isStageCurrent ? 'current' : 'locked'} ${index < workflowStages.length - 1 ? 'has-connector' : ''}`}
              aria-current={isStageCurrent ? 'step' : undefined}
            onClick={() => onStageChange(index)}
            >
              <span className="project-stage-node">{isDone ? <CheckOutlined /> : index + 1}</span>
              <strong>{stage.title}</strong>
              <small>{getStageStatus(index)}</small>
              {index < workflowStages.length - 1 && <span className={`project-stage-connector ${index < workflow.currentStage ? 'done' : ''}`} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function ProjectFlowBar() {
  const { workflow } = useProjectWorkflow();
  return (
    <div className="project-flow-bar">
      <div className="project-flow-bar-head">
        <div><SyncOutlined /><span>项目流程</span><strong>{workflowStages[workflow.currentStage].title}</strong><StatusPill tone="blue">阶段 {workflow.currentStage + 1} / {workflowStages.length}</StatusPill></div>
        <Button size="small" onClick={() => go('/procurement/projects/detail')}>返回项目详情</Button>
      </div>
      <div className="project-flow-mini-steps">
        {workflowStages.map((stage, index) => (
          <button
            type="button"
            key={stage.key}
            className={index < workflow.currentStage ? 'done' : index === workflow.currentStage ? 'current' : ''}
            disabled={index > workflow.currentStage}
            onClick={() => index < workflow.currentStage ? go(stage.route) : index === workflow.currentStage ? message.info(`当前正在办理：${stage.title}`) : message.info(`请先完成“${workflowStages[workflow.currentStage].title}”`)}
          >
            <span>{index < workflow.currentStage ? <CheckOutlined /> : index + 1}</span>
            {stage.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProjectDetail({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  const { workflow, project } = useProjectWorkflow();
  const currentStageIndex = normalizeStageIndex(workflow.currentStage);
  const currentStage = workflowStages[currentStageIndex];
  const workflowProgress = workflowProgressByStage[currentStageIndex];
  const needsMaterials = currentStageIndex === 2 && !workflow.materialsReady;
  const budgetRemaining = formatBudget(Math.max(parseBudget(project.budget) - parseBudget(project.usedBudget), 0));
  const [tab, setTab] = useState('basic');
  const goToCurrentStage = () => {
    if (needsMaterials) {
      onOpenModal('upload');
      return;
    }
    if (currentStage.route === '/procurement/projects/detail') {
      document.getElementById(`project-detail-stage-${currentStage.key}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      return;
    }
    go(currentStage.route);
  };
  return (
    <>
      <PageTitle
        breadcrumb={['项目管理', '我的项目', project.name]}
        title={project.name}
        subtitle={`${project.id} · ${project.department} · 创建于 ${project.createdAt} · 负责人：${project.owner}`}
        actions={<><Button icon={<ArrowLeftOutlined />} onClick={() => go('/procurement/projects')}>返回列表</Button><Button icon={<FolderOpenOutlined />} onClick={() => go('/procurement/records')}>项目档案</Button><Button type="primary" icon={<EditOutlined />} onClick={() => message.info('项目已进入编辑模式，可从需求拟制阶段继续调整')}>编辑项目</Button></>}
      />
      <Panel className="project-summary-panel">
        <div className="project-summary-top">
          <div className="project-heading"><div className="large-project-icon"><ProjectOutlined /></div><div><h2>{project.name}</h2><Space><StatusPill tone={getStageTone(currentStageIndex, workflow.completedStages.includes(workflowStages.length - 1) ? '已完成' : '进行中')}>当前：{currentStage.title}</StatusPill><StatusPill tone={project.urgency === 'normal' ? 'gray' : 'orange'}>{urgencyLabel(project.urgency)}</StatusPill></Space></div></div>
          <Space><Button icon={<ShareIcon />} onClick={() => message.success('项目链接已复制，可分享给项目成员')}>分享</Button><Button icon={<MoreOutlined />} onClick={() => message.info('更多操作：归档、关注和导出项目摘要')} /><Button type="primary" icon={<EditOutlined />} onClick={() => message.info('项目已进入编辑模式，可从需求拟制阶段继续调整')}>编辑项目</Button></Space>
        </div>
        <div className="summary-metrics">
          <div><span>采购预算</span><strong>{project.budget}</strong></div><div><span>已使用金额</span><strong>{project.usedBudget}</strong></div><div><span>采购方式</span><strong>{project.method} <ThunderboltFilled /></strong></div><div><span>计划完成时间</span><strong>{project.planDate || '待定'}</strong></div><div><span>整体进度</span><div className="summary-progress"><Progress percent={Math.max(project.budgetUsedPercent, workflowProgress)} showInfo={false} /><b>{Math.max(project.budgetUsedPercent, workflowProgress)}%</b></div></div>
        </div>
      </Panel>
      <ProjectDetailStageTimeline />
      <Panel className="current-stage-panel" title={<><SettingOutlined /> 当前阶段办理</>} extra={<StatusPill tone="blue">第 {currentStageIndex + 1} / {workflowStages.length} 阶段</StatusPill>}>
        <div className="workflow-stage-card">
          <div>
            <div className="workflow-stage-kicker"><SyncOutlined /> 系统已根据项目进度定位</div>
            <h3>{currentStage.title}</h3>
            <p>{currentStage.summary}</p>
            {needsMaterials && <div className="workflow-material-state missing"><WarningFilled /> 当前缺少必备材料：项目立项依据</div>}
          </div>
          <Button type="primary" onClick={goToCurrentStage}>{needsMaterials ? '补充项目立项依据' : currentStage.route === '/procurement/projects/detail' ? '查看当前阶段' : currentStage.action}</Button>
        </div>
      </Panel>
      <PageTabs active={tab} onChange={setTab} items={[{ key: 'basic', label: '基本信息' }, { key: 'requirements', label: '需求明细' }, { key: 'method', label: '采购方式' }, { key: 'supplier', label: '供应商' }, { key: 'contract', label: '合同与订单' }, { key: 'docs', label: '文档资料' }]} />
      {tab === 'basic' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={17}>
            <Panel title={<><FileTextOutlined /> 项目基本信息</>}>
              <div className="info-grid"><InfoCell label="项目类型" value={`${project.type}类`} /><InfoCell label="采购品类" value={project.category} /><InfoCell label="采购数量" value={project.quantity} /><InfoCell label="需求部门" value={project.department} /><InfoCell label="项目负责人" value={project.owner} avatar={project.owner.slice(0, 1)} /><InfoCell label="资金来源" value={project.funding} /></div>
              <div className="info-description"><span>采购意向</span><p>{project.intention}</p></div>
            </Panel>
            <Panel title={<><FileDoneOutlined /> 需求明细</>} extra={<Button type="link" onClick={() => setTab('requirements')}>共 4 项</Button>}>
              <Table pagination={false} rowKey="name" dataSource={[{ name: '商用台式计算机', spec: 'i5-13500 / 16G / 512G SSD', qty: '80 台', price: '¥2,600' }, { name: '激光多功能一体机', spec: '黑白 / 自动双面 / 网络', qty: '20 台', price: '¥1,800' }, { name: '显示器', spec: '27 英寸 / 2K / IPS', qty: '80 台', price: '¥900' }, { name: '办公桌椅套装', spec: '人体工学 / 1.4m 桌面', qty: '40 套', price: '¥1,200' }]} columns={[{ title: '物料名称', dataIndex: 'name' }, { title: '规格型号', dataIndex: 'spec' }, { title: '数量', dataIndex: 'qty' }, { title: '预估单价', dataIndex: 'price', render: (value) => <strong>{value}</strong> }]} />
            </Panel>
          </Col>
          <Col xs={24} xl={7}>
            <Panel title={<><FundOutlined /> 预算执行</>} extra={<StatusPill tone={project.budgetUsedPercent ? 'orange' : 'blue'}>执行 {project.budgetUsedPercent}%</StatusPill>}><div className="budget-circle"><Progress type="circle" percent={project.budgetUsedPercent} strokeColor="#2f66eb" trailColor="#e5e9f1" size={130} /><span>已使用 {project.usedBudget}</span></div><div className="budget-legend"><span><i className="blue-dot" /> 已使用金额 <b>{project.usedBudget}</b></span><span><i className="gray-dot" /> 可用余额 <b>{budgetRemaining}</b></span></div></Panel>
            <Panel title={<><TeamOutlined /> 项目团队</>}><div className="team-list">{[['张', '张明', '采购经理 · 项目负责人', '负责人'], ['李', '李静', '采购专员 · 需求对接', '成员'], ['王', '王强', '财务专员 · 预算审核', '成员']].map(([avatar, name, role, badge]) => <div className="team-item" key={name}><Avatar>{avatar}</Avatar><div><strong>{name}</strong><span>{role}</span></div><StatusPill tone={badge === '负责人' ? 'blue' : 'gray'}>{badge}</StatusPill></div>)}</div></Panel>
            <Panel title={<><HistoryOutlined /> 操作记录</>}><div className="activity-list">{['提交采购执行申请', `确认采购方式为${project.method}`, '创建采购项目'].map((item, index) => <div key={item}><i className={`activity-dot ${index === 0 ? 'blue' : index === 1 ? 'green' : 'purple'}`} /><div><strong>{item}</strong><span>{project.owner} · {project.createdAt}</span></div></div>)}</div></Panel>
          </Col>
        </Row>
      )}
      {tab !== 'basic' && <Panel title={tab === 'requirements' ? '需求明细' : tab === 'method' ? '采购方式' : tab === 'supplier' ? '供应商' : tab === 'contract' ? '合同与订单' : '文档资料'} extra={<Button type="primary" onClick={() => go(tab === 'requirements' ? '/procurement/requirements' : tab === 'supplier' ? '/procurement/suppliers' : tab === 'contract' ? '/procurement/contracts' : tab === 'docs' ? '/procurement/documents' : '/procurement/requirements')}>进入办理</Button>}><Empty description="该模块已纳入采购流程演示，可从左侧流程节点进入详细办理页面" /></Panel>}
    </>
  );
}

function InfoCell({ label, value, avatar }: { label: string; value: string; avatar?: string }) {
  return <div className="info-cell"><span>{label}</span><strong>{avatar && <Avatar size="small">{avatar}</Avatar>}{value}</strong></div>;
}

function ShareIcon() { return <LinkOutlined />; }

function RequirementPage({ onOpenModal, onCompleteStage }: { onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean }) {
  const { project } = useProjectWorkflow();
  const [checkOpen, setCheckOpen] = useState(false);
  const [resolved, setResolved] = useState<Record<number, string>>({});
  const [technicalItems, setTechnicalItems] = useState(requirementCards);
  const [assistantRevision, setAssistantRevision] = useState(0);
  const handledCount = Object.keys(resolved).length;
  const saveDraft = () => message.success('需求草稿已保存，稍后可继续编辑');
  const addTechnicalRequirement = () => {
    const index = technicalItems.length - requirementCards.length + 1;
    setTechnicalItems((items) => [...items, { title: `新增技术要求 ${index}`, text: '请补充该项技术指标、验收方式及判定标准。', tone: 'gray' }]);
    message.success('已新增一项技术要求');
  };
  const addAiRequirements = () => {
    if (technicalItems.some((item) => item.title === 'AI 补充建议')) {
      message.info('AI 识别内容已加入需求文档');
      return;
    }
    setTechnicalItems((items) => [...items, { title: 'AI 补充建议', text: '已将 AI 识别到的接口兼容性与环境适应性要求加入文档。', tone: 'purple' }]);
    message.success('AI 识别内容已加入需求文档');
  };
  const regenerateAssistant = () => {
    setAssistantRevision((revision) => revision + 1);
    message.success('AI 已重新生成需求建议');
  };
  const submitRequirement = () => {
    if (onCompleteStage && !onCompleteStage()) return;
    go('/procurement/documents');
  };
  return (
    <>
      <PageTitle breadcrumb={['采购需求', '需求拟制', project.name]} title="采购需求拟制" subtitle={`${project.id} · ${project.category}采购需求 · 负责人 ${project.owner}`} actions={<><Button icon={<HistoryOutlined />} onClick={() => onOpenModal('similar')}>查找相似案例</Button><Button icon={<DownloadOutlined />} onClick={saveDraft}>保存草稿</Button><Button icon={<SafetyCertificateOutlined />} onClick={() => go('/procurement/requirements/review')}>审核工作台</Button><Button icon={<ThunderboltFilled />} className="purple-button" onClick={() => setCheckOpen(true)}>智能检查</Button><Button type="primary" icon={<SendOutlined />} onClick={submitRequirement}>提交审核并进入文件编制</Button></>} />
      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={checkOpen ? 15 : 17}>
          <Panel title={<><InfoCircleOutlined /> 需求基本信息</>}>
            <Form layout="vertical" className="requirement-form">
              <Form.Item label="采购意向" required><Input.TextArea rows={3} defaultValue={project.intention} /></Form.Item>
              <Row gutter={16}><Col span={12}><Form.Item label="使用环境" required><Input defaultValue="室外车间，-10℃ ~ 45℃" /></Form.Item></Col><Col span={12}><Form.Item label="数量" required><Input defaultValue={project.quantity} /></Form.Item></Col><Col span={12}><Form.Item label="预算" required><Input prefix="¥" defaultValue={project.budget.replace(/^¥/, '')} /></Form.Item></Col><Col span={12}><Form.Item label="交付日期" required><DatePicker defaultValue={undefined} placeholder={project.planDate || '请选择日期'} style={{ width: '100%' }} /></Form.Item></Col><Col span={24}><Form.Item label="交付地点" required><Input defaultValue="总部园区 B 座一层收货区（含卸货与上楼搬运）" /></Form.Item></Col></Row>
            </Form>
          </Panel>
          <Panel title={<><ToolOutlined /> 技术要求 <StatusPill tone="purple">含 3 项 AI 识别内容</StatusPill></>}>
            <div className="requirement-card-list">{technicalItems.map((item) => <div className={`requirement-card ${item.tone}`} key={item.title}><div><strong>{item.title}</strong><p>{item.text}</p></div><StatusPill tone={item.tone === 'purple' ? 'purple' : 'gray'}>{item.tone === 'purple' ? 'AI 识别' : '手动填写'}</StatusPill></div>)}</div><Button block type="dashed" icon={<PlusOutlined />} onClick={addTechnicalRequirement}>添加技术要求</Button>
          </Panel>
          <Panel title={<><FileTextOutlined /> 商务要求</>}><Input.TextArea rows={4} defaultValue={'1. 整机质保不少于 3 年，提供原厂授权及售后承诺函；\n2. 报价含运输、安装、调试及首年上门维护费用；\n3. 付款方式为验收合格后 30 日内支付 90%，质保期满支付 10%。'} /><div className="chip-row"><Tag>质保 3 年</Tag><Tag>含运输安装</Tag><Tag>30 天账期</Tag></div></Panel>
          <Panel title={<><SafetyCertificateOutlined /> 验收要求</>}><Input.TextArea rows={3} defaultValue="到货后按 10% 比例抽检外观与配件完整性；全数设备进行开机功能测试与续航实测，测试结果需满足技术要求约定指标。" /><div className="completion-line"><span>需求完整度</span><Progress percent={handledCount ? 96 : 85} strokeColor="#10b981" /><b>{handledCount ? 96 : 85}%</b></div></Panel>
        </Col>
        {checkOpen && <Col xs={24} xl={9}><AuditPanel resolved={resolved} onResolve={(index, action) => setResolved((current) => ({ ...current, [index]: action }))} onRecheck={() => { setResolved({}); message.success('已重新检查需求文档'); }} onViewBasis={() => message.info('已定位到相关采购制度与历史案例依据')} onClose={() => setCheckOpen(false)} onOpenModal={onOpenModal} /></Col>}
        {!checkOpen && <Col xs={24} xl={7}><AiAssistant onOpenSimilar={() => onOpenModal('similar')} onCheck={() => setCheckOpen(true)} onAddRequirements={addAiRequirements} onRegenerate={regenerateAssistant} assistantRevision={assistantRevision} /></Col>}
      </Row>
    </>
  );
}

function AiAssistant({ onOpenSimilar, onCheck, onAddRequirements, onRegenerate, assistantRevision }: { onOpenSimilar: () => void; onCheck: () => void; onAddRequirements: () => void; onRegenerate: () => void; assistantRevision: number }) {
  return <Panel title={<><ThunderboltFilled /> AI 需求助手 <StatusPill tone="green">在线</StatusPill></>} className="assistant-panel"><div className="assistant-message">续航不少于12小时，IP67，支持标准数据接口。{assistantRevision > 0 && <span>（已重新生成第 {assistantRevision + 1} 版）</span>}</div><div className="assistant-result"><strong><ThunderboltFilled /> 已识别到 3 项可结构化需求点</strong>{['续航 ≥ 12 小时', '防护等级 IP67', '支持标准 API 接口'].map((item, index) => <div className="assistant-item" key={item}><b>{item}</b><StatusPill tone={index === 2 ? 'orange' : 'green'}>置信度 {98 - index * 4}%</StatusPill><span>归类：技术要求 / {index === 1 ? '环境适应性' : '性能指标'}</span></div>)}<Space><Button type="primary" icon={<PlusOutlined />} onClick={onAddRequirements}>加入需求文档</Button><Button icon={<SyncOutlined />} onClick={onRegenerate}>重新生成</Button></Space></div><div className="quick-command">快捷指令{['检查技术参数是否设置不合理门槛', '按同类项目补全验收标准', '检查是否存在品牌倾向性表述'].map((item) => <Button key={item} block icon={<SafetyCertificateOutlined />} onClick={onCheck}>{item}</Button>)}</div><Input.Search placeholder="输入技术要求，AI 将自动结构化并归类..." enterButton={<ThunderboltFilled />} onSearch={onCheck} /></Panel>;
}

function AuditPanel({ resolved, onResolve, onRecheck, onViewBasis, onClose, onOpenModal }: { resolved: Record<number, string>; onResolve: (index: number, action: string) => void; onRecheck: () => void; onViewBasis: (index: number) => void; onClose: () => void; onOpenModal: (key: ModalKey) => void }) {
  return <Panel title={<><ThunderboltFilled /> 智能检查结果 <StatusPill tone="purple">{4 - Object.keys(resolved).length} 项问题</StatusPill></>} extra={<Button type="text" icon={<CloseCircleFilled />} onClick={onClose} />} className="audit-panel"><div className="audit-summary"><span>🔴 高风险 {auditProblems.filter((item) => item.level === '高风险').length - Object.keys(resolved).filter((key) => auditProblems[Number(key)].level === '高风险').length}</span><span>🟠 中风险 {auditProblems.filter((item) => item.level === '中风险').length - Object.keys(resolved).filter((key) => auditProblems[Number(key)].level === '中风险').length}</span></div>{auditProblems.map((item, index) => { const status = resolved[index]; return <div className={`audit-card ${status ? 'resolved' : item.level === '高风险' ? 'high' : 'medium'}`} key={item.title}><div className="audit-card-head"><strong>{index + 1} {item.title}</strong><StatusPill tone={status ? 'green' : item.level === '高风险' ? 'red' : 'orange'}>{status ? '已处理' : item.level}</StatusPill></div>{status ? <><p className="audit-resolution">处理方式：{status === '采纳' ? '采纳建议' : status === '人工修改' ? '人工修改' : '人工保留'}</p><div className="audit-suggestion">{status === '人工保留' ? '已记录人工处理意见，将保留原文并在提交审核时提示。' : item.suggestion}</div></> : <><span className="audit-label">原文</span><div className="audit-original">“{item.original}”</div><span className="audit-label">问题原因</span><p>{item.reason}</p><div className="audit-suggestion"><strong>💡 修改建议</strong><br />{item.suggestion}</div><div className="audit-actions"><Button type="primary" size="small" onClick={() => onResolve(index, '采纳')}>采纳</Button><Button size="small" onClick={() => onResolve(index, '人工修改')}>人工修改</Button><Button size="small" onClick={() => { onResolve(index, '人工保留'); onOpenModal('ignore'); }}>忽略</Button><Button size="small" icon={<LinkOutlined />} onClick={() => onViewBasis(index)}>查看依据</Button></div></>}</div>; })}<Space direction="vertical" style={{ width: '100%' }}><Button block className="purple-button" icon={<SyncOutlined />} onClick={onRecheck}>重新检查</Button><Button block icon={<DownloadOutlined />} onClick={() => onOpenModal('ai-record')}>生成检查报告</Button></Space></Panel>;
}

type DocumentSourceKey = 'basic' | 'requirements' | 'technical' | 'commercial' | 'delivery' | 'acceptance';

const documentGenerationSources: Array<{ key: DocumentSourceKey; label: string; description: string }> = [
  { key: 'basic', label: '项目基础信息', description: '项目名称、编号、预算、采购单位、采购方式' },
  { key: 'requirements', label: '采购需求说明', description: '采购意向、采购范围、数量和项目概况' },
  { key: 'technical', label: '技术参数', description: '性能指标、配置要求和技术响应要求' },
  { key: 'commercial', label: '商务与评审规则', description: '资格条件、评分标准和投标文件要求' },
  { key: 'delivery', label: '交付与合同要点', description: '交付时间、地点、付款和违约责任' },
  { key: 'acceptance', label: '验收标准', description: '验收方式、检测项目和质保要求' },
];

const documentChapterSources: Array<{ title: string; source: DocumentSourceKey }> = [
  { title: '采购公告', source: 'basic' },
  { title: '投标人须知', source: 'commercial' },
  { title: '采购需求', source: 'requirements' },
  { title: '技术要求', source: 'technical' },
  { title: '商务要求', source: 'commercial' },
  { title: '评分标准', source: 'commercial' },
  { title: '合同条款', source: 'delivery' },
  { title: '验收要求', source: 'acceptance' },
];

function DocumentsPage({ onOpenModal, onCompleteStage }: { onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean }) {
  const { workflow, project } = useProjectWorkflow();
  const templateNames = ['《' + project.type + '类' + project.method + '标准采购文件》', '《集团通用采购文件模板》'];
  const allSourceKeys = documentGenerationSources.map((item) => item.key);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [generatedTemplate, setGeneratedTemplate] = useState(0);
  const [selectedSources, setSelectedSources] = useState<DocumentSourceKey[]>(allSourceKeys);
  const [appliedSources, setAppliedSources] = useState<DocumentSourceKey[]>(allSourceKeys);
  const [generatedAt, setGeneratedAt] = useState('2024-06-05 11:06');
  const [aiContinuation, setAiContinuation] = useState(false);
  const hasSource = (source: DocumentSourceKey) => appliedSources.includes(source);
  const generatedChapterCount = documentChapterSources.filter((chapter) => hasSource(chapter.source)).length;
  const generatedProgress = Math.round((generatedChapterCount / documentChapterSources.length) * 100);
  const selectedChapterCount = documentChapterSources.filter((chapter) => selectedSources.includes(chapter.source)).length;
  const sourceNames = documentGenerationSources.filter((item) => appliedSources.includes(item.key)).map((item) => item.label).join('、');
  const openTemplateGenerator = () => {
    setSelectedTemplate(generatedTemplate);
    setSelectedSources([...appliedSources]);
    setTemplateOpen(true);
  };
  const toggleSource = (key: DocumentSourceKey) => {
    setSelectedSources((sources) => sources.includes(key) ? sources.filter((item) => item !== key) : [...sources, key]);
  };
  const generateFromTemplate = () => {
    if (!selectedSources.length) {
      message.warning('至少勾选一项数据源后才能生成采购文件');
      return;
    }
    setAppliedSources([...selectedSources]);
    setGeneratedTemplate(selectedTemplate);
    setGeneratedAt(new Date().toLocaleString('zh-CN'));
    setTemplateOpen(false);
    message.success('已按' + templateNames[selectedTemplate] + '生成采购文件，带入 ' + selectedSources.length + ' 项数据源，形成 ' + selectedChapterCount + ' 个章节');
  };
  const runQualityCheck = () => message.success('文件质量检查已完成，当前生成 ' + generatedChapterCount + ' / ' + documentChapterSources.length + ' 章，发现 ' + (documentChapterSources.length - generatedChapterCount) + ' 项待补充问题');
  const exportDocument = () => message.success('采购文件 Word 已生成，正在下载');
  const submitForReview = () => {
    if (onCompleteStage && !onCompleteStage()) return;
    go('/procurement/suppliers');
  };

  return <>
    <PageTitle
      breadcrumb={['采购需求', '采购文件', project.method + '文件']}
      title="采购文件编制"
      subtitle={'基于' + templateNames[generatedTemplate] + '生成 · 最近生成 ' + generatedAt}
      actions={<><Button icon={<DiffOutlined />} onClick={openTemplateGenerator}>从模板生成</Button><Button icon={<FolderOpenOutlined />} onClick={() => go('/procurement/documents/gate')}>文件门控</Button><Button icon={<SafetyCertificateOutlined />} className="purple-button" onClick={runQualityCheck}>质量检查</Button><Button icon={<HistoryOutlined />} onClick={() => onOpenModal('version')}>版本记录</Button><Button icon={<DownloadOutlined />} onClick={exportDocument}>导出 Word</Button><Button type="primary" icon={<SendOutlined />} onClick={submitForReview}>提交审核并进入供应商核查</Button></>}
    />
    {!workflow.materialsReady && <Alert className="workflow-gate-alert" type="warning" showIcon message="当前阶段还缺少项目立项依据" description="请先补充必备材料，材料齐全后才能提交采购文件并进入供应商核查。" action={<Button type="primary" onClick={() => onOpenModal('upload')}>立即补充材料</Button>} />}
    <Row gutter={[16, 16]} align="top">
      <Col xs={24} lg={5}>
        <Panel title={<>☷ 章节 <StatusPill tone={generatedChapterCount === documentChapterSources.length ? 'green' : 'orange'}>{generatedChapterCount} / {documentChapterSources.length} 章</StatusPill></>}>
          <Progress percent={generatedProgress} showInfo={false} />
          <span className="muted-text">已生成 {generatedChapterCount} / {documentChapterSources.length} 章 · 来源 {appliedSources.length} 项</span>
          <div className="chapter-list">{documentChapterSources.map((chapter, index) => { const generated = hasSource(chapter.source); return <div className={generated ? index === 2 ? 'active' : '' : 'warning'} key={chapter.title}><span>{generated ? <CheckCircleFilled /> : <WarningFilled />}</span>{chapter.title}{!generated && <StatusPill tone="orange">待补充</StatusPill>}</div>; })}</div>
        </Panel>
        <Panel className="current-project-card"><strong>当前项目</strong><h3>{project.name}</h3><span>{project.id} · {project.method}</span><Progress percent={Math.max(18, generatedProgress)} showInfo={false} /></Panel>
      </Col>
      <Col xs={24} lg={14}>
        <Panel className="document-editor">
          <div className="editor-toolbar">
            <Space>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => message.info('已撤销上一处编辑')} />
              <Button type="text" icon={<ArrowRightOutlined />} onClick={() => message.info('已恢复下一处编辑')} />
              <Divider type="vertical" />
              <Select defaultValue="正文" options={[{ value: '正文', label: '正文' }, { value: '标题 1', label: '标题 1' }]} />
              <Select defaultValue="14" options={['12', '14', '16'].map((value) => ({ value, label: value }))} />
              <Button type="text" onClick={() => message.info('已应用粗体格式')}><strong>B</strong></Button>
              <Button type="text" onClick={() => message.info('已应用下划线格式')}><u>U</u></Button>
              <Button type="text" icon={<LinkOutlined />} onClick={() => message.info('请选择文本后插入链接')} />
              <Button type="text" className="purple-button" icon={<ThunderboltFilled />} onClick={() => { setAiContinuation(true); message.success('AI 续写内容已插入文档'); }}>AI 续写</Button>
            </Space>
          </div>
          <article className="document-body">
            <h1>{project.name}<br />{project.method}文件</h1>
            <p className="document-meta">项目编号：{project.id}　采购人：{project.department}　编制日期：{project.createdAt}　模板：{templateNames[generatedTemplate]}　版本：V1.3</p>
            {hasSource('basic') ? <><h2>第一章 采购公告</h2><h3>一、项目基本情况</h3><p>项目编号：<b>{project.id}</b></p><p>项目名称：<b>{project.name}</b></p><p>预算金额：<b>{project.budget}</b></p><p>采购方式：<b>{project.method}</b></p><h3>二、采购单位与项目概况</h3><p>采购单位：<b>{project.department}</b>；项目负责人：<b>{project.owner}</b>。本项目围绕{project.name}开展采购，采购品类为{project.category}。</p></> : <div className="generated-placeholder">未勾选“项目基础信息”，本章节已保留待补充占位。</div>}
            {hasSource('commercial') ? <><h2>第二章 投标人与评审规则</h2><h3>一、投标人资格要求</h3><ol><li>具有独立承担民事责任的能力，持有有效营业执照；</li><li>具有良好的商业信誉和健全的财务会计制度；</li><li>具有履行合同所必需的设备和专业技术能力；</li><li>近三年内在经营活动中没有重大违法记录。</li></ol><h3>二、评审标准</h3><p>技术评审 60 分、商务评审 20 分、价格评审 20 分，评审因素与采购需求保持一致。</p></> : <div className="generated-placeholder">未勾选“商务与评审规则”，投标资格和评分标准待补充。</div>}
            {hasSource('requirements') ? <><h2>第三章 采购需求</h2><h3>一、采购范围与项目概况</h3><p>{project.intention}</p><p>本章节由项目意向、历史相似项目和采购单位确认信息自动汇总生成，具体数量及交付范围以最终确认版本为准。</p></> : <div className="generated-placeholder">未勾选“采购需求说明”，采购范围和项目概况待补充。</div>}
            {hasSource('technical') ? <><h2>第四章 技术要求</h2><h3>一、核心技术指标</h3><ol><li>连续运行能力不低于 12 小时，支持连续巡检工作模式；</li><li>防护等级不低于 IP67，满足现场防尘、防水使用环境；</li><li>支持标准数据接口，具备与现有系统对接的能力；</li><li>投标人须逐项响应技术参数，并提供检测或验证依据。</li></ol></> : <div className="generated-placeholder">未勾选“技术参数”，技术指标章节待补充。</div>}
            {hasSource('delivery') ? <><h2>第五章 合同条款与交付要求</h2><h3>一、交付安排</h3><p>供应商应在合同生效后 45 日内完成供货、安装与调试，交付地点为采购单位指定地点（计划完成时间：{project.planDate}）。</p><h3>二、付款与违约责任</h3><p>验收合格后按合同约定办理付款；逾期交付、未按要求整改或服务承诺未兑现的，按合同专用条款承担违约责任。</p></> : <div className="generated-placeholder">未勾选“交付与合同要点”，合同专用条款待补充。</div>}
            {hasSource('acceptance') ? <><h2>第六章 验收要求</h2><h3>一、验收方式</h3><p>采用到货清点、现场功能测试和抽样检测相结合的方式组织验收，技术指标、资料完整性和服务承诺均应纳入验收记录。</p><h3>二、质保要求</h3><p>供应商应提供不少于 3 年质保服务，验收不合格的，应在采购单位规定期限内完成整改并申请复验。</p></> : <div className="generated-placeholder">未勾选“验收标准”，验收方式和质保要求待补充。</div>}
            <p className="document-generated-note">本稿已根据勾选的数据源自动生成：{sourceNames || '暂无'}。生成后仍可在线编辑，系统会保留模板、来源和版本留痕。</p>
            <p className="editor-placeholder">继续输入内容，或将鼠标移至下方添加新章节...</p>
            {aiContinuation && <p className="ai-generated-copy">AI 续写：供应商应在合同签订后 45 日内完成供货、安装与调试，并提交完整的产品合格证明及售后服务承诺。</p>}
          </article>
          <div className="editor-footer"><span>字数 {(1800 + appliedSources.length * 160 + (aiContinuation ? 56 : 0)).toLocaleString()}</span><span>共 {Math.max(3, generatedChapterCount - 1)} 页</span><span>自动保存</span><span>{project.owner} 正在编辑</span></div>
        </Panel>
      </Col>
      <Col xs={24} lg={5}>
        <Panel title={<><SafetyCertificateOutlined /> 文件质量检查</>}>
          <div className="quality-circle"><Progress type="circle" percent={Math.min(100, 42 + generatedChapterCount * 5)} strokeColor={generatedChapterCount === documentChapterSources.length ? '#10b981' : '#f59e0b'} /><span>质量评分 / 100</span></div>
          <div className="quality-list"><span>🔴 完整性 <b>{generatedChapterCount} / {documentChapterSources.length}</b></span><span>🟠 合规性 <b>{hasSource('commercial') ? '5 / 6' : '2 / 6'}</b></span><span>🟢 一致性 <b>{hasSource('requirements') && hasSource('technical') && hasSource('acceptance') ? '4 / 4' : '2 / 4'}</b></span><span>🟠 规范性 <b>{hasSource('basic') ? '2 / 3' : '1 / 3'}</b></span></div>
          <Divider /><strong>待处理问题 <Badge count={documentChapterSources.length - generatedChapterCount} /></strong>
          {documentChapterSources.filter((chapter) => !hasSource(chapter.source)).slice(0, 3).map((chapter) => <div className="quality-problem" key={chapter.title}><strong>{chapter.title}章节待补充</strong><span>请从模板生成时勾选对应数据源，或人工编辑补齐</span></div>)}
          {!documentChapterSources.some((chapter) => !hasSource(chapter.source)) && <div className="quality-problem success"><strong>章节数据已齐全</strong><span>可继续进行法规检查和多级审核</span></div>}
          <Button type="link" onClick={runQualityCheck}>查看全部检查项 <ArrowRightOutlined /></Button>
        </Panel>
      </Col>
    </Row>
    <Modal
      open={templateOpen}
      title={<ModalTitle icon={<DiffOutlined />} title="从模板生成采购文件" subtitle={'勾选需要带入模板的数据，系统将生成对应章节内容'} />}
      width={700}
      centered
      onCancel={() => setTemplateOpen(false)}
      footer={[<Button key="cancel" onClick={() => setTemplateOpen(false)}>取消</Button>, <Button key="create" type="primary" icon={<DiffOutlined />} disabled={!selectedSources.length} onClick={generateFromTemplate}>生成采购文件</Button>]}
    >
      <div className="template-detection"><strong>✣ 系统自动识别</strong><div><span>采购类型 <b>▣ {project.type}类</b></span><span>采购方式 <b>♙ {project.method}</b></span></div></div>
      <h3>推荐模板</h3>
      {templateNames.map((item, index) => <div className={'template-option ' + (selectedTemplate === index ? 'selected' : '')} key={item} onClick={() => setSelectedTemplate(index)}><Radio checked={selectedTemplate === index} /><FileTextOutlined /><div><strong>{item}</strong><span>{index === 0 ? '2024 版 · 含 8 个标准章节 · 集团法务审定' : '适用于各类采购方式 · 6 个通用章节'}</span></div>{index === 0 && <StatusPill tone="green">推荐</StatusPill>}</div>)}
      <div className="template-source-heading"><h3>自动带入内容</h3><Checkbox checked={selectedSources.length === documentGenerationSources.length} indeterminate={selectedSources.length > 0 && selectedSources.length < documentGenerationSources.length} onChange={(event) => setSelectedSources(event.target.checked ? [...allSourceKeys] : [])}>全选</Checkbox></div>
      <div className="template-source-grid">{documentGenerationSources.map((item) => <div className={'template-source-option ' + (selectedSources.includes(item.key) ? 'selected' : '')} key={item.key} onClick={() => toggleSource(item.key)}><Checkbox checked={selectedSources.includes(item.key)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSource(item.key)} /><div><strong>{item.label}</strong><span>{item.description}</span></div></div>)}</div>
      <div className="template-generation-summary"><strong>本次生成预览</strong><span>将带入 {selectedSources.length} 项数据源，生成 {selectedChapterCount} 个章节</span><div>{documentGenerationSources.filter((item) => selectedSources.includes(item.key)).map((item) => <Tag color="blue" key={item.key}>{item.label}</Tag>)}</div></div>
      <Alert type="info" showIcon message="生成后将覆盖当前文档草稿内容，未勾选的数据章节会保留待补充占位；模板、来源和生成版本会记录在文档留痕中。" />
    </Modal>
  </>;
}

function ContractsPage({ onCompleteStage }: { onCompleteStage?: () => boolean }) {
  const [writtenTitles, setWrittenTitles] = useState<string[]>([]);
  const [reviewLevel, setReviewLevel] = useState(0);
  const writeContract = (title: string) => {
    setWrittenTitles((titles) => titles.includes(title) ? titles : [...titles, title]);
    message.success(`“${title}”条款已写入合同草案`);
  };
  const writeAllContracts = () => {
    setWrittenTitles(contracts.map((item) => item.title));
    message.success('全部条款已写入合同草案');
  };
  const createContract = () => {
    if (writtenTitles.length < contracts.length) {
      message.info('未写入的条款将按当前建议一并带入合同草案');
    }
    if (onCompleteStage && !onCompleteStage()) return;
    message.success('合同草案已生成，正在进入履约管理');
    go('/procurement/contracts/fulfillment');
  };
  const advanceReview = () => {
    if (reviewLevel >= 2) {
      message.info('合同建议方案已完成终审，后续修改会自动生成新版本');
      return;
    }
    if (reviewLevel === 0 && writtenTitles.length < contracts.length) {
      message.warning('请先处理并确认全部差异条款，再提交复审');
      return;
    }
    setReviewLevel((level) => level + 1);
    message.success(`合同建议方案已完成${['初审', '复审', '终审'][reviewLevel]}`);
  };
  return (
    <>
      <PageTitle breadcrumb={['合同管理', '合同建议', '华科智能设备有限公司']} title="合同建议" subtitle="对比采购文件要求与供应商承诺，生成拟写入合同的条款建议" actions={<><Button icon={<DiffOutlined />} onClick={writeAllContracts}>全部写入合同</Button><Button onClick={() => go('/procurement/contracts/fulfillment')} icon={<FundOutlined />}>履约管理</Button><Button type="primary" icon={<FileDoneOutlined />} onClick={createContract}>生成合同草案并进入履约</Button></>} />
      <Panel className="contract-summary"><strong>{writtenTitles.length ? `已写入 ${writtenTitles.length} / ${contracts.length} 项条款，识别 4 项差异条款` : '共比对 24 项条款，识别 4 项差异条款'}</strong><Space><StatusPill tone="green">优于原要求 2</StatusPill><StatusPill tone="blue">新增承诺 1</StatusPill><StatusPill tone="orange">存在偏离 1</StatusPill></Space></Panel>
      <Panel title={<><FileSearchOutlined /> 合同信息提取与审核流</>} extra={<StatusPill tone={reviewLevel === 2 ? 'green' : 'blue'}>{reviewLevel === 2 ? '终审通过' : `当前：${['初审', '复审', '终审'][reviewLevel]}`}</StatusPill>}>
        <div className="contract-source-grid"><div><span>采购文件</span><strong>已提取 18 项约束</strong><small>技术要求、交付期、验收标准、付款方式</small></div><div><span>供应商响应文件</span><strong>已提取 15 项承诺</strong><small>报价、质保、培训、交付与服务承诺</small></div><div><span>评审与澄清记录</span><strong>已提取 6 项澄清</strong><small>2 项澄清已转为合同补充条款</small></div></div>
        <div className="contract-review-steps">{['初审', '复审', '终审'].map((step, index) => <div className={index < reviewLevel ? 'done' : index === reviewLevel ? 'current' : ''} key={step}><span>{index < reviewLevel ? <CheckOutlined /> : index + 1}</span><strong>{step}</strong><small>{index < reviewLevel ? '已完成 · 留痕' : index === reviewLevel ? '待处理' : '待开始'}</small></div>)}</div>
        <div className="contract-review-actions"><span><SafetyCertificateOutlined /> 偏离项、付款风险和验收风险会在提交前再次校验</span><Button type="primary" onClick={advanceReview}>{reviewLevel === 2 ? '查看审核记录' : `提交${['初审', '复审', '终审'][reviewLevel]}`}</Button></div>
      </Panel>
      <div className="contract-list">{contracts.map((item) => { const written = writtenTitles.includes(item.title); return <Card className={`contract-card ${item.color}`} bordered={false} key={item.title}><div className="contract-card-head"><h2><CheckCircleFilled /> {item.title}</h2><StatusPill tone={written ? 'green' : item.color as any}>{written ? '已写入合同' : item.kind}</StatusPill><Button type={written ? 'default' : 'primary'} disabled={written} icon={written ? <CheckOutlined /> : <FileDoneOutlined />} onClick={() => writeContract(item.title)}>{written ? '已写入' : '写入合同'}</Button></div><div className="contract-compare"><div><span>采购要求</span><strong>{item.sourceValue}</strong><small>来源：{item.source}</small></div><ArrowRightOutlined /><div><span>供应商承诺</span><strong>{item.result}</strong><small>来源：投标文件·商务承诺</small></div></div><div className="contract-tip">{item.color === 'orange' ? <WarningFilled /> : <InfoCircleOutlined />} {item.color === 'orange' ? '该要求与采购文件不一致，建议提交评标委员会复核后再决定是否写入合同。' : '建议将供应商承诺写入合同，并同步约定违约责任。'}</div></Card>; })}</div>
    </>
  );
}

function SuppliersPage({ onOpenModal, onCompleteStage }: { onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean }) {
  const [screeningStarted, setScreeningStarted] = useState(false);
  const [visibleSuppliers, setVisibleSuppliers] = useState(supplierCards);
  const handleScreening = () => {
    if (!screeningStarted) {
      setScreeningStarted(true);
      message.success('联合核查已完成，请确认结果后进入合同建议');
      return;
    }
    if (onCompleteStage && !onCompleteStage()) return;
    go('/procurement/contracts');
  };
  const removeSupplier = (name: string) => {
    Modal.confirm({
      title: '移除候选企业',
      content: `确认将“${name}”从候选供应商列表中移除吗？`,
      okText: '确认移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setVisibleSuppliers((suppliers) => suppliers.filter((supplier) => supplier.name !== name));
        message.success('候选企业已移除');
      },
    });
  };
  return (
    <>
      <PageTitle breadcrumb={['供应商管理', '风险核查', '候选供应商']} title="候选供应商" subtitle="添加候选企业后可发起联合核查，自动识别企业间关联关系" actions={<><Button icon={<PlusOutlined />} onClick={() => onOpenModal('add-company')}>添加企业</Button><Button type="primary" icon={<SyncOutlined />} onClick={handleScreening}>{screeningStarted ? '完成核查并进入合同建议' : '开始联合核查'}</Button></>} />
      <Panel className="scope-banner"><SafetyCertificateOutlined /><strong>联合核查范围：企业信息 · 信用风险 · 经营异常 · 司法风险 · 关联企业 · 关联人员 · 供应商关系</strong><span>疑点 1 项　·　上次核查 2024-06-15 10:22</span></Panel>
      <Row className="supplier-card-grid" gutter={[16, 16]}>{visibleSuppliers.map((supplier) => <Col xs={24} lg={8} key={supplier.name}><Card className="supplier-card" bordered={false}><div className="supplier-head"><Avatar shape="square" size={48} icon={<BankOutlined />} /><div><h2>{supplier.name}</h2><span>统一社会信用代码：{supplier.code}</span></div><StatusPill tone={supplier.tone as any}>{supplier.risk > 40 ? '中风险' : '低风险'}</StatusPill></div><div className="supplier-facts"><div><span>企业类型</span><b>有限责任公司</b></div><div><span>注册资本</span><b>{supplier.capital}</b></div><div><span>成立时间</span><b>{supplier.founded}</b></div></div><div className="supplier-tags"><StatusPill tone="green">合作 3 年</StatusPill><StatusPill tone={supplier.risk > 40 ? 'orange' : 'green'}>{supplier.relation}</StatusPill></div><div className="supplier-risk-line"><span>综合风险分</span><Progress percent={supplier.risk} showInfo={false} strokeColor={supplier.risk > 40 ? '#f59e0b' : '#10b981'} /><strong>{supplier.risk}</strong></div><Space className="supplier-actions"><Button type="primary" block icon={<SafetyCertificateOutlined />} onClick={() => go('/procurement/suppliers/risk')}>查看风险详情</Button><Button onClick={() => removeSupplier(supplier.name)}>移除</Button></Space></Card></Col>)}<Col xs={24} lg={8}><Card className="add-supplier-card" bordered={false} onClick={() => onOpenModal('add-company')}><PlusOutlined /><h3>添加候选企业</h3><span>支持批量导入或按名称检索</span></Card></Col></Row>
      <Panel title={<><LinkOutlined /> 联合核查机制说明</>}><div className="mechanism-grid">{[['1', '多企业合并核查', '同时核查多家候选企业，统一输出风险对比结果'], ['2', '跨企业关联识别', '识别企业间交叉任职、共同股东、同一控制人等图谱风险线索'], ['3', '结果留痕归档', '核查记录自动关联当前项目，可导出核查报告']].map(([index, title, desc]) => <div key={index}><span>{index}</span><div><strong>{title}</strong><p>{desc}</p></div></div>)}</div></Panel>
    </>
  );
}

function SupplierRiskPage({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  const [riskReportVisible, setRiskReportVisible] = useState(false);
  const refreshRisk = () => message.success('已重新查询供应商风险，当前为最新核查结果');
  const generateRiskReport = () => {
    setRiskReportVisible(true);
    message.success('供应商风险核查报告已生成');
  };
  const downloadRiskReport = () => message.success('供应商风险核查报告已生成，正在下载');
  return (
    <>
      <PageTitle
        breadcrumb={['供应商管理', '风险核查', '供应商风险详情']}
        title="华科智能设备有限公司"
        subtitle="91440300MA5F8K2X3D · 有限责任公司 · 法定代表人：张伟 · 成立 2015-03-12"
        actions={<><Button icon={<SyncOutlined />} onClick={refreshRisk}>重新查询</Button><Button type="primary" icon={<FileDoneOutlined />} onClick={generateRiskReport}>生成核查报告</Button></>}
      />
      <Alert type="warning" showIcon message="第三方关联库暂不可用，关联关系数据为部分结果，其余数据源结果正常保留。" className="warning-banner" />
      <Row gutter={[16, 16]} className="risk-metrics">
        <Col xs={24} sm={12} xl={4}><MetricCard icon={<AuditOutlined />} value="2" label="司法风险" accent="red" /></Col>
        <Col xs={24} sm={12} xl={5}><MetricCard icon={<SafetyCertificateOutlined />} value="3" label="信用风险" accent="orange" /></Col>
        <Col xs={24} sm={12} xl={5}><MetricCard icon={<CheckCircleFilled />} value="0" label="经营异常" accent="green" /></Col>
        <Col xs={24} sm={12} xl={5}><MetricCard icon={<ApartmentOutlined />} value="2" label="关联风险" accent="orange" /></Col>
        <Col xs={24} sm={12} xl={5}><MetricCard icon={<FundOutlined />} value="62 / 100" label="综合风险等级" accent="orange" badge="中风险" /></Col>
      </Row>
      <Panel title={<><ApartmentOutlined /> 企业关系图谱 <StatusPill tone="orange">部分结果</StatusPill></>}>
        <div className="relation-graph">
          <div className="graph-canvas">
            <svg className="graph-connections graph-connections-desktop" viewBox="0 0 100 230" preserveAspectRatio="none" aria-hidden="true">
              <line x1="16" y1="165" x2="30" y2="65" />
              <line x1="30" y1="65" x2="58" y2="65" />
              <line x1="58" y1="65" x2="84" y2="165" />
            </svg>
            <svg className="graph-connections graph-connections-mobile" viewBox="0 0 100 260" preserveAspectRatio="none" aria-hidden="true">
              <line x1="28" y1="90" x2="28" y2="126" />
              <line x1="28" y1="54" x2="72" y2="54" />
              <line x1="72" y1="90" x2="72" y2="126" />
            </svg>
            <button type="button" className="graph-node company left" onClick={() => onOpenModal('risk-node')}>华科智能设备<br />有限公司<span>候选企业 A</span></button>
            <button type="button" className="graph-node person top" onClick={() => onOpenModal('risk-node')}>张伟<span>董事 · 交叉任职</span></button>
            <button type="button" className="graph-node company right" onClick={() => onOpenModal('risk-node')}>中联数字科技<br />有限公司<span>候选企业 B</span></button>
            <button type="button" className="graph-node company middle" onClick={() => onOpenModal('risk-node')}>恒远科技有限公司<span>关联企业</span></button>
          </div>
          <div className="graph-warning">
            <WarningFilled />
            <div>
              <strong>两家供应商存在交叉任职线索</strong>
              <p>张伟同时担任华科智能设备有限公司董事与恒远科技有限公司监事，而恒远科技与中联数字科技存在同一人员任职，提示两家候选企业可能存在围标风险。</p>
            </div>
            <Button onClick={() => onOpenModal('risk-node')}>查看线索</Button>
          </div>
        </div>
        <div className="graph-help">点击图谱中的任意节点，可查看该节点的详细任职与数据来源信息</div>
      </Panel>
      <div className="bottom-action-bar">
        <span><ClockCircleOutlined /> 本次核查时间：2024-06-15 10:22 · 核查人：张明 · 部分数据源异常</span>
        <Space><Button icon={<SyncOutlined />} onClick={refreshRisk}>重新查询</Button><Button onClick={() => message.success('风险核查结果已关联到当前项目')}>关联当前项目</Button><Button type="primary" icon={<FileDoneOutlined />} onClick={generateRiskReport}>生成核查报告</Button></Space>
      </div>
      <Modal
        open={riskReportVisible}
        title={<ModalTitle icon={<FileDoneOutlined />} title="供应商风险核查报告" subtitle="RISK-2024-0615-001 · 生成时间：2024-06-15 10:25" />}
        width={820}
        centered
        onCancel={() => setRiskReportVisible(false)}
        footer={<Space><Button onClick={() => setRiskReportVisible(false)}>关闭</Button><Button type="primary" icon={<DownloadOutlined />} onClick={downloadRiskReport}>下载报告</Button></Space>}
      >
        <div className="risk-report-preview">
          <div className="risk-report-heading">
            <div><h2>供应商联合风险核查报告</h2><span>项目：2024年度办公设备集中采购 · PRJ-2024-012</span></div>
            <StatusPill tone="orange">中风险 · 62 / 100</StatusPill>
          </div>
          <DescriptionsList items={[['核查对象', '华科智能设备有限公司、中联数字科技有限公司'], ['核查范围', '企业信息、信用风险、经营异常、司法风险、关联企业、关联人员、供应商关系'], ['核查时间', '2024-06-15 10:22'], ['核查人员', '张明'], ['报告结论', '存在交叉任职及关联企业线索，建议复核后再确定供应商']]}/>
          <div className="risk-report-section">
            <h3>一、风险概览</h3>
            <div className="risk-report-stats"><div><span>司法风险</span><strong className="red">2</strong><small>项风险记录</small></div><div><span>信用风险</span><strong className="orange">3</strong><small>项需关注</small></div><div><span>经营异常</span><strong className="green">0</strong><small>项异常</small></div><div><span>关联风险</span><strong className="orange">2</strong><small>条线索</small></div></div>
          </div>
          <div className="risk-report-section">
            <h3>二、重点核查发现</h3>
            <div className="risk-report-finding"><StatusPill tone="orange">高关注</StatusPill><div><strong>存在交叉任职线索</strong><p>张伟同时担任华科智能设备有限公司董事与恒远科技有限公司监事；恒远科技与中联数字科技存在同一人员任职关系。</p></div></div>
            <div className="risk-report-finding"><StatusPill tone="orange">待复核</StatusPill><div><strong>候选企业间可能存在关联关系</strong><p>关系图谱显示两家候选企业通过恒远科技形成间接关联，建议在定标前补充实际控制人及关联人员核验。</p></div></div>
            <div className="risk-report-finding"><StatusPill tone="blue">数据说明</StatusPill><div><strong>第三方关联库暂不可用</strong><p>关联关系结果为部分数据源下的阶段性结果，其余企业、信用、司法数据已正常保留并纳入本报告。</p></div></div>
          </div>
          <div className="risk-report-section">
            <h3>三、处理建议</h3>
            <ol className="risk-report-advice"><li>补充核验两家候选企业的实际控制人、股东及关键人员任职信息。</li><li>将交叉任职线索提交评标委员会复核，并在评审记录中保留处理意见。</li><li>待关联数据源恢复后重新查询，形成补充核查记录并关联至本项目。</li></ol>
          </div>
          <Alert type="info" showIcon message="本报告已关联到当前项目全过程记录，后续重新查询或补充核查将自动生成新的版本记录。" />
        </div>
      </Modal>
    </>
  );
}

type FulfillmentNodeStatus = '已完成' | '逾期 2 天' | '即将超期' | '待开始';

type FulfillmentNodeRow = {
  node: string;
  plan: string;
  actual: string;
  owner: string;
  status: FulfillmentNodeStatus;
  summary: string;
  nextAction: string;
  attachments: string[];
  missingMaterials?: string[];
  activities: Array<{ time: string; title: string; description: string }>;
};

const fulfillmentNodeRows: FulfillmentNodeRow[] = [
  {
    node: '合同签订',
    plan: '2024-06-18',
    actual: '2024-06-18',
    owner: '李强（供应商）',
    status: '已完成',
    summary: '合同双方已完成签署，合同编号 HT-2024-0126 已生效。',
    nextAction: '节点已完成，已进入生产准备阶段。',
    attachments: ['合同签署版.pdf', '合同条款确认单.pdf'],
    activities: [{ time: '2024-06-18 09:15', title: '合同签署完成', description: '采购方张明与供应商李强完成合同签署，交付周期及质保承诺已写入合同。' }],
  },
  {
    node: '生产准备',
    plan: '2024-08-21',
    actual: '2024-06-22',
    owner: '李强（供应商）',
    status: '逾期 2 天',
    summary: '供应商尚未按计划回传完整的生产排期与备料确认信息。',
    nextAction: '督促供应商提交生产排期、备料清单及预计发货时间。',
    attachments: ['生产排期确认单.pdf'],
    activities: [
      { time: '2024-08-19 10:30', title: '首次催办', description: '已向供应商发送生产准备提醒，要求在计划日期前确认备料情况。' },
      { time: '2024-08-23 09:00', title: '节点逾期', description: '系统检测到生产准备节点逾期 2 天，已升级为履约异常。' },
    ],
  },
  {
    node: '设备到货',
    plan: '2024-08-22',
    actual: '—',
    owner: '李强（供应商）',
    status: '即将超期',
    summary: '设备已完成生产待发货，距离计划到货日期仅剩 3 天。',
    nextAction: '确认物流安排并补充出厂检测报告、装箱单与序列号清单。',
    attachments: [],
    missingMaterials: ['出厂检测报告', '装箱单与序列号清单'],
    activities: [
      { time: '2024-08-17 08:00', title: '系统触发预警', description: '距计划到货日期 3 天仍未登记物流信息，系统自动向责任人推送预警。' },
      { time: '2024-08-17 08:10', title: '责任人已确认', description: '李强确认设备已生产完成，待安排发货并上传随货资料。' },
    ],
  },
  {
    node: '安装调试',
    plan: '2024-08-23',
    actual: '—',
    owner: '张明（采购）',
    status: '待开始',
    summary: '设备到货验收通过后，安排现场安装、系统联调与试运行。',
    nextAction: '确认现场环境和安装人员，预约到货后的实施时间。',
    attachments: ['安装调试方案.docx'],
    activities: [{ time: '2024-06-18 09:15', title: '节点创建', description: '根据合同约定创建安装调试节点，完成时间以设备验收通过为前置条件。' }],
  },
  {
    node: '人员培训',
    plan: '2024-08-24',
    actual: '—',
    owner: '张明（采购）',
    status: '待开始',
    summary: '供应商将为使用部门提供 2 天驻场培训及操作手册。',
    nextAction: '收集使用部门培训名单，确认培训课表与场地。',
    attachments: ['培训计划模板.docx'],
    activities: [{ time: '2024-06-18 09:15', title: '节点创建', description: '已将供应商承诺的 2 天驻场培训纳入履约节点。' }],
  },
  {
    node: '项目验收',
    plan: '2024-08-25',
    actual: '—',
    owner: '张明（采购）',
    status: '待开始',
    summary: '完成到货数量、外观、功能、续航及接口等项目验收项核验。',
    nextAction: '准备验收人员和验收表单，设备到货后发起现场验收。',
    attachments: ['项目验收清单.xlsx'],
    activities: [{ time: '2024-06-18 09:15', title: '验收标准关联', description: '已关联采购文件中的技术指标与验收要求，验收时需补充续航实测记录。' }],
  },
  {
    node: '付款',
    plan: '2024-08-26',
    actual: '—',
    owner: '张明（采购）',
    status: '待开始',
    summary: '按合同约定在验收合格后触发到货款、验收款及质保金支付。',
    nextAction: '验收通过后核对发票与付款申请，触发对应付款节点。',
    attachments: ['付款申请单模板.xlsx'],
    activities: [{ time: '2024-06-18 09:15', title: '付款条件登记', description: '已登记预付款 30%、到货款 40%、验收款 20% 和质保金 10% 的付款比例。' }],
  },
  {
    node: '质保',
    plan: '2024-08-27',
    actual: '—',
    owner: '李强（供应商）',
    status: '待开始',
    summary: '整机质保 3 年、电池质保 5 年，质保期内提供故障响应与维修服务。',
    nextAction: '验收完成后登记质保起止日期与供应商服务联系人。',
    attachments: ['质保承诺书.pdf'],
    activities: [{ time: '2024-06-18 09:15', title: '质保条款登记', description: '供应商已承诺整机质保 3 年、电池质保 5 年，条款已写入合同。' }],
  },
];

let fulfillmentRuntimeNodes: FulfillmentNodeRow[] = fulfillmentNodeRows;

function getFulfillmentNodeTone(status: FulfillmentNodeStatus): 'green' | 'red' | 'orange' | 'gray' {
  if (status === '已完成') return 'green';
  if (status === '逾期 2 天') return 'red';
  if (status === '即将超期') return 'orange';
  return 'gray';
}

function getFulfillmentTimelineClass(status: FulfillmentNodeStatus) {
  if (status === '已完成') return 'done';
  if (status === '逾期 2 天') return 'overdue';
  if (status === '即将超期') return 'warning';
  return '';
}

function getFulfillmentTimelineMarker(status: FulfillmentNodeStatus, index: number): React.ReactNode {
  if (status === '已完成') return <CheckOutlined />;
  if (status === '逾期 2 天') return '×';
  if (status === '即将超期') return <WarningFilled />;
  return index + 1;
}

function getFulfillmentTimelineLabel(node: FulfillmentNodeRow) {
  if (node.status === '已完成') return node.actual === '—' ? '已完成' : node.actual;
  if (node.status === '逾期 2 天') return node.status;
  return `计划 ${node.plan.slice(5)}`;
}

function FulfillmentNodeDetailPage({ onOpenModal, nodeRows }: { onOpenModal: (key: ModalKey) => void; nodeRows: FulfillmentNodeRow[] }) {
  const location = useLocation();
  const nodeName = new URLSearchParams(location.search).get('node');
  const node = nodeRows.find((item) => item.node === nodeName) || nodeRows[0];
  const tone = getFulfillmentNodeTone(node.status);

  return (
    <>
      <PageTitle
        breadcrumb={['合同管理', '履约管理', '履约节点明细', node.node]}
        title={`${node.node}节点详情`}
        subtitle="HT-2024-0126 · 2024年度办公设备集中采购 · 华科智能设备有限公司"
        actions={
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={() => go('/procurement/contracts/fulfillment')}>返回履约管理</Button>
            {node.status === '即将超期' && <Button type="primary" onClick={() => onOpenModal('warning')}>处理预警</Button>}
          </>
        }
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Panel>
            <div className="fulfillment-node-detail-heading">
              <div className={`fulfillment-node-detail-icon ${tone}`}><FileSearchOutlined /></div>
              <div>
                <div className="fulfillment-node-detail-title"><h2>{node.node}</h2><StatusPill tone={tone}>{node.status}</StatusPill></div>
                <p>{node.summary}</p>
              </div>
            </div>
            <div className="fulfillment-node-detail-facts">
              <InfoCell label="计划日期" value={node.plan} />
              <InfoCell label="实际日期" value={node.actual} />
              <InfoCell label="责任人" value={node.owner} avatar={node.owner.slice(0, 1)} />
              <InfoCell label="合同编号" value="HT-2024-0126" />
            </div>
            {node.status === '逾期 2 天' && <Alert className="fulfillment-node-detail-alert" type="error" showIcon message="该节点已逾期 2 天，请尽快完成催办并补充生产准备凭证。" />}
            {node.status === '即将超期' && <Alert className="fulfillment-node-detail-alert" type="warning" showIcon message="该节点距离计划日期仅剩 3 天，系统已触发履约预警。" />}
          </Panel>
          <Panel title={<><HistoryOutlined /> 节点处理记录</>}>
            <div className="fulfillment-node-activity">
              {node.activities.map((activity) => (
                <div key={`${activity.time}-${activity.title}`}>
                  <span className="fulfillment-node-activity-dot" />
                  <div><strong>{activity.title}</strong><p>{activity.description}</p></div>
                  <time>{activity.time}</time>
                </div>
              ))}
            </div>
          </Panel>
        </Col>
        <Col xs={24} xl={7}>
          <Panel title={<><FileTextOutlined /> 节点资料</>} extra={<StatusPill tone={node.attachments.length ? 'blue' : 'gray'}>{node.attachments.length} 份</StatusPill>}>
            {node.attachments.length > 0 ? (
              <div className="fulfillment-node-files">
                {node.attachments.map((file) => <div className="fulfillment-node-file" key={file}><FileTextOutlined /><div><strong>{file}</strong><span>已关联至履约节点</span></div></div>)}
              </div>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无已上传资料" />}
            {node.missingMaterials && <div className="fulfillment-node-missing"><strong>待补资料</strong>{node.missingMaterials.map((file) => <span key={file}><FileProtectOutlined />{file}</span>)}</div>}
          </Panel>
          <Panel title={<><ArrowRightOutlined /> 下一步处理</>}>
            <div className="fulfillment-node-next"><InfoCircleOutlined /><p>{node.nextAction}</p></div>
          </Panel>
          <Panel title={<><FileTextOutlined /> 合同上下文</>}>
            <DescriptionsList items={[['项目', '2024年度办公设备集中采购'], ['供应商', '华科智能设备有限公司'], ['合同金额', '¥462,000'], ['交付地点', '总部园区 B 座收货区']]} />
          </Panel>
        </Col>
      </Row>
    </>
  );
}

function ContractsFulfillmentPage({ onOpenModal, nodeRows, onUpdateNode }: { onOpenModal: (key: ModalKey) => void; nodeRows: FulfillmentNodeRow[]; onUpdateNode: (nodeName: string, status: FulfillmentNodeStatus, note: string) => void }) {
  const [nodeFilter, setNodeFilter] = useState<'all' | 'exception'>('all');
  const visibleNodeRows = nodeFilter === 'all' ? nodeRows : nodeRows.filter((item) => item.status === '逾期 2 天' || item.status === '即将超期');
  const normalNodeCount = nodeRows.filter((item) => item.status === '已完成' || item.status === '待开始').length;
  const warningNodeCount = nodeRows.filter((item) => item.status === '即将超期').length;
  const overdueNodeCount = nodeRows.filter((item) => item.status === '逾期 2 天').length;
  const arrivalNode = nodeRows.find((item) => item.node === '设备到货') || fulfillmentNodeRows[2];
  const arrivalTone = getFulfillmentNodeTone(arrivalNode.status);
  const arrivalCurrentStatus = arrivalNode.status === '已完成' ? '设备已到货并完成验收' : arrivalNode.status === '逾期 2 天' ? '设备到货已逾期' : arrivalNode.status === '即将超期' ? '生产完成待发货' : '待进入设备到货阶段';
  const arrivalAlertType: 'success' | 'info' | 'warning' | 'error' = arrivalNode.status === '已完成' ? 'success' : arrivalNode.status === '逾期 2 天' ? 'error' : arrivalNode.status === '即将超期' ? 'warning' : 'info';
  const arrivalAlertMessage = arrivalNode.status === '已完成' ? '设备到货节点已完成，相关交付资料可在节点详情中查看。' : arrivalNode.status === '逾期 2 天' ? '设备到货节点已逾期，请尽快完成催办并补充交付资料。' : arrivalNode.status === '即将超期' ? '预警规则：距计划日期 3 天内未完成交付，系统自动触发「即将超期」预警。' : '设备到货节点尚未开始，待前置生产准备完成后推进。';
  const openStatusEditor = (record: FulfillmentNodeRow) => {
    let nextStatus = record.status;
    let note = '';
    Modal.confirm({
      title: `修改「${record.node}」状态`,
      icon: <EditOutlined />,
      width: 520,
      content: (
        <Form layout="vertical" className="modal-form">
          <Form.Item label="当前状态"><StatusPill tone={getFulfillmentNodeTone(record.status)}>{record.status}</StatusPill></Form.Item>
          <Form.Item label="修改为" required>
            <Select
              defaultValue={record.status}
              options={['已完成', '逾期 2 天', '即将超期', '待开始'].map((status) => ({ value: status, label: status }))}
              onChange={(value: FulfillmentNodeStatus) => { nextStatus = value; }}
            />
          </Form.Item>
          <Form.Item label="处理说明"><Input.TextArea rows={3} placeholder="可填写本次状态变更的依据或跟进说明" onChange={(event) => { note = event.target.value; }} /></Form.Item>
        </Form>
      ),
      okText: '保存状态',
      cancelText: '取消',
      onOk: () => {
        onUpdateNode(record.node, nextStatus, note.trim());
        message.success(`「${record.node}」状态已更新为${nextStatus}`);
      },
    });
  };
  return <><PageTitle breadcrumb={['合同管理', '履约管理', '2024年度办公设备集中采购合同']} title="合同履约管理" subtitle="HT-2024-0126 · 供应商：华科智能设备有限公司 · 合同金额 ¥462,000" actions={<><Button icon={<AuditOutlined />} onClick={() => go('/procurement/records')}>履约台账</Button><Button onClick={() => go('/procurement/acceptance')} icon={<SafetyCertificateOutlined />}>进入现场验收</Button><Button type="primary" icon={<DownloadOutlined />} onClick={() => message.success('履约报告已生成，正在下载')}>导出履约报告</Button></>} /><Row gutter={[16, 16]} className="metric-grid"><Col xs={24} sm={12} xl={6}><MetricCard icon={<FundOutlined />} value="68%" label="履约进度" badge="较上周 +6%" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<CheckCircleFilled />} value={normalNodeCount} label="正常节点" accent="green" badge="共 8 个节点" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<WarningFilled />} value={warningNodeCount} label="预警节点" accent="orange" badge="需关注" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<CloseCircleFilled />} value={overdueNodeCount} label="逾期节点" accent="red" badge="已逾期" /></Col></Row><Panel title={<><SyncOutlined /> 履约时间轴</>} extra={<span className="timeline-legend"><i className="green-dot" /> 已完成 <i className="orange-dot" /> 即将超期 <i className="red-dot" /> 逾期 <i className="gray-dot" /> 待开始</span>}><div className="fulfillment-timeline">{nodeRows.map((node, index) => <div className={`fulfillment-node ${getFulfillmentTimelineClass(node.status)}`} key={node.node}><div className="node-circle">{getFulfillmentTimelineMarker(node.status, index)}</div><strong>{node.node}</strong><span>{getFulfillmentTimelineLabel(node)}</span></div>)}</div></Panel><Row gutter={[16, 16]}><Col xs={24} xl={17}><Panel title={<><CloudUploadOutlined /> 设备到货 <StatusPill tone={arrivalTone}>{arrivalNode.status}</StatusPill></>} extra={(arrivalNode.status === '即将超期' || arrivalNode.status === '逾期 2 天') && <Button type="primary" onClick={() => onOpenModal('warning')}>处理预警</Button>} className="fulfillment-focus"><div className="fulfillment-facts"><InfoCell label="计划日期" value={arrivalNode.plan} /><InfoCell label="剩余时间" value={arrivalNode.status === '即将超期' ? '3 天' : arrivalNode.status === '逾期 2 天' ? '已逾期' : arrivalNode.status === '已完成' ? '已完成' : '待计算'} /><InfoCell label="责任人" value={arrivalNode.owner} avatar={arrivalNode.owner.slice(0, 1)} /><InfoCell label="当前状态" value={arrivalCurrentStatus} /></div>{arrivalNode.status !== '已完成' && <div className="missing-files"><div className="missing-title"><strong>缺失资料</strong><StatusPill tone="red">{arrivalNode.missingMaterials?.length || 0} 项</StatusPill></div>{(arrivalNode.missingMaterials || []).map((item) => <div className="missing-file" key={item}><FileProtectOutlined /> <strong>{item}</strong><span>未上传 <ArrowRightOutlined /></span></div>)}</div>}<Alert type={arrivalAlertType} showIcon message={arrivalAlertMessage} /></Panel></Col><Col xs={24} xl={7}><Panel title={<><FileTextOutlined /> 合同信息</>}><DescriptionsList items={[['合同编号', 'HT-2024-0126'], ['供应商', '华科智能设备有限公司'], ['合同金额', '¥462,000'], ['签订日期', '2024-06-18'], ['交付地点', '总部园区 B 座收货区'], ['质保期', '3 年（至 2027-10-15）'], ['逾期违约率', '0.5% / 日']]} /></Panel><Panel title={<><FundOutlined /> 付款进度</>}><div className="payment-list">{[['预付款 30%', '已支付', 'green'], ['到货款 40%', '待触发', 'blue'], ['验收款 20%', '未开始', 'gray'], ['质保金 10%', '未开始', 'gray']].map(([name, status, tone]) => <div key={name}><span className={`payment-dot ${tone}`} />{name}<b className={tone}>{status}</b></div>)}</div></Panel></Col></Row><Panel title={<><FileSearchOutlined /> 履约节点明细</>} extra={<Space><Button type={nodeFilter === 'all' ? 'primary' : 'default'} onClick={() => setNodeFilter('all')}>全部</Button><Button type={nodeFilter === 'exception' ? 'primary' : 'default'} onClick={() => setNodeFilter('exception')}>仅看异常</Button></Space>}><Table pagination={false} rowKey="node" dataSource={visibleNodeRows} columns={[{ title: '节点名称', dataIndex: 'node' }, { title: '计划日期', dataIndex: 'plan' }, { title: '实际日期', dataIndex: 'actual' }, { title: '责任人', dataIndex: 'owner' }, { title: '状态', dataIndex: 'status', render: (value: FulfillmentNodeStatus) => <StatusPill tone={getFulfillmentNodeTone(value)}>{value}</StatusPill> }, { title: '操作', render: (_, record) => <Space size="small"><Button type={record.status === '即将超期' ? 'primary' : 'link'} onClick={() => record.status === '即将超期' ? onOpenModal('warning') : go(`/procurement/contracts/fulfillment/node-detail?node=${encodeURIComponent(record.node)}`)}>{record.status === '即将超期' ? '处理预警' : '查看详情'}</Button><Button type="link" onClick={() => openStatusEditor(record)}>修改状态</Button></Space> }]} /></Panel></>;
}

function DescriptionsList({ items }: { items: Array<[string, string]> }) { return <div className="descriptions-list">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>; }

function RecordsPage({ onOpenModal, onCompleteStage, extraRecords = [] }: { onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean; extraRecords?: ProcurementRecord[] }) {
  const [filter, setFilter] = useState('全部');
  const [selectedRecord, setSelectedRecord] = useState<ProcurementRecord | null>(null);
  const [selectedFileRecord, setSelectedFileRecord] = useState<ProcurementRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ record: ProcurementRecord; name: string } | null>(null);
  const selectedPreview = useMemo(() => {
    if (!selectedFile) return null;
    return {
      filePath: buildRecordFilePreviewUrl(selectedFile.record, selectedFile.name),
      fileName: `${selectedFile.name}.txt`,
    };
  }, [selectedFile]);

  const archiveProcess = () => {
    if (onCompleteStage && !onCompleteStage()) return;
    message.success('全过程记录已归档，项目复盘阶段已完成');
  };
  const allRecords = [...extraRecords, ...recordItems];
  const visibleRecords = allRecords.filter((item) => filter === '全部' || (filter === 'AI 记录' && item.tone === 'purple') || (filter === '预警' && item.tone === 'orange') || filter === '我的操作');
  const showFileList = (record: ProcurementRecord) => {
    setSelectedRecord(null);
    setSelectedFileRecord(record);
  };
  const showFilePreview = (record: ProcurementRecord, name: string) => {
    setSelectedFileRecord(null);
    setSelectedFile({ record, name });
  };
  const downloadFile = (name: string) => {
    message.success(`文件「${name}」已开始下载`);
  };

  return <>
    <PageTitle breadcrumb={['项目管理', '项目详情', '全过程记录']} title="全过程记录" subtitle="2024年度办公设备集中采购 · PRJ-2024-012 · 全流程可追溯" actions={<><Button icon={<DownloadOutlined />}>导出记录</Button><Button type="primary" icon={<FileDoneOutlined />} onClick={archiveProcess}>生成过程归档并完成复盘</Button></>} />
    <Panel className="record-summary"><Space size="large"><span><ClockCircleOutlined /> 项目周期 102 天</span><span><UserOutlined /> 参与人员 6 人</span><span><FileTextOutlined /> 产生文件 14 份</span><span><ThunderboltFilled /> AI 参与 2 次</span></Space><Space>{['全部', '我的操作', 'AI 记录', '预警'].map((item) => <Button type={filter === item ? 'primary' : 'default'} key={item} onClick={() => setFilter(item)}>{item}</Button>)}</Space></Panel>
    <Panel className="record-timeline">
      {visibleRecords.map((item) => <div className={`record-item ${item.tone}`} key={item.title}>
        <div className="record-marker">{item.tone === 'green' ? <CheckCircleFilled /> : item.tone === 'purple' ? <ThunderboltFilled /> : item.tone === 'orange' ? <WarningFilled /> : <PlusOutlined />}</div>
        <div className="record-content">
          <div className="record-head"><h3>{item.title} <StatusPill tone={item.tone}>{item.type}</StatusPill></h3><span>{item.user} · {item.date}</span></div>
          <p>{item.detail}</p>
          <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedRecord(item)}>查看详情</Button>
            <Button size="small" icon={<FileTextOutlined />} onClick={() => setSelectedFileRecord(item)}>查看文件</Button>
            <Button size="small" disabled={item.tone !== 'purple'} icon={<ThunderboltFilled />} onClick={() => item.tone === 'purple' && onOpenModal('ai-record')}>查看 AI 记录</Button>
            {item.title === '验收完成' && <Button size="small" type="link" onClick={() => onOpenModal('version')}>查看前后版本</Button>}
          </Space>
        </div>
      </div>)}
      {!visibleRecords.length && <Empty description="暂无符合条件的记录" />}
    </Panel>
    <Modal open={Boolean(selectedRecord)} title={`操作详情 · ${selectedRecord?.title || ''}`} width={620} centered onCancel={() => setSelectedRecord(null)} footer={<Button onClick={() => setSelectedRecord(null)}>关闭</Button>}>
      {selectedRecord && <div className="record-detail-modal">
        <div className="record-detail-status"><StatusPill tone={selectedRecord.tone}>{selectedRecord.type}</StatusPill><strong>{selectedRecord.title}</strong></div>
        <DescriptionsList items={[['操作时间', selectedRecord.date], ['操作人', selectedRecord.user], ['关联文件', `${selectedRecord.files.length} 份`]]} />
        <div className="record-detail-description"><span>操作说明</span><p>{selectedRecord.detail}</p></div>
        <div className="record-detail-files">
          <div className="record-detail-files-head"><strong>关联文件</strong><Button type="link" onClick={() => showFileList(selectedRecord)}>查看文件列表</Button></div>
          {selectedRecord.files.map((name) => <div key={name}><FileTextOutlined />{name}</div>)}
        </div>
      </div>}
    </Modal>
    <Modal open={Boolean(selectedFileRecord)} title={`关联文件 · ${selectedFileRecord?.title || ''}`} width={680} centered onCancel={() => setSelectedFileRecord(null)} footer={<Button onClick={() => setSelectedFileRecord(null)}>关闭</Button>}>
      {selectedFileRecord && <div className="record-file-list">
        <Alert type="info" showIcon message="以下文件已关联到该条全过程记录" />
        {selectedFileRecord.files.map((name, index) => <div className="record-file-item" key={name}>
          <FileTextOutlined />
          <div><strong>{name}</strong><span>{index === 0 ? '当前版本' : '历史/关联文件'} · 已归档</span></div>
          <Space><Button size="small" icon={<EyeOutlined />} onClick={() => showFilePreview(selectedFileRecord, name)}>预览</Button><Button size="small" icon={<DownloadOutlined />} onClick={() => downloadFile(name)}>下载</Button></Space>
        </div>)}
      </div>}
    </Modal>
    <Modal open={Boolean(selectedFile)} title={`原文件预览 · ${selectedFile?.name || ''}`} width={960} centered destroyOnClose onCancel={() => setSelectedFile(null)} styles={{ body: { height: '72vh', padding: 0, overflow: 'hidden' } }} footer={<Space><Button onClick={() => setSelectedFile(null)}>关闭</Button><Button type="primary" icon={<DownloadOutlined />} onClick={() => selectedFile && downloadFile(selectedFile.name)}>下载文件</Button></Space>}>
      {selectedFile && selectedPreview && <div className="record-file-preview-workspace"><div className="record-file-preview-meta"><div><strong>{selectedFile.name}</strong><span>关联记录：{selectedFile.record.title} · 项目内置文档数据</span></div><Tag color="blue">原文件预览</Tag></div><div className="record-file-preview-viewer"><DocumentFilePreview filePath={selectedPreview.filePath} fileName={selectedPreview.fileName} height="100%" /></div></div>}
    </Modal>
  </>;
}

function ReportsPage() {
  return <><PageTitle title="数据报表" subtitle="按项目、品类和部门分析采购执行情况，辅助管理决策" actions={<Button type="primary" icon={<DownloadOutlined />}>导出报表</Button>} /><Row gutter={[16, 16]} className="metric-grid"><Col xs={24} sm={12} xl={6}><MetricCard icon={<ProjectOutlined />} value="48" label="全公司项目" badge="↑ 8" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<SyncOutlined />} value="12" label="在办项目" accent="purple" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<FundOutlined />} value="68%" label="预算执行率" accent="green" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<WarningFilled />} value="3" label="风险项目" accent="orange" badge="需关注" /></Col></Row><Row gutter={[16, 16]}><Col xs={24} xl={16}><Panel title={<><FundOutlined /> 品类采购金额分布</>} extra={<span className="muted-text">单位：万元</span>}><div className="bar-chart">{[['办公设备', 146, '#2f66eb'], ['IT 设备', 118, '#4d83ee'], ['工程改造', 82, '#7c5cff'], ['专业服务', 56, '#10b981'], ['后勤物资', 34, '#f59e0b']].map(([label, value, color]) => <div className="bar-item" key={String(label)}><div className="bar-value">{value}</div><div className="bar" style={{ height: `${Number(value) * 0.7}px`, background: color as string }} /><span>{label}</span></div>)}</div></Panel></Col><Col xs={24} xl={8}><Panel title={<><WarningFilled /> 风险项目 <Badge count={3} /></>}><div className="report-risk-list">{['数据中心服务器扩容项目', '厂区绿化养护服务采购', '办公楼装修改造工程'].map((item, index) => <div key={item}><strong>{item}</strong><span>{index === 0 ? '设备到货即将超期，剩余 3 天' : index === 1 ? '预算已使用 112%，超支 ¥18,000' : '立项审批停留 6 天，进度偏慢'}</span><StatusPill tone={index === 0 ? 'orange' : index === 1 ? 'orange' : 'gray'}>{index === 0 ? '高' : index === 1 ? '中' : '低'}</StatusPill></div>)}</div></Panel></Col></Row><Panel title="采购执行趋势"><div className="fake-line-chart"><div className="line-grid" /><svg viewBox="0 0 900 220" preserveAspectRatio="none"><polyline fill="none" stroke="#2f66eb" strokeWidth="4" points="0,170 80,140 160,154 240,92 320,118 400,72 480,98 560,54 640,80 720,36 820,60 900,22" /><polyline fill="none" stroke="#10b981" strokeWidth="3" points="0,190 80,170 160,180 240,142 320,155 400,128 480,146 560,116 640,136 720,98 820,112 900,84" /></svg><div className="chart-labels"><span>2024-01</span><span>2024-04</span><span>2024-07</span><span>2024-10</span></div></div></Panel></>;
}

function AcceptancePage({ view, onOpenModal, onCompleteStage }: { view: 'form' | 'result' | 'report' | 'evaluation'; onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean }) {
  const submitAcceptance = () => {
    if (onCompleteStage && !onCompleteStage()) return;
    go('/procurement/acceptance/result');
  };
  if (view === 'result') return <AcceptanceResult />;
  if (view === 'report') return <AcceptanceReport />;
  if (view === 'evaluation') return <SupplierEvaluation />;
  return <><PageTitle breadcrumb={['合同管理', '履约管理', '现场验收']} title="现场验收" subtitle="HT-2024-0126 · 设备到货验收 · PC 端办理" actions={<><Button icon={<ArrowLeftOutlined />} onClick={() => go('/procurement/contracts/fulfillment')}>返回履约管理</Button><Button type="primary" icon={<SendOutlined />} onClick={submitAcceptance}>提交验收</Button></>} /><Row gutter={[16, 16]}><Col xs={24} lg={17}><Panel title="验收明细"><Row gutter={[16, 16]}><Col span={12}><label className="field-label">到货数量 *</label><Input size="large" suffix="台 / 应到 120 台" defaultValue="120" /></Col><Col span={12}><label className="field-label">外观检查</label><Radio.Group defaultValue="ok" optionType="button" buttonStyle="solid" options={[{ value: 'ok', label: '合格' }, { value: 'not', label: '不合格' }]} /></Col><Col span={12}><label className="field-label">开机测试</label><Input size="large" suffix={<StatusPill tone="green">通过</StatusPill>} defaultValue="抽检 20 台，全部正常启动" /></Col><Col span={12}><label className="field-label">续航测试</label><Input size="large" suffix={<StatusPill tone="green">达标 ≥12h</StatusPill>} defaultValue="实测 12.5 小时" /></Col><Col span={12}><label className="field-label">防护等级</label><Input size="large" suffix={<StatusPill tone="green">通过</StatusPill>} defaultValue="IP67 浸水与防尘测试" /></Col><Col span={12}><label className="field-label">API 接口测试</label><Input size="large" suffix={<StatusPill tone="green">通过</StatusPill>} defaultValue="与巡检系统对接联调" /></Col></Row></Panel><Panel title="影像与报告"><div className="photo-grid"><div className="photo-placeholder">现场照片 1<br />厂区外观</div><div className="photo-placeholder">现场照片 2<br />设备配件</div><div className="photo-placeholder">现场照片 3<br />安装环境</div></div><div className="uploaded-report"><FileTextOutlined /><div><strong>出厂检测报告.pdf</strong><span>1.2 MB · 已上传</span></div><EyeOutlined /></div></Panel><Panel title="验收结论"><Radio.Group className="conclusion-options" defaultValue="pass"><Radio value="pass"><strong>合格</strong><span>各项指标符合合同与技术要求</span></Radio><Radio value="conditional"><strong>有条件合格</strong><span>需限期整改后方可确认</span></Radio><Radio value="fail"><strong>不合格</strong><span>需退回或重新交付</span></Radio></Radio.Group><Input.TextArea rows={4} defaultValue="到货数量与合同一致，外观与功能测试均通过，续航实测 12.5 小时优于要求；建议通过验收并进入安装调试阶段。" /></Panel></Col><Col xs={24} lg={7}><Panel title="验收任务"><div className="acceptance-info"><div><span>项目</span><strong>2024年度办公设备集中采购</strong></div><div><span>供应商</span><strong>华科智能设备有限公司</strong></div><div><span>计划日期</span><strong>2024-08-18</strong></div><div><span>验收人</span><strong>刘敏、王强</strong></div></div><Alert type="info" showIcon message="提交后将自动生成验收报告草稿，并同步生成供应商履约评价任务。" /></Panel><Panel title="操作"><Button block icon={<PaperClipOutlined />} onClick={() => onOpenModal('acceptance-upload')}>上传附件</Button><Button block type="primary" icon={<SendOutlined />} onClick={submitAcceptance}>提交验收</Button></Panel></Col></Row></>;
}

function AcceptanceResult() { return <><PageTitle title="验收提交结果" subtitle="系统已自动生成 2 份材料，可继续补充完善" actions={<Button type="primary" onClick={() => go('/procurement/projects/detail')}>返回项目详情</Button>} /><div className="result-hero"><div className="result-icon"><CheckOutlined /></div><h1>验收提交成功</h1><p>系统已自动生成 2 份材料，可继续补充完善</p></div><Row gutter={[16, 16]}><Col xs={24} md={12}><Panel title="自动生成内容"><ResultFile icon={<FileTextOutlined />} title="验收报告草稿" subtitle="设备到货验收报告 · 编号 YS-2024-0126" metrics={['合格', '120 台', '3 张']} action="查看验收报告" onClick={() => go('/procurement/acceptance/report')} /></Panel></Col><Col xs={24} md={12}><Panel title="供应商履约评价"><ResultFile icon={<StarOutlined />} title="供应商履约评价" subtitle="华科智能设备有限公司 · 综合得分 88" metrics={['及时性 90', '产品质量 92', '服务响应 82']} action="查看履约评价" onClick={() => go('/procurement/acceptance/evaluation')} /></Panel></Col></Row></>; }

function ResultFile({ icon, title, subtitle, metrics, action, onClick }: { icon: React.ReactNode; title: string; subtitle: string; metrics: string[]; action: string; onClick: () => void }) { return <div className="result-file"><div className="result-file-head"><div className="result-file-icon">{icon}</div><div><h3>{title}</h3><p>{subtitle}</p></div></div><div className="result-metrics">{metrics.map((item) => <span key={item}>{item}</span>)}</div><Button block className="result-action" onClick={onClick} icon={<EyeOutlined />}>{action}</Button></div>; }

function AcceptanceReport() { return <><PageTitle title="验收报告草稿" subtitle="YS-2024-0126 · 当前为草稿状态，确认无误后提交归档" actions={<><Button icon={<DownloadOutlined />}>导出</Button><Button type="primary" onClick={() => message.success('验收报告已提交归档')}>提交归档</Button></>} /><Row gutter={[16, 16]}><Col xs={24} xl={16}><Panel title="设备到货验收报告"><DescriptionsList items={[['报告编号', 'YS-2024-0126'], ['项目名称', '2024年度办公设备集中采购'], ['供应商', '华科智能设备有限公司'], ['验收环节', '设备到货验收'], ['验收日期', '2024-08-18'], ['验收人', '张明、王强']]} /></Panel><Panel title="验收明细"><DescriptionsList items={[['到货数量', '120 台（与合同一致）'], ['外观检查', '合格'], ['开机测试', '通过'], ['续航测试', '12.5 小时 · 达标'], ['防护等级', 'IP67 通过'], ['API 接口测试', '通过']]} /></Panel><Panel title="附件（4）"><List dataSource={['出厂检测报告.pdf', '现场照片-01.jpg', '现场照片-02.jpg', '现场照片-03.jpg']} renderItem={(item) => <List.Item><Space><FileTextOutlined />{item}</Space><span className="muted-text">1.2 MB</span></List.Item>} /></Panel></Col><Col xs={24} xl={8}><Panel title="验收结论" className="conclusion-panel"><StatusPill tone="green">合格</StatusPill><h2>到货数量与合同一致，外观与功能测试均通过，续航实测 12.5 小时优于要求；建议通过验收并进入安装调试阶段。</h2></Panel></Col></Row></>; }

function SupplierEvaluation() { return <><PageTitle title="供应商履约评价" subtitle="设备到货环节 · 2024-08-18" actions={<Button type="primary" onClick={() => message.success('履约评价已提交')}>提交评价</Button>} /><Row gutter={[16, 16]}><Col xs={24} xl={16}><Panel className="supplier-evaluation-card"><div className="evaluation-company"><Avatar shape="square" size={52} icon={<BankOutlined />} /><div><h2>华科智能设备有限公司</h2><span>HT-2024-0126 · 设备到货验收</span></div><StatusPill tone="green">A 级</StatusPill></div><div className="evaluation-score"><strong>88</strong><span>综合得分<br />履约表现良好</span><p>交付质量与产品表现优秀，服务响应仍有提升空间</p></div></Panel><Panel title="评分维度"><div className="evaluation-list">{[['交付及时性', '90', '优', '提前 2 天'], ['产品质量', '92', '优', '续航实测 12.5h 优于要求'], ['安装调试', '85', '良', '待进入安装调试阶段后补充评价'], ['服务响应', '82', '待改进', '生产阶段沟通响应偏慢，催办 2 次']].map(([name, value, level, desc]) => <div key={name}><div><strong>{name}</strong><b>{value}</b><StatusPill tone={level === '待改进' ? 'orange' : 'green'}>{level}</StatusPill></div><Progress percent={Number(value)} showInfo={false} strokeColor={level === '待改进' ? '#f59e0b' : '#10b981'} /><span>{desc}</span></div>)}</div></Panel></Col><Col xs={24} xl={8}><Panel title="系统评价标签"><div className="tag-cloud"><Tag color="green">产品优于承诺</Tag><Tag color="green">资料齐全</Tag><Tag color="orange">生产准备逾期 2 天</Tag><Tag color="orange">沟通响应偏慢</Tag></div></Panel><Panel title={<><InfoCircleOutlined /> 改进建议</>}><p>建议供应商在后续安装调试与培训阶段提升沟通响应速度，并提前 3 日同步实施计划。</p></Panel></Col></Row></>; }

type RoleKey = 'procurement' | 'reviewer' | 'manager' | 'acceptance';

const roleOptions: Array<{ key: RoleKey; label: string; name: string; color: string }> = [
  { key: 'procurement', label: '采购专员', name: '张明', color: '#7c5cff' },
  { key: 'reviewer', label: '审核人员', name: '王强', color: '#7c5cff' },
  { key: 'manager', label: '管理人员', name: '陈总', color: '#7c5cff' },
  { key: 'acceptance', label: '验收人员', name: '刘敏', color: '#7c5cff' },
];

function RolesPage() {
  const [role, setRole] = useState<RoleKey>('procurement');
  const current = roleOptions.find((item) => item.key === role)!;
  const configs: Record<RoleKey, { title: string; subtitle: string; metrics: Array<[string, string, string, 'blue' | 'orange' | 'purple' | 'red' | 'green']>; permissions: string[] }> = {
    procurement: {
      title: '我的工作台',
      subtitle: '数据范围：我负责的项目（12 个） · 权限：需求拟制、文件编制、发起流程',
      metrics: [['12', '我的在办项目', '↑ 2', 'blue'], ['8', '我的待办', '3 项紧急', 'orange'], ['3', '待编制采购文件', '', 'purple'], ['1', '待处理履约预警', '', 'red']],
      permissions: ['可创建 / 编辑项目', '可拟制需求与编制文件', '可发起风险核查', '不可审批 / 不可查看全公司数据'],
    },
    reviewer: {
      title: '审核工作台',
      subtitle: '数据范围：待我审核的项目（5 个） · 权限：审核、驳回、查看资料',
      metrics: [['5', '待我审核', '', 'red'], ['12', '今日已审核', '', 'green'], ['2', '本月驳回', '', 'orange'], ['1.2', '平均审核时长（天）', '', 'blue']],
      permissions: ['可审批 / 驳回流程', '可查看待审项目资料', '可添加审核意见', '不可创建项目 / 不可编辑文件'],
    },
    manager: {
      title: '数据驾驶舱',
      subtitle: '数据范围：全公司采购数据（48 个项目） · 权限：全局查看、分析、导出',
      metrics: [['48', '全公司项目', '↑ 8', 'blue'], ['12', '在办项目', '', 'purple'], ['68%', '预算执行率', '', 'green'], ['3', '风险项目', '需关注', 'orange']],
      permissions: ['可查看全公司数据', '可查看分析与统计报表', '可干预风险项目', '不参与具体经办操作'],
    },
    acceptance: {
      title: '验收工作台',
      subtitle: '数据范围：分配给我的验收任务（4 个） · 权限：现场验收、填写报告、履约评价',
      metrics: [['4', '待验收任务', '', 'red'], ['9', '本月已验收', '', 'green'], ['1', '质量问题待跟进', '', 'orange'], ['2.1', '平均验收周期（天）', '', 'blue']],
      permissions: ['可执行现场验收填报', '可出具验收报告', '可提交履约评价', '不可编辑需求 / 文件与合同'],
    },
  };
  const config = configs[role];
  return <div className="role-workspace"><div className="role-switcher"><div><TeamOutlined /><strong>演示角色切换</strong><span>切换后菜单、按钮、数据范围与操作权限同步变化</span></div><Space>{roleOptions.map((item) => <Button key={item.key} type={item.key === role ? 'primary' : 'default'} icon={<UserOutlined />} onClick={() => setRole(item.key)}>{item.label}</Button>)}</Space></div><PageTitle title={config.title} subtitle={<>{config.subtitle} <StatusPill tone="purple">当前角色：{current.label}</StatusPill></>} actions={<>{role !== 'acceptance' && <Button icon={<PlusOutlined />} onClick={() => role === 'procurement' && go('/procurement/requirements')}>{role === 'procurement' ? '新建需求' : role === 'reviewer' ? '审核规则' : '导出报表'}</Button>}<Button type="primary" onClick={() => role === 'procurement' ? go('/procurement') : role === 'acceptance' ? go('/procurement/acceptance') : message.info('已打开角色工作列表')}>{role === 'procurement' ? '新建采购项目' : role === 'reviewer' ? '批量审核' : role === 'manager' ? '查看全部项目' : '现场验收'}</Button></>} /><div className="role-permission-row">{config.permissions.map((item) => <span className={item.startsWith('不可') || item.startsWith('不参与') ? 'disabled' : ''} key={item}>{item.startsWith('不可') || item.startsWith('不参与') ? <CloseCircleFilled /> : <CheckCircleFilled />}{item}</span>)}</div><Row gutter={[16, 16]} className="metric-grid">{config.metrics.map(([value, label, badge, accent]) => <Col xs={24} sm={12} xl={6} key={label}><MetricCard icon={accent === 'red' ? <WarningFilled /> : accent === 'green' ? <CheckCircleFilled /> : accent === 'orange' ? <ClockCircleOutlined /> : <ProjectOutlined />} value={value} label={label} accent={accent} badge={badge || undefined} /></Col>)}</Row>{role === 'manager' ? <ManagerRoleContent /> : <RoleTaskContent role={role} />}</div>;
}

function RoleTaskContent({ role }: { role: RoleKey }) {
  const title = role === 'reviewer' ? '待我审核（5）' : role === 'acceptance' ? '我的待验收任务（4）' : '我负责的待办';
  const items = role === 'reviewer' ? ['采购文件审核 · 2024年度办公设备集中采购', '风险核查结论复核 · 候选供应商联合核查', '合同条款审核 · HT-2024-0126'] : role === 'acceptance' ? ['设备到货验收 · 2024年度办公设备集中采购', '安装调试验收 · 数据中心服务器扩容项目', '质量问题复验 · 厂区绿化养护服务采购'] : ['拟制「2024年度办公设备集中采购」需求说明', '处理「设备到货」履约预警（即将超期）', '从模板生成「厂区绿化养护服务」采购文件'];
  const reviewerRoutes = ['/procurement/documents', '/procurement/suppliers/risk', '/procurement/contracts'];
  const getTaskRoute = (index: number) => role === 'reviewer' ? reviewerRoutes[index] : role === 'acceptance' ? '/procurement/acceptance' : '/procurement/requirements';
  const rejectTask = (item: string) => Modal.confirm({
    title: '驳回审核任务',
    content: `确认驳回“${item}”吗？驳回后将退回经办人修改。`,
    okText: '确认驳回',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: () => message.success(`已驳回“${item}”`),
  });
  return <><Panel title={<><AuditOutlined /> {title}</>} extra={<Button type="link">查看全部</Button>}><div className="role-task-list">{items.map((item, index) => <div key={item}><div className={`role-task-icon ${index === 1 ? 'orange' : index === 2 ? 'purple' : 'blue'}`}>{role === 'reviewer' ? <FileSearchOutlined /> : role === 'acceptance' ? <SafetyCertificateOutlined /> : <FormOutlined />}</div><div><strong>{item}</strong><span>{role === 'reviewer' ? `提交人 张明 · 提交于 2024-06-${9 + index * 4} 09:30` : role === 'acceptance' ? `华科智能设备有限公司 · 计划 2024-08-${18 + index * 7}` : `PRJ-2024-0${12 + index * 6} · 截止 2024-05-${25 + index}`}</span></div>{role === 'reviewer' ? <Space size={8}><Button type={index === 1 ? 'primary' : 'default'} onClick={() => go(getTaskRoute(index))}>去处理</Button><Button type="link" danger onClick={() => rejectTask(item)}>驳回</Button></Space> : <Button type={index === 1 ? 'primary' : 'default'} onClick={() => go(getTaskRoute(index))}>去处理</Button>}</div>)}</div></Panel><Row gutter={[16, 16]}><Col xs={24} md={12}><Panel title="工作提醒"><div className="role-reminder-list"><p><BellOutlined /> 今日有 3 项任务即将到期</p><p><SafetyCertificateOutlined /> 所有操作均会自动记录到全过程档案</p><p><InfoCircleOutlined /> 可通过顶部角色按钮切换演示权限视图</p></div></Panel></Col><Col xs={24} md={12}><Panel title="最近操作"><div className="role-reminder-list"><p><CheckCircleFilled /> 已完成 2 项流程节点</p><p><HistoryOutlined /> 上次操作：确认采购方式为公开招标</p><p><FileDoneOutlined /> 当前项目整体进度 65%</p></div></Panel></Col></Row></>;
}

function ManagerRoleContent() {
  return <Row gutter={[16, 16]}><Col xs={24} xl={16}><Panel title={<><FundOutlined /> 品类采购金额分布</>} extra={<span className="muted-text">单位：万元</span>}><div className="bar-chart">{[['办公设备', 146, '#2f66eb'], ['IT 设备', 118, '#4d83ee'], ['工程改造', 82, '#7c5cff'], ['专业服务', 56, '#10b981'], ['后勤物资', 34, '#f59e0b']].map(([label, value, color]) => <div className="bar-item" key={String(label)}><div className="bar-value">{value}</div><div className="bar" style={{ height: `${Number(value) * 0.7}px`, background: color as string }} /><span>{label}</span></div>)}</div></Panel></Col><Col xs={24} xl={8}><Panel title={<><WarningFilled /> 风险项目 <Badge count={3} /></>}><div className="report-risk-list">{['数据中心服务器扩容项目', '厂区绿化养护服务采购', '办公楼装修改造工程'].map((item, index) => <div key={item}><strong>{item}</strong><span>{index === 0 ? '设备到货即将超期，剩余 3 天' : index === 1 ? '预算已使用 112%，超支 ¥18,000' : '立项审批停留 6 天，进度偏慢'}</span><StatusPill tone={index === 0 ? 'orange' : index === 1 ? 'orange' : 'gray'}>{index === 0 ? '高' : index === 1 ? '中' : '低'}</StatusPill></div>)}</div></Panel></Col></Row>;
}

function PlatformOverviewPage() {
  return <div className="platform-page"><PageTitle title="平台总览" subtitle="统一查看智能体、知识库与推理服务的运行状态" actions={<><Button icon={<DownloadOutlined />}>导入模板</Button><Button type="primary" icon={<PlusOutlined />}>新建智能体</Button></>} /><div className="platform-hero"><div><h1>下午好，林思远 👋</h1><p>当前有 3 个智能体运行中，1 个知识库正在进行向量重建，整体服务健康度 99.6%</p></div><Space><Button type="primary">新建智能体</Button><Button>导入模板</Button></Space></div><Row gutter={[16, 16]} className="metric-grid"><Col xs={24} sm={12} xl={6}><MetricCard icon={<TeamOutlined />} value="128" label="智能体总数" badge="↑ 12.4%" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<GlobalOutlined />} value="46,820" label="今日对话量" accent="green" badge="↑ 8.7%" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<ThunderboltFilled />} value="32.1M" label="Token 消耗（日）" accent="orange" badge="↓ 3.1%" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<SafetyCertificateOutlined />} value="99.6%" label="推理服务健康度" accent="blue" badge="正常" /></Col></Row><Row gutter={[16, 16]}><Col xs={24} xl={16}><Panel title="调用量趋势" extra={<span className="muted-text">近 14 天 Token 消耗与调用次数</span>}><div className="fake-line-chart"><div className="line-grid" /><svg viewBox="0 0 900 220" preserveAspectRatio="none"><polyline fill="none" stroke="#655cf5" strokeWidth="4" points="0,175 80,150 160,183 240,104 320,88 400,126 480,72 560,95 640,48 720,70 820,20 900,38" /><polyline fill="none" stroke="#18c6e9" strokeWidth="3" points="0,195 80,176 160,198 240,148 320,132 400,160 480,118 560,138 640,99 720,119 820,81 900,98" /></svg><div className="chart-labels"><span>09-01</span><span>09-04</span><span>09-07</span><span>09-10</span><span>09-13</span><span>09-14</span></div></div></Panel></Col><Col xs={24} xl={8}><Panel title="模型调用占比"><div className="platform-donut"><Progress type="circle" percent={50} strokeColor="#655cf5" format={() => '128'} /><div><p><i style={{ background: '#655cf5' }} /> GPT 系列 <b>49.7%</b></p><p><i style={{ background: '#18c6e9' }} /> Qwen 系列 <b>29.8%</b></p><p><i style={{ background: '#f59e0b' }} /> 私有化部署 <b>20.5%</b></p></div></div><Space wrap><Tag>vLLM</Tag><Tag>TGI</Tag><Tag>Ollama</Tag><Tag color="purple">+ 自定义</Tag></Space></Panel></Col></Row><Panel title={<><FundOutlined /> 平台能力矩阵</>} extra={<span className="muted-text">共 12 项核心能力 · 全部已就绪</span>}><div className="capability-grid">{['多模型多模型适配', '生命周期管理', '多格式文件解析', '可视化编排', '内置节点 + 多智能体', '自主决策执行', 'MCP / Skills 生态', '一键发布 API', '全链路可观测', '知识库 + 智能 RAG', '工程化文档构建', '多模态输入输出'].map((item, index) => <div key={item}><span className={`capability-icon c${index % 5}`}><ThunderboltFilled /></span><strong>{item}</strong><p>统一适配与可视化管理</p></div>)}</div></Panel></div>;
}

function ModelServicesPage() {
  const models = [
    ['GPT-4o', '云端 API', 'gpt-4o-2024-11', '320ms', '14.2K', '正常 · 10s 前'],
    ['Qwen2.5-72B-Instruct', 'vLLM', 'v2.5.7', '186ms', '9.8K', '正常 · 8s 前'],
    ['Qwen-VL-Max', 'vLLM', 'v1.3.0', '420ms', '3.1K', '正常 · 12s 前'],
    ['BGE-Reranker-v2', 'TGI', 'v2.1.0', '64ms', '8.7K', '正常 · 6s 前'],
    ['Llama-3.1-70B', 'Ollama', 'v3.1.2', '—', '0', '异常 · 掉线'],
  ];
  return <div className="platform-page"><PageTitle title="模型与推理服务" subtitle="统一适配多推理框架，管理模型接入、版本与健康状态" actions={<><Button icon={<SyncOutlined />}>同步服务</Button><Button type="primary" icon={<PlusOutlined />}>接入新模型</Button></>} /><Row gutter={[16, 16]} className="metric-grid"><Col xs={24} sm={12} xl={6}><MetricCard icon={<FundOutlined />} value="36" label="在线模型" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<ClockCircleOutlined />} value="284ms" label="平均首字延迟" accent="blue" badge="↓ 较昨日优化 12%" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<ThunderboltFilled />} value="2,840" label="吞吐量" accent="green" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<WarningFilled />} value="1" label="异常告警" accent="red" badge="1 个服务需关注" /></Col></Row><Panel><div className="model-filter"><Space><Button type="primary">全部模型</Button><Button>对话模型</Button><Button>向量模型</Button><Button>多模态</Button><Button>重排序</Button></Space><Space><Button>按调用量排序</Button><Button icon={<EllipsisOutlined />} /></Space></div><Table pagination={false} rowKey="name" dataSource={models.map(([name, framework, version, latency, calls, health]) => ({ name, framework, version, latency, calls, health }))} columns={[{ title: '模型 / 服务', dataIndex: 'name', render: (value, record) => <div className="model-name-cell"><span className="model-dot"><ThunderboltFilled /></span><div><strong>{value}</strong><span>私有部署 · {record.framework}</span></div></div> }, { title: '推理框架', dataIndex: 'framework', render: (value) => <StatusPill tone="blue">{value}</StatusPill> }, { title: '版本', dataIndex: 'version' }, { title: '首字延迟', dataIndex: 'latency' }, { title: '今日调用', dataIndex: 'calls' }, { title: '健康检查', dataIndex: 'health', render: (value) => <span className={value.startsWith('异常') ? 'health-error' : 'health-ok'}><i /> {value}</span> }, { title: '操作', render: (_, record) => <Space><Button size="small">详情</Button><Button size="small">测试</Button>{record.health.startsWith('异常') && <Button size="small" danger>重启</Button>}</Space> }]} /></Panel><Row gutter={[16, 16]}><Col xs={24} md={12}><Panel title="多推理框架适配"><div className="framework-list">{[['vLLM', '高吞吐 · PageAttention', '12 个模型'], ['TGI', 'HF 官方 · 连续批处理', '8 个模型'], ['Ollama / 自定义', '轻量本地 · 私有协议', '16 个模型']].map(([name, desc, count]) => <div key={name}><span><ThunderboltFilled /></span><div><strong>{name}</strong><p>{desc}</p></div><b>{count}<ArrowRightOutlined /></b></div>)}</div></Panel></Col><Col xs={24} md={12}><Panel title="健康检查策略" extra={<Switch defaultChecked />}><div className="health-settings"><div><span>探测间隔</span><b>每 10 秒</b></div><div><span>超时阈值</span><b>3000 ms</b></div><div><span>失败重试</span><b>3 次</b></div><div><span>故障转移</span><StatusPill tone="green">自动切换备用节点</StatusPill></div></div></Panel></Col></Row></div>;
}

function ProcurementModal({ modal, onClose, onOpenModal, onUploaded, onProjectCreated }: { modal: ModalKey; onClose: () => void; onOpenModal: (key: ModalKey) => void; onUploaded?: () => void; onProjectCreated?: (project: ProjectDetailData) => void }) {
  const { project } = useProjectWorkflow();
  const [form] = Form.useForm();
  const [selectedReferences, setSelectedReferences] = useState(['技术参数', '验收方式']);
  const [uploadReady, setUploadReady] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>(RECOMMENDED_METHOD);
  const [recommendationValues, setRecommendationValues] = useState<NewProjectFormValues>();
  const [similarFilter, setSimilarFilter] = useState<'all' | 'goods' | 'recent'>('all');
  const [similarSorted, setSimilarSorted] = useState(false);
  if (!modal) return null;
  const close = () => { setUploadReady(false); setIgnoreReason(''); onClose(); };
  const resetNewProject = () => { form.resetFields(); setSelectedMethod(RECOMMENDED_METHOD); setRecommendationValues(undefined); };
  const cancelNewProject = () => { resetNewProject(); close(); };
  const openRecommendation = async () => {
    try {
      const values = (await form.validateFields()) as NewProjectFormValues;
      setRecommendationValues(values);
      setSelectedMethod(RECOMMENDED_METHOD);
      onOpenModal('recommend');
    } catch {
      message.warning('请先补齐项目名称、采购品类、负责人、需求部门、采购预算和计划完成时间');
    }
  };
  const saveDraft = () => {
    const values = form.getFieldsValue() as Partial<NewProjectFormValues>;
    if (!values.name?.trim()) {
      message.warning('请至少填写项目名称后保存草稿');
      return;
    }
    message.success('草稿已保存，可继续完善后智能推荐');
  };
  const createProject = async () => {
    try {
      const values = recommendationValues || ((await form.validateFields()) as NewProjectFormValues);
      const project = createProjectDetail(values, selectedMethod);
      onProjectCreated?.(project);
      message.success(`项目已创建，采购方式：${selectedMethod}`);
      resetNewProject();
      close();
      go(`/procurement/projects/detail?projectId=${encodeURIComponent(project.id)}&stage=${workflowStages[0].key}`);
    } catch {
      message.warning('项目基础信息不完整，请返回补充后再创建');
    }
  };
  if (modal === 'new-project') return (
    <Modal
      open
      title={<ModalTitle icon={<PlusOutlined />} title="新建采购项目" subtitle="填写项目基础信息，系统将智能推荐采购方式" />}
      width={760}
      centered
      onCancel={cancelNewProject}
      footer={[
        <Button key="cancel" onClick={cancelNewProject}>取消</Button>,
        <Button key="draft" onClick={saveDraft}>保存草稿</Button>,
        <Button key="recommend" type="primary" icon={<ThunderboltFilled />} onClick={openRecommendation}>智能推荐采购方式</Button>,
      ]}
    >
      <Form form={form} layout="vertical" className="modal-form" initialValues={{ type: '货物', urgency: 'normal' }}>
        <h3 className="form-section-title">项目基础信息</h3>
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="请输入项目名称，如「2024年度办公设备集中采购」" />
        </Form.Item>
        <Form.Item name="type" label="项目类型">
          <Radio.Group optionType="button" buttonStyle="solid" options={[{ value: '货物', label: '📦 货物' }, { value: '服务', label: '♢ 服务' }, { value: '工程', label: '▣ 工程' }]} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="category" label="采购品类" rules={[{ required: true, message: '请选择采购品类' }]}><Select placeholder="请选择采购品类" options={[{ value: '办公设备', label: '办公设备' }, { value: '移动终端设备', label: '移动终端设备' }]} /></Form.Item></Col>
          <Col span={12}><Form.Item name="owner" label="项目负责人" rules={[{ required: true, message: '请选择项目负责人' }]}><Select placeholder="请选择负责人" options={[{ value: '张明', label: '张明' }, { value: '李静', label: '李静' }]} /></Form.Item></Col>
          <Col span={12}><Form.Item name="department" label="需求部门" rules={[{ required: true, message: '请选择需求部门' }]}><Select placeholder="请选择需求部门" options={[{ value: '行政部', label: '行政部' }, { value: '信息技术部', label: '信息技术部' }]} /></Form.Item></Col>
          <Col span={12}><Form.Item name="funding" label="资金来源"><Select placeholder="请选择资金来源" options={[{ value: '年度财政预算', label: '年度财政预算' }, { value: '专项资金', label: '专项资金' }]} /></Form.Item></Col>
          <Col span={12}><Form.Item name="budget" label="采购预算" rules={[{ required: true, message: '请输入采购预算' }, { validator: (_, value) => parseBudget(value) > 0 ? Promise.resolve() : Promise.reject(new Error('请输入有效预算金额')) }]}><Input prefix="¥" placeholder="请输入预算金额" /></Form.Item></Col>
          <Col span={12}><Form.Item name="quantity" label="采购数量"><Input placeholder="请输入数量（选填）" /></Form.Item></Col>
          <Col span={12}><Form.Item name="planDate" label="计划完成时间" rules={[{ required: true, message: '请选择计划完成时间' }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={12}><Form.Item name="urgency" label="紧急程度"><Radio.Group options={[{ value: 'normal', label: '普通' }, { value: 'urgent', label: '紧急' }, { value: 'critical', label: '特急' }]} /></Form.Item></Col>
        </Row>
        <Form.Item name="intention" label="采购意向"><Input.TextArea rows={4} placeholder="请描述采购目的、技术要求、期望交付标准等，有助于更精准地推荐采购方式" /></Form.Item>
        <Alert type="info" showIcon message="填写越完整，智能推荐结果越准确" />
      </Form>
    </Modal>
  );
  if (modal === 'recommend') {
    const budgetText = formatBudget(recommendationValues?.budget || '280000');
    const categoryText = recommendationValues?.category || '办公设备';
    return (
      <Modal
        open
        title={<ModalTitle icon={<ThunderboltFilled />} title="智能推荐采购方式" subtitle={`基于预算 ${budgetText}、品类「${categoryText}」及 36 个历史项目智能分析`} />}
        width={720}
        centered
        onCancel={() => { resetNewProject(); close(); }}
        footer={[
          <Button key="basis" icon={<BookOutlined />} onClick={() => message.info('推荐依据已根据当前项目基础信息生成')}>查看依据</Button>,
          <Button key="modify" onClick={() => onOpenModal('new-project')}>修改项目信息</Button>,
          <Button key="confirm" type="primary" icon={<CheckOutlined />} onClick={createProject}>确认创建项目</Button>,
        ]}
      >
        <div className="recommend-result">
          <Radio.Group value={selectedMethod} onChange={(event) => setSelectedMethod(event.target.value)} className="recommend-method-group">
            <div className={`recommend-main ${selectedMethod === RECOMMENDED_METHOD ? 'selected' : ''}`} onClick={() => setSelectedMethod(RECOMMENDED_METHOD)}>
              <Radio value={RECOMMENDED_METHOD} />
              <div><StatusPill tone="blue">推荐采购方式</StatusPill><h2>{RECOMMENDED_METHOD}</h2><p>系统结合预算、品类及历史项目分析，推荐匹配度最高的采购方式</p></div>
              <strong>{PROCUREMENT_METHOD_OPTIONS[0].match}<small>%</small><span>推荐匹配度</span></strong>
            </div>
            <h3>💡 推荐理由</h3>
            <ol><li>采购预算 {budgetText}，系统已结合公开招标限额标准进行合规判断</li><li>「{categoryText}」品类市场供应相对充分，具备多家潜在合格供应商，竞争条件较好</li><li>同类历史项目优先采用规范化竞争方式，便于控制采购风险与综合成本</li></ol>
            <div className="recommend-columns"><div><h3>↻ 历史案例</h3>{['2023年度电脑设备采购', '2023年办公家具集中采购', '2022年服务器采购项目'].map((item) => <p key={item}><strong>{item}</strong><StatusPill tone="green">公开招标 · 节约 9.2%</StatusPill></p>)}</div><div><h3>▣ 制度依据</h3><p>《招标投标法实施条例》<br /><span>第八条 · 公共招标限额标准</span></p><p>《集团采购管理办法》<br /><span>第 12 条 · 采购方式选择</span></p></div></div>
            <h3>☷ 其他可选方式</h3>
            {PROCUREMENT_METHOD_OPTIONS.slice(1).map((option) => <div className={`alternative-method ${selectedMethod === option.value ? 'selected' : ''}`} key={option.value} onClick={() => setSelectedMethod(option.value)}><Radio value={option.value} /><strong>{option.value}</strong><span>匹配度 {option.match}%</span></div>)}
          </Radio.Group>
          <Alert className="method-selection-hint" type="info" showIcon message={`当前选择：${selectedMethod}。确认创建后将按该方式进入项目启动阶段。`} />
        </div>
      </Modal>
    );
  }
  if (modal === 'missing') return <Modal open title={<ModalTitle icon={<WarningFilled />} title="提交失败" subtitle="必备材料不完整，暂时无法提交需求准备，请补充后再提交" />} width={520} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="upload" type="primary" icon={<CloudUploadOutlined />} onClick={() => { onClose(); setTimeout(() => (window as any).__openProcurementModal?.('upload'), 0); }}>立即补充</Button>]}><div className="missing-modal"><Alert type="error" showIcon message="当前缺少 1 项必备材料" /><div className="missing-list"><div><FileProtectOutlined /><strong>项目立项依据</strong><StatusPill tone="red">必备</StatusPill></div></div><div className="other-status"><p><CheckCircleFilled /> 项目立项申请表 <b>已上传</b></p><p><CheckCircleFilled /> 预算审批文件 <b>已上传</b></p><p><LoadingOutlined /> 采购需求说明 <b>待完善（可后补）</b></p></div><p className="muted-text">💡 补充材料后，提交按钮将自动变为可用状态</p></div></Modal>;
  if (modal === 'acceptance-upload') return <Modal open title={<ModalTitle icon={<CloudUploadOutlined />} title="上传验收附件" subtitle="上传验收报告、现场照片、检测证明等材料" />} width={620} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="submit" type="primary" icon={<CheckOutlined />} disabled={!uploadReady} onClick={() => { message.success('验收附件已上传'); close(); }}>确认上传</Button>]}><Form layout="vertical" className="modal-form"><Form.Item label="附件类型" required><Select defaultValue="验收报告" options={[{ value: '验收报告', label: '验收报告' }, { value: '现场照片', label: '现场照片' }, { value: '检测证明', label: '检测证明' }, { value: '其他验收材料', label: '其他验收材料' }]} /></Form.Item><Form.Item label="选择文件" required><Upload.Dragger accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip" maxCount={1} beforeUpload={() => { setUploadReady(true); return false; }} onChange={({ fileList }) => setUploadReady(fileList.length > 0)}><p className="upload-icon"><UploadOutlined /></p><p>点击上传或拖拽文件到此处</p><span>支持 PDF / Word / Excel / JPG / PNG / ZIP，单个文件不超过 50 MB</span></Upload.Dragger></Form.Item><Form.Item label="文件说明"><Input.TextArea rows={3} placeholder="请填写附件说明，例如设备外观、配件清点或检测结果" /></Form.Item><Alert type="info" showIcon message="上传后附件将关联到当前验收任务，并记录在项目全过程档案中。" /></Form></Modal>;
  if (modal === 'upload') return <Modal open title={<ModalTitle icon={<CloudUploadOutlined />} title="补充材料" subtitle="上传完成后，材料状态将更新为「已上传」" />} width={620} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="submit" type="primary" icon={<CheckOutlined />} disabled={!uploadReady} onClick={() => { onUploaded?.(); message.success('材料已上传'); close(); }}>确认上传</Button>]}><Form layout="vertical" className="modal-form"><Form.Item label="材料类型" required><Select defaultValue="项目立项依据" options={[{ value: '项目立项依据', label: '项目立项依据 · 必备' }, { value: '其他补充材料', label: '其他补充材料' }]} /></Form.Item><Form.Item label="上传文件" required><Upload.Dragger beforeUpload={() => { setUploadReady(true); return false; }} showUploadList={false}><p className="upload-icon"><UploadOutlined /></p><p>点击上传或拖拽文件到此处</p><span>支持 PDF / Word / Excel / JPG / PNG，单个文件不超过 50 MB</span></Upload.Dragger></Form.Item>{uploadReady && <div className="upload-file-row"><FileTextOutlined /><strong>项目立项依据.pdf</strong><span>1.6 MB · 上传完成</span></div>}<Form.Item label="文件说明"><Input.TextArea rows={3} placeholder="请简要说明本份材料的用途或来源，便于审核人员查阅" /></Form.Item><div className="switch-row"><div><strong>是否设为当前版本</strong><span>开启后，本条材料将替换原有版本作为最新有效版本</span></div><Switch defaultChecked /></div></Form></Modal>;
  if (modal === 'similar') {
    const similarCases = [
      { title: '2023 年度移动终端设备采购', type: 'goods', recent: true, score: 92, quantity: '100 台', amount: '¥420,000' },
      { title: '厂区巡检设备采购项目', type: 'goods', recent: true, score: 85, quantity: '150 台', amount: '¥336,000' },
      { title: '手持数据采集终端采购', type: 'recent', recent: false, score: 78, quantity: '200 台', amount: '¥252,000' },
    ];
    const visibleCases = similarCases.filter((item) => similarFilter === 'all' || (similarFilter === 'goods' && item.type === 'goods') || (similarFilter === 'recent' && item.recent)).sort((a, b) => similarSorted ? b.score - a.score : 0);
    return <Modal open title={<ModalTitle icon={<HistoryOutlined />} title="相似历史案例" subtitle="基于品类「移动终端设备」与预算 ¥480,000 匹配到 3 个高相似案例" />} width={760} centered onCancel={close} footer={null}><div className="similar-filter"><Space><Button type={similarFilter === 'all' ? 'primary' : 'default'} onClick={() => setSimilarFilter('all')}>全部</Button><Button type={similarFilter === 'goods' ? 'primary' : 'default'} onClick={() => setSimilarFilter('goods')}>货物类</Button><Button type={similarFilter === 'recent' ? 'primary' : 'default'} onClick={() => setSimilarFilter('recent')}>近三年</Button></Space><Button type="link" onClick={() => setSimilarSorted((sorted) => !sorted)}>{similarSorted ? '按默认顺序' : '按相似度排序'}</Button></div>{visibleCases.map((item) => <div className="similar-card" key={item.title}><div className="similar-head"><h3>{item.title}</h3><StatusPill tone="green">相似度 {item.score}%</StatusPill></div><div className="similar-metrics"><span>数量<strong>{item.quantity}</strong></span><span>成交金额<strong>{item.amount}</strong></span><span>单价区间<strong>¥3,500~¥4,200</strong></span></div><p><b>常见技术参数</b><br />续航 ≥ 10 小时 · IP65 · 支持 4G/5G · 6 英寸屏 · 整机 ≤ 350g</p><p><b>验收方法</b><br />到货抽检 10% + 现场功能测试 + 连续使用 3 天稳定性验证</p><div className="modal-actions"><Button icon={<EyeOutlined />} onClick={() => message.info(`已打开“${item.title}”详情`)}>查看详情</Button><Button type="primary" icon={<LinkOutlined />} onClick={() => { close(); (window as any).__openProcurementModal?.('reference'); }}>引用案例</Button></div></div>)}{visibleCases.length === 0 && <Empty description="暂无符合筛选条件的案例" />}<Alert type="info" showIcon message="引用案例时可按需选择「技术参数 / 验收方式 / 交付要求 / 商务要求」四类内容" /></Modal>;
  }
  if (modal === 'reference') return <Modal open title={<ModalTitle icon={<LinkOutlined />} title="引用案例内容" subtitle="来源：2023 年度移动终端设备采购 · 相似度 92%" />} width={600} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="confirm" type="primary" onClick={() => { message.success(`已引用 ${selectedReferences.length} 项内容`); close(); }}>确认引用</Button>]}><p>请选择需要引用到当前需求文档的内容（可多选）</p>{['技术参数', '验收方式', '交付要求', '商务要求'].map((item, index) => <div className={`reference-option ${selectedReferences.includes(item) ? 'selected' : ''}`} key={item} onClick={() => setSelectedReferences((items) => items.includes(item) ? items.filter((value) => value !== item) : [...items, item])}><Checkbox checked={selectedReferences.includes(item)} /><div><strong>{item}</strong>{index < 2 && <StatusPill tone="blue">推荐引用</StatusPill>}<span>{index === 0 ? '续航 ≥ 10 小时 · IP65 · 支持 4G/5G · 6 英寸屏 · 整机 ≤ 350g' : index === 1 ? '到货抽检 10% + 现场功能测试 + 连续使用 3 天稳定性验证' : index === 2 ? '合同签订后 45 日内到货，供货方负责运输及上楼搬运' : '质保 3 年 · 验收合格后 30 日内支付 90%'}</span></div></div>)}<Alert type="info" showIcon message="引用后内容将自动写入对应字段，你仍可继续编辑修改；系统会保留引用来源标记便于追溯。" /></Modal>;
  if (modal === 'ignore') return <Modal open title={<ModalTitle icon={<EllipsisOutlined />} title="忽略该问题" subtitle="忽略后需填写人工处理意见，便于留痕审计" />} width={540} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="confirm" type="primary" danger onClick={() => { if (!ignoreReason.trim()) { message.warning('请先填写处理意见'); return; } message.success('问题已标记为人工保留'); close(); }}>确认忽略</Button>]}><div className="ignore-problem"><Alert type="error" message="品牌倾向 · 高风险" description="“要求采用华为、联想等同档次品牌产品”" showIcon /><Form.Item label="人工处理意见" required><Input.TextArea rows={4} value={ignoreReason} onChange={(event) => setIgnoreReason(event.target.value)} placeholder="请说明忽略该问题的原因，例如已与需求部门确认、属于历史沿用配置等" /></Form.Item>{['已与需求部门线下沟通确认，该表述沿用历史配置', '现有系统兼容性要求，经使用部门审批同意保留', '已在采购方式说明中另行说明，本处不重复修改'].map((item) => <Button block type="text" className="suggestion-button" key={item} onClick={() => setIgnoreReason(item)}><PlusOutlined /> {item}</Button>)}<Alert type="warning" showIcon message="忽略后该问题将标记为「人工保留」，不纳入已处理统计，重新检查时仍会提示。" /></div></Modal>;
  if (modal === 'add-company') return <Modal open title={<ModalTitle icon={<BankOutlined />} title="添加候选企业" subtitle="录入企业信息并选择核查范围" />} width={600} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="confirm" type="primary" onClick={() => { message.success('候选企业已添加'); close(); }}>确认添加</Button>]}><Form layout="vertical" className="modal-form"><Form.Item label="企业名称" required><Input prefix={<SearchOutlined />} defaultValue="华科智能设备有限公司" /></Form.Item><div className="company-suggestion"><CheckCircleFilled /> <strong>华科智能设备有限公司</strong><span>91440300MA5F8K2X3D</span></div><Row gutter={16}><Col span={12}><Form.Item label="统一社会信用代码"><Input defaultValue="91440300MA5F8K2X3D" /></Form.Item></Col><Col span={12}><Form.Item label="企业类型"><Select defaultValue="有限责任公司" options={[{ value: '有限责任公司', label: '有限责任公司' }, { value: '股份有限公司', label: '股份有限公司' }]} /></Form.Item></Col></Row><Form.Item label="核查范围" required><div className="check-grid">{['企业信息', '信用风险', '经营异常', '司法风险', '关联企业', '关联人员', '供应商关系'].map((item) => <Checkbox defaultChecked key={item}>{item}</Checkbox>)}</div></Form.Item><Alert type="info" showIcon message="进入联合核查时，系统会自动识别候选企业之间的关联关系，无需单独设置。" /></Form></Modal>;
  if (modal === 'risk-node') return <Modal open title={<ModalTitle icon={<UserOutlined />} title="人员节点详情" subtitle="来自企业关系图谱 · 交叉任职线索" />} width={520} centered onCancel={close} footer={[<Button key="report" onClick={() => { message.success('该线索已加入核查报告'); close(); }}>加入核查报告</Button>, <Button key="close" type="primary" onClick={close}>关闭</Button>]}><div className="person-card"><Avatar size={48}>张</Avatar><div><h3>张伟 <StatusPill tone="orange">交叉任职</StatusPill></h3><span>在两家中标候选企业关联主体中担任职务</span></div></div><DescriptionsList items={[['职位', '董事（华科智能） · 监事（恒远科技）'], ['任职企业', '华科智能设备有限公司、恒远科技有限公司'], ['数据来源', '工商公示信息　第三方关联库（异常）'], ['查询时间', '2024-06-15 10:22:36']]} /><h3>关联路径</h3><div className="path-chips"><span>华科智能设备</span><ArrowRightOutlined /><span>张伟</span><ArrowRightOutlined /><span>恒远科技</span><br /><span>恒远科技</span><ArrowRightOutlined /><span>张伟</span><ArrowRightOutlined /><span>中联数字科技</span></div><Alert type="warning" showIcon message="该节点的关联关系部分来自第三方关联库，当前数据源不可用，结果可能不完整。" /></Modal>;
  if (modal === 'warning') return <Modal open title={<ModalTitle icon={<ToolOutlined />} title="处理履约预警" subtitle="设备到货 · 即将超期 · 计划日期 2024-08-20" />} width={680} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="confirm" type="primary" danger onClick={() => { message.success('预警处理已提交'); close(); }}>确认处理</Button>]}><Form layout="vertical" className="modal-form"><Alert type="warning" message="设备到货 — 即将超期（剩余 3 天）" /><Row gutter={16}><Col span={12}><Form.Item label="当前责任人"><Select defaultValue="李强（供应商）" options={[{ value: '李强（供应商）', label: '李强（供应商）' }, { value: '张明（采购）', label: '张明（采购）' }]} /></Form.Item></Col><Col span={12}><Form.Item label="新计划日期"><DatePicker style={{ width: '100%' }} placeholder="请选择日期" /></Form.Item></Col></Row><Form.Item label="处理方式" required><Radio.Group className="radio-grid" defaultValue="urge" options={[{ value: 'urge', label: '🔔 催办' }, { value: 'reschedule', label: '▣ 调整计划' }, { value: 'upload', label: '☁ 已完成未上传材料' }, { value: 'other', label: '··· 其他' }]} /></Form.Item><Form.Item label="处理说明" required><Input.TextArea rows={4} placeholder="请说明处理措施与后续跟进安排，例如已电话催办供应商、要求其于 3 日内发货并回传物流单号" /></Form.Item><Form.Item label="附件"><Upload><Button icon={<PaperClipOutlined />}>选择文件</Button></Upload></Form.Item><Alert type="info" showIcon message="处理记录将留痕，可在履约台账中查看" /></Form></Modal>;
  if (modal === 'version') return <Modal open title={<ModalTitle icon={<DiffOutlined />} title="查看前后版本" subtitle="采购文件 · V1.2 → V1.3 · 操作人：张明 · 2024-06-05 16:40" />} width={860} centered onCancel={close} footer={[<Button key="download" icon={<DownloadOutlined />} onClick={() => message.success('版本对比文件已生成，正在下载')}>下载对比</Button>, <Button key="close" onClick={close}>关闭</Button>, <Button key="restore" type="primary" onClick={() => { message.success('已恢复到此版本'); close(); }}>恢复到此版本</Button>]}><div className="version-summary"><span>↔ 共 3 处变更</span><span className="green-text">● 新增 1</span><span className="orange-text">● 修改 2</span><span className="red-text">● 删除 0</span></div><div className="version-grid"><div><h3>V1.2（修改前）</h3><div className="version-change red"><strong>新增　第四章 评分标准</strong><p>（本章节缺失，无内容）</p></div><div className="version-change orange"><strong>修改　技术要求·品牌表述</strong><p>要求采用华为、联想等同档次品牌产品</p></div><div className="version-change orange"><strong>修改　第四章 验收要求·续航检测项</strong><p>全数设备进行开机功能测试</p></div></div><div><h3>V1.3（修改后）</h3><div className="version-change green"><strong>技术分 60 分、商务分 20 分、价格分 20 分</strong><p>技术分含续航、防护等级、接口兼容性等指标。</p></div><div className="version-change green"><strong>采用同等性能的通用配置，需提供第三方检测报告佐证指标</strong></div><div className="version-change green"><strong>全数开机功能测试，并补充续航实测（抽检 5 台，连续巡检模式不少于 12 小时）</strong></div></div></div><Alert type="info" showIcon message="版本记录支持回溯查看与一键恢复，恢复操作将生成新的版本记录并保留完整历史。" /></Modal>;
  return <Modal open title={<ModalTitle icon={<ThunderboltFilled />} title="查看 AI 记录" subtitle="2024-05-18 10:12 · 模型：智采云需求合规检查 v2.3 · 耗时 2.3 秒" />} width={680} centered onCancel={close} footer={[<Button key="export" icon={<DownloadOutlined />} onClick={() => message.success('AI 检查记录已导出')}>导出 AI 记录</Button>, <Button key="close" type="primary" onClick={close}>关闭</Button>]}><div className="ai-stats"><MetricCard icon={<WarningFilled />} value="2" label="高风险" accent="red" /><MetricCard icon={<WarningFilled />} value="2" label="中风险" accent="orange" /><MetricCard icon={<CheckCircleFilled />} value="3" label="已处理" accent="green" /><MetricCard icon={<EllipsisOutlined />} value="1" label="人工保留" accent="purple" /></div><div className="ai-output"><strong>🤖 AI 原始输出摘要</strong><p>已比对 12 项制度与 36 个历史项目。检出 4 项高风险：①品牌倾向性表述 ②供应商业绩门槛显著高于项目规模 ③技术要求与验收标准不一致 ④缺少安装调试完成时间节点。建议优先处理高风险项。</p></div><h3>☷ 处理明细</h3>{auditProblems.map((item, index) => <div className={`ai-record-row ${index === 3 ? 'retained' : 'handled'}`} key={item.title}><CheckCircleFilled /> <strong>{item.title}</strong><StatusPill tone={index === 3 ? 'orange' : 'green'}>{index === 3 ? '人工保留' : index === 1 ? '人工修改' : '采纳建议'}</StatusPill><span>张明 10:{48 + index}</span></div>)}<div className="manual-opinion"><strong>人工处理意见（第 4 项）</strong><p>安装调试时间已在使用部门需求确认单中明确（到货后 10 个工作日内），本处维持原表述，提交时随附件一并说明。</p></div></Modal>;
}

type PolicyChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: PolicyReference[];
};

type PolicyReference = {
  name: string;
  clause: string;
  source: string;
};

type PolicyPresetQuestion = {
  question: string;
  answer: string;
  references: PolicyReference[];
};

const policyPresetQuestions: PolicyPresetQuestion[] = [
  {
    question: '公开招标的适用条件是什么？',
    answer: '公开招标是政府采购的主要采购方式。办理时应先核对项目是否达到适用的公开招标数额标准，并结合采购品类、预算来源和项目所在地的现行标准判断。若因特殊情况需要采用公开招标以外的方式，应在采购活动开始前履行相应审批程序，同时在采购文件中留存适用理由和审批依据；不得通过拆分项目等方式规避公开招标。',
    references: [
      { name: '中华人民共和国政府采购法', clause: '第二十六条', source: '中国政府采购网 · 法规库' },
      { name: '中华人民共和国政府采购法', clause: '第二十七条、第二十八条', source: '中国政府采购网 · 法规库' },
    ],
  },
  {
    question: '采购需求如何避免倾向性？',
    answer: '采购需求应围绕项目目标和实际履约需要编制，使用功能、性能、服务结果和可验证的客观指标表达，避免直接指定品牌、商标、专利、型号或供应商。资格条件、业绩门槛和评审因素要与项目特点相适应，不能设置与合同履行无关的区域、所有制或规模限制；技术要求和评分标准还应保持一致，并通过市场调查和需求审查留存论证记录。',
    references: [
      { name: '中华人民共和国政府采购法实施条例', clause: '第二十条', source: '中国政府采购网 · 法规库' },
      { name: '政府采购需求管理办法', clause: '第七条、第九条', source: '财政部政策文件库' },
    ],
  },
  {
    question: '供应商存在股权关联可以参加投标吗？',
    answer: '不能只看“是否有投资关系”这一项直接下结论。若不同供应商的单位负责人为同一人，或者存在直接控股、管理关系，不得参加同一合同项下的政府采购活动；采购人应在资格审查和供应商风险核查中核验股权、实际控制人、董监高任职及关联关系，并将核查结论留痕。属于同一控制关系的，应按规定取消相关供应商参与同一项目的资格。',
    references: [
      { name: '中华人民共和国政府采购法实施条例', clause: '第十八条', source: '中国政府采购网 · 法规库' },
      { name: '政府采购供应商资格审查与风险核查指引', clause: '关联关系核验要求', source: '采购法规知识库 · 内部指引' },
    ],
  },
  {
    question: '采购项目流标后如何处理？',
    answer: '先确认流标原因并形成书面记录，向相关供应商告知废标理由。若属于合格供应商不足三家、报价超过预算或存在影响采购公正的违法情形，原则上应重新组织采购；采购任务取消的，可以终止项目。若拟改用其他采购方式，应先论证原采购文件和程序是否存在问题，并按规定履行审批后再组织实施，不能直接跳过原因分析。',
    references: [
      { name: '中华人民共和国政府采购法', clause: '第三十六条', source: '中国政府采购网 · 法规库' },
      { name: '政府采购货物和服务招标投标管理办法', clause: '第五十七条', source: '财政部令第87号 · 政策库' },
    ],
  },
];

const initialPolicyMessages: PolicyChatMessage[] = [
  {
    id: 'policy-welcome',
    role: 'assistant',
    content: '您好，我是智采政策助手。可以基于法规知识库回答采购方式、需求编制、信息发布、合同履约等问题。当前回答会同步展示法规名称、条款号和政策来源，请结合项目实际情况由人工审核后使用。',
    references: [{ name: '政府采购法', clause: '第四十六条', source: '中国政府采购网法规库' }],
  },
  ...policyPresetQuestions.flatMap((item, index): PolicyChatMessage[] => [
    {
      id: `policy-preset-question-${index}`,
      role: 'user',
      content: item.question,
    },
    {
      id: `policy-preset-answer-${index}`,
      role: 'assistant',
      content: item.answer,
      references: item.references,
    },
  ]),
];

function PolicyAssistantPage() {
  const [messages, setMessages] = useState<PolicyChatMessage[]>(initialPolicyMessages);
  const [question, setQuestion] = useState('');
  const [activeHotQuestion, setActiveHotQuestion] = useState('');
  const hotQuestions = policyPresetQuestions;
  const askQuestion = (value = question) => {
    const content = value.trim();
    if (!content) return;
    const preset = policyPresetQuestions.find((item) => item.question === content);
    const timestamp = Date.now();
    setMessages((current) => [...current, { id: `user-${timestamp}`, role: 'user', content }, { id: `assistant-${timestamp + 1}`, role: 'assistant', content: preset?.answer || `基于当前项目与法规知识库检索，关于“${content}”的初步结论是：应先核对采购方式适用条件、节点前置材料和项目实际金额，不能仅依据历史做法直接推进。系统建议在提交前由审核人员确认具体适用条款，并将核查结论写入项目留痕。`, references: preset?.references || [{ name: '政府采购法实施条例', clause: '第三十四条', source: '中国政府采购网 · 法规库' }, { name: '政府采购需求管理办法', clause: '第十二条', source: '财政部政策文件库' }] }]);
    setQuestion('');
    setActiveHotQuestion(content);
  };
  return <>
    <PageTitle breadcrumb={['AI 能力', '政策合规']} title="AI 政策助手" subtitle="RAG 检索法规知识库，回答可追溯、可核验、可回看" actions={<><Button icon={<HistoryOutlined />} onClick={() => message.info('已打开近 30 天问答历史')}>历史记录</Button><Upload showUploadList={false} beforeUpload={(file) => { message.success(`已加载 ${file.name}，可在对话中提问`); return false; }}><Button icon={<UploadOutlined />}>上传文件问答</Button></Upload><Button type="primary" icon={<BookOutlined />} onClick={() => go('/procurement/knowledge-base')}>管理知识库</Button></>} />
    <Row gutter={[16, 16]} className="policy-assistant-layout"><Col xs={24} xl={17}><Panel className="policy-chat-panel" title={<><ThunderboltFilled /> 采购政策会话1 <StatusPill tone="green">RAG 在线</StatusPill></>} extra={<span className="muted-text">已内置 4 组政策问答 · 回答必须经人工确认后进入项目记录</span>}><div className="policy-chat-list">{messages.map((item) => <div className={`policy-chat-item ${item.role}`} key={item.id}><div className="policy-chat-avatar">{item.role === 'assistant' ? <ThunderboltFilled /> : <UserOutlined />}</div><div className="policy-chat-bubble"><div className="policy-chat-head"><strong>{item.role === 'assistant' ? '智采政策助手' : '张明'}</strong><span>{item.role === 'assistant' ? 'AI 生成 · 待人工核验' : '刚刚'}</span></div><p>{item.content}</p>{item.references && <div className="policy-reference-list"><span className="policy-reference-label"><BookOutlined /> 引用依据</span>{item.references.map((reference) => <div className="policy-reference" key={`${item.id}-${reference.name}-${reference.clause}`}><div><strong>{reference.name}</strong><span>{reference.clause} · {reference.source}</span></div><Button type="link" size="small" onClick={() => message.info(`已打开《${reference.name}》${reference.clause}原文`)}>查看原文</Button></div>)}</div>}</div></div>)}</div><div className="policy-upload-hint"><UploadOutlined /><span>可将采购文件、需求说明或合同上传后提问，系统会把文件内容与法规条款一起检索。</span><Button type="link" onClick={() => message.info('支持 PDF、Word、Excel、图片，单文件不超过 50 MB')}>支持格式</Button></div><div className="policy-compose"><Input.TextArea value={question} onChange={(event) => setQuestion(event.target.value)} autoSize={{ minRows: 2, maxRows: 5 }} placeholder="输入政策问题，例如：本项目预算 48 万元，采用公开招标是否合适？" onPressEnter={(event) => { if (!event.shiftKey) { event.preventDefault(); askQuestion(); } }} /><Button type="primary" icon={<SendOutlined />} onClick={() => askQuestion()}>发送</Button></div></Panel></Col><Col xs={24} xl={7}><Panel title={<><FileSearchOutlined /> 热门问题</>}><div className="policy-hot-list">{hotQuestions.map((item, index) => <button type="button" className={activeHotQuestion === item.question ? 'active' : ''} key={item.question} onClick={() => askQuestion(item.question)}><span>0{index + 1}</span><div><strong>{item.question}</strong><small>内置答案 · {item.references.length} 条引用</small></div><ArrowRightOutlined /></button>)}</div></Panel><Panel title={<><SafetyCertificateOutlined /> 回答质量控制</>}><div className="policy-quality-list"><div><CheckCircleFilled /><span>法规名称、条款号、来源</span><StatusPill tone="green">已开启</StatusPill></div><div><CheckCircleFilled /><span>回答与原文片段关联</span><StatusPill tone="green">已开启</StatusPill></div><div><CheckCircleFilled /><span>失效法规自动拦截</span><StatusPill tone="orange">需复核</StatusPill></div><div><HistoryOutlined /><span>问答结果写入项目留痕</span><StatusPill tone="blue">支持</StatusPill></div></div><Alert type="info" showIcon message="AI 仅提供辅助意见，正式办理以有效法规原文和审核结论为准。" /></Panel></Col></Row>
  </>;
}

const knowledgeDocuments = [
  { key: 'kb-1', name: '政府采购法.pdf', category: '法律', version: 'V3.0', chunks: 248, status: '已向量化', valid: '长期有效', updated: '2026-09-12' },
  { key: 'kb-2', name: '政府采购法实施条例.docx', category: '行政法规', version: 'V2.1', chunks: 186, status: '已向量化', valid: '长期有效', updated: '2026-09-10' },
  { key: 'kb-3', name: '政府采购需求管理办法.pdf', category: '部门规章', version: 'V1.4', chunks: 132, status: '已向量化', valid: '有效', updated: '2026-09-08' },
  { key: 'kb-4', name: '采购文件编制指引（2024）.pdf', category: '内部制度', version: 'V1.0', chunks: 96, status: '解析中', valid: '有效', updated: '2026-10-08' },
  { key: 'kb-5', name: '废止文件清单.xlsx', category: '失效政策', version: 'V1.2', chunks: 42, status: '已停用', valid: '已失效', updated: '2026-08-20' },
];

function KnowledgeBasePage() {
  const [category, setCategory] = useState('全部');
  const categories = ['全部', '法律', '行政法规', '部门规章', '内部制度', '失效政策'];
  const docs = knowledgeDocuments.filter((item) => category === '全部' || item.category === category);
  return <>
    <PageTitle breadcrumb={['AI 能力', '知识库']} title="采购法规知识库" subtitle="批量导入、自动解析、向量化、版本管理和法规失效控制" actions={<><Button icon={<DownloadOutlined />} onClick={() => message.success('知识库清单已导出')}>导出清单</Button><Upload showUploadList={false} multiple beforeUpload={(file) => { message.success(`已加入导入队列：${file.name}`); return false; }}><Button type="primary" icon={<UploadOutlined />}>批量导入文件</Button></Upload></>} />
    <Row gutter={[16, 16]} className="metric-grid"><Col xs={24} sm={12} xl={6}><MetricCard icon={<BookOutlined />} value="42" label="有效文档" badge="↑ 6" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<FileSearchOutlined />} value="8,624" label="知识切片" accent="purple" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<SyncOutlined />} value="1" label="处理中" accent="orange" badge="预计 2 分钟" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<WarningFilled />} value="3" label="待复核失效文件" accent="red" /></Col></Row>
    <Alert type="warning" showIcon message="知识库中有 3 份政策文件即将或已经失效，AI 回答会优先排除失效版本，并在引用区域提示复核。" />
    <Panel title={<><BookOutlined /> 文档资产</>} extra={<Space><Input prefix={<SearchOutlined />} placeholder="搜索法规名称" style={{ width: 220 }} /><Select value={category} onChange={setCategory} options={categories.map((item) => ({ value: item, label: item }))} /></Space>}><Table rowKey="key" dataSource={docs} pagination={{ pageSize: 8, showTotal: (total) => `共 ${total} 份文档` }} columns={[{ title: '文档名称', dataIndex: 'name', render: (value: string, record) => <div className="knowledge-file-name"><FileTextOutlined /><div><strong>{value}</strong><span>{record.category} · 更新于 {record.updated}</span></div></div> }, { title: '版本', dataIndex: 'version' }, { title: '切片数', dataIndex: 'chunks' }, { title: '向量状态', dataIndex: 'status', render: (value: string) => <StatusPill tone={value === '已向量化' ? 'green' : value === '已停用' ? 'red' : 'orange'}>{value}</StatusPill> }, { title: '有效性', dataIndex: 'valid', render: (value: string) => <StatusPill tone={value === '已失效' ? 'red' : 'green'}>{value}</StatusPill> }, { title: '操作', render: (_, record) => <Space size="small"><Button type="link" size="small" onClick={() => message.info(`已打开 ${record.name} 原文预览`)}>预览</Button><Button type="link" size="small" onClick={() => message.success(`${record.name} 已加入重新向量化队列`)}>重建向量</Button></Space> }]} /></Panel>
    <Row gutter={[16, 16]}><Col xs={24} xl={15}><Panel title={<><SyncOutlined /> 处理流水线</>}><div className="knowledge-pipeline"><div className="active"><span>1</span><strong>文件解析</strong><small>结构识别、OCR、表格抽取</small></div><ArrowRightOutlined /><div className="active"><span>2</span><strong>法规分类</strong><small>法律层级、采购品类、适用范围</small></div><ArrowRightOutlined /><div className="active"><span>3</span><strong>向量化</strong><small>切片、嵌入、索引更新</small></div><ArrowRightOutlined /><div><span>4</span><strong>质量反馈</strong><small>引用反馈、失效处理、优化召回</small></div></div></Panel></Col><Col xs={24} xl={9}><Panel title={<><SafetyCertificateOutlined /> 知识库规则</>}><ul className="knowledge-rule-list"><li>仅有效版本参与 RAG 检索</li><li>同名文件新版本自动建立版本链</li><li>法规失效后保留历史引用但禁止新回答引用</li><li>用户反馈会回流至召回质量评估</li></ul></Panel></Col></Row>
  </>;
}

const requirementReviewFindings = auditProblems.map((item, index) => ({ ...item, category: ['倾向性', '排他性', '一致性', '完整性'][index], basis: ['政府采购法实施条例 · 第二十条', '政府采购需求管理办法 · 第十七条', '政府采购法 · 第三十五条', '政府采购需求管理办法 · 第十三条'][index] }));

function RequirementReviewPage() {
  const { project } = useProjectWorkflow();
  const [resolved, setResolved] = useState<Record<number, string>>({});
  const remaining = requirementReviewFindings.length - Object.keys(resolved).length;
  const resolve = (index: number, action: string) => { setResolved((current) => ({ ...current, [index]: action })); message.success(`已记录第 ${index + 1} 项处理结果：${action}`); };
  return <>
    <PageTitle breadcrumb={['采购需求', '需求智能审核', project.name]} title="需求智能审核" subtitle="AI 识别倾向性、排他性、一致性和完整性风险，人工确认后形成审核报告" actions={<><Button icon={<ArrowLeftOutlined />} onClick={() => go('/procurement/requirements')}>返回需求拟制</Button><Button icon={<SyncOutlined />} onClick={() => message.success('已重新扫描需求文本，未发现新增问题')}>重新检查</Button><Button type="primary" icon={<DownloadOutlined />} onClick={() => message.success('审核报告已生成并进入项目档案')}>生成审核报告</Button></>} />
    <Alert type={remaining ? 'warning' : 'success'} showIcon message={remaining ? `当前还有 ${remaining} 项问题等待人工处理，全部高风险问题处理完成后才可提交审核。` : '全部问题已完成 AI 建议采纳或人工确认，审核报告可以生成。'} description="AI 结果仅作为辅助，人工选择会记录处理人、时间、原文位置和处理意见。" />
    <Row gutter={[16, 16]} className="review-layout"><Col xs={24} xl={11}><Panel title={<><FileTextOutlined /> 采购需求原文 <StatusPill tone="purple">AI 定位已开启</StatusPill></>} extra={<Button type="link" onClick={() => message.success('已定位到第 3 页第 2 段')}>定位问题</Button>}><div className="requirement-document-preview"><h2>{project.name} · 采购需求说明</h2><p className="document-meta">版本 V0.2 · 最近修改：张明 · 2026-10-08 09:30</p><h3>一、技术要求</h3><p>投标产品应采用主流品牌，续航不少于 12 小时，防护等级不低于 IP67，并支持标准数据接口。</p><p className="highlight-red">投标人须具备近 3 年不少于 5 个同类项目业绩，单个合同金额不低于 200 万元。</p><h3>二、验收标准</h3><p className="highlight-orange">验收时进行开机功能测试，确认设备能够正常使用。</p><h3>三、服务要求</h3><p>供应商负责运输、安装和调试，并提供培训及质保服务。</p><div className="document-ai-note"><ThunderboltFilled /><span>AI 已比对 12 项制度与 36 个历史项目，点击右侧风险卡可定位到对应原文。</span></div></div></Panel></Col><Col xs={24} xl={13}><Panel title={<><SafetyCertificateOutlined /> AI 合规检查结果 <StatusPill tone={remaining ? 'red' : 'green'}>{remaining ? `${remaining} 项待处理` : '已全部处理'}</StatusPill></>}><div className="review-summary-strip"><span className="red">高风险 {requirementReviewFindings.filter((item) => item.level === '高风险' && !resolved[requirementReviewFindings.indexOf(item)]).length}</span><span className="orange">中风险 {requirementReviewFindings.filter((item) => item.level === '中风险' && !resolved[requirementReviewFindings.indexOf(item)]).length}</span><span className="green">已处理 {Object.keys(resolved).length}</span></div><div className="review-finding-list">{requirementReviewFindings.map((item, index) => { const action = resolved[index]; return <div className={`review-finding-card ${action ? 'resolved' : item.level === '高风险' ? 'high' : 'medium'}`} key={item.title}><div className="review-finding-head"><div><span className="review-category">{item.category}</span><strong>{index + 1}. {item.title}</strong></div><StatusPill tone={action ? 'green' : item.level === '高风险' ? 'red' : 'orange'}>{action || item.level}</StatusPill></div>{action ? <p className="resolved-copy">处理结果：{action}，已生成留痕记录。</p> : <><p>{item.reason}</p><div className="review-suggestion"><strong>修改建议</strong><span>{item.suggestion}</span></div><div className="review-basis"><BookOutlined /> 法规依据：{item.basis}</div><Space wrap><Button size="small" type="primary" onClick={() => resolve(index, '采纳建议')}>一键修改</Button><Button size="small" onClick={() => resolve(index, '人工修改')}>人工修改</Button><Button size="small" onClick={() => resolve(index, '人工保留')}>人工保留</Button><Button size="small" type="link" onClick={() => message.info('已定位原文并打开法规原文侧栏')}>查看原文</Button></Space></>}</div>; })}</div></Panel></Col></Row>
  </>;
}

function ModalTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) { return <div className="modal-title"><div className="modal-title-icon">{icon}</div><div><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</div></div>; }

function ProcurementPortal() {
  const location = useLocation();
  const routeContextKey = getProjectContextKey(location.search);
  const initialContext = getRuntimeContext(routeContextKey);
  const [modal, setModal] = useState<ModalKey>(null);
  const [contextKey, setContextKey] = useState<ProjectContextKey>(routeContextKey);
  const [project, setProject] = useState<ProjectDetailData>(() => initialContext.project);
  const [projects, setProjects] = useState<Project[]>(() => procurementRuntime.projects);
  const [workflow, setWorkflow] = useState<ProjectWorkflow>(() => initialContext.workflow);
  const [fulfillmentNodes, setFulfillmentNodes] = useState<FulfillmentNodeRow[]>(() => fulfillmentRuntimeNodes);
  const [projectStatusLogs, setProjectStatusLogs] = useState<ProcurementRecord[]>(() => procurementRuntimeAuditRecords);
  const startNewProject = (createdProject: ProjectDetailData) => {
    const nextWorkflow: ProjectWorkflow = { currentStage: 0, completedStages: [], materialsReady: false };
    const nextProjects: Project[] = [{
      id: createdProject.id,
      name: createdProject.name,
      category: `${createdProject.type}类`,
      budget: createdProject.budget,
      stage: workflowStages[0].title,
      stageIndex: 0,
      progress: workflowProgressByStage[0],
      color: getStageColor(0, '进行中'),
      unit: createdProject.department,
      status: '进行中',
    }, ...procurementRuntime.projects.filter((item) => item.id !== createdProject.id)];
    procurementRuntime = {
      ...procurementRuntime,
      projects: nextProjects,
      contexts: { ...procurementRuntime.contexts, [createdProject.id]: { project: createdProject, workflow: nextWorkflow } },
      newProjectId: createdProject.id,
    };
    activeProjectContextKey = createdProject.id;
    setProject(createdProject);
    setProjects(nextProjects);
    setWorkflow(nextWorkflow);
  };
  const markMaterialsReady = () => {
    const currentContext = getRuntimeContext(contextKey);
    const nextWorkflow = { ...currentContext.workflow, materialsReady: true };
    const nextContext = { ...currentContext, workflow: nextWorkflow };
    procurementRuntime = { ...procurementRuntime, contexts: { ...procurementRuntime.contexts, [contextKey]: nextContext } };
    setWorkflow(nextWorkflow);
  };
  const updateProjectStatus = (projectId: string, status: Project['status']) => {
    const targetProject = procurementRuntime.projects.find((item) => item.id === projectId);
    const nextProjects = procurementRuntime.projects.map((item) => item.id === projectId ? { ...item, status, color: getStageColor(item.stageIndex, status) } : item);
    procurementRuntime = { ...procurementRuntime, projects: nextProjects };
    setProjects(nextProjects);
    const nextLog: ProcurementRecord = { title: '项目状态更新', type: '项目管理', tone: status === '已完成' ? 'green' : 'blue', detail: `将项目「${targetProject?.name || projectId}」状态更新为“${status}”，列表状态、项目摘要与后续办理入口已同步。`, date: new Date().toLocaleString('zh-CN'), user: project.owner || '张明', files: [] };
    procurementRuntimeAuditRecords = [nextLog, ...procurementRuntimeAuditRecords];
    setProjectStatusLogs(procurementRuntimeAuditRecords);
    message.success(`项目状态已更新为“${status}”，操作已写入全过程记录`);
  };
  const completeStage = (stageIndex = workflow.currentStage) => {
    const currentContext = getRuntimeContext(contextKey);
    const currentWorkflow = currentContext.workflow;
    if (stageIndex !== currentWorkflow.currentStage) {
      message.info(`请先完成“${workflowStages[currentWorkflow.currentStage].title}”`);
      return false;
    }
    if (stageIndex === 2 && !currentWorkflow.materialsReady) {
      message.warning('请先补充项目立项依据，再提交文件形成阶段');
      return false;
    }
    const nextWorkflow = {
      ...currentWorkflow,
      completedStages: currentWorkflow.completedStages.includes(stageIndex) ? currentWorkflow.completedStages : [...currentWorkflow.completedStages, stageIndex],
      currentStage: Math.min(stageIndex + 1, workflowStages.length - 1),
    };
    const nextContext = { ...currentContext, workflow: nextWorkflow };
    const nextProjects = syncProjectRowWithWorkflow(procurementRuntime.projects, currentContext.project.id, nextWorkflow);
    procurementRuntime = { ...procurementRuntime, projects: nextProjects, contexts: { ...procurementRuntime.contexts, [contextKey]: nextContext } };
    setWorkflow(nextWorkflow);
    setProjects(nextProjects);
    message.success(stageIndex === workflowStages.length - 1 ? '项目流程已全部完成' : `${workflowStages[stageIndex].title}已完成，已进入${workflowStages[stageIndex + 1].title}`);
    return true;
  };
  const updateFulfillmentNode = (nodeName: string, status: FulfillmentNodeStatus, note: string) => {
    const nextNodes = fulfillmentRuntimeNodes.map((item) => item.node !== nodeName ? item : {
      ...item,
      status,
      activities: [...item.activities, { time: '刚刚', title: '状态已更新', description: note || `节点状态已更新为“${status}”。` }],
    });
    fulfillmentRuntimeNodes = nextNodes;
    setFulfillmentNodes(nextNodes);
    const nextLog: ProcurementRecord = { title: '履约节点状态更新', type: '履约验收', tone: status === '已完成' ? 'green' : status === '逾期 2 天' ? 'orange' : 'blue', detail: `履约节点「${nodeName}」状态更新为“${status}”。${note ? `处理说明：${note}` : ''}`, date: new Date().toLocaleString('zh-CN'), user: project.owner || '张明', files: [] };
    procurementRuntimeAuditRecords = [nextLog, ...procurementRuntimeAuditRecords];
    setProjectStatusLogs(procurementRuntimeAuditRecords);
  };
  const workflowContextValue = { workflow, project, markMaterialsReady, completeStage };
  useEffect(() => {
    document.body.classList.add('procurement-mode');
    (window as any).__openProcurementModal = setModal;
    return () => { document.body.classList.remove('procurement-mode'); delete (window as any).__openProcurementModal; };
  }, []);
  useEffect(() => {
    activeProjectContextKey = contextKey;
  }, [contextKey]);
  useEffect(() => {
    if (routeContextKey === contextKey) return;
    const nextContext = getRuntimeContext(routeContextKey);
    activeProjectContextKey = routeContextKey;
    setContextKey(routeContextKey);
    setProject(nextContext.project);
    setProjects(procurementRuntime.projects);
    setWorkflow(nextContext.workflow);
  }, [contextKey, routeContextKey]);
  const view = location.pathname;
  const acceptanceView = view.endsWith('/result') ? 'result' : view.endsWith('/report') ? 'report' : view.endsWith('/evaluation') ? 'evaluation' : 'form';
  const showProjectFlowBar = ['/procurement/requirements', '/procurement/requirements/review', '/procurement/documents', '/procurement/documents/draft', '/procurement/documents/gate', '/procurement/suppliers', '/procurement/suppliers/risk', '/procurement/contracts', '/procurement/contracts/proposal', '/procurement/contracts/fulfillment', '/procurement/contracts/fulfillment/node-detail', '/procurement/acceptance', '/procurement/acceptance/result', '/procurement/acceptance/report', '/procurement/acceptance/evaluation', '/procurement/records'].includes(view);
  const content = view === '/platform-overview' ? <PlatformOverviewPage />
    : view === '/platform-models' ? <ModelServicesPage />
    : view === '/procurement' || view === '/procurement/' ? <Workbench onOpenModal={setModal} projects={projects} />
    : view === '/procurement/projects' ? <ProjectsPage onOpenModal={setModal} projects={projects} onUpdateStatus={updateProjectStatus} />
    : view === '/procurement/projects/detail' ? (workflow.currentStage === 0 ? <ProjectInitialStatePage onOpenModal={setModal} /> : <ProjectDetail onOpenModal={setModal} />)
        : view === '/procurement/requirements/review' ? <RequirementReviewPage />
          : view === '/procurement/requirements' ? <RequirementPage onOpenModal={setModal} onCompleteStage={() => completeStage(1)} />
            : view === '/procurement/documents/gate' ? <ProjectStageFileGatePage onOpenModal={setModal} />
              : view === '/procurement/documents/draft' || view === '/procurement/documents' ? <DocumentsPage onOpenModal={setModal} onCompleteStage={() => completeStage(2)} />
                : view === '/procurement/contracts/proposal' || view === '/procurement/contracts' ? <ContractsPage onCompleteStage={() => completeStage(4)} />
              : view === '/procurement/contracts/fulfillment' ? <ContractsFulfillmentPage onOpenModal={setModal} nodeRows={fulfillmentNodes} onUpdateNode={updateFulfillmentNode} />
                : view === '/procurement/contracts/fulfillment/node-detail' ? <FulfillmentNodeDetailPage onOpenModal={setModal} nodeRows={fulfillmentNodes} />
                  : view === '/procurement/suppliers/risk' ? <SupplierRiskPage onOpenModal={setModal} />
                  : view === '/procurement/suppliers' ? <SuppliersPage onOpenModal={setModal} onCompleteStage={() => completeStage(3)} />
                    : view.startsWith('/procurement/acceptance') ? <AcceptancePage view={acceptanceView as any} onOpenModal={setModal} onCompleteStage={() => completeStage(5)} />
                      : view === '/procurement/records' ? <RecordsPage onOpenModal={setModal} onCompleteStage={() => completeStage(6)} extraRecords={projectStatusLogs} />
                        : view === '/procurement/roles' ? <RolesPage />
                          : view === '/procurement/policy-assistant' ? <PolicyAssistantPage />
                            : view === '/procurement/knowledge-base' ? <KnowledgeBasePage />
                          : <ReportsPage />;
  return <ProjectWorkflowContext.Provider value={workflowContextValue}><div className="procurement-page">{showProjectFlowBar && <ProjectFlowBar />}{content}<ProcurementModal modal={modal} onClose={() => setModal(null)} onOpenModal={setModal} onUploaded={markMaterialsReady} onProjectCreated={startNewProject} /></div></ProjectWorkflowContext.Provider>;
}

export default ProcurementPortal;
