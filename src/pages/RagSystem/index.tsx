'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { history, request, useModel } from '@umijs/max';
import {
  ApiOutlined,
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  PlusOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAccessToken } from '@/access';
import { API_PREFIX } from '@/constants';
import {
  addEmbedModelConfig,
  getEmbedModelConfigPage,
  testEmbedModelConfig,
  type EmbedModelConfigItem,
} from '@/services/biz/embed-model-config';
import {
  addLlmModelConfig,
  getLlmModelConfigPage,
  testLlmModelConfig,
  type LlmModelConfigItem,
} from '@/services/biz/llm-model-config';
import {
  type AssistantItem,
  type ChatReference,
  type ChatItem,
  type ReferenceChunkItem,
  assertSuccessResponse,
  getAssistantList,
  getChatList,
  getChatMessages,
  getResponseData,
  normalizeChatMessage,
  normalizeAssistant,
  normalizeChat,
  pickList,
  saveChatMessage,
} from '@/services/biz/rag-system';
import './SmartQA.css';

const { Text } = Typography;
const { TextArea } = Input;

type MessageItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  reference?: ChatReference;
  status?: 'streaming' | 'done' | 'error';
};

type KnowledgeBaseOption = {
  label: string;
  value: number | string;
};

type ModelConfigItem = LlmModelConfigItem | EmbedModelConfigItem;

type ModelPageItem = ModelConfigItem & {
  key: number;
};

type ModelSelectorMode = 'llm' | 'embed';

type ModelFormValues = {
  name: string;
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKey?: string;
  enabled: boolean;
  sort?: number;
  remark?: string;
};

type AssistantFormValues = {
  id?: number | string;
  name: string;
  openingStatement?: string;
  prompt?: string;
  chatModelName?: string;
  chatModelUrl?: string;
  embeddingModelName?: string;
  embeddingModelUrl?: string;
  knowledgeBaseIds: Array<number | string>;
};

type ChatStreamRequestPayload = {
  question: string;
  knowledge_base_id: Array<number | string>;
  embed_api_type?: 'auto' | 'ollama' | 'openai';
  embed_base_url?: string;
  embed_model?: string;
  llm_base_url?: string;
  llm_model?: string;
  enable_thinking?: 'true' | 'false';
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  max_history_turns?: number;
  max_history_chars?: number;
};

type ChatStreamChunk = {
  code?: number;
  msg?: string;
  data?: {
    done?: boolean;
    content?: string;
    delta?: string;
    answer?: string;
    text?: string;
    sources?: string[];
    sourceList?: string[];
    reference?: ChatReference;
    sessionId?: number | string;
    messageId?: string;
  };
};

const QA_STREAM_ENDPOINT = '/api/knowledge/qa';
const MAX_HISTORY_TURNS = 5;
const MAX_HISTORY_CHARS = 8000;
const MODEL_PAGE_SIZE = 10;
const modelProviderOptions = [
  { label: 'vLLM', value: 'vllm' },
  { label: 'Ollama', value: 'ollama' },
  { label: 'Sub2API', value: 'sub2api' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Claude', value: 'claude' },
];
const modelApiTypeOptions = [
  { label: 'OpenAI 兼容协议', value: 'openai' },
  { label: 'Claude 协议', value: 'claude' },
];
const embedModelProviderOptions = [
  { label: 'vLLM', value: 'vllm' },
  { label: 'Ollama', value: 'ollama' },
];
const embedModelApiTypeOptions = [{ label: 'OpenAI 兼容协议', value: 'openai' }];

// const recommendQuestions = [
//   {
//     title: '请总结这个助理的主要能力',
//     desc: '快速了解当前助理可以处理哪些类型的问题。',
//   },
//   {
//     title: '帮我整理一份标准问答模板',
//     desc: '适用于客服、运营或业务支持等常见问答场景。',
//   },
//   {
//     title: '请根据当前配置给出回答示例',
//     desc: '直接查看这个助理的输出风格和回复效果。',
//   },
// ];

const CHAT_DELETE_MODAL_TEXT = {
  title: '确认删除会话',
  content: '删除后不可恢复，是否继续？',
  okText: '删除',
  cancelText: '取消',
};

const ASSISTANT_DELETE_MODAL_TEXT = {
  title: '确认删除助理',
  content: '删除后不可恢复，是否继续？',
  okText: '删除',
  cancelText: '取消',
};

const parseMarkdown = (text: string): string => {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br />');
  return html;
};

const getNowLabel = () =>
  new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDateTime = (value?: string | number) => {
  if (!value) return '刚刚更新';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getResponseMessage = (response: any, fallback: string) =>
  response?.msg || response?.message || response?.data?.msg || fallback;

const getFetchResponseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorBody = await response.clone().json();
      return getResponseMessage(errorBody, fallback);
    }

    const errorText = await response.clone().text();
    return errorText || fallback;
  } catch {
    return fallback;
  }
};

const extractReadableErrorMessage = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  const text = value.trim();
  if (!text) {
    return '';
  }

  const jsonStartIndex = text.indexOf('{');
  if (jsonStartIndex >= 0) {
    const maybeJsonText = text.slice(jsonStartIndex);
    try {
      const parsed = JSON.parse(maybeJsonText);
      const nestedMessage =
        parsed?.message || parsed?.msg || parsed?.error?.message || parsed?.data?.message;
      if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
        const prefix = text.slice(0, jsonStartIndex).trim().replace(/[:：]\s*$/, '');
        return prefix ? `${prefix}：${nestedMessage.trim()}` : nestedMessage.trim();
      }
    } catch {
      // ignore parse error and fall through to raw text
    }
  }

  return text;
};

const getStreamChunkErrorMessage = (chunk: any, fallback: string) => {
  if (!chunk || typeof chunk !== 'object') {
    return fallback;
  }

  return extractReadableErrorMessage(
    chunk?.msg ||
      chunk?.message ||
      chunk?.data?.msg ||
      chunk?.data?.message ||
      chunk?.data?.error?.message ||
      chunk?.error?.message ||
      fallback,
  );
};

const isSuccessResponse = (response: any) => {
  if (!response || typeof response !== 'object') return true;
  if (typeof response.code === 'number') return response.code === 200;
  return true;
};

const qaConsoleStyles = {
  connect: 'background:#1d4ed8;color:#fff;padding:2px 8px;border-radius:999px;font-weight:600;',
  event: 'background:#0f766e;color:#fff;padding:2px 8px;border-radius:999px;font-weight:600;',
  chunk: 'background:#7c3aed;color:#fff;padding:2px 8px;border-radius:999px;font-weight:600;',
  done: 'background:#15803d;color:#fff;padding:2px 8px;border-radius:999px;font-weight:600;',
  error: 'background:#b91c1c;color:#fff;padding:2px 8px;border-radius:999px;font-weight:600;',
};

const getReferenceChunkFileName = (chunk: ReferenceChunkItem) =>
  String(chunk.file_name ?? chunk.file_path ?? chunk.docId ?? '未命名文档');

const getReferenceSourceNames = (reference?: ChatReference) => {
  if (!reference || Number(reference.total ?? 0) <= 0) return [];
  const chunks = Array.isArray(reference.chunks) ? reference.chunks : [];
  return Array.from(new Set(chunks.map(getReferenceChunkFileName).filter(Boolean)));
};

const getReferenceChunks = (reference?: ChatReference) => {
  if (!reference || Number(reference.total ?? 0) <= 0) return [];
  return Array.isArray(reference.chunks) ? reference.chunks : [];
};

const getUniqueReferenceChunks = (reference?: ChatReference) => {
  const chunks = getReferenceChunks(reference);
  const seen = new Set<string>();
  return chunks.filter((chunk, index) => {
    const key = String(chunk.docId ?? chunk.file_name ?? chunk.file_path ?? index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const formatReferenceValue = (value: unknown, fallback = '-') => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : fallback;
  }
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value);
};

const formatReferenceScore = (score?: number) => {
  if (score === undefined || score === null || Number.isNaN(Number(score))) {
    return '-';
  }
  return `${(Number(score) * 100).toFixed(2)}%`;
};

const buildAssistantKnowledgeBaseMap = (assistant?: AssistantItem | null) => {
  if (!assistant) return {};

  return assistant.knowledgeBaseIds.reduce((result: Record<string, string>, id, index) => {
    result[String(id)] = assistant.knowledgeBaseNames?.[index] || `知识库 ${id}`;
    return result;
  }, {});
};

export default function RagSystemPage() {
  const { initialState } = useModel('@@initialState');
  const [assistantForm] = Form.useForm<AssistantFormValues>();
  const [modelForm] = Form.useForm<ModelFormValues>();
  const [assistants, setAssistants] = useState<AssistantItem[]>([]);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [knowledgeOptions, setKnowledgeOptions] = useState<KnowledgeBaseOption[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<AssistantItem | null>(null);
  const [savingAssistant, setSavingAssistant] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [modelSelectorMode, setModelSelectorMode] = useState<ModelSelectorMode>('llm');
  const [modelListLoading, setModelListLoading] = useState(false);
  const [modelList, setModelList] = useState<ModelPageItem[]>([]);
  const [modelPageNo, setModelPageNo] = useState(1);
  const [modelTotal, setModelTotal] = useState(0);
  const [modelCreateOpen, setModelCreateOpen] = useState(false);
  const [modelCreating, setModelCreating] = useState(false);
  const [modelTesting, setModelTesting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [activeAssistantId, setActiveAssistantId] = useState<number | string>('');
  const [activeChatId, setActiveChatId] = useState<number | string>('');
  const [typedWelcomeText, setTypedWelcomeText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const loadedChatMessagesRef = useRef<Record<string, boolean>>({});
  const chatRequestRef = useRef<{
    assistantId: number | string;
    promise: Promise<void>;
  } | null>(null);

  const activeAssistant = useMemo(
    () => assistants.find((item) => item.id === activeAssistantId),
    [assistants, activeAssistantId],
  );

  const activeChat = useMemo(
    () => chats.find((item) => item.id === activeChatId),
    [chats, activeChatId],
  );

  const activeAssistantKnowledgeBaseMap = useMemo(
    () => buildAssistantKnowledgeBaseMap(activeAssistant),
    [activeAssistant],
  );

  const modelTableColumns = useMemo<ColumnsType<ModelPageItem>>(() => {
    const columns: ColumnsType<ModelPageItem> = [
      {
        title: '模型名称',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        render: (_value, record) => (
          <Space size={8} wrap>
            <span>{record.name || '-'}</span>
            {modelSelectorMode === 'embed' && Number(record.defaulted) === 1 && (
              <Tag color="gold">默认</Tag>
            )}
          </Space>
        ),
      },
      {
        title: '提供方',
        dataIndex: 'providerType',
        key: 'providerType',
        width: 120,
        render: (value: string) => <Tag color="blue">{value || '-'}</Tag>,
      },
      {
        title: '协议',
        dataIndex: 'apiType',
        key: 'apiType',
        width: 120,
        render: (value: string) => <Tag color="purple">{value || '-'}</Tag>,
      },
      {
        title: '模型编码',
        dataIndex: 'modelCode',
        key: 'modelCode',
        width: 220,
        render: (value: string) => value || '-',
      },
      {
        title: '模型地址',
        dataIndex: 'baseUrl',
        key: 'baseUrl',
        ellipsis: true,
        render: (value: string) => value || '-',
      },
    ];

    if (modelSelectorMode === 'llm') {
      columns.push({
        title: '状态',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 100,
        render: (value: number) => (
          <Tag color={Number(value) === 1 ? 'success' : 'default'}>
            {Number(value) === 1 ? '启用' : '停用'}
          </Tag>
        ),
      });
    }

    columns.push({
      title: '操作',
      key: 'action',
      width: 100,
      render: (_value, record) => (
        <Button
          type="link"
          disabled={Number(record.enabled) !== 1}
          onClick={() => handleSelectModel(record)}
        >
          选择
        </Button>
      ),
    });

    return columns;
  }, [modelSelectorMode]);

  const updateChatMessages = (
    chatId: number | string,
    updater: (messages: MessageItem[]) => MessageItem[],
  ) => {
    setChats((prev) =>
      prev.map((item) =>
        item.id === chatId
          ? {
              ...item,
              messages: updater((item.messages as MessageItem[]) || []),
            }
          : item,
      ),
    );
  };

  const welcomeText = useMemo(() => {
    if (activeChat) {
      return activeAssistant?.openingStatement || '你好，我是你的助理，有什么可以帮你？';
    }
    return '你好，请选择一个会话开始问答。';
  }, [activeAssistant?.openingStatement, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, messagesLoading]);

  useEffect(() => {
    setTypedWelcomeText('');
    if (!welcomeText) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedWelcomeText(welcomeText.slice(0, index));
      if (index >= welcomeText.length) {
        window.clearInterval(timer);
      }
    }, 55);

    return () => {
      window.clearInterval(timer);
    };
  }, [welcomeText]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  const loadModelList = async (mode: ModelSelectorMode, pageNo = 1) => {
    setModelListLoading(true);
    try {
      const response: any =
        mode === 'llm'
          ? await getLlmModelConfigPage({
              pageNo,
              pageSize: MODEL_PAGE_SIZE,
            })
          : await getEmbedModelConfigPage({
              pageNo,
              pageSize: MODEL_PAGE_SIZE,
            });
      const list = response?.data?.list || response?.list || response?.rows || [];
      const total = Number(response?.data?.total || response?.total || 0);
      setModelList(
        Array.isArray(list)
          ? list.map((item: ModelConfigItem) => ({
              ...item,
              key: item.id,
            }))
          : [],
      );
      setModelTotal(total);
      setModelPageNo(pageNo);
    } catch (error) {
      console.error(error);
      message.error(mode === 'llm' ? '加载问答模型列表失败' : '加载向量模型列表失败');
    } finally {
      setModelListLoading(false);
    }
  };

  const openModelSelector = async (mode: ModelSelectorMode) => {
    setModelSelectorMode(mode);
    setModelSelectorOpen(true);
    await loadModelList(mode, 1);
  };

  const openCreateModelModal = () => {
    modelForm.setFieldsValue({
      name: '',
      providerType: 'vllm',
      apiType: 'openai',
      baseUrl: '',
      modelCode: '',
      apiKey: '',
      enabled: true,
      sort: 0,
      remark: '',
    });
    setModelCreateOpen(true);
  };

  const handleModelProviderChange = (value: string) => {
    if (value === 'claude') {
      modelForm.setFieldValue('apiType', 'claude');
      return;
    }
    if (modelForm.getFieldValue('apiType') === 'claude') {
      modelForm.setFieldValue('apiType', 'openai');
    }
  };

  const buildModelPayload = async () => {
    const values = await modelForm.validateFields();
    return {
      name: values.name.trim(),
      providerType: values.providerType,
      apiType: values.apiType,
      baseUrl: values.baseUrl.trim(),
      modelCode: values.modelCode.trim(),
      apiKey: values.apiKey?.trim() || '',
      enabled: values.enabled ? 1 : 0,
      sort: Number(values.sort || 0),
      remark: values.remark?.trim() || '',
    };
  };

  const handleCreateModel = async () => {
    setModelCreating(true);
    try {
      const payload = await buildModelPayload();
      const response: any =
        modelSelectorMode === 'llm'
          ? await addLlmModelConfig(payload)
          : await addEmbedModelConfig(payload);
      if (response?.code === 200) {
        message.success(modelSelectorMode === 'llm' ? '模型新增成功' : '向量模型新增成功');
        setModelCreateOpen(false);
        await loadModelList(modelSelectorMode, 1);
      } else {
        message.error(
          getResponseMessage(
            response,
            modelSelectorMode === 'llm' ? '模型新增失败' : '向量模型新增失败',
          ),
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setModelCreating(false);
    }
  };

  const handleTestModel = async () => {
    setModelTesting(true);
    try {
      const payload = await buildModelPayload();
      const response: any =
        modelSelectorMode === 'llm'
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
            });
      if (response?.code === 200) {
        Modal.info({
          title: response?.data?.success
            ? modelSelectorMode === 'llm'
              ? '模型测试成功'
              : '向量模型测试成功'
            : modelSelectorMode === 'llm'
              ? '模型测试结果'
              : '向量模型测试结果',
          content: response?.data?.message || '-',
        });
      } else {
        message.error(
          getResponseMessage(
            response,
            modelSelectorMode === 'llm' ? '模型测试失败' : '向量模型测试失败',
          ),
        );
      }
    } catch (error) {
      console.error(error);
      message.error(modelSelectorMode === 'llm' ? '模型测试失败' : '向量模型测试失败');
    } finally {
      setModelTesting(false);
    }
  };

  const handleSelectModel = (model: ModelConfigItem) => {
    if (modelSelectorMode === 'llm') {
      assistantForm.setFieldsValue({
        chatModelName: model.modelCode || model.name,
        chatModelUrl: model.baseUrl,
      });
    } else {
      assistantForm.setFieldsValue({
        embeddingModelName: model.modelCode || model.name,
        embeddingModelUrl: model.baseUrl,
      });
    }
    setModelSelectorOpen(false);
  };

  const loadAssistants = async () => {
    setAssistantLoading(true);
    try {
      const response = await getAssistantList();
      const list = pickList(assertSuccessResponse(response, '加载助理列表失败'));

      const normalized = list
        .map(normalizeAssistant)
        .filter((item) => item.id !== undefined && item.id !== null && item.id !== '');

      setAssistants(normalized);
      setActiveAssistantId((prev) => {
        if (normalized.some((item) => item.id === prev)) return prev;
        return normalized[0]?.id ?? '';
      });
    } catch (error: any) {
      message.error(error?.message || '加载助理列表失败');
      setAssistants([]);
      setActiveAssistantId('');
    } finally {
      setAssistantLoading(false);
    }
  };

  const loadChats = async (
    assistantId: number | string,
    options?: { preferredChatId?: number | string; preferredTitle?: string },
  ) => {
    if (!assistantId) {
      setChats([]);
      setActiveChatId('');
      return;
    }

    if (chatRequestRef.current?.assistantId === assistantId) {
      await chatRequestRef.current.promise;
      return;
    }

    let requestPromise: Promise<void> | null = null;
    requestPromise = (async () => {
      setChatLoading(true);
      try {
        const list = await getChatList(assistantId);

        const normalized = list
          .map((item) => normalizeChat(item))
          .filter((item) => item.id !== undefined && item.id !== null && item.id !== '');

        setChats(normalized);
        loadedChatMessagesRef.current = {};
        setActiveChatId((prev) => {
          if (
            options?.preferredChatId !== undefined &&
            options.preferredChatId !== null &&
            normalized.some((item) => item.id === options.preferredChatId)
          ) {
            return options.preferredChatId;
          }
          if (options?.preferredTitle) {
            const matchedChat = [...normalized]
              .reverse()
              .find((item) => item.title === options.preferredTitle);
            if (matchedChat) {
              return matchedChat.id;
            }
          }
          if (normalized.some((item) => item.id === prev)) return prev;
          return normalized[0]?.id ?? '';
        });
      } catch (error: any) {
        message.error(error?.message || '加载会话列表失败');
        setChats([]);
        setActiveChatId('');
      } finally {
        if (requestPromise && chatRequestRef.current?.promise === requestPromise) {
          chatRequestRef.current = null;
        }
        setChatLoading(false);
      }
    })();

    chatRequestRef.current = {
      assistantId,
      promise: requestPromise,
    };

    await requestPromise;
  };

  useEffect(() => {
    void loadAssistants();
  }, []);

  useEffect(() => {
    const loadKnowledgeBases = async () => {
      setLoadingKnowledge(true);
      try {
        const response: any = await request(`${API_PREFIX}/biz/knowledge-base/page`, {
          method: 'GET',
          params: { pageNo: 1, pageSize: 1000 },
        });
        const list = pickList(response);
        setKnowledgeOptions(
          list.map((item: any) => ({
            label: String(item.name ?? item.label ?? item.id),
            value: item.id,
          })),
        );
      } catch {
        setKnowledgeOptions([]);
      } finally {
        setLoadingKnowledge(false);
      }
    };

    void loadKnowledgeBases();
  }, []);

  useEffect(() => {
    void loadChats(activeAssistantId);
  }, [activeAssistantId]);

  useEffect(() => {
    const loadCurrentChatMessages = async () => {
      if (!activeChatId) return;
      const chatKey = String(activeChatId);
      if (loadedChatMessagesRef.current[chatKey]) return;

      setMessagesLoading(true);
      try {
        const list = await getChatMessages(activeChatId);
        const normalized = list.map(normalizeChatMessage);
        const historyMessages: MessageItem[] = normalized.flatMap((item, index) => {
          const baseTimestamp = String(formatDateTime(item.createTime));
          const questionMessage: MessageItem[] = item.question
            ? [
                {
                  id: `history-q-${item.id ?? index}`,
                  role: 'user',
                  content: item.question,
                  timestamp: baseTimestamp,
                },
              ]
            : [];
          const answerMessage: MessageItem[] = item.answer
            ? [
                {
                  id: `history-a-${item.id ?? index}`,
                  role: 'assistant',
                  content: item.answer,
                  timestamp: baseTimestamp,
                  reference: item.reference,
                  sources: getReferenceSourceNames(item.reference),
                  status: 'done',
                },
              ]
            : [];
          return [...questionMessage, ...answerMessage];
        });

        updateChatMessages(activeChatId, () => historyMessages);
        loadedChatMessagesRef.current[chatKey] = true;
      } catch (error: any) {
        message.error(error?.message || '加载聊天记录失败');
      } finally {
        setMessagesLoading(false);
      }
    };

    void loadCurrentChatMessages();
  }, [activeChatId]);

  useEffect(() => {
    if (!assistantModalOpen || !editingAssistant) return;
    assistantForm.setFieldsValue({
      ...editingAssistant,
    });
  }, [assistantForm, assistantModalOpen, editingAssistant]);

  const openCreateAssistant = () => {
    setEditingAssistant(null);
    assistantForm.resetFields();
    assistantForm.setFieldsValue({
      knowledgeBaseIds: [],
    });
    setAssistantModalOpen(true);
  };

  const openEditAssistant = (assistant: AssistantItem) => {
    setEditingAssistant(assistant);
    setAssistantModalOpen(true);
  };

  const handleSaveAssistant = async () => {
    const values = await assistantForm.validateFields();

    const payload = {
      id: editingAssistant?.id,
      name: values.name,
      openingStatement: values.openingStatement,
      prompt: values.prompt,
      chatModelName: values.chatModelName,
      chatModelUrl: values.chatModelUrl,
      embeddingModelName: values.embeddingModelName,
      embeddingModelUrl: values.embeddingModelUrl,
      knowledgeBaseIds: values.knowledgeBaseIds,
    };
    setSavingAssistant(true);
    try {
      if (editingAssistant) {
        assertSuccessResponse(
          await request(`${API_PREFIX}/biz/qa-assistant/update`, {
            method: 'PUT',
            data: payload,
          }),
          '保存助理失败',
        );
        message.success('更新成功');
      } else {
        assertSuccessResponse(
          await request(`${API_PREFIX}/biz/qa-assistant/create`, {
            method: 'POST',
            data: payload,
          }),
          '保存助理失败',
        );
        message.success('创建成功');
      }
      setAssistantModalOpen(false);
      await loadAssistants();
    } catch (error: any) {
      message.error(error?.message || '保存助理失败');
    } finally {
      setSavingAssistant(false);
    }
  };

  const getDefaultChatTitle = () => `会话 ${chats.length + 1}`;

  const handlePrepareCreateChat = () => {
    if (!activeAssistant) {
      message.warning('请先选择助理');
      return;
    }

    setNewChatTitle((prev) => prev || getDefaultChatTitle());
  };

  const handleCreateChat = async () => {
    if (!activeAssistant) {
      message.warning('请先选择助理');
      return;
    }

    const title = newChatTitle.trim() || getDefaultChatTitle();

    setCreatingChat(true);
    try {
      const createResponse = assertSuccessResponse(
        await request(`${API_PREFIX}/biz/qa-chat/create`, {
          method: 'POST',
          data: {
            assistantId: activeAssistant.id,
            title,
          },
        }),
        '创建会话失败',
      );
      const createdChat = getResponseData<{
        id?: number | string;
        chatId?: number | string;
        qaChatId?: number | string;
      }>(createResponse);
      const createdChatId = createdChat?.id ?? createdChat?.chatId ?? createdChat?.qaChatId;
      message.success('创建成功');
      setNewChatTitle('');
      await loadChats(activeAssistant.id, {
        preferredChatId: createdChatId,
        preferredTitle: title,
      });
    } catch (error: any) {
      message.error(error?.message || '创建会话失败');
    } finally {
      setCreatingChat(false);
    }
  };

  const handleDeleteAssistant = async (assistantId: number | string) => {
    try {
      assertSuccessResponse(
        await request(`${API_PREFIX}/biz/qa-assistant/delete`, {
          method: 'DELETE',
          params: { id: assistantId },
        }),
        '删除助理失败',
      );
      message.success('删除成功');
      await loadAssistants();
    } catch (error: any) {
      message.error(error?.message || '删除助理失败');
    }
  };

  const handleDeleteChat = async (chatId: number | string) => {
    try {
      assertSuccessResponse(
        await request(`${API_PREFIX}/biz/qa-chat/delete`, {
          method: 'DELETE',
          params: { id: chatId },
        }),
        '删除会话失败',
      );
      message.success('删除成功');
      await loadChats(activeAssistantId);
    } catch (error: any) {
      message.error(error?.message || '删除会话失败');
    }
  };

  const handleOpenReferenceDoc = (chunk: ReferenceChunkItem) => {
    if (!chunk.docId) {
      message.warning('未获取到文档ID');
      return;
    }
    history.push(`/data/document/${chunk.docId}`);
  };

  const handleOpenKnowledgeBase = (knowledgeBaseId: number | string) => {
    if (knowledgeBaseId === undefined || knowledgeBaseId === null || knowledgeBaseId === '') {
      message.warning('未获取到知识库ID');
      return;
    }
    history.push(`/knowledge/detail/${knowledgeBaseId}`);
  };

  const handleClearChat = () => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;

    if (!activeChat) return;
    loadedChatMessagesRef.current[String(activeChat.id)] = true;
    setChats((prev) =>
      prev.map((item) => (item.id === activeChat.id ? { ...item, messages: [] } : item)),
    );
    message.success('对话已清空');
  };

  const appendQuestion = async (question: string) => {
    if (!question.trim() || !activeChat || !activeAssistant) return;

    streamAbortRef.current?.abort();
    const trimmedQuestion = question.trim();
    const targetChatId = activeChat.id;
    let latestReference: ChatReference | undefined;
    let latestAnswerSnapshot = '';
    let hasSavedCurrentRound = false;

    const userMessage: MessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedQuestion,
      timestamp: getNowLabel(),
    };

    const assistantMessageId = `assistant-${Date.now()}`;

    setChats((prev) =>
      prev.map((item) =>
        item.id === targetChatId
          ? {
              ...item,
              title: item.messages.length === 0 ? trimmedQuestion.slice(0, 16) : item.title,
              messages: [...item.messages, userMessage],
            }
          : item,
      ),
    );
    setInputValue('');
    setMessagesLoading(true);

    const requestPayload: ChatStreamRequestPayload = {
      question: trimmedQuestion,
      knowledge_base_id: activeAssistant.knowledgeBaseIds,
      embed_api_type: 'auto',
      embed_base_url: activeAssistant.embeddingModelUrl,
      embed_model: activeAssistant.embeddingModelName,
      llm_base_url: activeAssistant.chatModelUrl,
      llm_model: activeAssistant.chatModelName,
      enable_thinking: 'false',
      history: activeChat.messages
        .filter((item) => item.role === 'user' || item.role === 'assistant')
        .map((item) => ({
          role: item.role,
          content: item.content,
        })),
      max_history_turns: MAX_HISTORY_TURNS,
      max_history_chars: MAX_HISTORY_CHARS,
    };

    const ensureAssistantMessage = (initialPatch?: Partial<MessageItem>) => {
      setChats((prev) =>
        prev.map((item) => {
          if (item.id !== targetChatId) return item;
          const hasAssistantMessage = item.messages.some(
            (messageItem) => messageItem.id === assistantMessageId,
          );
          if (hasAssistantMessage) return item;
          return {
            ...item,
            messages: [
              ...item.messages,
              {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: getNowLabel(),
                sources: [],
                reference: undefined,
                status: 'streaming',
                ...initialPatch,
              },
            ],
          };
        }),
      );
    };

    const updateAssistantMessage = (updater: (messageItem: MessageItem) => MessageItem) => {
      setChats((prev) =>
        prev.map((item) =>
          item.id === targetChatId
            ? {
                ...item,
                messages: item.messages.map((messageItem) =>
                  messageItem.id === assistantMessageId ? updater(messageItem) : messageItem,
                ),
              }
            : item,
        ),
      );
    };

    const finishStreamMessage = (patch?: Partial<MessageItem>) => {
      ensureAssistantMessage(patch);
      updateAssistantMessage((messageItem) => ({
        ...messageItem,
        ...patch,
        status: patch?.status ?? 'done',
        timestamp: getNowLabel(),
      }));
      setMessagesLoading(false);
      streamAbortRef.current = null;
    };

    const persistChatRound = async (answer: string, reference?: ChatReference) => {
      if (hasSavedCurrentRound) return;
      hasSavedCurrentRound = true;
      try {
        await saveChatMessage({
          chatId: targetChatId,
          question: trimmedQuestion,
          answer,
          reference,
        });
      } catch (error: any) {
        hasSavedCurrentRound = false;
        message.warning(error?.message || '聊天记录保存失败');
      }
    };

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    try {
      await fetchEventSource(QA_STREAM_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAccessToken() || ''}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal,
        openWhenHidden: true,
        async onopen(response) {
          console.groupCollapsed('%cQA STREAM 连接建立', qaConsoleStyles.connect, {
            url: QA_STREAM_ENDPOINT,
            status: response.status,
            ok: response.ok,
            time: new Date().toLocaleString('zh-CN'),
            requestPayload,
          });
          console.groupEnd();
          if (!response.ok) {
            const errorMessage = await getFetchResponseErrorMessage(
              response,
              `HTTP ${response.status} ${response.statusText || ''}`.trim(),
            );
            throw new Error(`对话接口连接失败：${errorMessage}`);
          }
        },
        onmessage(event) {
          console.groupCollapsed('%cQA STREAM EVENT', qaConsoleStyles.event, {
            event: event.event || 'message',
            id: event.id || '',
            retry: event.retry ?? '',
            time: new Date().toLocaleString('zh-CN'),
          });
          console.log('raw event.data:', event.data);
          console.groupEnd();

          if (!event.data || event.data === 'connected') return;
          if (event.data === '[DONE]') {
            console.log('%cQA STREAM DONE', qaConsoleStyles.done, {
              reason: '[DONE]',
              time: new Date().toLocaleString('zh-CN'),
            });
            finishStreamMessage();
            return;
          }

          let chunk: ChatStreamChunk | null = null;
          try {
            chunk = JSON.parse(event.data) as ChatStreamChunk;
          } catch {
            console.log('%cQA STREAM CHUNK', qaConsoleStyles.chunk, {
              mode: 'plain-text',
              text: event.data,
              time: new Date().toLocaleString('zh-CN'),
            });
            ensureAssistantMessage();
            updateAssistantMessage((messageItem) => ({
              ...messageItem,
              content: `${messageItem.content}${event.data}`,
            }));
            return;
          }

          const chunkData = chunk?.data;
          if (chunk?.code && chunk.code !== 200) {
            throw new Error(getStreamChunkErrorMessage(chunk, '对话接口返回失败'));
          }

          if (
            chunkData &&
            typeof chunkData === 'object' &&
            typeof (chunkData as any).code === 'number' &&
            (chunkData as any).code !== 200
          ) {
            throw new Error(getStreamChunkErrorMessage(chunk, '对话接口返回失败'));
          }

          const streamedAnswer =
            chunkData?.answer ?? chunkData?.content ?? chunkData?.text ?? chunkData?.delta ?? '';
          const delta = chunkData?.delta ?? chunkData?.content ?? chunkData?.text ?? '';
          latestReference = chunkData?.reference ?? latestReference;
          const sourceNames = getReferenceSourceNames(latestReference);

          if (streamedAnswer) {
            latestAnswerSnapshot = streamedAnswer;
          }

          console.log('%cQA STREAM CHUNK', qaConsoleStyles.chunk, {
            code: chunk?.code ?? 200,
            done: chunkData?.done ?? false,
            delta,
            answer: chunkData?.answer ?? '',
            reference: chunkData?.reference ?? null,
            sources: chunkData?.sources ?? chunkData?.sourceList ?? [],
            raw: chunk,
            time: new Date().toLocaleString('zh-CN'),
          });

          if (streamedAnswer) {
            ensureAssistantMessage();
            updateAssistantMessage((messageItem) => ({
              ...messageItem,
              content:
                chunkData?.answer && chunkData.answer.startsWith(messageItem.content)
                  ? chunkData.answer
                  : `${messageItem.content}${delta || streamedAnswer}`,
              reference: latestReference ?? messageItem.reference,
              sources:
                sourceNames.length > 0
                  ? sourceNames
                  : chunkData?.sources || chunkData?.sourceList || messageItem.sources,
            }));
          }

          if (chunkData?.done) {
            void persistChatRound(latestAnswerSnapshot, latestReference);
            console.log('%cQA STREAM DONE', qaConsoleStyles.done, {
              reason: 'chunk.data.done',
              sources: chunkData.sources ?? chunkData.sourceList ?? [],
              time: new Date().toLocaleString('zh-CN'),
            });
            finishStreamMessage({
              content: latestAnswerSnapshot,
              reference: latestReference,
              sources:
                sourceNames.length > 0 ? sourceNames : (chunkData.sources ?? chunkData.sourceList),
            });
          }
        },
        onclose() {
          if (latestAnswerSnapshot) {
            void persistChatRound(latestAnswerSnapshot, latestReference);
          }
          console.log('%cQA STREAM CLOSED', qaConsoleStyles.done, {
            time: new Date().toLocaleString('zh-CN'),
          });
          finishStreamMessage({
            content: latestAnswerSnapshot,
            reference: latestReference,
            sources: getReferenceSourceNames(latestReference),
          });
        },
        onerror(error) {
          console.error('%cQA STREAM ERROR', qaConsoleStyles.error, {
            error,
            time: new Date().toLocaleString('zh-CN'),
          });
          finishStreamMessage({
            status: 'error',
            content: '对话接口调用失败，请稍后重试。',
          });
          throw error;
        },
      });
    } catch (error: any) {
      if (abortController.signal.aborted) {
        finishStreamMessage({
          status: 'done',
          content: '已取消当前回答。',
        });
        return;
      }

      finishStreamMessage({
        status: 'error',
        content: '对话接口调用失败，请稍后重试。',
      });
      message.warning(error?.message || '对话接口暂不可用');
    }
  };

  const renderAssistantAvatar = () => (
    <div className="ai-avatar ai-avatar-robot">
      <div className="robot-screen robot-screen-mini">
        <div className="robot-eye robot-eye-mini" />
        <div className="robot-eye robot-eye-mini" />
      </div>
      <div className="robot-antenna robot-antenna-mini" />
    </div>
  );

  const userAvatar = initialState?.currentUser?.avatar || '';

  return (
    <div className="smart-qa-page">
      <div className="smart-qa-workspace">
        <aside className="assistant-sidebar">
          <div className="sidebar-header sidebar-header-full-action">
            <Button block type="primary" icon={<PlusOutlined />} onClick={openCreateAssistant}>
              新建助理
            </Button>
          </div>

          <div className="sidebar-list sidebar-list-compact">
            {assistantLoading ? (
              <div className="sidebar-empty">
                <Spin />
              </div>
            ) : assistants.length === 0 ? (
              <div className="sidebar-empty">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无助理" />
              </div>
            ) : (
              assistants.map((item) => {
                const selected = item.id === activeAssistantId;
                const allKbNames =
                  item.knowledgeBaseNames && item.knowledgeBaseNames.length > 0
                    ? item.knowledgeBaseNames
                    : item.knowledgeBaseIds.map(
                        (id) =>
                          knowledgeOptions.find((option) => option.value === id)?.label ||
                          `知识库 ${id}`,
                      );
                const kbNames = allKbNames.slice(0, 2);
                const hiddenKbCount = Math.max(allKbNames.length - kbNames.length, 0);

                return (
                  <div
                    key={item.id}
                    className={`sidebar-row ${selected ? 'active' : ''}`}
                    onClick={() => setActiveAssistantId(item.id)}
                  >
                    <div className="sidebar-row-indicator" />
                    <div className="sidebar-row-main">
                      <div className="sidebar-row-top">
                        <div className="sidebar-row-title">{item.name}</div>
                      </div>
                      <div className="sidebar-row-meta">{item.chatModelName || '未配置模型'}</div>
                      <div className="sidebar-row-tags">
                        {kbNames.map((name) => (
                          <span key={name} className="sidebar-mini-tag">
                            {name}
                          </span>
                        ))}
                        {hiddenKbCount > 0 && (
                          <Tooltip title={allKbNames.join('、')}>
                            <span className="sidebar-mini-tag sidebar-mini-tag-more">
                              +{hiddenKbCount}
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    <Space size={6}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        className="sidebar-row-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditAssistant(item);
                        }}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        className="sidebar-row-action sidebar-row-action-danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          Modal.confirm({
                            ...ASSISTANT_DELETE_MODAL_TEXT,
                            okButtonProps: { danger: true },
                            onOk: async () => {
                              await handleDeleteAssistant(item.id);
                            },
                          });
                        }}
                      />
                    </Space>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-title">{`会话（${chats.length}）`}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Input
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  onFocus={handlePrepareCreateChat}
                  onPressEnter={() => void handleCreateChat()}
                  placeholder={activeAssistant ? getDefaultChatTitle() : '请先选择助理'}
                  disabled={!activeAssistant || creatingChat}
                  maxLength={100}
                />
                <Button
                  onClick={() => void handleCreateChat()}
                  loading={creatingChat}
                  disabled={!activeAssistant}
                >
                  新建
                </Button>
              </div>
            </div>
          </div>

          <div className="sidebar-list sidebar-list-compact">
            {chatLoading ? (
              <div className="sidebar-empty">
                <Spin />
              </div>
            ) : chats.length === 0 ? (
              <div className="sidebar-empty">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" />
              </div>
            ) : (
              chats.map((item) => (
                <div
                  key={item.id}
                  className={`sidebar-row chat-row ${item.id === activeChatId ? 'active' : ''}`}
                  onClick={() => setActiveChatId(item.id)}
                >
                  <div className="sidebar-row-main">
                    <div className="sidebar-row-top">
                      <div className="sidebar-row-title">{item.title}</div>
                      <div className="sidebar-row-meta chat-row-time">
                        {formatDateTime(item.createTime)}
                      </div>
                    </div>
                    <div className="sidebar-row-meta chat-row-subtle">
                      {item.messages.length > 0
                        ? item.messages[item.messages.length - 1].content
                        : '点击开始会话'}
                    </div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    className="sidebar-row-action sidebar-row-action-danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      Modal.confirm({
                        ...CHAT_DELETE_MODAL_TEXT,
                        okButtonProps: { danger: true },
                        onOk: async () => {
                          await handleDeleteChat(item.id);
                        },
                      });
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="smart-qa-container">
          <div className="chat-header">
            <div className="chat-title-section">
              <div className="chat-title-main">
                <div className="chat-title-wrap">
                  <div className="chat-subtitle">
                    {activeChat ? activeChat.title : '请选择一个会话开始问答'}
                  </div>
                  {activeAssistant && (
                    <span className="chat-title-assistant-tag">{activeAssistant.name}</span>
                  )}
                </div>
              </div>
              {activeAssistant && (
                <Space size={8} wrap>
                  <Button
                    className="clear-button"
                    icon={<ClearOutlined />}
                    onClick={handleClearChat}
                  >
                    清空对话
                  </Button>
                  <Button
                    icon={<SettingOutlined />}
                    onClick={() => openEditAssistant(activeAssistant)}
                  >
                    配置
                  </Button>
                </Space>
              )}
            </div>
          </div>

          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="chat-landing">
              <div className="welcome-screen">
                <div className="robot-avatar-container">
                  <div className="robot-avatar">
                    <div className="robot-screen">
                      <div className="robot-eye" />
                      <div className="robot-eye" />
                    </div>
                    <div className="robot-antenna" />
                  </div>
                </div>
                <div className="welcome-panel">
                  <div
                    className={`welcome-title ${typedWelcomeText.length < welcomeText.length ? 'typing-cursor' : ''}`}
                  >
                    {typedWelcomeText}
                  </div>
                </div>
              </div>
              {/* 推荐问题功能先注释 */}
              {/* 
              {activeChat && (
                <div className="recommend-section">
                  <div className="recommend-header">
                    <div className="recommend-title">你可以试试这些问题：</div>
                  </div>
                  <div className="recommend-grid">
                    {recommendQuestions.map((question) => (
                      <div
                        key={question.title}
                        className="hot-question-card"
                        onClick={() => void appendQuestion(question.title)}
                      >
                        <div className="hot-question-top">
                          <span className="hot-question-index" />
                          <div className="hot-question-title">{question.title}</div>
                        </div>
                        <div className="hot-question-desc">{question.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
            </div>
          ) : (
            <div className="messages-area">
              {activeChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, maxWidth: '76%' }}>
                    {msg.role === 'assistant' && renderAssistantAvatar()}
                    <div>
                      <div
                        style={{
                          marginBottom: 6,
                          textAlign: msg.role === 'user' ? 'right' : 'left',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          {msg.role === 'user' ? '我' : activeAssistant?.name}
                        </Text>
                      </div>
                      <div
                        className={`message-bubble ${msg.role}`}
                        style={{
                          padding: '14px 18px',
                          borderRadius:
                            msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        }}
                      >
                        {msg.role === 'user' ? (
                          <div
                            style={{ lineHeight: 1.7 }}
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                          />
                        ) : (
                          <div className="message-answer-section">
                            <div
                              className="message-answer-body"
                              style={{ lineHeight: 1.7 }}
                              dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                            />
                          </div>
                        )}
                        {msg.role === 'assistant' && (
                          <div className="message-tools">
                            {Number(msg.reference?.total ?? 0) > 0 && (
                              <div className="message-reference-panel">
                                <div className="message-reference-panel-header">
                                  <span className="message-reference-panel-title">引用来源</span>
                                  <span className="message-reference-panel-subtitle">
                                    共 {Number(msg.reference?.total ?? 0)} 条
                                  </span>
                                </div>
                                <div className="message-reference-list">
                                  {getReferenceChunks(msg.reference).map((chunk, index) => (
                                    <div
                                      key={`${chunk.docId ?? chunk.file_name ?? index}-${chunk.chunk_index ?? index}`}
                                      className="message-reference-card"
                                    >
                                      <div className="message-reference-card-header">
                                        <div className="message-reference-card-title">
                                          {chunk.docId ? (
                                            <Button
                                              size="small"
                                              type="link"
                                              style={{ paddingInline: 0, height: 'auto' }}
                                              onClick={() => handleOpenReferenceDoc(chunk)}
                                            >
                                              {getReferenceChunkFileName(chunk)}
                                            </Button>
                                          ) : (
                                            getReferenceChunkFileName(chunk)
                                          )}
                                        </div>
                                        <Space size={8} wrap>
                                          <Tag color="geekblue">
                                            相似度得分 {formatReferenceScore(chunk.score)}
                                          </Tag>
                                        </Space>
                                      </div>
                                      <div className="message-reference-text">
                                        <div className="message-reference-text-body">
                                          {formatReferenceValue(chunk.text)}
                                        </div>
                                      </div>
                                      <div className="message-reference-grid">
                                        <div className="message-reference-grid-item message-reference-grid-item-kb">
                                          <span className="message-reference-meta-key">知识库</span>
                                          <div className="message-reference-value">
                                            {Array.isArray(chunk.knowledge_base_id) &&
                                            chunk.knowledge_base_id.length > 0 ? (
                                              <Space size={[6, 6]} wrap>
                                                {chunk.knowledge_base_id.map((knowledgeBaseId) => (
                                                  <Button
                                                    key={String(knowledgeBaseId)}
                                                    size="small"
                                                    type="link"
                                                    style={{ paddingInline: 0, height: 'auto' }}
                                                    onClick={() =>
                                                      handleOpenKnowledgeBase(knowledgeBaseId)
                                                    }
                                                  >
                                                    {activeAssistantKnowledgeBaseMap[
                                                      String(knowledgeBaseId)
                                                    ] || `知识库 ${knowledgeBaseId}`}
                                                  </Button>
                                                ))}
                                              </Space>
                                            ) : (
                                              '-'
                                            )}
                                          </div>
                                        </div>
                                        {/* <div className="message-reference-grid-item message-reference-grid-item-path">
                                          <span className="message-reference-meta-key">
                                            文件地址
                                          </span>
                                          <div className="message-reference-value">
                                            {formatReferenceValue(chunk.file_path)}
                                          </div>
                                        </div> */}
                                        <div className="message-reference-grid-item message-reference-grid-item-location">
                                          <span className="message-reference-meta-key">
                                            所属文件位置
                                          </span>
                                          <div className="message-reference-value">
                                            {`第${formatReferenceValue(chunk.page)}页 第${formatReferenceValue(
                                              chunk.chunk_index,
                                            )}分块`}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="message-source-summary">
                                <span className="message-source-summary-label">文档来源：</span>
                                <div className="message-source-summary-list">
                                  {msg.sources.map((source: string) => (
                                    <span key={source} className="sidebar-mini-tag">
                                      {source}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 11,
                            color: msg.role === 'user' ? 'rgba(255,255,255,0.75)' : '#94a3b8',
                            marginTop: 8,
                            textAlign: 'right',
                          }}
                        >
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="user-avatar">
                        {userAvatar ? (
                          <img src={userAvatar} alt="用户头像" className="user-avatar-image" />
                        ) : (
                          '我'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {messagesLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {renderAssistantAvatar()}
                    <div className="message-bubble assistant" style={{ padding: '14px 18px' }}>
                      <div className="thinking-container">
                        <div className="thinking-dot" />
                        <div className="thinking-dot" />
                        <div className="thinking-dot" />
                        <Text style={{ color: '#94a3b8', marginLeft: 8 }}>AI 正在思考中...</Text>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="input-area">
            <div style={{ display: 'flex', gap: 10 }}>
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={activeChat ? '输入你的问题...' : '请先选择会话...'}
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    void appendQuestion(inputValue);
                  }
                }}
                disabled={!activeChat}
              />
              <Button
                className="send-button"
                type="primary"
                icon={<SendOutlined />}
                onClick={() => void appendQuestion(inputValue)}
                loading={messagesLoading}
                disabled={!inputValue.trim() || !activeChat}
              >
                发送
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        title={editingAssistant ? '编辑助理' : '新建助理'}
        open={assistantModalOpen}
        width={920}
        onCancel={() => setAssistantModalOpen(false)}
        onOk={() => void handleSaveAssistant()}
        confirmLoading={savingAssistant}
        okText="保存"
        cancelText="取消"
      >
        <Form form={assistantForm} layout="vertical">
          <div className="assistant-form-grid">
            <Form.Item
              name="name"
              label="助理名称"
              className="assistant-form-full-row"
              rules={[{ required: true, message: '请输入助理名称' }]}
            >
              <Input placeholder="例如：法规问答助理" />
            </Form.Item>

            <div
              className="assistant-form-full-row"
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
                    <MessageOutlined />
                    <span>问答模型配置</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#597ef7' }}>
                    可手动填写，也可从模型管理中选择并自动回填模型编码和地址。
                  </div>
                </div>
                <Button type="primary" ghost onClick={() => void openModelSelector('llm')}>
                  从模型管理选择
                </Button>
              </div>

              <Form.Item style={{ marginBottom: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item
                    name="chatModelName"
                    label="问答模型编码"
                    rules={[{ required: true, message: '请输入问答模型编码' }]}
                  >
                    <Input placeholder="qwen2.5-72b-instruct" />
                  </Form.Item>

                  <Form.Item
                    name="chatModelUrl"
                    label="问答模型地址"
                    rules={[{ required: true, message: '请输入问答模型地址' }]}
                  >
                    <Input placeholder="http://127.0.0.1:8000/v1" />
                  </Form.Item>
                </div>
              </Form.Item>
            </div>

            <div
              className="assistant-form-full-row"
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
                    <ApiOutlined />
                    <span>向量模型配置</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#597ef7' }}>
                    可手动填写，也可从向量管理中选择并自动回填模型编码和地址。
                  </div>
                </div>
                <Button type="primary" ghost onClick={() => void openModelSelector('embed')}>
                  从向量管理中选择
                </Button>
              </div>

              <Form.Item style={{ marginBottom: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item
                    name="embeddingModelName"
                    label="向量模型编码"
                    rules={[{ required: true, message: '请输入向量模型编码' }]}
                  >
                    <Input placeholder="bge-large-zh" />
                  </Form.Item>

                  <Form.Item
                    name="embeddingModelUrl"
                    label="向量模型地址"
                    rules={[{ required: true, message: '请输入向量模型地址' }]}
                  >
                    <Input placeholder="http://127.0.0.1:8001/embed" />
                  </Form.Item>
                </div>
              </Form.Item>
            </div>
          </div>

          <Form.Item
            name="knowledgeBaseIds"
            label="关联知识库"
            rules={[{ required: true, message: '请至少选择一个知识库' }]}
          >
            <Select
              mode="multiple"
              loading={loadingKnowledge}
              options={knowledgeOptions}
              placeholder="选择一个或多个知识库"
            />
          </Form.Item>

          <Form.Item name="openingStatement" label="开场白">
            <Input.TextArea rows={3} placeholder="例如：你好，我可以根据知识库回答你的问题。" />
          </Form.Item>

          <Form.Item name="prompt" label="提示词">
            <Input.TextArea rows={4} placeholder="例如：请基于知识内容给出清晰、准确的回答。" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={modelSelectorMode === 'llm' ? '选择问答模型' : '选择向量模型'}
        open={modelSelectorOpen}
        width={1200}
        footer={null}
        onCancel={() => setModelSelectorOpen(false)}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: '#8c8c8c' }}>
            {modelSelectorMode === 'llm'
              ? '可以直接选择已有问答模型，也可以先新增一个模型配置。'
              : '可以直接选择已有向量模型，也可以先新增一个向量模型配置。'}
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModelModal}>
            {modelSelectorMode === 'llm' ? '新增模型' : '新增向量模型'}
          </Button>
        </div>
        <Table
          rowKey="id"
          loading={modelListLoading}
          dataSource={modelList}
          columns={modelTableColumns}
          pagination={false}
          scroll={{ x: 900 }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 16,
          }}
        >
          <Pagination
            current={modelPageNo}
            pageSize={MODEL_PAGE_SIZE}
            total={modelTotal}
            showSizeChanger={false}
            onChange={(pageNo) => void loadModelList(modelSelectorMode, pageNo)}
          />
        </div>
      </Modal>

      <Modal
        title={modelSelectorMode === 'llm' ? '新增模型' : '新增向量模型'}
        open={modelCreateOpen}
        width={760}
        onCancel={() => setModelCreateOpen(false)}
        footer={[
          <Button
            key="test"
            icon={<ApiOutlined />}
            loading={modelTesting}
            onClick={() => void handleTestModel()}
          >
            测试连接
          </Button>,
          <Button key="cancel" onClick={() => setModelCreateOpen(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={modelCreating}
            onClick={() => void handleCreateModel()}
          >
            保存
          </Button>,
        ]}
      >
        <Form form={modelForm} layout="vertical">
          <div className="assistant-form-grid">
            <Form.Item
              name="name"
              label="模型名称"
              rules={[{ required: true, message: '请输入模型名称' }]}
            >
              <Input placeholder="例如：本地 Qwen 2.5 7B" />
            </Form.Item>
            <Form.Item name="enabled" label="是否启用" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
            <Form.Item
              name="providerType"
              label="提供方类型"
              rules={[{ required: true, message: '请选择提供方类型' }]}
            >
              <Select
                options={
                  modelSelectorMode === 'llm' ? modelProviderOptions : embedModelProviderOptions
                }
                onChange={handleModelProviderChange}
              />
            </Form.Item>
            <Form.Item
              name="apiType"
              label="协议类型"
              rules={[{ required: true, message: '请选择协议类型' }]}
            >
              <Select
                options={
                  modelSelectorMode === 'llm' ? modelApiTypeOptions : embedModelApiTypeOptions
                }
              />
            </Form.Item>
            <Form.Item
              name="baseUrl"
              label="基础地址"
              className="assistant-form-full-row"
              rules={[{ required: true, message: '请输入基础地址' }]}
            >
              <Input placeholder="例如：http://127.0.0.1:11434/v1" />
            </Form.Item>
            <Form.Item
              name="modelCode"
              label="模型编码"
              rules={[{ required: true, message: '请输入模型编码' }]}
            >
              <Input placeholder="例如：qwen2.5:7b 或 gpt-4o-mini" />
            </Form.Item>
            <Form.Item name="sort" label="排序号">
              <Input type="number" placeholder="默认 0" />
            </Form.Item>
            <Form.Item name="apiKey" label="API Key" className="assistant-form-full-row">
              <Input.Password placeholder="本地无密码服务可留空" />
            </Form.Item>
            <Form.Item name="remark" label="备注" className="assistant-form-full-row">
              <Input.TextArea
                rows={3}
                placeholder={
                  modelSelectorMode === 'llm'
                    ? '说明该模型的使用场景，例如问答、推理等'
                    : '说明该向量模型的使用场景，例如知识库默认召回向量模型'
                }
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
