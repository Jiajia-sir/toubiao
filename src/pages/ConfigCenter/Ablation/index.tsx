'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  List,
  Popconfirm,
  Row,
  Select,
  Segmented,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';
import {
  ApartmentOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  LinkOutlined,
  LoadingOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  getAblationPayload,
  deleteAblationTask,
  getAblationTaskPage,
  getAblationTaskResult,
  type AblationEntity,
  type AblationGlobalEntity,
  type AblationRelation,
  type AblationResolution,
  type AblationResult,
  type AblationStatistics,
  type AblationTask,
  type AblationTaskPage,
  unwrapAblationResponse,
  uploadAblation,
} from '@/services/biz/ablation';

const { Text } = Typography;
const { Dragger } = Upload;

type Language = 'zh' | 'en';
type PageTab = 'result' | 'group';

interface GroupRow {
  key: string;
  standardWord: string;
  hitCount: number;
  aliases: string[];
  enabled: boolean;
}

const languageOptions = [
  { label: '中文（zh）', value: 'zh' as Language },
  { label: '英文（en）', value: 'en' as Language },
];

const groupSeed: GroupRow[] = [
  {
    key: '1',
    standardWord: 'Apple',
    hitCount: 200,
    aliases: ['苹果公司', '苹果', 'apple inc', '苹果'],
    enabled: true,
  },
  {
    key: '2',
    standardWord: 'AI',
    hitCount: 323,
    aliases: ['人工智能', '机器智能', '人工智慧'],
    enabled: true,
  },
  {
    key: '3',
    standardWord: '电脑',
    hitCount: 152,
    aliases: ['计算机', 'PC', '个人电脑'],
    enabled: true,
  },
  {
    key: '4',
    standardWord: 'LLM',
    hitCount: 156,
    aliases: ['大语言模型', '大模型', '语言模型'],
    enabled: false,
  },
];

const pageCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: '1px solid #eef2f7',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
};

const sectionCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '1px solid #e9edf5',
  boxShadow: '0 6px 20px rgba(15, 23, 42, 0.03)',
};

function formatValue(value: unknown): string {
  if (value === null || typeof value === 'undefined' || value === '') {
    return '-';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatAttributes(attributes?: Record<string, unknown>): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return '-';
  }
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join('；');
}

function formatFileSize(size?: number): string {
  if (!size) {
    return '-';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: unknown): string {
  if (value === null || typeof value === 'undefined' || value === '') {
    return '-';
  }
  const date =
    typeof value === 'number'
      ? new Date(value < 10000000000 ? value * 1000 : value)
      : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('zh-CN', { hour12: false });
}

function inferLanguage(fileName: string): Language {
  return /(^|[-_.])en(?:[-_.]|$)|english/i.test(fileName) ? 'en' : 'zh';
}

function getTaskId(task?: AblationTask | null): number | string | undefined {
  if (!task) {
    return undefined;
  }
  return task.id ?? task.task_id ?? task.taskId ?? task['melt_task_id'] ?? task['meltTaskId'];
}

function getTaskName(task: AblationTask): string {
  return String(task.task_name ?? task.taskName ?? task.name ?? getTaskId(task) ?? '未命名任务');
}

function getTaskStatus(task: AblationTask): unknown {
  return (
    task.status ??
    task.state ??
    task.status_code ??
    task.statusCode ??
    task['task_status'] ??
    task['taskStatus'] ??
    task['stage'] ??
    '未知'
  );
}

function getTaskCreatedTime(task: AblationTask): unknown {
  return (
    task.created_at ?? task.createdAt ?? task.create_time ?? task.createTime ?? task['updated_at']
  );
}

function getStatusCode(status: unknown): number | undefined {
  if (typeof status === 'number' && [0, 1, 2].includes(status)) {
    return status;
  }

  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (/^[012]$/.test(normalized)) {
      return Number(normalized);
    }
    if (/running|processing|pending|queued|in_progress|进行|处理|等待/.test(normalized)) {
      return 0;
    }
    if (/success|completed|complete|done|finished|成功|完成/.test(normalized)) {
      return 1;
    }
    if (/fail|error|exception|失败|异常/.test(normalized)) {
      return 2;
    }
  }

  return undefined;
}

function getTaskStatusCode(task: AblationTask): number | undefined {
  return getStatusCode(getTaskStatus(task));
}

function getStatusMeta(status: unknown): { label: string; color: string } {
  const statusCode = getStatusCode(status);
  if (statusCode === 0) {
    return { label: '消融中', color: 'processing' };
  }
  if (statusCode === 1) {
    return { label: '消融完成', color: 'success' };
  }
  if (statusCode === 2) {
    return { label: '消融失败', color: 'error' };
  }

  const normalized = String(status ?? '').toLowerCase();
  if (/success|completed|complete|done|finished|成功|完成/.test(normalized)) {
    return { label: '消融完成', color: 'success' };
  }
  if (/running|processing|pending|queued|in_progress|进行|处理|等待/.test(normalized)) {
    return { label: '消融中', color: 'processing' };
  }
  if (/fail|error|exception|失败|异常/.test(normalized)) {
    return { label: '消融失败', color: 'error' };
  }
  if (/cancel|取消/.test(normalized)) {
    return { label: '已取消', color: 'default' };
  }
  return { label: String(status ?? '未知'), color: 'default' };
}

function normalizeTaskPage(response: unknown): { list: AblationTask[]; total: number } {
  const payload = getAblationPayload<unknown>(response);
  if (Array.isArray(payload)) {
    return { list: payload as AblationTask[], total: payload.length };
  }

  const data = (payload || {}) as AblationTaskPage & Record<string, any>;
  const list =
    [data.tasks, data.list, data.items, data.records, data.data].find(Array.isArray) || [];
  const totalValue = data.total ?? data.count ?? data.total_count ?? data.totalCount ?? list.length;
  const total = Number(totalValue);
  return {
    list: list as AblationTask[],
    total: Number.isFinite(total) ? total : list.length,
  };
}

function isAblationResult(value: unknown): value is AblationResult {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const data = value as AblationResult;
  return (
    Array.isArray(data.entities) ||
    Array.isArray(data.relations) ||
    Array.isArray(data.resolutions) ||
    Array.isArray(data.global_entities) ||
    Boolean(data.statistics)
  );
}

function normalizeAblationResult(response: unknown): AblationResult | undefined {
  const payload = getAblationPayload<unknown>(response);
  const candidates = [
    payload,
    (payload as Record<string, any> | null)?.result,
    (payload as Record<string, any> | null)?.result_data,
    (payload as Record<string, any> | null)?.output,
    (payload as Record<string, any> | null)?.data,
  ];
  return candidates.find(isAblationResult);
}

function getApiErrorMessage(response: unknown): string | undefined {
  const body = unwrapAblationResponse(response) as Record<string, any> | null;
  if (!body || body.success !== false) {
    return undefined;
  }
  return typeof body.error === 'string'
    ? body.error
    : typeof body.message === 'string'
      ? body.message
      : '接口返回失败';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  const response = (error as { response?: unknown } | null)?.response;
  return getApiErrorMessage(response) || '请求失败，请稍后重试';
}

function getStatisticValue(
  statistics: AblationStatistics | undefined,
  key: string,
  fallback: number,
): number {
  const value = statistics?.[key];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export default function AblationIndexPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('result');
  const [groups, setGroups] = useState<GroupRow[]>(groupSeed);
  const [taskName, setTaskName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [fileLanguages, setFileLanguages] = useState<Record<string, Language>>({});
  const [uploading, setUploading] = useState(false);

  const [tasks, setTasks] = useState<AblationTask[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(20);
  const [taskLoading, setTaskLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | string>();

  const [selectedTask, setSelectedTask] = useState<AblationTask | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | string>();
  const [result, setResult] = useState<AblationResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState('');
  const [resultSearch, setResultSearch] = useState('');

  const fetchTasks = useCallback(async (page = 1, pageSize = 20) => {
    setTaskLoading(true);
    try {
      const response = await getAblationTaskPage(page, pageSize);
      const apiError = getApiErrorMessage(response);
      if (apiError) {
        throw new Error(apiError);
      }
      const normalized = normalizeTaskPage(response);
      setTasks(normalized.list);
      setTaskTotal(normalized.total);
      setTaskPage(page);
      setTaskPageSize(pageSize);
      return normalized.list;
    } catch (error) {
      message.error(`获取消融任务列表失败：${getErrorMessage(error)}`);
      return [];
    } finally {
      setTaskLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const openTaskResult = useCallback(async (task: AblationTask) => {
    const taskId = getTaskId(task);
    if (typeof taskId === 'undefined' || taskId === null || taskId === '') {
      message.warning('当前任务缺少任务 ID，无法查询详细结果');
      return;
    }

    const statusCode = getTaskStatusCode(task);
    if (statusCode === 0) {
      message.info('任务正在消融，请等待消融完成后再查看结果');
      return;
    }
    if (statusCode === 2) {
      message.warning('任务消融失败，暂无可查看的详细结果');
      return;
    }

    setSelectedTask(task);
    setSelectedTaskId(taskId);
    setResult(null);
    setResultError('');
    setResultLoading(true);
    try {
      const response = await getAblationTaskResult(taskId);
      const apiError = getApiErrorMessage(response);
      if (apiError) {
        throw new Error(apiError);
      }
      const normalized = normalizeAblationResult(response);
      if (!normalized) {
        throw new Error('接口未返回可展示的消融结果');
      }
      setResult(normalized);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setResultError(errorMessage);
      message.error(`获取任务结果失败：${errorMessage}`);
    } finally {
      setResultLoading(false);
    }
  }, []);

  const handleDeleteTask = useCallback(
    async (task: AblationTask) => {
      const taskId = getTaskId(task);
      if (typeof taskId === 'undefined' || taskId === null || taskId === '') {
        message.warning('当前任务缺少任务 ID，无法删除');
        return;
      }

      setDeletingTaskId(taskId);
      try {
        const response = await deleteAblationTask(taskId);
        const apiError = getApiErrorMessage(response);
        if (apiError) {
          throw new Error(apiError);
        }

        if (String(selectedTaskId) === String(taskId)) {
          setSelectedTask(null);
          setSelectedTaskId(undefined);
          setResult(null);
          setResultError('');
        }

        const nextPage = tasks.length === 1 && taskPage > 1 ? taskPage - 1 : taskPage;
        await fetchTasks(nextPage, taskPageSize);
        message.success('消融任务已删除');
      } catch (error) {
        message.error(`删除消融任务失败：${getErrorMessage(error)}`);
      } finally {
        setDeletingTaskId(undefined);
      }
    },
    [fetchTasks, selectedTaskId, taskPage, taskPageSize, tasks.length],
  );

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    const nextFile: UploadFile = {
      uid: file.uid,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'done',
      originFileObj: file,
    };
    setSelectedFiles((current) => {
      const exists = current.some((item) => item.name === file.name);
      return exists
        ? current.map((item) => (item.name === file.name ? nextFile : item))
        : [...current, nextFile];
    });
    setFileLanguages((current) => ({
      ...current,
      [file.name]: current[file.name] || inferLanguage(file.name),
    }));
    return Upload.LIST_IGNORE;
  };

  const handleRemoveFile: UploadProps['onRemove'] = (file) => {
    setSelectedFiles((current) => current.filter((item) => item.uid !== file.uid));
    setFileLanguages((current) => {
      const next = { ...current };
      delete next[file.name];
      return next;
    });
    return true;
  };

  const handleUpload = async () => {
    const normalizedTaskName = taskName.trim();
    if (!normalizedTaskName) {
      message.warning('请输入任务名称');
      return;
    }
    if (!selectedFiles.length) {
      message.warning('请至少选择一个文件');
      return;
    }

    const files = selectedFiles
      .map((file) => file.originFileObj)
      .filter((file): file is RcFile => Boolean(file));
    if (!files.length) {
      message.error('未读取到待上传文件，请重新选择');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadAblation({
        files,
        taskName: normalizedTaskName,
        fileLanguages: files.reduce<Record<string, string>>((languages, file) => {
          languages[file.name] = fileLanguages[file.name] || inferLanguage(file.name);
          return languages;
        }, {}),
      });
      const apiError = getApiErrorMessage(response);
      if (apiError) {
        throw new Error(apiError);
      }

      const uploadedResult = normalizeAblationResult(response);
      if (uploadedResult) {
        setResult(uploadedResult);
        setResultError('');
        setSelectedTask(null);
        setSelectedTaskId(undefined);
      }

      const refreshedTasks = await fetchTasks(1, taskPageSize);
      const createdTask = refreshedTasks.find((task) => getTaskName(task) === normalizedTaskName);
      if (createdTask) {
        setSelectedTask(createdTask);
        setSelectedTaskId(getTaskId(createdTask));
        if (!uploadedResult && getTaskStatusCode(createdTask) === 1) {
          await openTaskResult(createdTask);
        }
      }

      setSelectedFiles([]);
      setFileLanguages({});
      setTaskName('');
      message.success('消融任务已提交');
    } catch (error) {
      message.error(`提交消融任务失败：${getErrorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  };

  const entityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (result?.entities || []).forEach((entity) => {
      if (entity.entity_id) {
        map.set(String(entity.entity_id), entity.name || entity.entity_id);
      }
    });
    (result?.global_entities || []).forEach((entity) => {
      if (entity.entity_id) {
        map.set(String(entity.entity_id), entity.standard_name || entity.entity_id);
      }
    });
    return map;
  }, [result]);

  const entityColumns: ColumnsType<AblationEntity> = [
    {
      title: '实体名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (value: string) => <Text strong>{value || '-'}</Text>,
    },
    {
      title: '实体类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (value: string) => value || '-',
    },
    {
      title: '属性',
      dataIndex: 'attributes',
      key: 'attributes',
      width: 320,
      render: (value: Record<string, unknown>) => <span>{formatAttributes(value)}</span>,
    },
    {
      title: '实体 ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      width: 210,
      render: (value: string) => <Text copyable={{ text: value }}>{value || '-'}</Text>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      minWidth: 300,
      render: (value: string) => <span style={{ whiteSpace: 'pre-wrap' }}>{value || '-'}</span>,
    },
  ];

  const relationColumns: ColumnsType<AblationRelation> = [
    {
      title: '头实体',
      dataIndex: 'head_entity_id',
      key: 'head_entity_id',
      width: 220,
      render: (value: string) => (
        <Space direction="vertical" size={0}>
          <Text>{entityNameMap.get(String(value)) || value || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {value || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: '关系',
      dataIndex: 'relationCode',
      key: 'relationCode',
      width: 140,
      render: (value: string) => <Tag color="blue">{value || '-'}</Tag>,
    },
    {
      title: '尾实体',
      dataIndex: 'tail_entity_id',
      key: 'tail_entity_id',
      width: 220,
      render: (value: string) => (
        <Space direction="vertical" size={0}>
          <Text>{entityNameMap.get(String(value)) || value || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {value || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: '证据',
      dataIndex: 'evidence',
      key: 'evidence',
      minWidth: 360,
      render: (value: string) => <span style={{ whiteSpace: 'pre-wrap' }}>{value || '-'}</span>,
    },
  ];

  const resolutionColumns: ColumnsType<AblationResolution> = [
    { title: '原始提及', dataIndex: 'mention', key: 'mention', width: 220 },
    { title: '标准实体', dataIndex: 'canonical_entity', key: 'canonical_entity', width: 220 },
    {
      title: '实体 ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      width: 220,
      render: (value: string) => <Text copyable={{ text: value }}>{value || '-'}</Text>,
    },
    { title: '说明', dataIndex: 'description', key: 'description', minWidth: 360 },
  ];

  const globalEntityColumns: ColumnsType<AblationGlobalEntity> = [
    {
      title: '标准名称',
      dataIndex: 'standard_name',
      key: 'standard_name',
      width: 220,
      render: (value: string) => <Text strong>{value || '-'}</Text>,
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 140 },
    {
      title: '别名',
      dataIndex: 'aliases',
      key: 'aliases',
      width: 280,
      render: (value: string[]) => (value?.length ? value.join('、') : '-'),
    },
    {
      title: '语言',
      dataIndex: 'languages',
      key: 'languages',
      width: 140,
      render: (value: string[]) => value?.join('、') || '-',
    },
    {
      title: '来源文档',
      dataIndex: 'source_docs',
      key: 'source_docs',
      width: 260,
      render: (value: string[]) => value?.join('、') || '-',
    },
    {
      title: '属性',
      dataIndex: 'attributes',
      key: 'attributes',
      minWidth: 320,
      render: (value: Record<string, unknown>) => formatAttributes(value),
    },
  ];

  const taskColumns: ColumnsType<AblationTask> = [
    {
      title: '任务名称',
      key: 'taskName',
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{getTaskName(record)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID：{formatValue(getTaskId(record))}
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_value, record) => {
        const meta = getStatusMeta(getTaskStatus(record));
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '失败原因',
      dataIndex: 'error_message',
      key: 'error_message',
      width: 300,
      render: (value, record) => {
        if (getTaskStatusCode(record) !== 2) {
          return '-';
        }
        const reason = formatValue(value);
        return (
          <Text type="danger" ellipsis={{ tooltip: reason }} style={{ maxWidth: 260 }}>
            {reason}
          </Text>
        );
      },
    },
    {
      title: '创建时间',
      key: 'createdTime',
      width: 190,
      render: (_value, record) => formatDate(getTaskCreatedTime(record)),
    },
    {
      title: '操作',
      key: 'action',
      width: 190,
      render: (_value, record) => {
        const taskId = getTaskId(record);
        const statusCode = getTaskStatusCode(record);
        const isLoading = resultLoading && String(selectedTaskId) === String(taskId);
        const isDeleting =
          deletingTaskId !== undefined && String(deletingTaskId) === String(taskId);
        const canViewResult = statusCode === 1 || typeof statusCode === 'undefined';
        const actionHint =
          statusCode === 0
            ? '任务正在消融，完成后可查看结果'
            : statusCode === 2
              ? '任务消融失败，暂无结果'
              : undefined;
        return (
          <Space size={0}>
            <Button
              type="link"
              icon={isLoading ? <LoadingOutlined /> : <EyeOutlined />}
              disabled={typeof taskId === 'undefined' || !canViewResult}
              title={actionHint}
              onClick={() => void openTaskResult(record)}
            >
              查看结果
            </Button>
            <Popconfirm
              title="确认删除该消融任务？"
              description="删除后任务及其结果将无法在列表中查看。"
              okText="确认删除"
              cancelText="取消"
              onConfirm={() => void handleDeleteTask(record)}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                loading={isDeleting}
                disabled={typeof taskId === 'undefined' || isDeleting}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const statistics = result?.statistics;
  const entityCount = getStatisticValue(statistics, 'entity_count', result?.entities?.length || 0);
  const relationCount = getStatisticValue(
    statistics,
    'relation_count',
    result?.relations?.length || 0,
  );
  const resolutionCount = getStatisticValue(
    statistics,
    'resolution_count',
    result?.resolutions?.length || 0,
  );
  const globalEntityCount = result?.global_entities?.length || 0;
  const completedTaskCount = tasks.filter((task) => getTaskStatusCode(task) === 1).length;
  const processingTaskCount = tasks.filter((task) => getTaskStatusCode(task) === 0).length;
  const failedTaskCount = tasks.filter((task) => getTaskStatusCode(task) === 2).length;
  const resultKeyword = resultSearch.trim().toLowerCase();
  const filteredEntities = (result?.entities || []).filter((entity) => {
    if (!resultKeyword) return true;
    return [
      entity.name,
      entity.type,
      entity.entity_id,
      entity.description,
      formatAttributes(entity.attributes),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(resultKeyword);
  });

  return (
    <div style={{ background: '#f6f8fc', minHeight: 'calc(100vh - 120px)', padding: 24 }}>
      <Card style={pageCardStyle} styles={{ body: { padding: 28 } }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <Space align="start" size={14}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: '#edf3ff',
                color: '#3b6dd8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 25,
              }}
            >
              <ApartmentOutlined />
            </div>
            <div>
              <Typography.Title level={2} style={{ margin: 0, color: '#1f2937' }}>
                消融配置
              </Typography.Title>
              <Text type="secondary">
                上传多语言图谱文件，创建消融任务并查看融合后的实体与关系结果。
              </Text>
            </div>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            loading={taskLoading}
            onClick={() => void fetchTasks(taskPage, taskPageSize)}
          >
            刷新任务
          </Button>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} xl={6}>
            <Card bordered={false} style={{ background: '#f8faff', borderRadius: 16 }}>
              <Statistic title="任务总数" value={taskTotal} prefix={<LinkOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card bordered={false} style={{ background: '#f6ffed', borderRadius: 16 }}>
              <Statistic title="当前页已完成" value={completedTaskCount} />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card bordered={false} style={{ background: '#e6f7ff', borderRadius: 16 }}>
              <Statistic title="当前页处理中" value={processingTaskCount} />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card bordered={false} style={{ background: '#fff1f0', borderRadius: 16 }}>
              <Statistic title="当前页失败" value={failedTaskCount} />
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 20, marginBottom: 24 }}>
          <Segmented<PageTab>
            value={activeTab}
            onChange={(value) => setActiveTab(value)}
            options={[
              {
                value: 'result',
                label: (
                  <Space size={8}>
                    <ApartmentOutlined />
                    <span>文件消歧</span>
                  </Space>
                ),
              },
              {
                value: 'group',
                label: (
                  <Space size={8}>
                    <PlusOutlined />
                    <span>消歧词组配置</span>
                  </Space>
                ),
              },
            ]}
            style={{
              padding: 4,
              background: '#f1f3f7',
              borderRadius: 14,
            }}
          />
        </div>

        {activeTab === 'result' ? (
          <>
            <Row gutter={[20, 20]} align="stretch">
              <Col xs={24} xl={8}>
                <Card
                  title={
                    <Space>
                      <CloudUploadOutlined />
                      <span>创建消融任务</span>
                    </Space>
                  }
                  style={{ ...sectionCardStyle, height: '100%' }}
                >
                  <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <div>
                      <Text strong>任务名称</Text>
                      <Input
                        value={taskName}
                        onChange={(event) => setTaskName(event.target.value)}
                        placeholder="请输入本次消融任务名称"
                        maxLength={100}
                        style={{ marginTop: 8 }}
                      />
                    </div>

                    <Dragger
                      multiple
                      accept=".txt,.md,.csv,.json,.doc,.docx"
                      showUploadList={false}
                      beforeUpload={handleBeforeUpload}
                      style={{ borderRadius: 14, background: '#fafcff' }}
                    >
                      <p className="ant-upload-drag-icon">
                        <CloudUploadOutlined style={{ color: '#4a73db' }} />
                      </p>
                      <p className="ant-upload-text">拖拽文件到此处，或点击选择文件</p>
                      <p className="ant-upload-hint">
                        接口会按文件名生成 file_languages 映射，可逐个调整语言。
                      </p>
                    </Dragger>

                    {selectedFiles.length > 0 && (
                      <List
                        size="small"
                        bordered
                        dataSource={selectedFiles}
                        renderItem={(file) => (
                          <List.Item
                            actions={[
                              <Button
                                key="remove"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => void handleRemoveFile(file)}
                                aria-label={`移除 ${file.name}`}
                              />,
                            ]}
                          >
                            <Space style={{ minWidth: 0 }}>
                              <FileTextOutlined style={{ color: '#6b7280' }} />
                              <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
                                <Text ellipsis={{ tooltip: file.name }} style={{ maxWidth: 180 }}>
                                  {file.name}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {formatFileSize(file.size)}
                                </Text>
                              </Space>
                              <Select
                                size="small"
                                value={fileLanguages[file.name] || inferLanguage(file.name)}
                                options={languageOptions}
                                onChange={(value: Language) =>
                                  setFileLanguages((current) => ({
                                    ...current,
                                    [file.name]: value,
                                  }))
                                }
                                style={{ width: 116 }}
                              />
                            </Space>
                          </List.Item>
                        )}
                      />
                    )}

                    {/* <Alert
                      type="info"
                      showIcon
                      message="上传字段"
                      description="files 会重复提交多个文件，file_languages 和 task_name 会按接口要求以 multipart/form-data 发送。"
                    /> */}
                    <Button
                      type="primary"
                      size="large"
                      block
                      icon={<CloudUploadOutlined />}
                      loading={uploading}
                      onClick={() => void handleUpload()}
                    >
                      开始上传并执行消融
                    </Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} xl={16}>
                <Card
                  title={
                    <Space>
                      <ReloadOutlined />
                      <span>消融任务状态</span>
                    </Space>
                  }
                  style={{ ...sectionCardStyle, height: '100%' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <Table<AblationTask>
                    rowKey={(record, index) =>
                      String(getTaskId(record) ?? `${getTaskName(record)}-${index}`)
                    }
                    columns={taskColumns}
                    dataSource={tasks}
                    loading={taskLoading}
                    scroll={{ x: 1000 }}
                    pagination={{
                      current: taskPage,
                      pageSize: taskPageSize,
                      total: taskTotal,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`,
                    }}
                    onChange={(pagination) => {
                      void fetchTasks(pagination.current || 1, pagination.pageSize || taskPageSize);
                    }}
                  />
                </Card>
              </Col>
            </Row>

            <Divider />

            <Card
              title={
                <Space>
                  <ApartmentOutlined />
                  <span>消融详细结果</span>
                  {selectedTask && <Tag color="blue">{getTaskName(selectedTask)}</Tag>}
                </Space>
              }
              extra={
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  value={resultSearch}
                  onChange={(event) => setResultSearch(event.target.value)}
                  placeholder="搜索实体名称、类型或描述"
                  style={{ width: 260 }}
                />
              }
              style={sectionCardStyle}
            >
              {resultLoading ? (
                <div
                  style={{
                    minHeight: 240,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Space direction="vertical" align="center">
                    <LoadingOutlined style={{ fontSize: 28, color: '#4a73db' }} />
                    <Text type="secondary">正在读取任务结果...</Text>
                  </Space>
                </div>
              ) : resultError ? (
                <Alert type="error" showIcon message="结果加载失败" description={resultError} />
              ) : result ? (
                <>
                  <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                    <Col xs={12} sm={8} lg={4}>
                      <Statistic
                        title="输入图谱"
                        value={getStatisticValue(statistics, 'input_graph_count', 0)}
                      />
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Statistic title="实体" value={entityCount} />
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Statistic title="关系" value={relationCount} />
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Statistic
                        title="属性"
                        value={getStatisticValue(statistics, 'attribute_count', 0)}
                      />
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Statistic
                        title="消融映射"
                        value={getStatisticValue(statistics, 'mapping_count', 0)}
                      />
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Statistic title="全局实体" value={globalEntityCount} />
                    </Col>
                  </Row>

                  <Tabs
                    items={[
                      {
                        key: 'entities',
                        label: `实体（${entityCount}）`,
                        children: (
                          <Table<AblationEntity>
                            rowKey={(record, index) =>
                              String(record.entity_id || `${record.name}-${index}`)
                            }
                            columns={entityColumns}
                            dataSource={filteredEntities}
                            pagination={{ pageSize: 10, showSizeChanger: true }}
                            scroll={{ x: 1150 }}
                          />
                        ),
                      },
                      {
                        key: 'relations',
                        label: `关系（${relationCount}）`,
                        children: (
                          <Table<AblationRelation>
                            rowKey={(record, index) =>
                              `${record.head_entity_id}-${record.relationCode}-${record.tail_entity_id}-${index}`
                            }
                            columns={relationColumns}
                            dataSource={result.relations || []}
                            pagination={{ pageSize: 10, showSizeChanger: true }}
                            scroll={{ x: 1050 }}
                          />
                        ),
                      },
                      {
                        key: 'resolutions',
                        label: `消融映射（${resolutionCount}）`,
                        children: (
                          <Table<AblationResolution>
                            rowKey={(record, index) =>
                              `${record.mention}-${record.entity_id}-${index}`
                            }
                            columns={resolutionColumns}
                            dataSource={result.resolutions || []}
                            pagination={{ pageSize: 10, showSizeChanger: true }}
                            scroll={{ x: 900 }}
                          />
                        ),
                      },
                      {
                        key: 'global-entities',
                        label: `全局实体（${globalEntityCount}）`,
                        children: (
                          <Table<AblationGlobalEntity>
                            rowKey={(record, index) =>
                              String(record.entity_id || `${record.standard_name}-${index}`)
                            }
                            columns={globalEntityColumns}
                            dataSource={result.global_entities || []}
                            pagination={{ pageSize: 10, showSizeChanger: true }}
                            scroll={{ x: 1250 }}
                          />
                        ),
                      },
                    ]}
                  />
                </>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="请从上方任务列表选择一个任务查看详细结果"
                />
              )}
            </Card>
          </>
        ) : (
          <Card style={sectionCardStyle} styles={{ body: { padding: 20 } }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
              消歧词组配置
            </div>
            <div style={{ color: '#8a94a6', marginBottom: 18 }}>
              配置「标准词 → 别名」映射规则，后续上传的文件将自动按此规则消歧
            </div>

            <div
              style={{
                marginBottom: 16,
                borderRadius: 12,
                background: '#f4f7fd',
                border: '1px solid #e7edf8',
                color: '#7b8798',
                padding: '10px 14px',
              }}
            >
              启用的词组会在文件处理阶段生效。命中任一别名的词条都会被归一化为对应标准词。
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              <Input
                placeholder="输入新的标准词，如 Apple"
                style={{ flex: '1 1 480px', minWidth: 280, borderRadius: 10 }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                style={{ borderRadius: 10 }}
              >
                新增词组
              </Button>
            </div>

            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              {groups.map((group) => (
                <div
                  key={group.key}
                  style={{
                    borderRadius: 16,
                    border: '1px solid #e9edf5',
                    background: '#fff',
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <Space size={12} wrap>
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            border: 'none',
                            borderRadius: 10,
                            background: '#edf3ff',
                            color: '#3b6dd8',
                            fontWeight: 700,
                            padding: '6px 10px',
                          }}
                        >
                          {group.standardWord}
                        </Tag>
                        <Text style={{ color: '#8a94a6' }}>命中 {group.hitCount} 次</Text>
                      </Space>

                      <Space size={[8, 8]} wrap style={{ marginTop: 12 }}>
                        {group.aliases.map((alias) => (
                          <Tag
                            key={alias}
                            closable
                            style={{
                              marginInlineEnd: 0,
                              borderRadius: 999,
                              background: '#fff',
                              border: '1px solid #e6eaf2',
                              paddingInline: 10,
                            }}
                          >
                            {alias}
                          </Tag>
                        ))}
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            borderRadius: 999,
                            background: '#fff',
                            border: '1px dashed #d7ddeb',
                            paddingInline: 10,
                            color: '#6b7280',
                          }}
                        >
                          ＋ 添加别名
                        </Tag>
                      </Space>
                    </div>

                    <Space size={14}>
                      <Space size={8}>
                        <Text style={{ color: '#8a94a6' }}>
                          {group.enabled ? '已启用' : '已停用'}
                        </Text>
                        <Switch
                          checked={group.enabled}
                          onChange={(checked) => {
                            setGroups((current) =>
                              current.map((item) =>
                                item.key === group.key ? { ...item, enabled: checked } : item,
                              ),
                            );
                          }}
                        />
                      </Space>
                      <Button type="text" icon={<DeleteOutlined />} style={{ color: '#8a94a6' }} />
                    </Space>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        )}
      </Card>
    </div>
  );
}
