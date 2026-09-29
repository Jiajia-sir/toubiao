import React, { useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  ToolOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import './index.less';

type Skill = {
  id: string;
  name: string;
  source: string;
  desc: string;
  authorized: boolean;
  calls: number;
  config: string;
  topic?: string;
  jsonConfig?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
};

type AuditLog = {
  id: number;
  skill: string;
  time: string;
  caller: string;
  detail: string;
  status: 'success' | 'failed';
};

type SkillFormValues = {
  topic: string;
  command: string;
  argsText?: string;
  envText?: string;
};

const INITIAL_SKILLS: Skill[] = [
  { id: 'SK001', name: 'Web 搜索', source: 'MCP Server', desc: '联网搜索获取最新信息', authorized: true, calls: 4567, config: '已配置 API 密钥' },
  { id: 'SK002', name: '数据库查询', source: '内置工具', desc: '查询业务数据库获取数据', authorized: true, calls: 8901, config: '已配置数据源' },
  { id: 'SK003', name: '文件读取', source: '内置工具', desc: '读取上传的文件内容', authorized: true, calls: 2345, config: '默认配置' },
  { id: 'SK004', name: '邮件发送', source: 'MCP Server', desc: '通过 SMTP 发送邮件', authorized: false, calls: 0, config: '未配置 SMTP' },
  { id: 'SK005', name: '图表生成', source: '内置工具', desc: '生成数据可视化图表', authorized: true, calls: 1234, config: '已配置图表服务' },
  { id: 'SK006', name: '天气查询', source: '外部 API', desc: '查询指定城市天气', authorized: true, calls: 678, config: '已配置 API 密钥' },
  { id: 'SK007', name: '知识检索', source: '内置工具', desc: '从知识库检索相关内容', authorized: true, calls: 12345, config: '已关联知识库' },
  { id: 'SK008', name: '代码执行', source: '沙箱环境', desc: '在沙箱中执行 Python 代码', authorized: false, calls: 0, config: '未启用沙箱' },
];

const AUDIT_LOGS: AuditLog[] = [
  { id: 1, skill: 'Web 搜索', time: '2026-09-14 09:23', caller: '政务问答智能体', detail: '搜索“2026 年企业税收优惠政策”', status: 'success' },
  { id: 2, skill: '数据库查询', time: '2026-09-14 08:45', caller: '客户服务智能体', detail: '查询客户信息表，返回 5 条记录', status: 'success' },
  { id: 3, skill: '知识检索', time: '2026-09-14 08:12', caller: '政务问答智能体', detail: '检索知识库，返回 3 条结果', status: 'success' },
  { id: 4, skill: '邮件发送', time: '2026-09-13 16:00', caller: '客户服务智能体', detail: 'SMTP 未配置，调用被拒绝', status: 'failed' },
  { id: 5, skill: '图表生成', time: '2026-09-13 14:30', caller: '数据分析智能体', detail: '生成柱状图，数据来源：销售统计', status: 'success' },
];

function parseArgs(text = '') {
  return text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function parseEnv(text = '') {
  return text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).reduce<Record<string, string>>((result, item) => {
    const separator = item.indexOf('=');
    if (separator > 0) {
      result[item.slice(0, separator).trim()] = item.slice(separator + 1).trim();
    }
    return result;
  }, {});
}

function envToText(env?: Record<string, string>) {
  return env ? Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n') : '';
}

function buildMcpJson(command: string, args: string[], env: Record<string, string>) {
  return JSON.stringify({
    command,
    args,
    ...(Object.keys(env).length ? { env } : {}),
  }, null, 2);
}

const EMPTY_SKILL: SkillFormValues = {
  topic: '',
  command: '',
  argsText: '',
  envText: '',
};

function nextSkillId(items: Skill[]) {
  const maxId = items.reduce((max, item) => Math.max(max, Number(item.id.replace('SK', '')) || 0), 0);
  return `SK${String(maxId + 1).padStart(3, '0')}`;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
  const [activeTab, setActiveTab] = useState('list');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [form] = Form.useForm<SkillFormValues>();

  const authorizedCount = useMemo(() => skills.filter((skill) => skill.authorized).length, [skills]);
  const totalCalls = useMemo(() => skills.reduce((total, skill) => total + skill.calls, 0), [skills]);

  const filteredSkills = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return skills;
    return skills.filter((skill) => `${skill.name} ${skill.source} ${skill.desc}`.toLowerCase().includes(keyword));
  }, [search, skills]);

  const openAdd = () => {
    setEditingSkill(null);
    form.setFieldsValue(EMPTY_SKILL);
    setModalOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    const topic = skill.topic || skill.name;
    form.setFieldsValue({
      ...EMPTY_SKILL,
      topic,
      command: skill.command || '',
      argsText: skill.args?.join('\n') || '',
      envText: envToText(skill.env),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSkill(null);
    form.resetFields();
  };

  const saveSkill = (values: SkillFormValues) => {
    const topic = values.topic.trim();
    const command = values.command.trim();
    const args = parseArgs(values.argsText);
    const env = parseEnv(values.envText);
    const jsonConfig = buildMcpJson(command, args, env);
    const description = `${topic} MCP 服务`;
    if (editingSkill) {
      setSkills((current) => current.map((skill) => skill.id === editingSkill.id ? {
        ...skill,
        name: topic,
        desc: description,
        config: jsonConfig,
        topic,
        jsonConfig,
        command,
        args,
        env,
      } : skill));
      message.success('工具配置已保存');
    } else {
      setSkills((current) => [...current, {
        id: nextSkillId(current),
        name: topic,
        source: 'MCP Server',
        desc: description,
        authorized: false,
        calls: 0,
        config: jsonConfig,
        topic,
        jsonConfig,
        command,
        args,
        env,
      }]);
      message.success('工具添加成功，当前为未授权状态');
    }
    closeModal();
  };

  const authorizeSkill = (skill: Skill) => {
    setSkills((current) => current.map((item) => item.id === skill.id ? {
      ...item,
      authorized: true,
      config: item.source === 'MCP Server' ? '已授权，待配置连接' : item.config,
    } : item));
    message.success(`「${skill.name}」授权成功`);
  };

  const removeSkill = (id: string) => {
    setSkills((current) => current.filter((skill) => skill.id !== id));
    message.success('工具已删除');
  };

  const columns: ColumnsType<Skill> = [
    {
      title: '工具名称',
      dataIndex: 'name',
      key: 'name',
      width: 190,
      render: (name: string) => <Space><span className="skill-icon"><ToolOutlined /></span><strong>{name}</strong></Space>,
    },
    { title: '来源', dataIndex: 'source', key: 'source', width: 130, render: (source: string) => <Tag>{source}</Tag> },
    { title: '能力描述', dataIndex: 'desc', key: 'desc', ellipsis: true },
    {
      title: '授权状态',
      dataIndex: 'authorized',
      key: 'authorized',
      width: 120,
      render: (authorized: boolean) => authorized
        ? <Tag color="success" icon={<CheckCircleOutlined />}>已授权</Tag>
        : <Tag color="warning" icon={<UnlockOutlined />}>未授权</Tag>,
    },
    { title: '调用次数', dataIndex: 'calls', key: 'calls', width: 110, sorter: (a, b) => a.calls - b.calls, render: (calls: number) => calls.toLocaleString() },
    { title: '配置', dataIndex: 'config', key: 'config', width: 150, ellipsis: true, render: (config: string) => <span className="muted-text">{config}</span> },
    {
      title: '操作',
      key: 'actions',
      width: 145,
      render: (_, skill) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<EditOutlined />} title="配置" onClick={() => openEdit(skill)} />
          {!skill.authorized && <Button type="text" size="small" className="skill-authorize-button" icon={<SafetyCertificateOutlined />} title="授权" onClick={() => authorizeSkill(skill)} />}
          <Popconfirm title="确定删除这个工具吗？" okText="删除" cancelText="取消" onConfirm={() => removeSkill(skill.id)}>
            <Button danger type="text" size="small" icon={<DeleteOutlined />} title="删除" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const auditColumns: ColumnsType<AuditLog> = [
    { title: '工具', dataIndex: 'skill', key: 'skill' },
    { title: '时间', dataIndex: 'time', key: 'time', width: 165, sorter: (a, b) => a.time.localeCompare(b.time) },
    { title: '调用者', dataIndex: 'caller', key: 'caller' },
    { title: '详情', dataIndex: 'detail', key: 'detail', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (status: AuditLog['status']) => <Tag color={status === 'success' ? 'success' : 'error'}>{status === 'success' ? '成功' : '失败'}</Tag> },
  ];

  return (
    <PageContainer ghost pageHeaderRender={false} className="ai-agent-page-container">
      <div className="ai-agent-page">
        <div className="ai-agent-page-header">
          <div>
            <div className="ai-agent-eyebrow"><ToolOutlined /> 工具与服务治理</div>
            <h1>Skills / MCP 管理</h1>
            <p>管理智能体可用的工具和 MCP 服务，支持授权、配置和调用审计</p>
          </div>
          {activeTab === 'list' && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>添加工具</Button>}
        </div>

        <div className="skill-stat-grid">
          <Card className="ai-agent-stat-card"><Statistic title="工具总数" value={skills.length} prefix={<ToolOutlined />} suffix="个" /></Card>
          <Card className="ai-agent-stat-card stat-green"><Statistic title="已授权" value={authorizedCount} prefix={<SafetyCertificateOutlined />} suffix="个" /></Card>
          <Card className="ai-agent-stat-card stat-orange"><Statistic title="待处理授权" value={skills.length - authorizedCount} prefix={<LockOutlined />} suffix="个" /></Card>
          <Card className="ai-agent-stat-card stat-purple"><Statistic title="累计调用" value={totalCalls} prefix={<SettingOutlined />} /></Card>
        </div>

        <Card className="skill-table-card">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[{ key: 'list', label: `工具列表 ${skills.length}` }, { key: 'audit', label: `审计记录 ${AUDIT_LOGS.length}` }]}
            tabBarExtraContent={activeTab === 'list' ? <Input allowClear prefix={<SearchOutlined />} placeholder="搜索工具名称、来源" value={search} onChange={(event) => setSearch(event.target.value)} /> : <Button icon={<SafetyCertificateOutlined />} onClick={() => message.success('审计记录已刷新')}>刷新审计</Button>}
          />
          {activeTab === 'list' ? (
            <Table<Skill> rowKey="id" columns={columns} dataSource={filteredSkills} pagination={{ pageSize: 8, showSizeChanger: false }} />
          ) : (
            <Table<AuditLog> rowKey="id" columns={auditColumns} dataSource={AUDIT_LOGS} pagination={false} />
          )}
        </Card>

        <Modal
          title="MCP 配置向导"
          open={modalOpen}
          onCancel={closeModal}
          footer={null}
          width={672}
          className="mcp-config-modal"
          destroyOnClose
        >
          <Form form={form} layout="vertical" initialValues={EMPTY_SKILL} onFinish={saveSkill} className="mcp-config-form">
            <div className="mcp-config-hint">快速配置 MCP 服务器，自动生成 JSON 配置</div>

            <Form.Item
              label="MCP 主题（唯一）"
              name="topic"
              required
              rules={[
                { required: true, message: '请输入 MCP 主题' },
                {
                  validator: async (_, value: string) => {
                    const topic = value?.trim();
                    const duplicated = skills.some((skill) => (skill.topic || (skill.source === 'MCP Server' ? skill.name : '')) === topic && skill.id !== editingSkill?.id);
                    if (duplicated) throw new Error('MCP 主题已存在，请换一个主题');
                  },
                },
              ]}
            >
              <Input className="mcp-config-input" placeholder="my-mcp-server" />
            </Form.Item>

            <Form.Item label="命令" name="command" required rules={[{ required: true, message: '请输入命令' }]}>
              <Input className="mcp-config-input" placeholder="npx 或 uvx" />
            </Form.Item>

            <Form.Item label="参数" name="argsText">
              <Input.TextArea className="mcp-config-textarea" rows={3} placeholder={'arg1\narg2'} />
            </Form.Item>

            <Form.Item label="环境变量" name="envText">
              <Input.TextArea className="mcp-config-textarea" rows={3} placeholder={'KEY1=value1\nKEY2=value2'} />
            </Form.Item>

            <div className="mcp-config-footer">
              <Button onClick={closeModal}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} className="mcp-apply-button">应用配置</Button>
            </div>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
}
