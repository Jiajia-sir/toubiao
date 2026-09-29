import React, { useMemo, useState } from 'react';
import { history } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  message,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MessageOutlined,
  PlusOutlined,
  RobotOutlined,
  RocketOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import './index.less';

type AgentStatus = 'published' | 'draft';

type Agent = {
  id: string;
  name: string;
  role: string;
  model: string;
  knowledge: string[];
  skills: number;
  status: AgentStatus;
  conversations: number;
  updatedAt: string;
  desc: string;
};

type AgentFormValues = {
  name: string;
  role: string;
  model: string;
  desc?: string;
  prompt?: string;
  knowledge?: string[];
  skills?: string;
  memory?: string;
  permission?: string;
};

const MODEL_OPTIONS = [
  { label: '通义千问', value: '通义千问' },
  { label: 'GPT-4 Turbo', value: 'GPT-4 Turbo' },
  { label: 'Claude 3.5 Sonnet', value: 'Claude 3.5 Sonnet' },
  { label: '本地 Llama 3', value: '本地 Llama 3' },
];

const KNOWLEDGE_OPTIONS = [
  { label: '政务办事指南知识库', value: '政务办事指南知识库' },
  { label: '企业法规政策库', value: '企业法规政策库' },
  { label: '合同模板与条款库', value: '合同模板与条款库' },
  { label: '客户服务知识库', value: '客户服务知识库' },
  { label: '行业分析报告库', value: '行业分析报告库' },
  { label: '技术文档知识库', value: '技术文档知识库' },
];

const INITIAL_AGENTS: Agent[] = [
  {
    id: 'AG001',
    name: '政务问答智能体',
    role: '政务服务助手',
    model: '通义千问',
    knowledge: ['政务办事指南知识库', '企业法规政策库'],
    skills: 5,
    status: 'published',
    conversations: 12456,
    updatedAt: '2026-09-14 09:12',
    desc: '为群众提供政务咨询和办事引导。',
  },
  {
    id: 'AG002',
    name: '客户服务智能体',
    role: '客服助手',
    model: 'GPT-4 Turbo',
    knowledge: ['客户服务知识库'],
    skills: 8,
    status: 'published',
    conversations: 23456,
    updatedAt: '2026-09-13 16:00',
    desc: '智能客服问答和工单处理。',
  },
  {
    id: 'AG003',
    name: '数据分析智能体',
    role: '数据分析师',
    model: 'Claude 3.5 Sonnet',
    knowledge: ['行业分析报告库'],
    skills: 12,
    status: 'draft',
    conversations: 890,
    updatedAt: '2026-09-12 14:00',
    desc: '辅助完成数据分析、指标解读和报告生成。',
  },
  {
    id: 'AG004',
    name: '风险预警智能体',
    role: '风控助手',
    model: '通义千问',
    knowledge: ['企业法规政策库'],
    skills: 6,
    status: 'published',
    conversations: 3456,
    updatedAt: '2026-09-11 10:00',
    desc: '识别企业经营风险并提供预警依据。',
  },
  {
    id: 'AG005',
    name: '代码生成智能体',
    role: '开发助手',
    model: '本地 Llama 3',
    knowledge: ['技术文档知识库'],
    skills: 10,
    status: 'draft',
    conversations: 567,
    updatedAt: '2026-09-10 16:00',
    desc: '辅助代码编写、接口联调和技术问题解答。',
  },
  {
    id: 'AG006',
    name: '合同审查智能体',
    role: '合同风险审查助手',
    model: 'Claude 3.5 Sonnet',
    knowledge: ['合同模板与条款库', '企业法规政策库'],
    skills: 9,
    status: 'published',
    conversations: 1680,
    updatedAt: '2026-09-14 11:20',
    desc: '解析合同条款，识别履约、合规与风险事项，生成审查意见。',
  },
];

const EMPTY_FORM: AgentFormValues = {
  name: '',
  role: '',
  model: MODEL_OPTIONS[0].value,
  desc: '',
  prompt: '',
  knowledge: [],
  skills: '',
  memory: '启用对话记忆',
  permission: '所有用户',
};

function formatTime() {
  return new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(/\//g, '-');
}

function nextAgentId(items: Agent[]) {
  const maxId = items.reduce((max, item) => Math.max(max, Number(item.id.replace('AG', '')) || 0), 0);
  return `AG${String(maxId + 1).padStart(3, '0')}`;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form] = Form.useForm<AgentFormValues>();

  const publishedCount = useMemo(() => agents.filter((agent) => agent.status === 'published').length, [agents]);
  const totalConversations = useMemo(
    () => agents.reduce((total, agent) => total + agent.conversations, 0),
    [agents],
  );

  const openCreate = () => {
    setEditingAgent(null);
    form.setFieldsValue(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent);
    form.setFieldsValue({
      name: agent.name,
      role: agent.role,
      model: agent.model,
      desc: agent.desc,
      prompt: '',
      knowledge: agent.knowledge,
      skills: '',
      memory: '启用对话记忆',
      permission: '所有用户',
    });
    setModalOpen(true);
  };

  const openView = (agent: Agent) => {
    history.push(`/ai-agent/workflow?agentId=${encodeURIComponent(agent.id)}&agentName=${encodeURIComponent(agent.name)}`);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAgent(null);
    form.resetFields();
  };

  const handleSave = (values: AgentFormValues) => {
    const now = formatTime();
    const selectedKnowledge = values.knowledge || [];
    const skillCount = values.skills
      ? values.skills.split(/[,，\s]+/).filter(Boolean).length
      : 0;

    if (editingAgent) {
      setAgents((current) => current.map((agent) => agent.id === editingAgent.id ? {
        ...agent,
        name: values.name.trim(),
        role: values.role.trim(),
        model: values.model,
        desc: values.desc?.trim() || agent.desc,
        knowledge: selectedKnowledge.length ? selectedKnowledge : agent.knowledge,
        skills: skillCount || agent.skills,
        updatedAt: now,
      } : agent));
      message.success('智能体配置已更新');
    } else {
      setAgents((current) => [...current, {
        id: nextAgentId(current),
        name: values.name.trim(),
        role: values.role.trim(),
        model: values.model,
        desc: values.desc?.trim() || '待完善智能体描述',
        knowledge: selectedKnowledge.length ? selectedKnowledge : ['客户服务知识库'],
        skills: skillCount,
        status: 'draft',
        conversations: 0,
        updatedAt: now,
      }]);
      message.success('智能体创建成功，当前为草稿状态');
    }
    closeModal();
  };

  const copyAgent = (agent: Agent) => {
    setAgents((current) => [...current, {
      ...agent,
      id: nextAgentId(current),
      name: `${agent.name}（副本）`,
      status: 'draft',
      conversations: 0,
      updatedAt: formatTime(),
    }]);
    message.success(`已复制「${agent.name}」`);
  };

  const publishAgent = (id: string) => {
    setAgents((current) => current.map((agent) => agent.id === id ? {
      ...agent,
      status: 'published',
      updatedAt: formatTime(),
    } : agent));
    message.success('智能体已发布');
  };

  const removeAgent = (id: string) => {
    setAgents((current) => current.filter((agent) => agent.id !== id));
    message.success('智能体已删除');
  };

  return (
    <PageContainer ghost pageHeaderRender={false} className="ai-agent-page-container">
      <div className="ai-agent-page">
        <div className="ai-agent-page-header">
          <div>
            <div className="ai-agent-eyebrow"><RobotOutlined /> AI 智能体空间</div>
            <h1>智能体管理</h1>
            <p>创建和管理 AI 智能体，配置模型、知识库、工具和权限</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>创建智能体</Button>
        </div>

        <Row gutter={[16, 16]} className="ai-agent-stat-row">
          <Col xs={24} sm={12} xl={6}><Card className="ai-agent-stat-card"><Statistic title="智能体总数" value={agents.length} prefix={<RobotOutlined />} suffix="个" /></Card></Col>
          <Col xs={24} sm={12} xl={6}><Card className="ai-agent-stat-card stat-green"><Statistic title="已发布" value={publishedCount} prefix={<RocketOutlined />} suffix="个" /></Card></Col>
          <Col xs={24} sm={12} xl={6}><Card className="ai-agent-stat-card stat-orange"><Statistic title="草稿" value={agents.length - publishedCount} prefix={<SettingOutlined />} suffix="个" /></Card></Col>
          <Col xs={24} sm={12} xl={6}><Card className="ai-agent-stat-card stat-purple"><Statistic title="累计对话" value={totalConversations} prefix={<MessageOutlined />} /></Card></Col>
        </Row>

        {agents.length === 0 ? (
          <Card><Empty description="暂无智能体" /></Card>
        ) : (
          <Row gutter={[16, 16]}>
            {agents.map((agent) => (
              <Col key={agent.id} xs={24} md={12} xl={8}>
                <Card className="agent-card" bordered>
                  <div className="agent-card-topline">
                    <Space align="start" size={12}>
                      <Avatar className="agent-avatar" icon={<RobotOutlined />} />
                      <div>
                        <div className="agent-name">{agent.name}</div>
                        <div className="agent-role">{agent.role}</div>
                      </div>
                    </Space>
                    <Tag color={agent.status === 'published' ? 'success' : 'default'}>
                      {agent.status === 'published' ? '已发布' : '草稿'}
                    </Tag>
                  </div>
                  <p className="agent-description">{agent.desc}</p>
                  <div className="agent-facts">
                    <div><span>模型</span><Tag color="blue">{agent.model}</Tag></div>
                    <div><span>知识库</span><div className="agent-tags">{agent.knowledge.map((knowledge) => <Tag key={knowledge}>{knowledge}</Tag>)}</div></div>
                    <div><span>工具数</span><strong>{agent.skills} 个</strong></div>
                    <div><span>对话数</span><strong>{agent.conversations.toLocaleString()}</strong></div>
                  </div>
                  <div className="agent-card-footer">
                    <span>更新于 {agent.updatedAt}</span>
                    <Space size={2}>
                      <Button type="link" size="small" icon={<EyeOutlined />} title="查看已编排工作流" onClick={() => openView(agent)}>查看工作流</Button>
                      <Button type="text" size="small" icon={<EditOutlined />} title="编辑" onClick={() => openEdit(agent)} />
                      <Button type="text" size="small" icon={<CopyOutlined />} title="复制" onClick={() => copyAgent(agent)} />
                      {agent.status === 'draft' && <Button type="text" size="small" className="agent-publish-button" icon={<RocketOutlined />} title="发布" onClick={() => publishAgent(agent.id)} />}
                      <Popconfirm title="确定删除这个智能体吗？" description="删除后不可恢复。" okText="删除" cancelText="取消" onConfirm={() => removeAgent(agent.id)}>
                        <Button danger type="text" size="small" icon={<DeleteOutlined />} title="删除" />
                      </Popconfirm>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <Modal
          title={editingAgent ? '编辑智能体' : '创建智能体'}
          open={modalOpen}
          onCancel={closeModal}
          footer={null}
          width={720}
          destroyOnClose
        >
          <Form form={form} layout="vertical" initialValues={EMPTY_FORM} onFinish={handleSave} className="agent-form">
            <Row gutter={16}>
              <Col span={12}><Form.Item label="智能体名称" name="name" rules={[{ required: true, message: '请输入智能体名称' }]}><Input placeholder="如：政务问答智能体" /></Form.Item></Col>
              <Col span={12}><Form.Item label="角色" name="role" rules={[{ required: true, message: '请输入智能体角色' }]}><Input placeholder="如：政务服务助手" /></Form.Item></Col>
            </Row>
            <Form.Item label="描述" name="desc"><Input.TextArea rows={2} placeholder="描述智能体的用途和服务范围" /></Form.Item>
            <Form.Item label="模型" name="model"><Select options={MODEL_OPTIONS} /></Form.Item>
            <Form.Item label="系统提示词" name="prompt"><Input.TextArea rows={4} className="agent-prompt-input" placeholder="你是一个专业的政务服务助手，请用准确、清晰的方式回答用户问题……" /></Form.Item>
            <Form.Item label="关联知识库" name="knowledge"><Checkbox.Group options={KNOWLEDGE_OPTIONS} className="agent-knowledge-options" /></Form.Item>
            <Form.Item label="工具 / Skills" name="skills" extra="可输入多个工具名称，用逗号或空格分隔。"><Input placeholder="如：知识检索，网页搜索，文件读取" /></Form.Item>
            <Row gutter={16}>
              <Col span={12}><Form.Item label="记忆" name="memory"><Select options={[{ label: '启用对话记忆', value: '启用对话记忆' }, { label: '无记忆', value: '无记忆' }, { label: '滑动窗口记忆', value: '滑动窗口记忆' }]} /></Form.Item></Col>
              <Col span={12}><Form.Item label="权限" name="permission"><Select options={[{ label: '所有用户', value: '所有用户' }, { label: '认证用户', value: '认证用户' }, { label: '指定角色', value: '指定角色' }]} /></Form.Item></Col>
            </Row>
            <div className="agent-form-footer">
              <Button onClick={closeModal}>取消</Button>
              <Button type="primary" htmlType="submit">{editingAgent ? '保存修改' : '创建'}</Button>
            </div>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
}
