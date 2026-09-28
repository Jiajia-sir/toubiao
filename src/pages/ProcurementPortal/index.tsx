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
  Steps,
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
import './index.less';

type ModalKey =
  | 'new-project'
  | 'recommend'
  | 'missing'
  | 'upload'
  | 'similar'
  | 'reference'
  | 'ignore'
  | 'template'
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
  progress: number;
  color: string;
  unit: string;
  status: '进行中' | '已完成' | '待审核';
};

const projectRows: Project[] = [
  {
    id: 'PRJ-2024-012',
    name: '2024年度办公设备集中采购',
    category: '货物类',
    budget: '¥280,000',
    stage: '采购执行',
    progress: 65,
    color: '#2f66eb',
    unit: '行政部',
    status: '进行中',
  },
  {
    id: 'PRJ-2024-009',
    name: '数据中心服务器扩容项目',
    category: '货物类',
    budget: '¥1,200,000',
    stage: '合同签订',
    progress: 80,
    color: '#f59e0b',
    unit: '信息技术部',
    status: '进行中',
  },
  {
    id: 'PRJ-2024-018',
    name: '厂区绿化养护服务采购',
    category: '服务类',
    budget: '¥150,000',
    stage: '需求确认',
    progress: 35,
    color: '#10b981',
    unit: '后勤保障部',
    status: '进行中',
  },
  {
    id: 'PRJ-2024-021',
    name: '办公楼装修改造工程',
    category: '工程类',
    budget: '¥860,000',
    stage: '立项审批',
    progress: 15,
    color: '#94a3b8',
    unit: '行政部',
    status: '待审核',
  },
  {
    id: 'PRJ-2024-006',
    name: '年度法律咨询服务采购',
    category: '服务类',
    budget: '¥120,000',
    stage: '验收结算',
    progress: 95,
    color: '#10b981',
    unit: '法务部',
    status: '已完成',
  },
];

const processSteps = [
  { title: '立项审批', count: 3, percent: 72, color: '#2f66eb', desc: '平均耗时 2.1 天' },
  { title: '需求确认', count: 3, percent: 62, color: '#2f66eb', desc: '平均耗时 1.4 天' },
  { title: '采购执行', count: 3, percent: 45, color: '#7c5cff', desc: '平均耗时 3.6 天' },
  { title: '合同签订', count: 2, percent: 30, color: '#f59e0b', desc: '平均耗时 2.8 天' },
  { title: '验收结算', count: 1, percent: 18, color: '#10b981', desc: '平均耗时 4.2 天' },
];

const stages = ['项目启动', '需求拟制', '文件形成', '供应商核查', '合同建议', '履约验收', '数据复盘'];

type WorkflowStage = {
  key: string;
  title: string;
  route: string;
  summary: string;
  action: string;
};

const workflowStages: WorkflowStage[] = [
  { key: 'startup', title: stages[0], route: '/procurement/projects/detail', summary: '项目基础信息、预算与负责人已确认。', action: '查看项目基础信息' },
  { key: 'requirement', title: stages[1], route: '/procurement/requirements', summary: '完善采购需求，完成 AI 合规检查并提交审核。', action: '进入需求拟制' },
  { key: 'documents', title: stages[2], route: '/procurement/documents', summary: '补齐立项材料，形成采购文件并提交审核。', action: '进入文件编制' },
  { key: 'suppliers', title: stages[3], route: '/procurement/suppliers', summary: '完成候选供应商添加、联合核查与风险确认。', action: '进入供应商核查' },
  { key: 'contract', title: stages[4], route: '/procurement/contracts', summary: '确认合同条款建议，生成合同草案并进入履约。', action: '进入合同建议' },
  { key: 'fulfillment', title: stages[5], route: '/procurement/contracts/fulfillment', summary: '跟进交付节点，完成现场验收并生成评价。', action: '进入履约验收' },
  { key: 'review', title: stages[6], route: '/procurement/records', summary: '归档全流程记录，完成项目复盘与数据沉淀。', action: '进入数据复盘' },
];

type ProjectWorkflow = {
  currentStage: number;
  completedStages: number[];
  materialsReady: boolean;
};

type ProjectWorkflowContextValue = {
  workflow: ProjectWorkflow;
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

const recordItems = [
  { title: '创建项目', type: '项目启动', tone: 'blue', detail: '创建采购项目「2024年度办公设备集中采购」，预算金额 ¥480,000，采购方式：公开招标。', date: '2024-05-08 09:20', user: '张明' },
  { title: '文件上传', type: '需求拟制', tone: 'green', detail: '上传「项目立项申请表.pdf」，并提交「预算审批文件.pdf」，材料清单更新为必备 2/3 已上传。', date: '2024-05-09 11:05', user: '李静' },
  { title: '文件审核', type: '需求拟制', tone: 'green', detail: '审核立项材料与预算审批文件，核对无误后审核通过，允许进入需求拟制环节。', date: '2024-05-16 14:30', user: '王强' },
  { title: 'AI 智能检查', type: '需求拟制', tone: 'purple', detail: 'AI 对采购需求执行合规检查，共发现 4 项问题：品牌倾向、供应商业绩门槛过高、技术要求与验收标准不一致、缺失安装调试完成时间。', date: '2024-05-18 10:12', user: 'AI 系统' },
  { title: '建议采纳 / 忽略', type: '需求拟制', tone: 'purple', detail: '针对 AI 检查结果处理：采纳 2 项、人工修改 1 项、忽略（人工保留）1 项，并填写人工处理意见留痕。', date: '2024-05-21 10:58', user: '张明' },
  { title: '采购文件生成', type: '文件形成', tone: 'blue', detail: '基于《货物类公开招标标准采购文件》生成正式采购文件，版本更新至 V1.3，共 8 个标准章节。', date: '2024-06-05 16:40', user: '张明' },
  { title: '风险核查', type: '供应商核查', tone: 'orange', detail: '对华科智能设备有限公司与中联数字科技有限公司发起联合核查，识别出两家供应商存在交叉任职线索。', date: '2024-06-15 10:22', user: '张明' },
  { title: '合同确认', type: '合同建议', tone: 'green', detail: '确认合同条款，将「25 天交付」「电池质保 5 年」等供应商承诺写入合同，生成 HT-2024-0126 并完成签订。', date: '2024-06-18 09:15', user: '张明' },
  { title: '履约预警', type: '履约验收', tone: 'orange', detail: '系统检测「设备到货」节点距计划日期仅剩 3 天未完成交付，自动触发预警并推送至责任人李强。', date: '2024-08-17 08:00', user: '系统' },
  { title: '验收完成', type: '履约验收', tone: 'green', detail: '完成现场验收：到货 120 台、续航实测 12.5 小时、IP67 通过，验收结论合格，并生成验收报告与供应商履约评价。', date: '2024-08-18 15:30', user: '张明、王强' },
];

function go(path: string) {
  history.push(path);
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

function Workbench({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  return (
    <>
      <PageTitle
        title="早上好，张明 👋"
        subtitle="今天是 2024年6月15日 星期六，您有 8 项待办事项等待处理"
        actions={
          <>
            <Button icon={<TeamOutlined />} onClick={() => go('/procurement/roles')}>切换角色</Button>
            <Button icon={<DownloadOutlined />}>导出报表</Button>
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
            extra={<Space><Button type="primary" size="small">全部</Button><Button size="small">进行中</Button><Button size="small">已完成</Button></Space>}
          >
            <Table<Project>
              rowKey="id"
              pagination={false}
              columns={projectColumns}
              dataSource={projectRows}
              onRow={(record) => ({ onClick: () => go('/procurement/projects/detail') })}
              className="clickable-table"
            />
          </Panel>
        </Col>
        <Col xs={24} xl={7}>
          <Panel title={<><AuditOutlined /> 我的待办 <Badge count={8} /></>} extra={<Button type="link">查看全部</Button>}>
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
  { title: '当前阶段', dataIndex: 'stage', render: (value, record) => <StatusPill tone={record.color === '#10b981' ? 'green' : record.color === '#f59e0b' ? 'orange' : 'purple'}>{value}</StatusPill> },
  { title: '进度', dataIndex: 'progress', render: (value, record) => <div className="table-progress"><Progress percent={value} showInfo={false} strokeColor={record.color} /><span>{value}%</span></div> },
  { title: '操作', render: () => <Button type="link">查看</Button> },
];

function ProjectsPage({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState('all');
  const data = useMemo(() => projectRows.filter((item) => {
    const matchKeyword = !keyword || `${item.name}${item.id}${item.unit}`.includes(keyword);
    const matchStatus = filter === 'all' || (filter === 'doing' && item.status === '进行中') || (filter === 'done' && item.status === '已完成');
    return matchKeyword && matchStatus;
  }), [filter, keyword]);
  return (
    <>
      <PageTitle title="项目管理" subtitle="统一管理采购项目全生命周期，实时掌握项目进度与风险" actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => onOpenModal('new-project')}>新建采购项目</Button>} />
      <Panel>
        <div className="filter-bar">
          <Input prefix={<SearchOutlined />} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索项目名称 / 编号 / 部门" allowClear />
          <Select value={filter} onChange={setFilter} options={[{ value: 'all', label: '全部状态' }, { value: 'doing', label: '进行中' }, { value: 'done', label: '已完成' }]} />
          <Select defaultValue="all" options={[{ value: 'all', label: '全部品类' }, { value: 'goods', label: '货物类' }, { value: 'service', label: '服务类' }, { value: 'engineering', label: '工程类' }]} />
          <Button icon={<DownloadOutlined />}>导出列表</Button>
        </div>
        <Table<Project> rowKey="id" columns={projectColumns} dataSource={data} pagination={{ pageSize: 8, showTotal: (total) => `共 ${total} 个项目` }} onRow={() => ({ onClick: () => go('/procurement/projects/detail') })} className="clickable-table" />
      </Panel>
    </>
  );
}

function ProjectWorkflowTimeline({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  const { workflow, completeStage } = useProjectWorkflow();
  const [selectedStage, setSelectedStage] = useState(workflow.currentStage);

  useEffect(() => {
    setSelectedStage(workflow.currentStage);
  }, [workflow.currentStage]);

  const selected = workflowStages[selectedStage];
  const isCurrent = selectedStage === workflow.currentStage;
  const handleStageChange = (stageIndex: number) => {
    setSelectedStage(stageIndex);
    if (stageIndex > workflow.currentStage) {
      message.info(`请先完成“${workflowStages[workflow.currentStage].title}”，再进入下一阶段`);
      return;
    }
    if (stageIndex !== workflow.currentStage) {
      go(workflowStages[stageIndex].route);
    }
  };

  return (
    <Panel title={<><SyncOutlined /> 项目阶段时间线</>} extra={<StatusPill tone="blue">已完成 {workflow.completedStages.length} / {workflowStages.length}</StatusPill>}>
      <Steps
        current={workflow.currentStage}
        onChange={handleStageChange}
        items={workflowStages.map((stage, index) => ({
          title: stage.title,
          description: index < workflow.currentStage ? '已完成' : index === workflow.currentStage ? '进行中' : '待开始',
          status: index < workflow.currentStage ? 'finish' : index === workflow.currentStage ? 'process' : 'wait',
          disabled: index > workflow.currentStage,
        }))}
      />
      <div className={`workflow-stage-card ${isCurrent ? 'current' : 'history'}`}>
        <div>
          <div className="workflow-stage-kicker">
            <span>阶段 {String(selectedStage + 1).padStart(2, '0')}</span>
            <StatusPill tone={selectedStage < workflow.currentStage ? 'green' : isCurrent ? 'blue' : 'gray'}>
              {selectedStage < workflow.currentStage ? '已完成' : isCurrent ? '当前阶段' : '待开始'}
            </StatusPill>
          </div>
          <h3>{selected.title}</h3>
          <p>{selected.summary}</p>
          {isCurrent && selectedStage === 2 && (
            <div className={`workflow-material-state ${workflow.materialsReady ? 'ready' : 'missing'}`}>
              {workflow.materialsReady ? <CheckCircleFilled /> : <WarningFilled />}
              <span>{workflow.materialsReady ? '必备材料已齐全，可以进入文件编制。' : '还缺少“项目立项依据”，需补充材料后才能进入文件编制。'}</span>
            </div>
          )}
        </div>
        <Space wrap>
          {isCurrent && selectedStage === 0 && <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => { if (completeStage()) go('/procurement/requirements'); }}>确认项目启动并进入需求拟制</Button>}
          {isCurrent && selectedStage === 2 && !workflow.materialsReady && <Button onClick={() => onOpenModal('missing')}>查看材料任务</Button>}
          {isCurrent && selectedStage === 2 && !workflow.materialsReady && <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => onOpenModal('upload')}>补充材料</Button>}
          {isCurrent && selectedStage === 2 && workflow.materialsReady && <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => go(selected.route)}>进入文件编制</Button>}
          {isCurrent && selectedStage !== 0 && selectedStage !== 2 && <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => go(selected.route)}>{selected.action}</Button>}
          {selectedStage < workflow.currentStage && <Button onClick={() => go(selected.route)}>查看该阶段</Button>}
          {selectedStage > workflow.currentStage && <Button disabled>完成当前阶段后解锁</Button>}
        </Space>
      </div>
      <div className="workflow-next-hint">
        <span><CheckCircleFilled /> 已完成阶段可点击回看，未开始阶段需按顺序解锁。</span>
        {workflow.currentStage < workflowStages.length - 1 && <span>下一阶段：{workflowStages[workflow.currentStage + 1].title}</span>}
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
        <Button size="small" onClick={() => go('/procurement/projects/detail')}>返回项目流程</Button>
      </div>
      <div className="project-flow-mini-steps">
        {workflowStages.map((stage, index) => (
          <button
            type="button"
            key={stage.key}
            className={index < workflow.currentStage ? 'done' : index === workflow.currentStage ? 'current' : ''}
            disabled={index > workflow.currentStage}
            onClick={() => index <= workflow.currentStage && go(stage.route)}
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
  const { workflow } = useProjectWorkflow();
  const materialsReady = workflow.materialsReady;
  const currentStage = workflowStages[workflow.currentStage];
  const workflowProgress = [15, 30, 55, 68, 80, 92, 100][workflow.currentStage];
  const [tab, setTab] = useState('basic');
  return (
    <>
      {workflow.currentStage === 0 && workflow.completedStages.length === 0 && <Alert className="success-banner" type="info" showIcon message="项目创建成功，开始项目启动" description="请确认项目基础信息后进入需求拟制，后续阶段将按顺序解锁。" />}
      {materialsReady && <Alert className="success-banner" type="success" showIcon message="材料补充成功" description="「项目立项依据」已上传并设为当前版本，必备材料已齐全，现在可以提交需求准备。" closable />}
      <PageTitle
        breadcrumb={['项目管理', '我的项目', '2024年度办公设备集中采购']}
        title="2024年度办公设备集中采购"
        subtitle="PRJ-2024-012 · 行政部 · 创建于 2024-05-08 · 负责人：张明"
        actions={<><Button icon={<ArrowLeftOutlined />} onClick={() => go('/procurement/projects')}>返回列表</Button><Button icon={<FolderOpenOutlined />}>项目档案</Button><Button type="primary" icon={<EditOutlined />}>编辑项目</Button></>}
      />
      <Panel className="project-summary-panel">
        <div className="project-summary-top">
          <div className="project-heading"><div className="large-project-icon"><ProjectOutlined /></div><div><h2>2024年度办公设备集中采购</h2><Space><StatusPill tone={workflow.currentStage >= 5 ? 'green' : workflow.currentStage === 2 && !materialsReady ? 'purple' : 'blue'}>{currentStage.title}</StatusPill><StatusPill tone="orange">紧急</StatusPill></Space></div></div>
          <Space><Button icon={<ShareIcon />}>分享</Button><Button icon={<MoreOutlined />} /><Button type="primary" icon={<EditOutlined />}>编辑项目</Button></Space>
        </div>
        <div className="summary-metrics">
          <div><span>采购预算</span><strong>¥280,000</strong></div><div><span>已使用金额</span><strong>¥182,000</strong></div><div><span>采购方式</span><strong>公开招标 <ThunderboltFilled /></strong></div><div><span>计划完成时间</span><strong>2024-08-30</strong></div><div><span>整体进度</span><div className="summary-progress"><Progress percent={materialsReady ? 70 : 65} showInfo={false} /><b>{materialsReady ? 70 : 65}%</b></div></div>
        </div>
      </Panel>
      <PageTabs active={tab} onChange={setTab} items={[{ key: 'basic', label: '基本信息' }, { key: 'requirements', label: '需求明细' }, { key: 'method', label: '采购方式' }, { key: 'supplier', label: '供应商' }, { key: 'contract', label: '合同与订单' }, { key: 'docs', label: '文档资料' }]} />
      {tab === 'basic' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={17}>
            <Panel title={<><FileTextOutlined /> 项目基本信息</>}>
              <div className="info-grid"><InfoCell label="项目类型" value="货物类" /><InfoCell label="采购品类" value="计算机及办公设备" /><InfoCell label="采购数量" value="120 台 / 套" /><InfoCell label="需求部门" value="行政部" /><InfoCell label="项目负责人" value="张明" avatar="张" /><InfoCell label="资金来源" value="年度财政预算" /></div>
              <div className="info-description"><span>采购意向</span><p>拟采购一批办公电脑、打印机及配套设备，用于新办公区员工办公使用。要求主流品牌、整机三年质保，支持批量部署与统一管理，交付周期不超过 45 天。</p></div>
            </Panel>
            <ProjectWorkflowTimeline onOpenModal={onOpenModal} />
            <Panel title={<><FileDoneOutlined /> 需求明细</>} extra={<Button type="link">共 4 项</Button>}>
              <Table pagination={false} rowKey="name" dataSource={[{ name: '商用台式计算机', spec: 'i5-13500 / 16G / 512G SSD', qty: '80 台', price: '¥2,600' }, { name: '激光多功能一体机', spec: '黑白 / 自动双面 / 网络', qty: '20 台', price: '¥1,800' }, { name: '显示器', spec: '27 英寸 / 2K / IPS', qty: '80 台', price: '¥900' }, { name: '办公桌椅套装', spec: '人体工学 / 1.4m 桌面', qty: '40 套', price: '¥1,200' }]} columns={[{ title: '物料名称', dataIndex: 'name' }, { title: '规格型号', dataIndex: 'spec' }, { title: '数量', dataIndex: 'qty' }, { title: '预估单价', dataIndex: 'price', render: (value) => <strong>{value}</strong> }]} />
            </Panel>
          </Col>
          <Col xs={24} xl={7}>
            <Panel title={<><FundOutlined /> 预算执行</>} extra={<StatusPill tone="orange">执行 65%</StatusPill>}><div className="budget-circle"><Progress type="circle" percent={65} strokeColor="#2f66eb" trailColor="#e5e9f1" size={130} /><span>已使用 ¥182,000</span></div><div className="budget-legend"><span><i className="blue-dot" /> 已使用金额 <b>¥182,000</b></span><span><i className="gray-dot" /> 可用余额 <b>¥98,000</b></span></div></Panel>
            <Panel title={<><TeamOutlined /> 项目团队</>}><div className="team-list">{[['张', '张明', '采购经理 · 项目负责人', '负责人'], ['李', '李静', '采购专员 · 需求对接', '成员'], ['王', '王强', '财务专员 · 预算审核', '成员']].map(([avatar, name, role, badge]) => <div className="team-item" key={name}><Avatar>{avatar}</Avatar><div><strong>{name}</strong><span>{role}</span></div><StatusPill tone={badge === '负责人' ? 'blue' : 'gray'}>{badge}</StatusPill></div>)}</div></Panel>
            <Panel title={<><HistoryOutlined /> 操作记录</>}><div className="activity-list">{['提交采购执行申请', '确认采购方式为公开招标', '创建采购项目'].map((item, index) => <div key={item}><i className={`activity-dot ${index === 0 ? 'blue' : index === 1 ? 'green' : 'purple'}`} /><div><strong>{item}</strong><span>张明 · 2024-05-{20 - index * 2} 14:32</span></div></div>)}</div></Panel>
          </Col>
        </Row>
      )}
      {tab !== 'basic' && <Panel title={tab === 'requirements' ? '需求明细' : tab === 'method' ? '采购方式' : tab === 'supplier' ? '供应商' : tab === 'contract' ? '合同与订单' : '文档资料'}><Empty description="该模块已纳入采购流程演示，可从左侧流程节点进入详细办理页面" /></Panel>}
      {!materialsReady && <div className="project-quick-actions"><Button type="primary" onClick={() => onOpenModal('missing')}>查看当前任务</Button><Button onClick={() => onOpenModal('upload')}>补充材料</Button></div>}
    </>
  );
}

function InfoCell({ label, value, avatar }: { label: string; value: string; avatar?: string }) {
  return <div className="info-cell"><span>{label}</span><strong>{avatar && <Avatar size="small">{avatar}</Avatar>}{value}</strong></div>;
}

function ShareIcon() { return <LinkOutlined />; }

function RequirementPage({ onOpenModal, onCompleteStage }: { onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean }) {
  const [checkOpen, setCheckOpen] = useState(false);
  const [resolved, setResolved] = useState<Record<number, string>>({});
  const handledCount = Object.keys(resolved).length;
  const submitRequirement = () => {
    if (onCompleteStage && !onCompleteStage()) return;
    go('/procurement/documents');
  };
  return (
    <>
      <PageTitle breadcrumb={['采购需求', '需求拟制', '2024年度办公设备集中采购']} title="采购需求拟制" subtitle="PRJ-2024-012 · 移动终端设备采购需求 · 负责人 张明" actions={<><Button icon={<HistoryOutlined />} onClick={() => onOpenModal('similar')}>查找相似案例</Button><Button icon={<DownloadOutlined />}>保存草稿</Button><Button icon={<ThunderboltFilled />} className="purple-button" onClick={() => setCheckOpen(true)}>智能检查</Button><Button type="primary" icon={<SendOutlined />} onClick={submitRequirement}>提交审核并进入文件编制</Button></>} />
      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={checkOpen ? 15 : 17}>
          <Panel title={<><InfoCircleOutlined /> 需求基本信息</>}>
            <Form layout="vertical" className="requirement-form">
              <Form.Item label="采购意向" required><Input.TextArea rows={3} defaultValue="拟为新建办公区采购一批便携式移动终端设备，用于外勤巡检、现场数据采集与移动办公，替代现有老旧设备，提升一线作业效率。" /></Form.Item>
              <Row gutter={16}><Col span={12}><Form.Item label="使用环境" required><Input defaultValue="室外车间，-10℃ ~ 45℃" /></Form.Item></Col><Col span={12}><Form.Item label="数量" required><Select defaultValue="120 台" options={[{ value: '120 台', label: '120 台' }, { value: '80 台', label: '80 台' }, { value: '200 台', label: '200 台' }]} /></Form.Item></Col><Col span={12}><Form.Item label="预算" required><Input prefix="¥" defaultValue="480,000" /></Form.Item></Col><Col span={12}><Form.Item label="交付日期" required><DatePicker defaultValue={undefined} placeholder="2024-08-30" style={{ width: '100%' }} /></Form.Item></Col><Col span={24}><Form.Item label="交付地点" required><Input defaultValue="总部园区 B 座一层收货区（含卸货与上楼搬运）" /></Form.Item></Col></Row>
            </Form>
          </Panel>
          <Panel title={<><ToolOutlined /> 技术要求 <StatusPill tone="purple">含 3 项 AI 识别内容</StatusPill></>}>
            <div className="requirement-card-list">{requirementCards.map((item) => <div className={`requirement-card ${item.tone}`} key={item.title}><div><strong>{item.title}</strong><p>{item.text}</p></div><StatusPill tone={item.tone === 'purple' ? 'purple' : 'gray'}>{item.tone === 'purple' ? 'AI 识别' : '手动填写'}</StatusPill></div>)}</div><Button block type="dashed" icon={<PlusOutlined />}>添加技术要求</Button>
          </Panel>
          <Panel title={<><FileTextOutlined /> 商务要求</>}><Input.TextArea rows={4} defaultValue={'1. 整机质保不少于 3 年，提供原厂授权及售后承诺函；\n2. 报价含运输、安装、调试及首年上门维护费用；\n3. 付款方式为验收合格后 30 日内支付 90%，质保期满支付 10%。'} /><div className="chip-row"><Tag>质保 3 年</Tag><Tag>含运输安装</Tag><Tag>30 天账期</Tag></div></Panel>
          <Panel title={<><SafetyCertificateOutlined /> 验收要求</>}><Input.TextArea rows={3} defaultValue="到货后按 10% 比例抽检外观与配件完整性；全数设备进行开机功能测试与续航实测，测试结果需满足技术要求约定指标。" /><div className="completion-line"><span>需求完整度</span><Progress percent={handledCount ? 96 : 85} strokeColor="#10b981" /><b>{handledCount ? 96 : 85}%</b></div></Panel>
        </Col>
        {checkOpen && <Col xs={24} xl={9}><AuditPanel resolved={resolved} onResolve={(index, action) => setResolved((current) => ({ ...current, [index]: action }))} onClose={() => setCheckOpen(false)} onOpenModal={onOpenModal} /></Col>}
        {!checkOpen && <Col xs={24} xl={7}><AiAssistant onOpenSimilar={() => onOpenModal('similar')} onCheck={() => setCheckOpen(true)} /></Col>}
      </Row>
    </>
  );
}

function AiAssistant({ onOpenSimilar, onCheck }: { onOpenSimilar: () => void; onCheck: () => void }) {
  return <Panel title={<><ThunderboltFilled /> AI 需求助手 <StatusPill tone="green">在线</StatusPill></>} className="assistant-panel"><div className="assistant-message">续航不少于12小时，IP67，支持标准数据接口。</div><div className="assistant-result"><strong><ThunderboltFilled /> 已识别到 3 项可结构化需求点</strong>{['续航 ≥ 12 小时', '防护等级 IP67', '支持标准 API 接口'].map((item, index) => <div className="assistant-item" key={item}><b>{item}</b><StatusPill tone={index === 2 ? 'orange' : 'green'}>置信度 {98 - index * 4}%</StatusPill><span>归类：技术要求 / {index === 1 ? '环境适应性' : '性能指标'}</span></div>)}<Space><Button type="primary" icon={<PlusOutlined />}>加入需求文档</Button><Button icon={<SyncOutlined />}>重新生成</Button></Space></div><div className="quick-command">快捷指令{['检查技术参数是否设置不合理门槛', '按同类项目补全验收标准', '检查是否存在品牌倾向性表述'].map((item) => <Button key={item} block icon={<SafetyCertificateOutlined />} onClick={onCheck}>{item}</Button>)}</div><Input.Search placeholder="输入技术要求，AI 将自动结构化并归类..." enterButton={<ThunderboltFilled />} onSearch={onCheck} /></Panel>;
}

function AuditPanel({ resolved, onResolve, onClose, onOpenModal }: { resolved: Record<number, string>; onResolve: (index: number, action: string) => void; onClose: () => void; onOpenModal: (key: ModalKey) => void }) {
  return <Panel title={<><ThunderboltFilled /> 智能检查结果 <StatusPill tone="purple">{4 - Object.keys(resolved).length} 项问题</StatusPill></>} extra={<Button type="text" icon={<CloseCircleFilled />} onClick={onClose} />} className="audit-panel"><div className="audit-summary"><span>🔴 高风险 {auditProblems.filter((item) => item.level === '高风险').length - Object.keys(resolved).filter((key) => auditProblems[Number(key)].level === '高风险').length}</span><span>🟠 中风险 {auditProblems.filter((item) => item.level === '中风险').length - Object.keys(resolved).filter((key) => auditProblems[Number(key)].level === '中风险').length}</span></div>{auditProblems.map((item, index) => { const status = resolved[index]; return <div className={`audit-card ${status ? 'resolved' : item.level === '高风险' ? 'high' : 'medium'}`} key={item.title}><div className="audit-card-head"><strong>{index + 1} {item.title}</strong><StatusPill tone={status ? 'green' : item.level === '高风险' ? 'red' : 'orange'}>{status ? '已处理' : item.level}</StatusPill></div>{status ? <><p className="audit-resolution">处理方式：{status === '采纳' ? '采纳建议' : status === '人工修改' ? '人工修改' : '人工保留'}</p><div className="audit-suggestion">{status === '人工保留' ? '已记录人工处理意见，将保留原文并在提交审核时提示。' : item.suggestion}</div></> : <><span className="audit-label">原文</span><div className="audit-original">“{item.original}”</div><span className="audit-label">问题原因</span><p>{item.reason}</p><div className="audit-suggestion"><strong>💡 修改建议</strong><br />{item.suggestion}</div><div className="audit-actions"><Button type="primary" size="small" onClick={() => onResolve(index, '采纳')}>采纳</Button><Button size="small" onClick={() => onResolve(index, '人工修改')}>人工修改</Button><Button size="small" onClick={() => { onResolve(index, '人工保留'); onOpenModal('ignore'); }}>忽略</Button><Button size="small" icon={<LinkOutlined />}>查看依据</Button></div></>}</div>; })}<Space direction="vertical" style={{ width: '100%' }}><Button block className="purple-button" icon={<SyncOutlined />} onClick={() => message.success('已重新检查需求文档')}>重新检查</Button><Button block icon={<DownloadOutlined />}>生成检查报告</Button></Space></Panel>;
}

function DocumentsPage({ onOpenModal, onCompleteStage }: { onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean }) {
  const chapters = ['采购公告', '投标人须知', '采购需求', '技术要求', '商务要求', '评分标准', '合同条款', '验收要求'];
  const { workflow } = useProjectWorkflow();
  const submitForReview = () => {
    if (onCompleteStage && !onCompleteStage()) return;
    go('/procurement/suppliers');
  };
  return <>
    <PageTitle breadcrumb={['采购需求', '采购文件', '公开招标文件']} title="采购文件编制" subtitle="基于《货物类公开招标标准采购文件》生成 · 最后保存 11:06" actions={<><Button icon={<DiffOutlined />} onClick={() => onOpenModal('template')}>从模板生成</Button><Button icon={<SafetyCertificateOutlined />} className="purple-button">质量检查</Button><Button icon={<HistoryOutlined />} onClick={() => onOpenModal('version')}>版本记录</Button><Button icon={<DownloadOutlined />}>导出 Word</Button><Button type="primary" icon={<SendOutlined />} onClick={submitForReview}>提交审核并进入供应商核查</Button></>} />
    {!workflow.materialsReady && <Alert className="workflow-gate-alert" type="warning" showIcon message="当前阶段还缺少项目立项依据" description="请先返回项目流程补充必备材料，材料齐全后才能提交采购文件并进入供应商核查。" action={<Button onClick={() => go('/procurement/projects/detail')}>返回项目补充材料</Button>} />}
    <Row gutter={[16, 16]} align="top"><Col xs={24} lg={5}><Panel title={<>☷ 章节 <StatusPill tone="gray">8 章</StatusPill></>}><Progress percent={75} showInfo={false} /><span className="muted-text">已完成 6 / 8 章</span><div className="chapter-list">{chapters.map((chapter, index) => <div className={index === 2 ? 'active' : index === 5 ? 'warning' : ''} key={chapter}><span>{index < 5 ? <CheckCircleFilled /> : index === 5 ? <WarningFilled /> : <span className="chapter-dot" />}</span>{chapter}{index === 5 && <StatusPill tone="red">缺失</StatusPill>}</div>)}</div></Panel><Panel className="current-project-card"><strong>当前项目</strong><h3>2024年度办公设备集中采购</h3><span>PRJ-2024-012 · 公开招标</span><Progress percent={62} showInfo={false} /></Panel></Col><Col xs={24} lg={14}><Panel className="document-editor"><div className="editor-toolbar"><Space><Button type="text" icon={<ArrowLeftOutlined />} /><Button type="text" icon={<ArrowRightOutlined />} /><Divider type="vertical" /><Select defaultValue="正文" options={[{ value: '正文', label: '正文' }, { value: '标题 1', label: '标题 1' }]} /><Select defaultValue="14" options={['12', '14', '16'].map((value) => ({ value, label: value }))} /><Button type="text"><strong>B</strong></Button><Button type="text"><u>U</u></Button><Button type="text" icon={<LinkOutlined />} /><Button type="text" className="purple-button" icon={<ThunderboltFilled />}>AI 续写</Button></Space></div><article className="document-body"><h1>2024 年度办公设备集中采购<br />公开招标文件</h1><p className="document-meta">项目编号：PRJ-2024-012　采购人：某某集团有限公司　编制日期：2024-06-15</p><h2>第一章 采购公告</h2><h3>一、项目基本情况</h3><p>项目编号：<b>PRJ-2024-012</b></p><p>项目名称：<b>2024 年度办公设备集中采购</b></p><p>预算金额：<b>人民币 480,000 元</b></p><p>采购方式：<b>公开招标</b></p><h3>二、投标人资格要求</h3><ol><li>具有独立承担民事责任的能力，持有有效营业执照；</li><li>具有良好的商业信誉和健全的财务会计制度；</li><li>具有履行合同所必需的设备和专业技术能力；</li><li>近三年内在经营活动中没有重大违法记录。</li></ol><h3>三、获取招标文件</h3><p>凡有意参加投标者，请于 2024 年 6 月 20 日至 2024 年 6 月 27 日，登录集团电子采购平台下载招标文件，逾期不予受理。</p><h3>四、投标截止时间及开标时间</h3><p>投标截止时间：2024 年 7 月 8 日 09:30（北京时间）</p><p>开标时间：2024 年 7 月 8 日 09:30（北京时间）</p><p className="editor-placeholder">继续输入内容，或将鼠标移至下方添加新章节...</p></article><div className="editor-footer"><span>字数 2,486</span><span>共 6 页</span><span>自动保存</span><span>张明 正在编辑</span></div></Panel></Col><Col xs={24} lg={5}><Panel title={<><SafetyCertificateOutlined /> 文件质量检查</>}><div className="quality-circle"><Progress type="circle" percent={82} strokeColor="#f59e0b" /><span>质量评分 / 100</span></div><div className="quality-list"><span>🔴 完整性 <b>6 / 8</b></span><span>🟠 合规性 <b>5 / 6</b></span><span>🟢 一致性 <b>4 / 4</b></span><span>🟠 规范性 <b>2 / 3</b></span></div><Divider /><strong>待处理问题 <Badge count={3} /></strong>{['评分标准章节缺失', '合同条款未引用最新模板', '验收要求与技术指标表述不一致'].map((item, index) => <div className={`quality-problem ${index === 0 ? 'danger' : ''}`} key={item}><strong>{item}</strong><span>建议补充或调整相关内容</span></div>)}<Button type="link">查看全部检查项 <ArrowRightOutlined /></Button></Panel></Col></Row>
  </>;
}

function ContractsPage({ onCompleteStage }: { onCompleteStage?: () => boolean }) {
  const createContract = () => {
    if (onCompleteStage && !onCompleteStage()) return;
    go('/procurement/contracts/fulfillment');
  };
  return <><PageTitle breadcrumb={['合同管理', '合同建议', '华科智能设备有限公司']} title="合同建议" subtitle="对比采购文件要求与供应商承诺，生成拟写入合同的条款建议" actions={<><Button icon={<DiffOutlined />}>全部写入合同</Button><Button onClick={() => go('/procurement/contracts/fulfillment')} icon={<FundOutlined />}>履约管理</Button><Button type="primary" icon={<FileDoneOutlined />} onClick={createContract}>生成合同草案并进入履约</Button></>} /><Panel className="contract-summary"><strong>共比对 24 项条款，识别 4 项差异条款</strong><Space><StatusPill tone="green">优于原要求 2</StatusPill><StatusPill tone="blue">新增承诺 1</StatusPill><StatusPill tone="orange">存在偏离 1</StatusPill></Space></Panel><div className="contract-list">{contracts.map((item) => <Card className={`contract-card ${item.color}`} bordered={false} key={item.title}><div className="contract-card-head"><h2><CheckCircleFilled /> {item.title}</h2><StatusPill tone={item.color as any}>{item.kind}</StatusPill><Button type="primary" icon={<FileDoneOutlined />}>写入合同</Button></div><div className="contract-compare"><div><span>采购要求</span><strong>{item.sourceValue}</strong><small>来源：{item.source}</small></div><ArrowRightOutlined /><div><span>供应商承诺</span><strong>{item.result}</strong><small>来源：投标文件·商务承诺</small></div></div><div className="contract-tip">{item.color === 'orange' ? <WarningFilled /> : <InfoCircleOutlined />} {item.color === 'orange' ? '该要求与采购文件不一致，建议提交评标委员会复核后再决定是否写入合同。' : '建议将供应商承诺写入合同，并同步约定违约责任。'}</div></Card>)}</div></>;
}

function SuppliersPage({ onOpenModal, onCompleteStage }: { onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean }) {
  const [screeningStarted, setScreeningStarted] = useState(false);
  const handleScreening = () => {
    if (!screeningStarted) {
      setScreeningStarted(true);
      message.success('联合核查已完成，请确认结果后进入合同建议');
      return;
    }
    if (onCompleteStage && !onCompleteStage()) return;
    go('/procurement/contracts');
  };
  return <><PageTitle breadcrumb={['供应商管理', '风险核查', '候选供应商']} title="候选供应商" subtitle="添加候选企业后可发起联合核查，自动识别企业间关联关系" actions={<><Button icon={<PlusOutlined />} onClick={() => onOpenModal('add-company')}>添加企业</Button><Button type="primary" icon={<SyncOutlined />} onClick={handleScreening}>{screeningStarted ? '完成核查并进入合同建议' : '开始联合核查'}</Button></>} /><Panel className="scope-banner"><SafetyCertificateOutlined /><strong>联合核查范围：企业信息 · 信用风险 · 经营异常 · 司法风险 · 关联企业 · 关联人员 · 供应商关系</strong><span>疑点 1 项　·　上次核查 2024-06-15 10:22</span></Panel><Row gutter={[16, 16]}>{supplierCards.map((supplier) => <Col xs={24} lg={8} key={supplier.name}><Card className="supplier-card" bordered={false}><div className="supplier-head"><Avatar shape="square" size={48} icon={<BankOutlined />} /><div><h2>{supplier.name}</h2><span>统一社会信用代码：{supplier.code}</span></div><StatusPill tone={supplier.tone as any}>{supplier.risk > 40 ? '中风险' : '低风险'}</StatusPill></div><div className="supplier-facts"><div><span>企业类型</span><b>有限责任公司</b></div><div><span>注册资本</span><b>{supplier.capital}</b></div><div><span>成立时间</span><b>{supplier.founded}</b></div></div><div className="supplier-tags"><StatusPill tone="green">合作 3 年</StatusPill><StatusPill tone={supplier.risk > 40 ? 'orange' : 'green'}>{supplier.relation}</StatusPill></div><div className="supplier-risk-line"><span>综合风险分</span><Progress percent={supplier.risk} showInfo={false} strokeColor={supplier.risk > 40 ? '#f59e0b' : '#10b981'} /><strong>{supplier.risk}</strong></div><Space className="supplier-actions"><Button type="primary" block icon={<SafetyCertificateOutlined />} onClick={() => go('/procurement/suppliers/risk')}>查看风险详情</Button><Button>移除</Button></Space></Card></Col>)}<Col xs={24} lg={8}><Card className="add-supplier-card" bordered={false} onClick={() => onOpenModal('add-company')}><PlusOutlined /><h3>添加候选企业</h3><span>支持批量导入或按名称检索</span></Card></Col></Row><Panel title={<><LinkOutlined /> 联合核查机制说明</>}><div className="mechanism-grid">{[['1', '多企业合并核查', '同时核查多家候选企业，统一输出风险对比结果'], ['2', '跨企业关联识别', '识别企业间交叉任职、共同股东、同一控制人等图谱风险线索'], ['3', '结果留痕归档', '核查记录自动关联当前项目，可导出核查报告']].map(([index, title, desc]) => <div key={index}><span>{index}</span><div><strong>{title}</strong><p>{desc}</p></div></div>)}</div></Panel></>;
}

function SupplierRiskPage({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  return <><PageTitle breadcrumb={['供应商管理', '风险核查', '供应商风险详情']} title="华科智能设备有限公司" subtitle="91440300MA5F8K2X3D · 有限责任公司 · 法定代表人：张伟 · 成立 2015-03-12" actions={<><Button icon={<SyncOutlined />}>重新查询</Button><Button type="primary" icon={<FileDoneOutlined />}>生成核查报告</Button></>} /><Alert type="warning" showIcon message="第三方关联库暂不可用，关联关系数据为部分结果，其余数据源结果正常保留。" className="warning-banner" /><Row gutter={[16, 16]} className="risk-metrics"><Col xs={24} sm={12} xl={4}><MetricCard icon={<AuditOutlined />} value="2" label="司法风险" accent="red" /></Col><Col xs={24} sm={12} xl={5}><MetricCard icon={<SafetyCertificateOutlined />} value="3" label="信用风险" accent="orange" /></Col><Col xs={24} sm={12} xl={5}><MetricCard icon={<CheckCircleFilled />} value="0" label="经营异常" accent="green" /></Col><Col xs={24} sm={12} xl={5}><MetricCard icon={<ApartmentOutlined />} value="2" label="关联风险" accent="orange" /></Col><Col xs={24} sm={12} xl={5}><MetricCard icon={<FundOutlined />} value="62 / 100" label="综合风险等级" accent="orange" badge="中风险" /></Col></Row><Panel title={<><ApartmentOutlined /> 企业关系图谱 <StatusPill tone="orange">部分结果</StatusPill></>}><div className="relation-graph"><div className="graph-node company left">华科智能设备<br />有限公司<span>候选企业 A</span></div><div className="graph-edge edge-1" /><div className="graph-node person top">张伟<span>董事 · 交叉任职</span></div><div className="graph-edge edge-2" /><div className="graph-node company right">中联数字科技<br />有限公司<span>候选企业 B</span></div><div className="graph-edge edge-3" /><div className="graph-node company middle">恒远科技有限公司<span>关联企业</span></div><div className="graph-warning"><WarningFilled /><div><strong>两家供应商存在交叉任职线索</strong><p>张伟同时担任华科智能设备有限公司董事与恒远科技有限公司监事，而恒远科技与中联数字科技存在同一人员任职，提示两家候选企业可能存在围标风险。</p></div><Button onClick={() => onOpenModal('risk-node')}>查看线索</Button></div></div><div className="graph-help">点击图谱中的任意节点，可查看该节点的详细任职与数据来源信息</div></Panel><div className="bottom-action-bar"><span><ClockCircleOutlined /> 本次核查时间：2024-06-15 10:22 · 核查人：张明 · 部分数据源异常</span><Space><Button icon={<SyncOutlined />}>重新查询</Button><Button>关联当前项目</Button><Button type="primary" icon={<FileDoneOutlined />}>生成核查报告</Button></Space></div></>;
}

function ContractsFulfillmentPage({ onOpenModal }: { onOpenModal: (key: ModalKey) => void }) {
  const nodes = ['合同签订', '生产准备', '设备到货', '安装调试', '人员培训', '项目验收', '付款', '质保'];
  return <><PageTitle breadcrumb={['合同管理', '履约管理', '2024年度办公设备集中采购合同']} title="合同履约管理" subtitle="HT-2024-0126 · 供应商：华科智能设备有限公司 · 合同金额 ¥462,000" actions={<><Button icon={<AuditOutlined />}>履约台账</Button><Button onClick={() => go('/procurement/acceptance')} icon={<SafetyCertificateOutlined />}>进入现场验收</Button><Button type="primary" icon={<DownloadOutlined />}>导出履约报告</Button></>} /><Row gutter={[16, 16]} className="metric-grid"><Col xs={24} sm={12} xl={6}><MetricCard icon={<FundOutlined />} value="68%" label="履约进度" badge="较上周 +6%" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<CheckCircleFilled />} value="5" label="正常节点" accent="green" badge="共 8 个节点" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<WarningFilled />} value="1" label="预警节点" accent="orange" badge="需关注" /></Col><Col xs={24} sm={12} xl={6}><MetricCard icon={<CloseCircleFilled />} value="1" label="逾期节点" accent="red" badge="已逾期" /></Col></Row><Panel title={<><SyncOutlined /> 履约时间轴</>} extra={<span className="timeline-legend"><i className="green-dot" /> 已完成 <i className="orange-dot" /> 即将超期 <i className="red-dot" /> 逾期 <i className="gray-dot" /> 待开始</span>}><div className="fulfillment-timeline">{nodes.map((node, index) => <div className={`fulfillment-node ${index === 1 ? 'overdue' : index === 2 ? 'warning' : index < 1 ? 'done' : ''}`} key={node}><div className="node-circle">{index < 1 ? <CheckOutlined /> : index === 1 ? '×' : index === 2 ? <WarningFilled /> : index + 1}</div><strong>{node}</strong><span>{index < 1 ? '2024-06-18' : index === 1 ? '逾期 2 天' : index === 2 ? '计划 08-20' : '计划 09-' + String(5 + index * 5).padStart(2, '0')}</span></div>)}</div></Panel><Row gutter={[16, 16]}><Col xs={24} xl={17}><Panel title={<><CloudUploadOutlined /> 设备到货 <StatusPill tone="orange">即将超期</StatusPill></>} extra={<Button type="primary" onClick={() => onOpenModal('warning')}>处理预警</Button>} className="fulfillment-focus"><div className="fulfillment-facts"><InfoCell label="计划日期" value="2024-08-20" /><InfoCell label="剩余时间" value="3 天" /><InfoCell label="责任人" value="李强（供应商）" avatar="李" /><InfoCell label="当前状态" value="生产完成待发货" /></div><div className="missing-files"><div className="missing-title"><strong>缺失资料</strong><StatusPill tone="red">2 项</StatusPill></div>{['出厂检测报告', '装箱单与序列号清单'].map((item) => <div className="missing-file" key={item}><FileProtectOutlined /> <strong>{item}</strong><span>未上传 <ArrowRightOutlined /></span></div>)}</div><Alert type="info" showIcon message="预警规则：距计划日期 3 天内未完成交付，系统自动触发「即将超期」预警" /></Panel></Col><Col xs={24} xl={7}><Panel title={<><FileTextOutlined /> 合同信息</>}><DescriptionsList items={[['合同编号', 'HT-2024-0126'], ['供应商', '华科智能设备有限公司'], ['合同金额', '¥462,000'], ['签订日期', '2024-06-18'], ['交付地点', '总部园区 B 座收货区'], ['质保期', '3 年（至 2027-10-15）'], ['逾期违约率', '0.5% / 日']]} /></Panel><Panel title={<><FundOutlined /> 付款进度</>}><div className="payment-list">{[['预付款 30%', '已支付', 'green'], ['到货款 40%', '待触发', 'blue'], ['验收款 20%', '未开始', 'gray'], ['质保金 10%', '未开始', 'gray']].map(([name, status, tone]) => <div key={name}><span className={`payment-dot ${tone}`} />{name}<b className={tone}>{status}</b></div>)}</div></Panel></Col></Row><Panel title={<><FileSearchOutlined /> 履约节点明细</>} extra={<Space><Button type="primary">全部</Button><Button>仅看异常</Button></Space>}><Table pagination={false} rowKey="node" dataSource={nodes.map((node, index) => ({ node, plan: index === 0 ? '2024-06-18' : '2024-08-' + String(20 + index).padStart(2, '0'), actual: index < 2 ? '2024-06-' + String(18 + index * 4).padStart(2, '0') : '—', owner: index < 3 ? '李强（供应商）' : '张明（采购）', status: index === 1 ? '逾期 2 天' : index === 2 ? '即将超期' : index < 1 ? '已完成' : '待开始' }))} columns={[{ title: '节点名称', dataIndex: 'node' }, { title: '计划日期', dataIndex: 'plan' }, { title: '实际日期', dataIndex: 'actual' }, { title: '责任人', dataIndex: 'owner' }, { title: '状态', dataIndex: 'status', render: (value) => <StatusPill tone={value === '已完成' ? 'green' : value === '逾期 2 天' ? 'red' : value === '即将超期' ? 'orange' : 'gray'}>{value}</StatusPill> }, { title: '操作', render: (_, record) => <Button type={record.status === '即将超期' ? 'primary' : 'link'} onClick={() => record.status === '即将超期' && onOpenModal('warning')}>{record.status === '即将超期' ? '处理预警' : '查看详情'}</Button> }]} /></Panel></>;
}

function DescriptionsList({ items }: { items: Array<[string, string]> }) { return <div className="descriptions-list">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>; }

function RecordsPage({ onOpenModal, onCompleteStage }: { onOpenModal: (key: ModalKey) => void; onCompleteStage?: () => boolean }) {
  const archiveProcess = () => {
    if (onCompleteStage && !onCompleteStage()) return;
    message.success('全过程记录已归档，项目复盘阶段已完成');
  };
  const [filter, setFilter] = useState('全部');
  return <><PageTitle breadcrumb={['项目管理', '项目详情', '全过程记录']} title="全过程记录" subtitle="2024年度办公设备集中采购 · PRJ-2024-012 · 全流程可追溯" actions={<><Button icon={<DownloadOutlined />}>导出记录</Button><Button type="primary" icon={<FileDoneOutlined />} onClick={archiveProcess}>生成过程归档并完成复盘</Button></>} /><Panel className="record-summary"><Space size="large"><span><ClockCircleOutlined /> 项目周期 102 天</span><span><UserOutlined /> 参与人员 6 人</span><span><FileTextOutlined /> 产生文件 14 份</span><span><ThunderboltFilled /> AI 参与 2 次</span></Space><Space>{['全部', '我的操作', 'AI 记录', '预警'].map((item) => <Button type={filter === item ? 'primary' : 'default'} key={item} onClick={() => setFilter(item)}>{item}</Button>)}</Space></Panel><Panel className="record-timeline">{recordItems.filter((item) => filter === '全部' || (filter === 'AI 记录' && item.tone === 'purple') || (filter === '预警' && item.tone === 'orange') || filter === '我的操作').map((item) => <div className={`record-item ${item.tone}`} key={item.title}><div className="record-marker">{item.tone === 'green' ? <CheckCircleFilled /> : item.tone === 'purple' ? <ThunderboltFilled /> : item.tone === 'orange' ? <WarningFilled /> : <PlusOutlined />}</div><div className="record-content"><div className="record-head"><h3>{item.title} <StatusPill tone={item.tone as any}>{item.type}</StatusPill></h3><span>{item.user} · {item.date}</span></div><p>{item.detail}</p><Space><Button size="small" icon={<EyeOutlined />}>查看详情</Button><Button size="small" icon={<FileTextOutlined />}>查看文件</Button><Button size="small" disabled={item.tone !== 'purple'} icon={<ThunderboltFilled />} onClick={() => item.tone === 'purple' && onOpenModal('ai-record')}>查看 AI 记录</Button>{item.title === '验收完成' && <Button size="small" type="link" onClick={() => onOpenModal('version')}>查看前后版本</Button>}</Space></div></div>)}</Panel></>;
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
  return <><PageTitle breadcrumb={['合同管理', '履约管理', '现场验收']} title="现场验收" subtitle="HT-2024-0126 · 设备到货验收 · PC 端办理" actions={<><Button icon={<ArrowLeftOutlined />} onClick={() => go('/procurement/contracts/fulfillment')}>返回履约管理</Button><Button type="primary" icon={<SendOutlined />} onClick={submitAcceptance}>提交验收</Button></>} /><Row gutter={[16, 16]}><Col xs={24} lg={17}><Panel title="验收明细"><Row gutter={[16, 16]}><Col span={12}><label className="field-label">到货数量 *</label><Input size="large" suffix="台 / 应到 120 台" defaultValue="120" /></Col><Col span={12}><label className="field-label">外观检查</label><Radio.Group defaultValue="ok" optionType="button" buttonStyle="solid" options={[{ value: 'ok', label: '合格' }, { value: 'not', label: '不合格' }]} /></Col><Col span={12}><label className="field-label">开机测试</label><Input size="large" suffix={<StatusPill tone="green">通过</StatusPill>} defaultValue="抽检 20 台，全部正常启动" /></Col><Col span={12}><label className="field-label">续航测试</label><Input size="large" suffix={<StatusPill tone="green">达标 ≥12h</StatusPill>} defaultValue="实测 12.5 小时" /></Col><Col span={12}><label className="field-label">防护等级</label><Input size="large" suffix={<StatusPill tone="green">通过</StatusPill>} defaultValue="IP67 浸水与防尘测试" /></Col><Col span={12}><label className="field-label">API 接口测试</label><Input size="large" suffix={<StatusPill tone="green">通过</StatusPill>} defaultValue="与巡检系统对接联调" /></Col></Row></Panel><Panel title="影像与报告"><div className="photo-grid"><div className="photo-placeholder">现场照片 1<br />厂区外观</div><div className="photo-placeholder">现场照片 2<br />设备配件</div><div className="photo-placeholder">现场照片 3<br />安装环境</div></div><div className="uploaded-report"><FileTextOutlined /><div><strong>出厂检测报告.pdf</strong><span>1.2 MB · 已上传</span></div><EyeOutlined /></div></Panel><Panel title="验收结论"><Radio.Group className="conclusion-options" defaultValue="pass"><Radio value="pass"><strong>合格</strong><span>各项指标符合合同与技术要求</span></Radio><Radio value="conditional"><strong>有条件合格</strong><span>需限期整改后方可确认</span></Radio><Radio value="fail"><strong>不合格</strong><span>需退回或重新交付</span></Radio></Radio.Group><Input.TextArea rows={4} defaultValue="到货数量与合同一致，外观与功能测试均通过，续航实测 12.5 小时优于要求；建议通过验收并进入安装调试阶段。" /></Panel></Col><Col xs={24} lg={7}><Panel title="验收任务"><div className="acceptance-info"><div><span>项目</span><strong>2024年度办公设备集中采购</strong></div><div><span>供应商</span><strong>华科智能设备有限公司</strong></div><div><span>计划日期</span><strong>2024-08-18</strong></div><div><span>验收人</span><strong>刘敏、王强</strong></div></div><Alert type="info" showIcon message="提交后将自动生成验收报告草稿，并同步生成供应商履约评价任务。" /></Panel><Panel title="操作"><Button block icon={<CameraIcon />}>拍照</Button><Button block icon={<PaperClipOutlined />}>上传附件</Button><Button block type="primary" icon={<SendOutlined />} onClick={submitAcceptance}>提交验收</Button></Panel></Col></Row></>;
}

function CameraIcon() { return <GlobalOutlined />; }

function AcceptanceResult() { return <><PageTitle title="验收提交结果" subtitle="系统已自动生成 2 份材料，可继续补充完善" actions={<Button type="primary" onClick={() => go('/procurement/projects/detail')}>返回项目流程</Button>} /><div className="result-hero"><div className="result-icon"><CheckOutlined /></div><h1>验收提交成功</h1><p>系统已自动生成 2 份材料，可继续补充完善</p></div><Row gutter={[16, 16]}><Col xs={24} md={12}><Panel title="自动生成内容"><ResultFile icon={<FileTextOutlined />} title="验收报告草稿" subtitle="设备到货验收报告 · 编号 YS-2024-0126" metrics={['合格', '120 台', '3 张']} action="查看验收报告" onClick={() => go('/procurement/acceptance/report')} /></Panel></Col><Col xs={24} md={12}><Panel title="供应商履约评价"><ResultFile icon={<StarOutlined />} title="供应商履约评价" subtitle="华科智能设备有限公司 · 综合得分 88" metrics={['及时性 90', '产品质量 92', '服务响应 82']} action="查看履约评价" onClick={() => go('/procurement/acceptance/evaluation')} /></Panel></Col></Row></>; }

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
  return <div className="role-workspace"><div className="role-switcher"><div><TeamOutlined /><strong>演示角色切换</strong><span>切换后菜单、按钮、数据范围与操作权限同步变化</span></div><Space>{roleOptions.map((item) => <Button key={item.key} type={item.key === role ? 'primary' : 'default'} icon={<UserOutlined />} onClick={() => setRole(item.key)}>{item.label}</Button>)}</Space></div><PageTitle title={config.title} subtitle={<>{config.subtitle} <StatusPill tone="purple">当前角色：{current.label}</StatusPill></>} actions={<><Button icon={<PlusOutlined />} onClick={() => role === 'procurement' && go('/procurement/requirements')}>{role === 'procurement' ? '新建需求' : role === 'reviewer' ? '审核规则' : role === 'manager' ? '导出报表' : '扫码验收'}</Button><Button type="primary" onClick={() => role === 'procurement' ? go('/procurement') : role === 'acceptance' ? go('/procurement/acceptance') : message.info('已打开角色工作列表')}>{role === 'procurement' ? '新建采购项目' : role === 'reviewer' ? '批量审核' : role === 'manager' ? '查看全部项目' : '现场验收'}</Button></>} /><div className="role-permission-row">{config.permissions.map((item) => <span className={item.startsWith('不可') || item.startsWith('不参与') ? 'disabled' : ''} key={item}>{item.startsWith('不可') || item.startsWith('不参与') ? <CloseCircleFilled /> : <CheckCircleFilled />}{item}</span>)}</div><Row gutter={[16, 16]} className="metric-grid">{config.metrics.map(([value, label, badge, accent]) => <Col xs={24} sm={12} xl={6} key={label}><MetricCard icon={accent === 'red' ? <WarningFilled /> : accent === 'green' ? <CheckCircleFilled /> : accent === 'orange' ? <ClockCircleOutlined /> : <ProjectOutlined />} value={value} label={label} accent={accent} badge={badge || undefined} /></Col>)}</Row>{role === 'manager' ? <ManagerRoleContent /> : <RoleTaskContent role={role} />}</div>;
}

function RoleTaskContent({ role }: { role: RoleKey }) {
  const title = role === 'reviewer' ? '待我审核（5）' : role === 'acceptance' ? '我的待验收任务（4）' : '我负责的待办';
  const items = role === 'reviewer' ? ['采购文件审核 · 2024年度办公设备集中采购', '风险核查结论复核 · 候选供应商联合核查', '合同条款审核 · HT-2024-0126'] : role === 'acceptance' ? ['设备到货验收 · 2024年度办公设备集中采购', '安装调试验收 · 数据中心服务器扩容项目', '质量问题复验 · 厂区绿化养护服务采购'] : ['拟制「2024年度办公设备集中采购」需求说明', '处理「设备到货」履约预警（即将超期）', '从模板生成「厂区绿化养护服务」采购文件'];
  return <><Panel title={<><AuditOutlined /> {title}</>} extra={<Button type="link">查看全部</Button>}><div className="role-task-list">{items.map((item, index) => <div key={item}><div className={`role-task-icon ${index === 1 ? 'orange' : index === 2 ? 'purple' : 'blue'}`}>{role === 'reviewer' ? <FileSearchOutlined /> : role === 'acceptance' ? <SafetyCertificateOutlined /> : <FormOutlined />}</div><div><strong>{item}</strong><span>{role === 'reviewer' ? `提交人 张明 · 提交于 2024-06-${9 + index * 4} 09:30` : role === 'acceptance' ? `华科智能设备有限公司 · 计划 2024-08-${18 + index * 7}` : `PRJ-2024-0${12 + index * 6} · 截止 2024-05-${25 + index}`}</span></div><Button type={index === 1 ? 'primary' : 'default'} onClick={() => role === 'acceptance' ? go('/procurement/acceptance') : role === 'reviewer' ? message.info('已打开审核办理') : go('/procurement/requirements')}>去处理</Button></div>)}</div></Panel><Row gutter={[16, 16]}><Col xs={24} md={12}><Panel title="工作提醒"><div className="role-reminder-list"><p><BellOutlined /> 今日有 3 项任务即将到期</p><p><SafetyCertificateOutlined /> 所有操作均会自动记录到全过程档案</p><p><InfoCircleOutlined /> 可通过顶部角色按钮切换演示权限视图</p></div></Panel></Col><Col xs={24} md={12}><Panel title="最近操作"><div className="role-reminder-list"><p><CheckCircleFilled /> 已完成 2 项流程节点</p><p><HistoryOutlined /> 上次操作：确认采购方式为公开招标</p><p><FileDoneOutlined /> 当前项目整体进度 65%</p></div></Panel></Col></Row></>;
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

function ProcurementModal({ modal, onClose, onUploaded, onProjectCreated }: { modal: ModalKey; onClose: () => void; onUploaded?: () => void; onProjectCreated?: () => void }) {
  const [form] = Form.useForm();
  const [selectedReferences, setSelectedReferences] = useState(['技术参数', '验收方式']);
  const [uploadReady, setUploadReady] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState('');
  if (!modal) return null;
  const close = () => { setUploadReady(false); setIgnoreReason(''); onClose(); };
  if (modal === 'new-project') return <Modal open title={<ModalTitle icon={<PlusOutlined />} title="新建采购项目" subtitle="填写项目基础信息，系统将智能推荐采购方式" />} width={760} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="draft" onClick={() => message.success('草稿已保存')}>保存草稿</Button>, <Button key="recommend" type="primary" icon={<ThunderboltFilled />} onClick={() => { onClose(); setTimeout(() => (window as any).__openProcurementModal?.('recommend'), 0); }}>智能推荐采购方式</Button>]}><Form form={form} layout="vertical" className="modal-form"><h3 className="form-section-title">项目基础信息</h3><Form.Item name="name" label="项目名称" required><Input placeholder="请输入项目名称，如「2024年度办公设备集中采购」" /></Form.Item><Form.Item label="项目类型"><Radio.Group defaultValue="货物" optionType="button" buttonStyle="solid" options={[{ value: '货物', label: '📦 货物' }, { value: '服务', label: '♢ 服务' }, { value: '工程', label: '▣ 工程' }]} /></Form.Item><Row gutter={16}><Col span={12}><Form.Item label="采购品类" required><Select placeholder="请选择采购品类" options={[{ value: '办公设备', label: '办公设备' }, { value: '移动终端设备', label: '移动终端设备' }]} /></Form.Item></Col><Col span={12}><Form.Item label="项目负责人" required><Select placeholder="请选择负责人" options={[{ value: '张明', label: '张明' }, { value: '李静', label: '李静' }]} /></Form.Item></Col><Col span={12}><Form.Item label="需求部门" required><Select placeholder="请选择需求部门" options={[{ value: '行政部', label: '行政部' }, { value: '信息技术部', label: '信息技术部' }]} /></Form.Item></Col><Col span={12}><Form.Item label="资金来源"><Select placeholder="请选择资金来源" options={[{ value: '年度财政预算', label: '年度财政预算' }, { value: '专项资金', label: '专项资金' }]} /></Form.Item></Col><Col span={12}><Form.Item label="采购预算" required><Input prefix="¥" placeholder="请输入预算金额" /></Form.Item></Col><Col span={12}><Form.Item label="采购数量"><Input placeholder="请输入数量（选填）" /></Form.Item></Col><Col span={12}><Form.Item label="计划完成时间" required><DatePicker style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item label="紧急程度"><Radio.Group defaultValue="normal" options={[{ value: 'normal', label: '普通' }, { value: 'urgent', label: '紧急' }, { value: 'critical', label: '特急' }]} /></Form.Item></Col></Row><Form.Item label="采购意向"><Input.TextArea rows={4} placeholder="请描述采购目的、技术要求、期望交付标准等，有助于更精准地推荐采购方式" /></Form.Item><Alert type="info" showIcon message="填写越完整，智能推荐结果越准确" /></Form></Modal>;
  if (modal === 'recommend') return <Modal open title={<ModalTitle icon={<ThunderboltFilled />} title="智能推荐采购方式" subtitle="基于预算 ¥280,000、品类「办公设备」及 36 个历史项目智能分析" />} width={720} centered onCancel={close} footer={[<Button key="basis" icon={<BookOutlined />}>查看依据</Button>, <Button key="modify" onClick={close}>修改采购方式</Button>, <Button key="confirm" type="primary" icon={<CheckOutlined />} onClick={() => { message.success('项目已创建'); onProjectCreated?.(); close(); go('/procurement/projects/detail'); }}>确认创建项目</Button>]}><div className="recommend-result"><div className="recommend-main"><div><StatusPill tone="blue">推荐采购方式</StatusPill><h2>公开招标</h2><p>预算金额 ≥ ¥200,000，达到公开招标法定限额标准</p></div><strong>96<small>%</small><span>推荐匹配度</span></strong></div><h3>💡 推荐理由</h3><ol><li>采购预算 ¥280,000 超过公开招标限额标准 ¥200,000，依法需采用公开招标方式</li><li>「办公设备」品类市场供应充足，具备 8 家以上潜在合格供应商，竞争充分</li><li>同类历史项目 12 个中，10 个采用公开招标，平均节约成本 8.6%</li></ol><div className="recommend-columns"><div><h3>↻ 历史案例</h3>{['2023年度电脑设备采购', '2023年办公家具集中采购', '2022年服务器采购项目'].map((item) => <p key={item}><strong>{item}</strong><StatusPill tone="green">公开招标 · 节约 9.2%</StatusPill></p>)}</div><div><h3>▣ 制度依据</h3><p>《招标投标法实施条例》<br /><span>第八条 · 公共招标限额标准</span></p><p>《集团采购管理办法》<br /><span>第 12 条 · 采购方式选择</span></p></div></div><h3>☷ 其他可选方式</h3>{['竞争性磋商', '询价采购', '单一来源采购'].map((item, index) => <div className="alternative-method" key={item}><Radio checked={false} /> <strong>{item}</strong><span>匹配度 {68 - index * 16}%</span></div>)}</div></Modal>;
  if (modal === 'missing') return <Modal open title={<ModalTitle icon={<WarningFilled />} title="提交失败" subtitle="必备材料不完整，暂时无法提交需求准备，请补充后再提交" />} width={520} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="upload" type="primary" icon={<CloudUploadOutlined />} onClick={() => { onClose(); setTimeout(() => (window as any).__openProcurementModal?.('upload'), 0); }}>立即补充</Button>]}><div className="missing-modal"><Alert type="error" showIcon message="当前缺少 1 项必备材料" /><div className="missing-list"><div><FileProtectOutlined /><strong>项目立项依据</strong><StatusPill tone="red">必备</StatusPill></div></div><div className="other-status"><p><CheckCircleFilled /> 项目立项申请表 <b>已上传</b></p><p><CheckCircleFilled /> 预算审批文件 <b>已上传</b></p><p><LoadingOutlined /> 采购需求说明 <b>待完善（可后补）</b></p></div><p className="muted-text">💡 补充材料后，提交按钮将自动变为可用状态</p></div></Modal>;
  if (modal === 'upload') return <Modal open title={<ModalTitle icon={<CloudUploadOutlined />} title="补充材料" subtitle="上传完成后，材料状态将更新为「已上传」" />} width={620} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="submit" type="primary" icon={<CheckOutlined />} disabled={!uploadReady} onClick={() => { onUploaded?.(); message.success('材料已上传'); close(); }}>确认上传</Button>]}><Form layout="vertical" className="modal-form"><Form.Item label="材料类型" required><Select defaultValue="项目立项依据" options={[{ value: '项目立项依据', label: '项目立项依据 · 必备' }, { value: '其他补充材料', label: '其他补充材料' }]} /></Form.Item><Form.Item label="上传文件" required><Upload.Dragger beforeUpload={() => { setUploadReady(true); return false; }} showUploadList={false}><p className="upload-icon"><UploadOutlined /></p><p>点击上传或拖拽文件到此处</p><span>支持 PDF / Word / Excel / JPG / PNG，单个文件不超过 50 MB</span></Upload.Dragger></Form.Item>{uploadReady && <div className="upload-file-row"><FileTextOutlined /><strong>项目立项依据.pdf</strong><span>1.6 MB · 上传完成</span></div>}<Form.Item label="文件说明"><Input.TextArea rows={3} placeholder="请简要说明本份材料的用途或来源，便于审核人员查阅" /></Form.Item><div className="switch-row"><div><strong>是否设为当前版本</strong><span>开启后，本条材料将替换原有版本作为最新有效版本</span></div><Switch defaultChecked /></div></Form></Modal>;
  if (modal === 'similar') return <Modal open title={<ModalTitle icon={<HistoryOutlined />} title="相似历史案例" subtitle="基于品类「移动终端设备」与预算 ¥480,000 匹配到 3 个高相似案例" />} width={760} centered onCancel={close} footer={null}><div className="similar-filter"><Space><Button type="primary">全部</Button><Button>货物类</Button><Button>近三年</Button></Space><Button type="link">按相似度排序</Button></div>{['2023 年度移动终端设备采购', '厂区巡检设备采购项目', '手持数据采集终端采购'].map((item, index) => <div className="similar-card" key={item}><div className="similar-head"><h3>{item}</h3><StatusPill tone="green">相似度 {92 - index * 7}%</StatusPill></div><div className="similar-metrics"><span>数量<strong>{100 + index * 50} 台</strong></span><span>成交金额<strong>¥{420 - index * 84},000</strong></span><span>单价区间<strong>¥3,500~¥4,200</strong></span></div><p><b>常见技术参数</b><br />续航 ≥ 10 小时 · IP65 · 支持 4G/5G · 6 英寸屏 · 整机 ≤ 350g</p><p><b>验收方法</b><br />到货抽检 10% + 现场功能测试 + 连续使用 3 天稳定性验证</p><div className="modal-actions"><Button icon={<EyeOutlined />}>查看详情</Button><Button type="primary" icon={<LinkOutlined />} onClick={() => { close(); (window as any).__openProcurementModal?.('reference'); }}>引用案例</Button></div></div>)}<Alert type="info" showIcon message="引用案例时可按需选择「技术参数 / 验收方式 / 交付要求 / 商务要求」四类内容" /></Modal>;
  if (modal === 'reference') return <Modal open title={<ModalTitle icon={<LinkOutlined />} title="引用案例内容" subtitle="来源：2023 年度移动终端设备采购 · 相似度 92%" />} width={600} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="confirm" type="primary" onClick={() => { message.success(`已引用 ${selectedReferences.length} 项内容`); close(); }}>确认引用</Button>]}><p>请选择需要引用到当前需求文档的内容（可多选）</p>{['技术参数', '验收方式', '交付要求', '商务要求'].map((item, index) => <div className={`reference-option ${selectedReferences.includes(item) ? 'selected' : ''}`} key={item} onClick={() => setSelectedReferences((items) => items.includes(item) ? items.filter((value) => value !== item) : [...items, item])}><Checkbox checked={selectedReferences.includes(item)} /><div><strong>{item}</strong>{index < 2 && <StatusPill tone="blue">推荐引用</StatusPill>}<span>{index === 0 ? '续航 ≥ 10 小时 · IP65 · 支持 4G/5G · 6 英寸屏 · 整机 ≤ 350g' : index === 1 ? '到货抽检 10% + 现场功能测试 + 连续使用 3 天稳定性验证' : index === 2 ? '合同签订后 45 日内到货，供货方负责运输及上楼搬运' : '质保 3 年 · 验收合格后 30 日内支付 90%'}</span></div></div>)}<Alert type="info" showIcon message="引用后内容将自动写入对应字段，你仍可继续编辑修改；系统会保留引用来源标记便于追溯。" /></Modal>;
  if (modal === 'ignore') return <Modal open title={<ModalTitle icon={<EllipsisOutlined />} title="忽略该问题" subtitle="忽略后需填写人工处理意见，便于留痕审计" />} width={540} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="confirm" type="primary" danger onClick={() => { if (!ignoreReason.trim()) { message.warning('请先填写处理意见'); return; } message.success('问题已标记为人工保留'); close(); }}>确认忽略</Button>]}><div className="ignore-problem"><Alert type="error" message="品牌倾向 · 高风险" description="“要求采用华为、联想等同档次品牌产品”" showIcon /><Form.Item label="人工处理意见" required><Input.TextArea rows={4} value={ignoreReason} onChange={(event) => setIgnoreReason(event.target.value)} placeholder="请说明忽略该问题的原因，例如已与需求部门确认、属于历史沿用配置等" /></Form.Item>{['已与需求部门线下沟通确认，该表述沿用历史配置', '现有系统兼容性要求，经使用部门审批同意保留', '已在采购方式说明中另行说明，本处不重复修改'].map((item) => <Button block type="text" className="suggestion-button" key={item} onClick={() => setIgnoreReason(item)}><PlusOutlined /> {item}</Button>)}<Alert type="warning" showIcon message="忽略后该问题将标记为「人工保留」，不纳入已处理统计，重新检查时仍会提示。" /></div></Modal>;
  if (modal === 'template') return <Modal open title={<ModalTitle icon={<DiffOutlined />} title="从模板生成采购文件" subtitle="系统已根据项目信息自动匹配推荐模板" />} width={620} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="create" type="primary" icon={<DiffOutlined />} onClick={() => { message.success('正在生成采购文件'); close(); }}>生成采购文件</Button>]}><div className="template-detection"><strong>✣ 系统自动识别</strong><div><span>采购类型 <b>▣ 货物</b></span><span>采购方式 <b>♙ 公开招标</b></span></div></div><h3>推荐模板</h3>{['《货物类公开招标标准采购文件》', '《集团通用采购文件模板》'].map((item, index) => <div className={`template-option ${index === 0 ? 'selected' : ''}`} key={item}><Radio checked={index === 0} /><FileTextOutlined /><div><strong>{item}</strong><span>{index === 0 ? '2024 版 · 含 8 个标准章节 · 集团法务审定' : '适用于各类采购方式 · 6 个通用章节'}</span></div>{index === 0 && <StatusPill tone="green">推荐</StatusPill>}</div>)}<h3>自动带入内容 <Checkbox defaultChecked>全选</Checkbox></h3><div className="content-check-grid">{['项目名称', '预算金额', '技术要求', '商务要求', '交付安排', '验收标准'].map((item) => <Checkbox defaultChecked key={item}>{item}</Checkbox>)}</div><Alert type="info" showIcon message="生成后将覆盖当前文档草稿内容，您可随时通过「版本记录」恢复到历史版本。" /></Modal>;
  if (modal === 'add-company') return <Modal open title={<ModalTitle icon={<BankOutlined />} title="添加候选企业" subtitle="录入企业信息并选择核查范围" />} width={600} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="confirm" type="primary" onClick={() => { message.success('候选企业已添加'); close(); }}>确认添加</Button>]}><Form layout="vertical" className="modal-form"><Form.Item label="企业名称" required><Input prefix={<SearchOutlined />} defaultValue="华科智能设备有限公司" /></Form.Item><div className="company-suggestion"><CheckCircleFilled /> <strong>华科智能设备有限公司</strong><span>91440300MA5F8K2X3D</span></div><Row gutter={16}><Col span={12}><Form.Item label="统一社会信用代码"><Input defaultValue="91440300MA5F8K2X3D" /></Form.Item></Col><Col span={12}><Form.Item label="企业类型"><Select defaultValue="有限责任公司" options={[{ value: '有限责任公司', label: '有限责任公司' }, { value: '股份有限公司', label: '股份有限公司' }]} /></Form.Item></Col></Row><Form.Item label="核查范围" required><div className="check-grid">{['企业信息', '信用风险', '经营异常', '司法风险', '关联企业', '关联人员', '供应商关系'].map((item) => <Checkbox defaultChecked key={item}>{item}</Checkbox>)}</div></Form.Item><Alert type="info" showIcon message="进入联合核查时，系统会自动识别候选企业之间的关联关系，无需单独设置。" /></Form></Modal>;
  if (modal === 'risk-node') return <Modal open title={<ModalTitle icon={<UserOutlined />} title="人员节点详情" subtitle="来自企业关系图谱 · 交叉任职线索" />} width={520} centered onCancel={close} footer={[<Button key="report">加入核查报告</Button>, <Button key="close" type="primary" onClick={close}>关闭</Button>]}><div className="person-card"><Avatar size={48}>张</Avatar><div><h3>张伟 <StatusPill tone="orange">交叉任职</StatusPill></h3><span>在两家中标候选企业关联主体中担任职务</span></div></div><DescriptionsList items={[['职位', '董事（华科智能） · 监事（恒远科技）'], ['任职企业', '华科智能设备有限公司、恒远科技有限公司'], ['数据来源', '工商公示信息　第三方关联库（异常）'], ['查询时间', '2024-06-15 10:22:36']]} /><h3>关联路径</h3><div className="path-chips"><span>华科智能设备</span><ArrowRightOutlined /><span>张伟</span><ArrowRightOutlined /><span>恒远科技</span><br /><span>恒远科技</span><ArrowRightOutlined /><span>张伟</span><ArrowRightOutlined /><span>中联数字科技</span></div><Alert type="warning" showIcon message="该节点的关联关系部分来自第三方关联库，当前数据源不可用，结果可能不完整。" /></Modal>;
  if (modal === 'warning') return <Modal open title={<ModalTitle icon={<ToolOutlined />} title="处理履约预警" subtitle="设备到货 · 即将超期 · 计划日期 2024-08-20" />} width={680} centered onCancel={close} footer={[<Button key="cancel" onClick={close}>取消</Button>, <Button key="confirm" type="primary" danger onClick={() => { message.success('预警处理已提交'); close(); }}>确认处理</Button>]}><Form layout="vertical" className="modal-form"><Alert type="warning" message="设备到货 — 即将超期（剩余 3 天）" /><Row gutter={16}><Col span={12}><Form.Item label="当前责任人"><Select defaultValue="李强（供应商）" options={[{ value: '李强（供应商）', label: '李强（供应商）' }, { value: '张明（采购）', label: '张明（采购）' }]} /></Form.Item></Col><Col span={12}><Form.Item label="新计划日期"><DatePicker style={{ width: '100%' }} placeholder="请选择日期" /></Form.Item></Col></Row><Form.Item label="处理方式" required><Radio.Group className="radio-grid" defaultValue="urge" options={[{ value: 'urge', label: '🔔 催办' }, { value: 'reschedule', label: '▣ 调整计划' }, { value: 'upload', label: '☁ 已完成未上传材料' }, { value: 'other', label: '··· 其他' }]} /></Form.Item><Form.Item label="处理说明" required><Input.TextArea rows={4} placeholder="请说明处理措施与后续跟进安排，例如已电话催办供应商、要求其于 3 日内发货并回传物流单号" /></Form.Item><Form.Item label="附件"><Upload><Button icon={<PaperClipOutlined />}>选择文件</Button></Upload></Form.Item><Alert type="info" showIcon message="处理记录将留痕，可在履约台账中查看" /></Form></Modal>;
  if (modal === 'version') return <Modal open title={<ModalTitle icon={<DiffOutlined />} title="查看前后版本" subtitle="采购文件 · V1.2 → V1.3 · 操作人：张明 · 2024-06-05 16:40" />} width={860} centered onCancel={close} footer={[<Button key="download" icon={<DownloadOutlined />}>下载对比</Button>, <Button key="close" onClick={close}>关闭</Button>, <Button key="restore" type="primary" onClick={() => { message.success('已恢复到此版本'); close(); }}>恢复到此版本</Button>]}><div className="version-summary"><span>↔ 共 3 处变更</span><span className="green-text">● 新增 1</span><span className="orange-text">● 修改 2</span><span className="red-text">● 删除 0</span></div><div className="version-grid"><div><h3>V1.2（修改前）</h3><div className="version-change red"><strong>新增　第四章 评分标准</strong><p>（本章节缺失，无内容）</p></div><div className="version-change orange"><strong>修改　技术要求·品牌表述</strong><p>要求采用华为、联想等同档次品牌产品</p></div><div className="version-change orange"><strong>修改　第四章 验收要求·续航检测项</strong><p>全数设备进行开机功能测试</p></div></div><div><h3>V1.3（修改后）</h3><div className="version-change green"><strong>技术分 60 分、商务分 20 分、价格分 20 分</strong><p>技术分含续航、防护等级、接口兼容性等指标。</p></div><div className="version-change green"><strong>采用同等性能的通用配置，需提供第三方检测报告佐证指标</strong></div><div className="version-change green"><strong>全数开机功能测试，并补充续航实测（抽检 5 台，连续巡检模式不少于 12 小时）</strong></div></div></div><Alert type="info" showIcon message="版本记录支持回溯查看与一键恢复，恢复操作将生成新的版本记录并保留完整历史。" /></Modal>;
  return <Modal open title={<ModalTitle icon={<ThunderboltFilled />} title="查看 AI 记录" subtitle="2024-05-18 10:12 · 模型：智采云需求合规检查 v2.3 · 耗时 2.3 秒" />} width={680} centered onCancel={close} footer={[<Button key="export" icon={<DownloadOutlined />}>导出 AI 记录</Button>, <Button key="close" type="primary" onClick={close}>关闭</Button>]}><div className="ai-stats"><MetricCard icon={<WarningFilled />} value="2" label="高风险" accent="red" /><MetricCard icon={<WarningFilled />} value="2" label="中风险" accent="orange" /><MetricCard icon={<CheckCircleFilled />} value="3" label="已处理" accent="green" /><MetricCard icon={<EllipsisOutlined />} value="1" label="人工保留" accent="purple" /></div><div className="ai-output"><strong>🤖 AI 原始输出摘要</strong><p>已比对 12 项制度与 36 个历史项目。检出 4 项 altos 风险：①品牌倾向性表述 ②供应商业绩门槛显著高于项目规模 ③技术要求与验收标准不一致 ④缺少安装调试完成时间节点。建议优先处理高风险项。</p></div><h3>☷ 处理明细</h3>{auditProblems.map((item, index) => <div className={`ai-record-row ${index === 3 ? 'retained' : 'handled'}`} key={item.title}><CheckCircleFilled /> <strong>{item.title}</strong><StatusPill tone={index === 3 ? 'orange' : 'green'}>{index === 3 ? '人工保留' : index === 1 ? '人工修改' : '采纳建议'}</StatusPill><span>张明 10:{48 + index}</span></div>)}<div className="manual-opinion"><strong>人工处理意见（第 4 项）</strong><p>安装调试时间已在使用部门需求确认单中明确（到货后 10 个工作日内），本处维持原表述，提交时随附件一并说明。</p></div></Modal>;
}

function ModalTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) { return <div className="modal-title"><div className="modal-title-icon">{icon}</div><div><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</div></div>; }

function ProcurementPortal() {
  const location = useLocation();
  const [modal, setModal] = useState<ModalKey>(null);
  const [workflow, setWorkflow] = useState<ProjectWorkflow>({ currentStage: 2, completedStages: [0, 1], materialsReady: false });
  const startNewProject = () => {
    setWorkflow({ currentStage: 0, completedStages: [], materialsReady: false });
  };
  const markMaterialsReady = () => {
    setWorkflow((current) => ({ ...current, materialsReady: true }));
  };
  const completeStage = (stageIndex = workflow.currentStage) => {
    if (stageIndex !== workflow.currentStage) {
      message.info(`请先完成“${workflowStages[workflow.currentStage].title}”`);
      return false;
    }
    if (stageIndex === 2 && !workflow.materialsReady) {
      message.warning('请先补充项目立项依据，再提交文件形成阶段');
      return false;
    }
    setWorkflow((current) => ({
      ...current,
      completedStages: current.completedStages.includes(stageIndex) ? current.completedStages : [...current.completedStages, stageIndex],
      currentStage: Math.min(stageIndex + 1, workflowStages.length - 1),
    }));
    message.success(stageIndex === workflowStages.length - 1 ? '项目流程已全部完成' : `${workflowStages[stageIndex].title}已完成，已进入${workflowStages[stageIndex + 1].title}`);
    return true;
  };
  const workflowContextValue = { workflow, markMaterialsReady, completeStage };
  useEffect(() => {
    document.body.classList.add('procurement-mode');
    (window as any).__openProcurementModal = setModal;
    return () => { document.body.classList.remove('procurement-mode'); delete (window as any).__openProcurementModal; };
  }, []);
  const view = location.pathname;
  const acceptanceView = view.endsWith('/result') ? 'result' : view.endsWith('/report') ? 'report' : view.endsWith('/evaluation') ? 'evaluation' : 'form';
  const showProjectFlowBar = ['/procurement/requirements', '/procurement/documents', '/procurement/suppliers', '/procurement/suppliers/risk', '/procurement/contracts', '/procurement/contracts/fulfillment', '/procurement/acceptance', '/procurement/acceptance/result', '/procurement/acceptance/report', '/procurement/acceptance/evaluation', '/procurement/records'].includes(view);
  const content = view === '/platform-overview' ? <PlatformOverviewPage />
    : view === '/platform-models' ? <ModelServicesPage />
    : view === '/procurement' || view === '/procurement/' ? <Workbench onOpenModal={setModal} />
    : view === '/procurement/projects' ? <ProjectsPage onOpenModal={setModal} />
      : view === '/procurement/projects/detail' ? <ProjectDetail onOpenModal={setModal} />
        : view === '/procurement/requirements' ? <RequirementPage onOpenModal={setModal} onCompleteStage={() => completeStage(1)} />
          : view === '/procurement/documents' ? <DocumentsPage onOpenModal={setModal} onCompleteStage={() => completeStage(2)} />
            : view === '/procurement/contracts' ? <ContractsPage onCompleteStage={() => completeStage(4)} />
              : view === '/procurement/contracts/fulfillment' ? <ContractsFulfillmentPage onOpenModal={setModal} />
                : view === '/procurement/suppliers/risk' ? <SupplierRiskPage onOpenModal={setModal} />
                  : view === '/procurement/suppliers' ? <SuppliersPage onOpenModal={setModal} onCompleteStage={() => completeStage(3)} />
                    : view.startsWith('/procurement/acceptance') ? <AcceptancePage view={acceptanceView as any} onOpenModal={setModal} onCompleteStage={() => completeStage(5)} />
                      : view === '/procurement/records' ? <RecordsPage onOpenModal={setModal} onCompleteStage={() => completeStage(6)} />
                        : view === '/procurement/roles' ? <RolesPage />
                          : <ReportsPage />;
  return <ProjectWorkflowContext.Provider value={workflowContextValue}><div className="procurement-page">{showProjectFlowBar && <ProjectFlowBar />}{content}<ProcurementModal modal={modal} onClose={() => setModal(null)} onUploaded={markMaterialsReady} onProjectCreated={startNewProject} /></div></ProjectWorkflowContext.Provider>;
}

export default ProcurementPortal;
