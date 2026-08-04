'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  addEmbedModelConfig,
  getEmbedModelConfigPage,
  removeEmbedModelConfig,
  testEmbedModelConfig,
  updateEmbedModelConfig,
  type EmbedModelConfigItem,
} from '@/services/biz/embed-model-config';
import {
  addLlmModelConfig,
  getLlmModelConfigPage,
  removeLlmModelConfig,
  testLlmModelConfig,
  updateLlmModelConfig,
  type LlmModelConfigItem,
} from '@/services/biz/llm-model-config';

type EnabledFilter = 'all' | '1' | '0';
type ActiveTab = 'llm' | 'embed';

type BaseConfigItem = {
  id: number;
  name: string;
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKeyMasked?: string;
  defaulted?: number;
  enabled: number;
  sort?: number;
  remark?: string;
  createTime?: string;
};

type TableItem = BaseConfigItem & {
  key: number;
  dimension?: number;
};

type FormValues = {
  name: string;
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKey?: string;
  enabled: boolean;
  defaulted?: boolean;
  sort?: number;
  remark?: string;
  dimension?: number;
};

const pageSize = 10;

const providerOptions = [
  { label: 'vLLM', value: 'vllm' },
  { label: 'Ollama', value: 'ollama' },
  // { label: 'Sub2API', value: 'sub2api' },
  // { label: 'OpenAI', value: 'openai' },
  // { label: 'Claude', value: 'claude' },
  // { label: 'Xinference', value: 'xinference' },
  // { label: 'OneAPI', value: 'oneapi' },
];

const apiTypeOptions = [
  { label: 'OpenAI 兼容协议', value: 'openai' },
  // { label: 'Claude 协议', value: 'claude' },
];

const llmProviderOptions = [
  { label: 'vLLM', value: 'vllm' },
  { label: 'Ollama', value: 'ollama' },
  { label: 'Sub2API', value: 'sub2api' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Claude', value: 'claude' },
  { label: 'Xinference', value: 'xinference' },
  { label: 'OneAPI', value: 'oneapi' },
];

const llmApiTypeOptions = [
  { label: 'OpenAI 兼容协议', value: 'openai' },
  { label: 'Claude 协议', value: 'claude' },
];

const enabledOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: '1' },
  { label: '停用', value: '0' },
];

const tabConfig = {
  llm: {
    title: '模型管理',
    addButtonText: '新增模型',
    modalTitle: '模型配置',
    emptyRemark: '暂无备注',
    testSuccessTitle: '模型测试成功',
    testResultTitle: '模型测试结果',
    testFailMessage: '模型测试失败',
    fetchFailMessage: '获取模型列表失败',
    createSuccessMessage: '模型配置已创建',
    updateSuccessMessage: '模型配置已更新',
    saveFailMessage: '保存模型配置失败',
    deleteSuccessMessage: '删除成功',
    deleteFailMessage: '删除失败',
  },
  embed: {
    title: '向量管理',
    addButtonText: '新增向量模型',
    modalTitle: '向量模型配置',
    emptyRemark: '暂无备注',
    testSuccessTitle: '向量模型测试成功',
    testResultTitle: '向量模型测试结果',
    testFailMessage: '向量模型测试失败',
    fetchFailMessage: '获取向量模型列表失败',
    createSuccessMessage: '向量模型配置已创建',
    updateSuccessMessage: '向量模型配置已更新',
    saveFailMessage: '保存向量模型配置失败',
    deleteSuccessMessage: '删除成功',
    deleteFailMessage: '删除失败',
  },
} as const;

function extractList(payload: any): TableItem[] {
  const list = payload?.data?.list || payload?.list || payload?.rows || [];
  return Array.isArray(list)
    ? list.map((item: LlmModelConfigItem | EmbedModelConfigItem) => ({
        ...item,
        key: item.id,
      }))
    : [];
}

function extractTotal(payload: any): number {
  return Number(payload?.data?.total || payload?.total || 0);
}

function getProviderLabel(value: string) {
  return (
    [...llmProviderOptions, ...providerOptions].find((item) => item.value === value)?.label || value
  );
}

function getApiTypeLabel(value: string) {
  return (
    [...llmApiTypeOptions, ...apiTypeOptions].find((item) => item.value === value)?.label || value
  );
}

function formatJsonPreview(value?: string) {
  if (!value) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (_error) {
    return value;
  }
}

export default function ModelManagePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('llm');
  const [list, setList] = useState<TableItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [editingItem, setEditingItem] = useState<TableItem | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchProviderType, setSearchProviderType] = useState<string | undefined>(undefined);
  const [searchApiType, setSearchApiType] = useState<string | undefined>(undefined);
  const [searchEnabled, setSearchEnabled] = useState<EnabledFilter>('all');
  const [form] = Form.useForm<FormValues>();

  const currentTabConfig = tabConfig[activeTab];
  const currentProviderOptions = activeTab === 'llm' ? llmProviderOptions : providerOptions;
  const currentApiTypeOptions = activeTab === 'llm' ? llmApiTypeOptions : apiTypeOptions;
  const tabItems = [
    {
      key: 'llm',
      label: <div style={{ width: '100%', textAlign: 'center' }}>模型管理</div>,
    },
    {
      key: 'embed',
      label: <div style={{ width: '100%', textAlign: 'center' }}>向量管理</div>,
    },
  ];
  const columns = useMemo<ColumnsType<TableItem>>(() => {
    const baseColumns: ColumnsType<TableItem> = [
      {
        title: '模型名称',
        dataIndex: 'name',
        key: 'name',
        width: 240,
        render: (_value, record) => (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, color: '#262626' }}>{record.name}</div>
              {activeTab === 'embed' && Number(record.defaulted) === 1 && (
                <Tag color="gold">默认</Tag>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
              {record.remark || currentTabConfig.emptyRemark}
            </div>
          </div>
        ),
      },
      {
        title: '提供方',
        dataIndex: 'providerType',
        key: 'providerType',
        width: 120,
        render: (value) => <Tag color="blue">{getProviderLabel(value)}</Tag>,
      },
      {
        title: '协议',
        dataIndex: 'apiType',
        key: 'apiType',
        width: 160,
        render: (value) => <Tag color="purple">{getApiTypeLabel(value)}</Tag>,
      },
      {
        title: '模型编码',
        dataIndex: 'modelCode',
        key: 'modelCode',
        width: 220,
      },
      {
        title: '排序号',
        dataIndex: 'sort',
        key: 'sort',
        width: 100,
        render: (value) => value ?? 0,
      },
      {
        title: '基础地址',
        dataIndex: 'baseUrl',
        key: 'baseUrl',
        ellipsis: true,
      },
      {
        title: 'API Key',
        dataIndex: 'apiKeyMasked',
        key: 'apiKeyMasked',
        width: 160,
        render: (value) => value || '未设置',
      },
    ];

    if (activeTab === 'embed') {
      baseColumns.splice(4, 0, {
        title: '向量维度',
        dataIndex: 'dimension',
        key: 'dimension',
        width: 120,
        render: (value) => value ?? '-',
      });
    }

    if (activeTab === 'llm') {
      baseColumns.push({
        title: '状态',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 100,
        render: (value) => (
          <Tag color={Number(value) === 1 ? 'success' : 'default'}>
            {Number(value) === 1 ? '启用' : '停用'}
          </Tag>
        ),
      });
    }

    baseColumns.push(
      {
        title: '创建时间',
        dataIndex: 'createTime',
        key: 'createTime',
        width: 180,
        render: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--'),
      },
      {
        title: '操作',
        key: 'action',
        width: activeTab === 'embed' ? 280 : 220,
        render: (_value, record) => (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              style={activeTab === 'embed' ? { display: 'none' } : undefined}
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
            {activeTab === 'embed' && (
              <Button
                type="link"
                size="small"
                disabled={Number(record.defaulted) === 1}
                onClick={() => void handleSetEmbedDefault(record)}
              >
                设为默认
              </Button>
            )}
            <Popconfirm
              title={`确认删除该${activeTab === 'llm' ? '模型' : '向量模型'}配置吗？`}
              okText="确认"
              cancelText="取消"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    );

    return baseColumns;
  }, [activeTab, currentTabConfig.emptyRemark]);

  const fetchList = async (
    currentPage = page,
    filters = {
      name: searchName,
      providerType: searchProviderType,
      apiType: searchApiType,
      enabled: searchEnabled,
    },
    currentTab = activeTab,
  ) => {
    setLoading(true);
    try {
      const params = {
        pageNo: currentPage,
        pageSize,
        name: filters.name.trim() || undefined,
        providerType: filters.providerType || undefined,
        apiType: filters.apiType || undefined,
        enabled: filters.enabled === 'all' ? undefined : Number(filters.enabled),
      };
      const res: any =
        currentTab === 'llm'
          ? await getLlmModelConfigPage(params)
          : await getEmbedModelConfigPage(params);
      if (res?.code === 200 || res?.data) {
        setList(extractList(res));
        setTotal(extractTotal(res));
      } else {
        message.error(res?.msg || tabConfig[currentTab].fetchFailMessage);
      }
    } catch (error) {
      console.error(error);
      message.error(tabConfig[currentTab].fetchFailMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList(1, undefined, activeTab);
  }, [activeTab]);

  const handleProviderChange = (value: string) => {
    if (value === 'claude') {
      form.setFieldValue('apiType', 'claude');
      return;
    }
    if (form.getFieldValue('apiType') === 'claude') {
      form.setFieldValue('apiType', 'openai');
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    form.setFieldsValue({
      name: '',
      providerType: 'vllm',
      apiType: 'openai',
      baseUrl: '',
      modelCode: '',
      apiKey: '',
      dimension: undefined,
      enabled: true,
      defaulted: false,
      sort: 0,
      remark: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (record: TableItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      name: record.name,
      providerType: record.providerType,
      apiType: record.apiType,
      baseUrl: record.baseUrl,
      modelCode: record.modelCode,
      apiKey: '',
      dimension: record.dimension,
      enabled: Number(record.enabled) === 1,
      defaulted: Number(record.defaulted) === 1,
      sort: record.sort ?? 0,
      remark: record.remark || '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
    form.resetFields();
  };

  const buildSubmitPayload = async () => {
    const values = await form.validateFields();
    return {
      id: editingItem?.id,
      name: values.name.trim(),
      providerType: values.providerType,
      apiType: values.apiType,
      baseUrl: values.baseUrl.trim(),
      modelCode: values.modelCode.trim(),
      apiKey: values.apiKey?.trim() || '',
      dimension:
        activeTab === 'embed' && values.dimension !== undefined
          ? Number(values.dimension)
          : undefined,
      defaulted: activeTab === 'embed' ? Number(values.defaulted ? 1 : 0) : undefined,
      enabled: activeTab === 'embed' ? 1 : values.enabled ? 1 : 0,
      sort: Number(values.sort || 0),
      remark: values.remark?.trim() || '',
    };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = await buildSubmitPayload();
      const res: any =
        activeTab === 'llm'
          ? editingItem
            ? await updateLlmModelConfig(payload)
            : await addLlmModelConfig(payload)
          : editingItem
            ? await updateEmbedModelConfig(payload)
            : await addEmbedModelConfig(payload);

      if (res?.code === 200) {
        message.success(
          editingItem
            ? currentTabConfig.updateSuccessMessage
            : currentTabConfig.createSuccessMessage,
        );
        closeModal();
        const nextPage = editingItem ? page : 1;
        setPage(nextPage);
        void fetchList(nextPage);
      } else {
        message.error(res?.msg || currentTabConfig.saveFailMessage);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res: any =
        activeTab === 'llm' ? await removeLlmModelConfig(id) : await removeEmbedModelConfig(id);
      if (res?.code === 200) {
        message.success(currentTabConfig.deleteSuccessMessage);
        const nextPage = list.length === 1 && page > 1 ? page - 1 : page;
        setPage(nextPage);
        void fetchList(nextPage);
      } else {
        message.error(res?.msg || currentTabConfig.deleteFailMessage);
      }
    } catch (error) {
      console.error(error);
      message.error(currentTabConfig.deleteFailMessage);
    }
  };

  const handleSetEmbedDefault = async (record: TableItem) => {
    try {
      const payload = {
        id: record.id,
        name: record.name,
        providerType: record.providerType,
        apiType: record.apiType,
        baseUrl: record.baseUrl,
        modelCode: record.modelCode,
        apiKey: '',
        dimension: record.dimension,
        defaulted: 1,
        enabled: record.enabled,
        sort: Number(record.sort || 0),
        remark: record.remark || '',
      };
      const res: any = await updateEmbedModelConfig(payload);
      if (res?.code === 200) {
        message.success('默认向量模型已更新');
        void fetchList(page);
      } else {
        message.error(res?.msg || '设置默认向量模型失败');
      }
    } catch (error) {
      console.error(error);
      message.error('设置默认向量模型失败');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const payload = await buildSubmitPayload();
      const res: any =
        activeTab === 'llm'
          ? await testLlmModelConfig({
              providerType: payload.providerType,
              apiType: payload.apiType,
              baseUrl: payload.baseUrl,
              modelCode: payload.modelCode,
              apiKey: payload.apiKey,
            })
          : await testEmbedModelConfig({
              providerType: payload.providerType,
              apiType: payload.apiType,
              baseUrl: payload.baseUrl,
              modelCode: payload.modelCode,
              apiKey: payload.apiKey,
              expectedDimension: payload.dimension,
            });

      if (res?.code === 200) {
        const result = res?.data;
        console;
        Modal.info({
          title: result?.success
            ? currentTabConfig.testSuccessTitle
            : currentTabConfig.testResultTitle,
          width: 720,
          content: (
            <div style={{ marginTop: 12 }}>
              <p>结果说明：{result?.message || '-'}</p>
              <p>耗时：{result?.latencyMs ? `${result.latencyMs} ms` : '-'}</p>
              {activeTab === 'embed' && <p>向量维度：{result?.dimension ?? '-'}</p>}
              <Input.TextArea
                value={formatJsonPreview(result?.responsePreview)}
                rows={12}
                readOnly
                placeholder="无响应预览"
              />
            </div>
          ),
        });
      } else {
      }
    } catch (error) {
      console.error(error);
      message.error(currentTabConfig.testFailMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleTabChange = (key: string) => {
    const nextTab = key as ActiveTab;
    setActiveTab(nextTab);
    setSearchName('');
    setSearchProviderType(undefined);
    setSearchApiType(undefined);
    setSearchEnabled('all');
    setPage(1);
    setList([]);
    setTotal(0);
    closeModal();
  };

  return (
    <>
      <div style={{ background: '#f5f7fa', minHeight: 'calc(100vh - 300px)' }}>
        <Card styles={{ body: { flex: 1, minHeight: '86vh', padding: 0 } }}>
          <div className="model-manage-tabs" style={{ padding: '20px 24px 16px' }}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ padding: '0 0 24px', borderBottom: '1px solid #f0f0f0' }}>
              <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#262626' }}>
                    {currentTabConfig.title}
                  </div>
                </Col>
                <Col>
                  <Space>
                    <Tag color="blue">总数 {total}</Tag>
                    <Button icon={<ReloadOutlined />} onClick={() => void fetchList(page)}>
                      刷新
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                      {currentTabConfig.addButtonText}
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>

            <div
              style={{
                padding: '16px 0',
                borderBottom: '1px solid #f0f0f0',
                background: 'linear-gradient(180deg, #f7f9fc 0%, #fff 100%)',
              }}
            >
              <Row gutter={[16, 12]}>
                <Col>
                  <Input
                    placeholder="请输入模型名称"
                    allowClear
                    value={searchName}
                    onChange={(event) => setSearchName(event.target.value)}
                    onPressEnter={() => {
                      setPage(1);
                      void fetchList(1);
                    }}
                    style={{ width: 220 }}
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  />
                </Col>
                <Col>
                  <Select
                    allowClear
                    placeholder="提供方类型"
                    value={searchProviderType}
                    onChange={setSearchProviderType}
                    style={{ width: 160 }}
                    options={currentProviderOptions}
                  />
                </Col>
                <Col>
                  <Select
                    allowClear
                    placeholder="协议类型"
                    value={searchApiType}
                    onChange={setSearchApiType}
                    style={{ width: 180 }}
                    options={currentApiTypeOptions}
                  />
                </Col>
                <Col>
                  <Select
                    value={searchEnabled}
                    onChange={setSearchEnabled}
                    style={{ width: 140 }}
                    options={enabledOptions}
                  />
                </Col>
                <Col>
                  <Space>
                    <Button
                      type="primary"
                      onClick={() => {
                        setPage(1);
                        void fetchList(1);
                      }}
                    >
                      搜索
                    </Button>
                    <Button
                      onClick={() => {
                        setSearchName('');
                        setSearchProviderType(undefined);
                        setSearchApiType(undefined);
                        setSearchEnabled('all');
                        setPage(1);
                        void fetchList(1, {
                          name: '',
                          providerType: undefined,
                          apiType: undefined,
                          enabled: 'all',
                        });
                      }}
                    >
                      重置
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>

            <div style={{ paddingTop: 16 }}>
              <Table
                dataSource={list}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={false}
                scroll={{ x: activeTab === 'embed' ? 1500 : 1400 }}
              />
            </div>

            <div
              style={{
                paddingTop: 16,
                display: 'flex',
                justifyContent: 'flex-end',
                borderTop: '1px solid #f0f0f0',
                marginTop: 16,
              }}
            >
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(nextPage) => {
                  setPage(nextPage);
                  void fetchList(nextPage);
                }}
                showSizeChanger={false}
                showTotal={(value) => `共 ${value} 条记录`}
              />
            </div>
          </div>
        </Card>
      </div>

      <Modal
        title={`${editingItem ? '编辑' : '新增'}${currentTabConfig.modalTitle}`}
        open={modalVisible}
        onCancel={closeModal}
        width={760}
        footer={[
          <Button
            key="test"
            icon={<ApiOutlined />}
            loading={testing}
            onClick={() => void handleTest()}
          >
            测试连接
          </Button>,
          <Button key="cancel" onClick={closeModal}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            保存
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="模型名称"
                rules={[{ required: true, message: '请输入模型名称' }]}
              >
                <Input
                  placeholder={
                    activeTab === 'llm' ? '例如：本地 Qwen 2.5 7B' : '例如：本地 BGE Large'
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              {activeTab === 'llm' ? (
                <Form.Item name="enabled" label="是否启用" valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="停用" />
                </Form.Item>
              ) : (
                <Form.Item name="defaulted" label="是否默认" valuePropName="checked">
                  <Switch checkedChildren="默认" unCheckedChildren="非默认" />
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              <Form.Item
                name="providerType"
                label="提供方类型"
                rules={[{ required: true, message: '请选择提供方类型' }]}
              >
                <Select options={currentProviderOptions} onChange={handleProviderChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="apiType"
                label="协议类型"
                rules={[{ required: true, message: '请选择协议类型' }]}
              >
                <Select options={currentApiTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="baseUrl"
                label="基础地址"
                rules={[{ required: true, message: '请输入基础地址' }]}
              >
                <Input placeholder="例如：https://api.openai.com/v1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="modelCode"
                label="模型编码"
                rules={[{ required: true, message: '请输入模型编码' }]}
              >
                <Input
                  placeholder={
                    activeTab === 'llm'
                      ? '例如：qwen2.5:7b 或 gpt-4o-mini'
                      : '例如：bge-large-zh-v1.5'
                  }
                />
              </Form.Item>
            </Col>
            {activeTab === 'embed' && (
              <Col span={12}>
                <Form.Item name="dimension" label="向量维度">
                  <Input type="number" placeholder="为空时以模型实际返回为准" />
                </Form.Item>
              </Col>
            )}
            <Col span={activeTab === 'embed' ? 12 : 12}>
              <Form.Item name="sort" label="排序号">
                <Input type="number" placeholder="默认 0" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="apiKey" label="API Key">
                <Input.Password
                  placeholder={
                    editingItem ? '留空表示保持原有 API Key 不变' : '本地无密码服务可留空'
                  }
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea
                  rows={3}
                  placeholder={
                    activeTab === 'llm'
                      ? '说明该模型的使用场景，例如问答、推理等'
                      : '说明该向量模型的使用场景，例如知识库默认召回向量模型'
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .model-manage-tabs .ant-tabs-nav {
          margin-bottom: 0;
        }

        .model-manage-tabs .ant-tabs-nav-wrap,
        .model-manage-tabs .ant-tabs-nav-list {
          width: 100%;
        }

        .model-manage-tabs .ant-tabs-nav-list {
          position: relative;
          gap: 0;
          padding: 4px;
          background: #f3f6fb;
          border: 1px solid #e4ebf5;
          border-radius: 12px;
        }

        .model-manage-tabs .ant-tabs-nav-list::before {
          content: '';
          position: absolute;
          top: 10px;
          bottom: 10px;
          left: 50%;
          width: 2px;
          background: #ffffff;
          transform: translateX(-50%);
          z-index: 1;
          pointer-events: none;
        }

        .model-manage-tabs .ant-tabs-tab {
          position: relative;
          z-index: 2;
          flex: 1 1 50%;
          justify-content: center;
          margin: 0;
          padding: 10px 0;
          border-radius: 9px;
          transition: all 0.2s ease;
        }

        .model-manage-tabs .ant-tabs-tab-btn {
          width: 100%;
          text-align: center;
          color: #5b6472;
          font-weight: 500;
        }

        .model-manage-tabs .ant-tabs-ink-bar {
          height: 3px;
          top: auto;
          bottom: 0;
          border-radius: 999px;
          background: #1677ff;
          box-shadow: none;
        }

        .model-manage-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn {
          color: #1677ff;
        }

        .model-manage-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #1677ff;
          font-weight: 600;
        }
      `,
        }}
      />
    </>
  );
}
