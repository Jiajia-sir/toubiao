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
  Slider,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  QuestionCircleOutlined,
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
  vectorStrategy?: {
    type: 'sentence' | 'summary' | 'custom';
    sentences_per_chunk?: number;
    sentence_overlap?: number;
    separators?: string[];
    source_chars_per_summary?: number;
    summary_max_tokens?: number;
    llm?: {
      base_url: string;
      model: string;
    };
    chunk_size?: number;
    chunk_overlap?: number;
  };
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
  vectorStrategyType?: 'sentence' | 'summary' | 'custom';
  sentencesPerChunk?: number;
  sentenceOverlap?: number;
  sentenceSeparators?: string[];
  sourceCharsPerSummary?: number;
  summaryMaxTokens?: number;
  summaryLlmBaseUrl?: string;
  summaryLlmModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  customSeparators?: string[];
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

function formatStrategySeparator(value: string) {
  return value.replace(/\n/g, '\\n');
}

function renderStrategyBlock(title: string, dotColor: string, value?: string | number | null) {
  const isEmpty = value === undefined || value === null || value === '';

  return (
    <div
      key={title}
      style={{
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#8c8c8c',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <span>{title}:</span>
      </div>
      <div
        style={{
          color: isEmpty ? '#bfbfbf' : '#262626',
          fontSize: 12,
          lineHeight: 1.5,
          wordBreak: 'break-all',
        }}
      >
        {isEmpty ? '未设置' : String(value)}
      </div>
    </div>
  );
}

function renderSeparatorTags(dotColor: string, separators?: string[] | null) {
  if (!separators?.length) {
    return renderStrategyBlock('分隔符', dotColor, null);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '2px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#8c8c8c',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <span>分隔符:</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {separators.map((item) => (
          <Tag
            key={item}
            style={{
              marginInlineEnd: 0,
              marginBottom: 0,
              borderRadius: 999,
              paddingInline: 6,
              lineHeight: '18px',
              fontSize: 12,
            }}
          >
            {formatStrategySeparator(item)}
          </Tag>
        ))}
      </div>
    </div>
  );
}

function renderVectorStrategy(strategy?: TableItem['vectorStrategy']) {
  if (!strategy) {
    return renderUnconfiguredTag();
  }

  const typeLabelMap = {
    sentence: '按句切分',
    summary: '摘要切分',
    custom: '自定义切分',
  } as const;
  const typeColorMap = {
    sentence: '#1677ff',
    summary: '#13c2c2',
    custom: '#faad14',
  } as const;
  const dotColor = typeColorMap[strategy.type];

  if (strategy.type === 'sentence') {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <Tag
          color="processing"
          style={{ width: 'fit-content', marginInlineEnd: 0, marginBottom: 0 }}
        >
          {typeLabelMap[strategy.type]}
        </Tag>
        <div style={{ display: 'grid', gap: 2 }}>
          {renderStrategyBlock('每块句子数', dotColor, strategy.sentences_per_chunk)}
          {renderStrategyBlock('重叠句子数', dotColor, strategy.sentence_overlap)}
          {renderSeparatorTags(dotColor, strategy.separators)}
        </div>
      </div>
    );
  }

  if (strategy.type === 'summary') {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <Tag color="cyan" style={{ width: 'fit-content', marginInlineEnd: 0, marginBottom: 0 }}>
          {typeLabelMap[strategy.type]}
        </Tag>
        <div style={{ display: 'grid', gap: 2 }}>
          {renderStrategyBlock('摘要原文字数', dotColor, strategy.source_chars_per_summary)}
          {renderStrategyBlock('摘要最大 Tokens', dotColor, strategy.summary_max_tokens)}
          {renderStrategyBlock('摘要模型地址', dotColor, strategy.llm?.base_url)}
          {renderStrategyBlock('摘要模型名称', dotColor, strategy.llm?.model)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <Tag color="gold" style={{ width: 'fit-content', marginInlineEnd: 0, marginBottom: 0 }}>
        {typeLabelMap[strategy.type]}
      </Tag>
      <div style={{ display: 'grid', gap: 2 }}>
        {renderStrategyBlock('切分粒度', dotColor, strategy.chunk_size)}
        {renderStrategyBlock('重叠字符数', dotColor, strategy.chunk_overlap)}
        {renderSeparatorTags(dotColor, strategy.separators)}
      </div>
    </div>
  );
}

function renderUnconfiguredTag() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        color: '#bfbfbf',
        fontSize: 12,
      }}
    >
      未配置
    </div>
  );
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
  const vectorStrategyType = Form.useWatch('vectorStrategyType', form);
  const sentencesPerChunkValue = Form.useWatch('sentencesPerChunk', form);
  const sentenceOverlapValue = Form.useWatch('sentenceOverlap', form);
  const sourceCharsPerSummaryValue = Form.useWatch('sourceCharsPerSummary', form);
  const summaryMaxTokensValue = Form.useWatch('summaryMaxTokens', form);
  const chunkSizeValue = Form.useWatch('chunkSize', form);
  const chunkOverlapValue = Form.useWatch('chunkOverlap', form);

  const currentTabConfig = tabConfig[activeTab];
  const formColSpan = activeTab === 'llm' ? 12 : 8;
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
        width: 340,
        render: (_value, record) => (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, color: '#262626' }}>{record.name}</div>
              {activeTab === 'embed' && Number(record.defaulted) === 1 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 10px 2px 8px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #e6f4ff 0%, #f7fbff 100%)',
                    border: '1px solid #bae0ff',
                    color: '#0958d9',
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    boxShadow: '0 1px 2px rgba(22, 119, 255, 0.08)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#1677ff',
                      boxShadow: '0 0 0 3px rgba(22, 119, 255, 0.12)',
                      flexShrink: 0,
                    }}
                  />
                  <span>默认</span>
                </span>
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
        render: (value) => value || renderUnconfiguredTag(),
      },
    ];

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

    if (activeTab === 'embed') {
      baseColumns.push({
        title: '分句向量方式',
        dataIndex: 'vectorStrategy',
        key: 'vectorStrategy',
        width: 320,
        render: (value) => renderVectorStrategy(value),
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

  useEffect(() => {
    if (activeTab !== 'embed') {
      return;
    }
    const chunkValue = Number(sentencesPerChunkValue ?? 3);
    const overlapValue = sentenceOverlapValue;
    if (overlapValue === undefined || overlapValue === null || overlapValue === '') {
      return;
    }
    const maxOverlap = Math.max(chunkValue - 1, 0);
    if (Number(overlapValue) > maxOverlap) {
      form.setFieldValue('sentenceOverlap', maxOverlap);
    }
  }, [activeTab, form, sentenceOverlapValue, sentencesPerChunkValue]);

  useEffect(() => {
    if (activeTab !== 'embed') {
      return;
    }
    const sizeValue = Number(chunkSizeValue ?? 1000);
    const overlapValue = chunkOverlapValue;
    if (overlapValue === undefined || overlapValue === null || overlapValue === '') {
      return;
    }
    const maxOverlap = Math.max(Math.min(sizeValue - 1, 5000), 0);
    if (Number(overlapValue) > maxOverlap) {
      form.setFieldValue('chunkOverlap', maxOverlap);
    }
  }, [activeTab, chunkOverlapValue, chunkSizeValue, form]);

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
      enabled: true,
      defaulted: false,
      sort: 0,
      remark: '',
      vectorStrategyType: 'sentence',
      sentencesPerChunk: 3,
      sentenceOverlap: 1,
      sentenceSeparators: ['。', '！', '？', '；', '\\n'],
      sourceCharsPerSummary: 5000,
      summaryMaxTokens: 500,
      summaryLlmBaseUrl: '',
      summaryLlmModel: '',
      chunkSize: 1000,
      chunkOverlap: 200,
      customSeparators: ['\\n\\n', '\\n', '。'],
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
      enabled: Number(record.enabled) === 1,
      defaulted: Number(record.defaulted) === 1,
      sort: record.sort ?? 0,
      remark: record.remark || '',
      vectorStrategyType: record.vectorStrategy?.type || 'sentence',
      sentencesPerChunk: record.vectorStrategy?.sentences_per_chunk,
      sentenceOverlap: record.vectorStrategy?.sentence_overlap,
      sentenceSeparators: record.vectorStrategy?.separators?.map((item) =>
        item.replace(/\n/g, '\\n'),
      ),
      sourceCharsPerSummary: record.vectorStrategy?.source_chars_per_summary,
      summaryMaxTokens: record.vectorStrategy?.summary_max_tokens,
      summaryLlmBaseUrl: record.vectorStrategy?.llm?.base_url || '',
      summaryLlmModel: record.vectorStrategy?.llm?.model || '',
      chunkSize: record.vectorStrategy?.chunk_size,
      chunkOverlap: record.vectorStrategy?.chunk_overlap,
      customSeparators: record.vectorStrategy?.separators?.map((item) =>
        item.replace(/\n/g, '\\n'),
      ),
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
    const parseSeparators = (value?: string[]) =>
      value
        ?.map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/\\n/g, '\n'));

    const buildVectorStrategy = () => {
      if (activeTab !== 'embed' || !values.vectorStrategyType) {
        return undefined;
      }
      if (values.vectorStrategyType === 'sentence') {
        return {
          type: 'sentence' as const,
          sentences_per_chunk:
            values.sentencesPerChunk !== undefined &&
            values.sentencesPerChunk !== null &&
            values.sentencesPerChunk !== ''
              ? Number(values.sentencesPerChunk)
              : undefined,
          sentence_overlap:
            values.sentenceOverlap !== undefined &&
            values.sentenceOverlap !== null &&
            values.sentenceOverlap !== ''
              ? Number(values.sentenceOverlap)
              : undefined,
          separators: parseSeparators(values.sentenceSeparators),
        };
      }
      if (values.vectorStrategyType === 'summary') {
        return {
          type: 'summary' as const,
          source_chars_per_summary:
            values.sourceCharsPerSummary !== undefined &&
            values.sourceCharsPerSummary !== null &&
            values.sourceCharsPerSummary !== ''
              ? Number(values.sourceCharsPerSummary)
              : undefined,
          summary_max_tokens:
            values.summaryMaxTokens !== undefined &&
            values.summaryMaxTokens !== null &&
            values.summaryMaxTokens !== ''
              ? Number(values.summaryMaxTokens)
              : undefined,
          llm:
            values.summaryLlmBaseUrl?.trim() && values.summaryLlmModel?.trim()
              ? {
                  base_url: values.summaryLlmBaseUrl.trim(),
                  model: values.summaryLlmModel.trim(),
                }
              : undefined,
        };
      }
      return {
        type: 'custom' as const,
        chunk_size:
          values.chunkSize !== undefined && values.chunkSize !== null && values.chunkSize !== ''
            ? Number(values.chunkSize)
            : undefined,
        chunk_overlap:
          values.chunkOverlap !== undefined &&
          values.chunkOverlap !== null &&
          values.chunkOverlap !== ''
            ? Number(values.chunkOverlap)
            : undefined,
        separators: parseSeparators(values.customSeparators),
      };
    };

    return {
      id: editingItem?.id,
      name: values.name.trim(),
      providerType: values.providerType,
      apiType: values.apiType,
      baseUrl: values.baseUrl.trim(),
      modelCode: values.modelCode.trim(),
      apiKey: values.apiKey?.trim() || '',
      dimension: activeTab === 'embed' ? editingItem?.dimension : undefined,
      defaulted: activeTab === 'embed' ? Number(values.defaulted ? 1 : 0) : undefined,
      enabled: activeTab === 'embed' ? 1 : values.enabled ? 1 : 0,
      sort: Number(values.sort || 0),
      remark: values.remark?.trim() || '',
      vectorStrategy: buildVectorStrategy(),
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
                rowClassName={(record) =>
                  activeTab === 'embed' && Number(record.defaulted) === 1
                    ? 'model-manage-default-row'
                    : ''
                }
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
        width={1080}
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
        <Form form={form} layout="vertical" className="model-manage-form">
          <Row gutter={[16, 0]}>
            <Col span={formColSpan}>
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
            {activeTab === 'llm' && (
              <Col span={formColSpan}>
                <Form.Item name="enabled" label="是否启用" valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="停用" />
                </Form.Item>
              </Col>
            )}
            <Col span={formColSpan}>
              <Form.Item
                name="providerType"
                label="提供方类型"
                rules={[{ required: true, message: '请选择提供方类型' }]}
              >
                <Select options={currentProviderOptions} onChange={handleProviderChange} />
              </Form.Item>
            </Col>
            <Col span={formColSpan}>
              <Form.Item
                name="apiType"
                label="协议类型"
                rules={[{ required: true, message: '请选择协议类型' }]}
              >
                <Select options={currentApiTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={formColSpan}>
              <Form.Item
                name="baseUrl"
                label="基础地址"
                rules={[{ required: true, message: '请输入基础地址' }]}
              >
                <Input placeholder="例如：https://api.openai.com/v1" />
              </Form.Item>
            </Col>
            <Col span={formColSpan}>
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
              <>
                <Col span={8}>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item name="defaulted" label="是否默认" valuePropName="checked">
                        <Switch checkedChildren="默认" unCheckedChildren="非默认" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="sort" label="排序号">
                        <Input type="number" placeholder="默认 0" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
                <Col span={24}>
                  <div
                    style={{
                      marginBottom: 20,
                      padding: '16px 16px 4px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%)',
                      border: '1px solid #d6e8ff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        marginBottom: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#1d39c4',
                          }}
                        >
                          <span>分句向量方式</span>
                          <Tooltip title="定义文本怎么切块做向量化">
                            <QuestionCircleOutlined
                              style={{ color: '#597ef7', cursor: 'pointer', fontSize: 14 }}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <Row gutter={[16, 0]}>
                        <Col span={24}>
                          <Form.Item
                            name="vectorStrategyType"
                            label="向量类型"
                            style={{ marginBottom: 8 }}
                            rules={[{ required: true, message: '请选择向量类型' }]}
                          >
                            <Tabs
                              className="vector-strategy-tabs"
                              activeKey={vectorStrategyType}
                              onChange={(key) =>
                                form.setFieldValue(
                                  'vectorStrategyType',
                                  key as FormValues['vectorStrategyType'],
                                )
                              }
                              items={[
                                { key: 'sentence', label: '按句切分' },
                                { key: 'summary', label: '摘要切分' },
                                { key: 'custom', label: '自定义粒度' },
                              ]}
                            />
                          </Form.Item>
                        </Col>

                        {vectorStrategyType === 'sentence' && (
                          <>
                            <Col span={8}>
                              <Form.Item
                                name="sentencesPerChunk"
                                label={
                                  <div
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      minWidth: 0,
                                      flex: 1,
                                      boxSizing: 'border-box',
                                      paddingRight: 4,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        minWidth: 0,
                                      }}
                                    >
                                      <span>每块句子数</span>
                                      <Tooltip title="每个文本块包含多少句话。默认值 3。">
                                        <QuestionCircleOutlined
                                          style={{
                                            color: '#19213aff',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                          }}
                                        />
                                      </Tooltip>
                                    </div>
                                    <Tag color="blue" style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                                      当前值 {form.getFieldValue('sentencesPerChunk') ?? 3}
                                    </Tag>
                                  </div>
                                }
                                rules={[{ required: true, message: '请设置每块句子数' }]}
                              >
                                <Slider min={1} max={100} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                name="sentenceOverlap"
                                label={
                                  <div
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      minWidth: 0,
                                      flex: 1,
                                      boxSizing: 'border-box',
                                      paddingRight: 4,
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        minWidth: 0,
                                      }}
                                    >
                                      <span>允许重叠数</span>
                                      <Tooltip title="相邻文本块重复多少句话，下一块会保留上一块末尾约多少个字符。默认值 1。必须小于每块句子数。">
                                        <QuestionCircleOutlined
                                          style={{
                                            color: '#19213aff',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                          }}
                                        />
                                      </Tooltip>
                                    </div>
                                    <Tag color="blue" style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                                      当前值 {sentenceOverlapValue ?? 1}
                                    </Tag>
                                  </div>
                                }
                                rules={[
                                  { required: true, message: '请设置允许重叠数' },
                                  {
                                    validator: async (_rule, value) => {
                                      if (value === undefined || value === null || value === '') {
                                        return;
                                      }
                                      const chunkValue = Number(sentencesPerChunkValue ?? 3);
                                      if (Number(value) >= chunkValue) {
                                        throw new Error('允许重叠数必须小于每块句子数');
                                      }
                                    },
                                  },
                                ]}
                              >
                                <Slider
                                  min={0}
                                  max={Math.max(Number(sentencesPerChunkValue ?? 3) - 1, 0)}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                name="sentenceSeparators"
                                label={
                                  <Space size={4}>
                                    <span>切分符</span>
                                    <Tooltip
                                      title={
                                        '分隔符有优先顺序，建议把大结构分隔符放前面，例如先 "\\n\\n"，再 "\\n"，最后句号'
                                      }
                                    >
                                      <QuestionCircleOutlined
                                        style={{
                                          color: '#19213aff',
                                          cursor: 'pointer',
                                          fontSize: 14,
                                        }}
                                      />
                                    </Tooltip>
                                  </Space>
                                }
                                rules={[{ required: true, message: '请设置切分符' }]}
                              >
                                <Select
                                  mode="tags"
                                  tokenSeparators={[',']}
                                  placeholder="输入值回车，默认值 。，！，？，；，\n"
                                  options={[]}
                                />
                              </Form.Item>
                            </Col>
                          </>
                        )}

                        {vectorStrategyType === 'summary' && (
                          <>
                            <Col span={12}>
                              <Form.Item
                                name="sourceCharsPerSummary"
                                label={
                                  <div
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      minWidth: 0,
                                      flex: 1,
                                      boxSizing: 'border-box',
                                      paddingRight: 4,
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        minWidth: 0,
                                      }}
                                    >
                                      <span>文本字数</span>
                                      <Tooltip title="每多少个原文字符生成一份摘要。默认值 5000。">
                                        <QuestionCircleOutlined
                                          style={{
                                            color: '#19213aff',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                          }}
                                        />
                                      </Tooltip>
                                    </div>
                                    <Tag color="blue" style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                                      当前值 {sourceCharsPerSummaryValue ?? 5000}
                                    </Tag>
                                  </div>
                                }
                                rules={[{ required: true, message: '请设置文本字数' }]}
                              >
                                <Slider min={100} max={20000} />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="summaryMaxTokens"
                                label={
                                  <div
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      minWidth: 0,
                                      flex: 1,
                                      boxSizing: 'border-box',
                                      paddingRight: 4,
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        minWidth: 0,
                                      }}
                                    >
                                      <span>摘要字数</span>
                                      <Tooltip title="一份摘要最多生成多少token。默认值 500。">
                                        <QuestionCircleOutlined
                                          style={{
                                            color: '#19213aff',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                          }}
                                        />
                                      </Tooltip>
                                    </div>
                                    <Tag color="blue" style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                                      当前值 {summaryMaxTokensValue ?? 500}
                                    </Tag>
                                  </div>
                                }
                                rules={[{ required: true, message: '请设置摘要字数' }]}
                              >
                                <Slider min={32} max={16384} />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="summaryLlmBaseUrl"
                                label={
                                  <Space size={4}>
                                    <span>摘要模型地址</span>
                                    <Tooltip title="当前会在地址自动添加 /chat/completions">
                                      <QuestionCircleOutlined
                                        style={{
                                          color: '#19213aff',
                                          cursor: 'pointer',
                                          fontSize: 14,
                                        }}
                                      />
                                    </Tooltip>
                                  </Space>
                                }
                                rules={[{ required: true, message: '请输入摘要模型地址' }]}
                              >
                                <Input placeholder="默认值 使用系统默认模型地址" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="summaryLlmModel"
                                label="摘要模型名称"
                                rules={[{ required: true, message: '请输入摘要模型名称' }]}
                              >
                                <Input placeholder="默认值 使用系统默认模型名称" />
                              </Form.Item>
                            </Col>
                          </>
                        )}

                        {vectorStrategyType === 'custom' && (
                          <>
                            <Col span={8}>
                              <Form.Item
                                name="chunkSize"
                                label={
                                  <div
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      minWidth: 0,
                                      flex: 1,
                                      boxSizing: 'border-box',
                                      paddingRight: 4,
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        minWidth: 0,
                                      }}
                                    >
                                      <span>切分粒度</span>
                                      <Tooltip title="每块最大字符数，默认值 1000。">
                                        <QuestionCircleOutlined
                                          style={{
                                            color: '#19213aff',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                          }}
                                        />
                                      </Tooltip>
                                    </div>
                                    <Tag color="blue" style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                                      当前值 {chunkSizeValue ?? 1000}
                                    </Tag>
                                  </div>
                                }
                                rules={[{ required: true, message: '请设置切分粒度' }]}
                              >
                                <Slider min={50} max={10000} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                name="chunkOverlap"
                                label={
                                  <div
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      minWidth: 0,
                                      flex: 1,
                                      boxSizing: 'border-box',
                                      paddingRight: 4,
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        minWidth: 0,
                                      }}
                                    >
                                      <span>可重叠大小</span>
                                      <Tooltip title="相邻块重复字符数，默认值 200。必须小于切分粒度。">
                                        <QuestionCircleOutlined
                                          style={{
                                            color: '#19213aff',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                          }}
                                        />
                                      </Tooltip>
                                    </div>
                                    <Tag color="blue" style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                                      当前值 {chunkOverlapValue ?? 200}
                                    </Tag>
                                  </div>
                                }
                                rules={[
                                  { required: true, message: '请设置可重叠大小' },
                                  {
                                    validator: async (_rule, value) => {
                                      if (value === undefined || value === null || value === '') {
                                        return;
                                      }
                                      const sizeValue = Number(chunkSizeValue ?? 1000);
                                      if (Number(value) >= sizeValue) {
                                        throw new Error('可重叠大小必须小于切分粒度');
                                      }
                                    },
                                  },
                                ]}
                              >
                                <Slider
                                  min={0}
                                  max={Math.max(
                                    Math.min(Number(chunkSizeValue ?? 1000) - 1, 5000),
                                    0,
                                  )}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                name="customSeparators"
                                label={
                                  <Space size={4}>
                                    <span>分隔符</span>
                                    <Tooltip
                                      title={
                                        '分隔符有优先顺序，建议把大结构分隔符放前面，例如先 "\\n\\n"，再 "\\n"，最后句号'
                                      }
                                    >
                                      <QuestionCircleOutlined
                                        style={{
                                          color: '#19213aff',
                                          cursor: 'pointer',
                                          fontSize: 14,
                                        }}
                                      />
                                    </Tooltip>
                                  </Space>
                                }
                                rules={[{ required: true, message: '请设置分隔符' }]}
                              >
                                <Select
                                  mode="tags"
                                  tokenSeparators={[',']}
                                  placeholder="输入后按逗号生成标签"
                                  options={[]}
                                />
                              </Form.Item>
                            </Col>
                          </>
                        )}
                      </Row>
                    </Form.Item>
                  </div>
                </Col>
              </>
            )}
            {activeTab !== 'embed' && (
              <Col span={formColSpan}>
                <Form.Item name="sort" label="排序号">
                  <Input type="number" placeholder="默认 0" />
                </Form.Item>
              </Col>
            )}
            {activeTab === 'embed' && (
              <>
                <Col span={24}>
                  <Form.Item name="apiKey" label="API Key">
                    <Input.Password
                      placeholder={
                        editingItem ? '留空表示保持原有 API Key 不变' : '本地无密码服务可留空'
                      }
                    />
                  </Form.Item>
                </Col>
              </>
            )}
            {activeTab !== 'embed' && (
              <Col span={24}>
                <Form.Item name="apiKey" label="API Key">
                  <Input.Password
                    placeholder={
                      editingItem ? '留空表示保持原有 API Key 不变' : '本地无密码服务可留空'
                    }
                  />
                </Form.Item>
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea
                  rows={2}
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

        .vector-strategy-tabs .ant-tabs-nav {
          margin-bottom: 8px;
        }

        .vector-strategy-tabs .ant-tabs-nav::before {
          display: none;
        }

        .vector-strategy-tabs .ant-tabs-nav-wrap,
        .vector-strategy-tabs .ant-tabs-nav-list {
          width: 100%;
        }

        .vector-strategy-tabs .ant-tabs-tab {
          flex: 1 1 33.33%;
          justify-content: center;
          margin: 0;
          padding: 8px 0;
          border: 1px solid #d6e8ff;
          border-radius: 10px;
          background: #f7fbff;
          transition: all 0.2s ease;
        }

        .vector-strategy-tabs .ant-tabs-tab-btn {
          width: 100%;
          text-align: center;
          color: #5b6472;
          font-weight: 500;
        }

        .vector-strategy-tabs .ant-tabs-tab:hover {
          border-color: #91caff;
          background: #edf5ff;
        }

        .vector-strategy-tabs .ant-tabs-tab.ant-tabs-tab-active {
          background: #e6f4ff;
          border-color: #91caff;
          box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.08);
        }

        .vector-strategy-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #1677ff;
          font-weight: 600;
        }

        .vector-strategy-tabs .ant-tabs-ink-bar {
          display: none;
        }

        .model-manage-form .ant-switch {
          min-width: 150px;
        }

        .model-manage-default-row > td {
          background: #f7fbff !important;
        }

        .model-manage-default-row:hover > td {
          background: #edf5ff !important;
        }
      `,
        }}
      />
    </>
  );
}
