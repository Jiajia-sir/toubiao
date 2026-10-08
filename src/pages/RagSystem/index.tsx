'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { history, request, useModel } from '@umijs/max';
import {
  ApiOutlined,
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
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
import { policyDocumentMocks } from '@/data/policyDocumentMock';
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
  policyReferences?: PolicyReference[];
  status?: 'streaming' | 'done' | 'error';
};

type PolicyReference = {
  name: string;
  clause: string;
  source: string;
  fileName: string;
  docId?: number | string;
  filePath?: string;
};

type PolicyPresetQuestion = {
  question: string;
  answer: string;
  references: PolicyReference[];
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

type ReferenceDocumentItem = {
  key: string;
  fileName: string;
  docId?: number | string;
  filePath?: string;
  chunks: ReferenceChunkItem[];
  knowledgeBaseIds: Array<number | string>;
  bestScore?: number;
};

type ReferenceDocumentLookupItem = {
  id: number | string;
  fileName: string;
  filePath?: string;
  fileType?: string;
  isFallback?: boolean;
};

type PolicyReferenceDocumentItem = {
  key: string;
  fileName: string;
  docId?: number | string;
  filePath?: string;
  references: PolicyReference[];
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

const POLICY_CHAT_TITLE = '采购政策会话1';

const policyPresetQuestions: PolicyPresetQuestion[] = [
  {
    question: '公开招标的适用条件是什么？',
    answer:
      '公开招标是政府采购的主要采购方式。办理时应先核对项目是否达到适用的公开招标数额标准，并结合采购品类、预算来源和项目所在地的现行标准判断。若因特殊情况需要采用公开招标以外的方式，应在采购活动开始前履行相应审批程序，同时在采购文件中留存适用理由和审批依据；不得通过拆分项目等方式规避公开招标。',
    references: [
      {
        name: '中华人民共和国政府采购法',
        clause: '第二十六条',
        source: '采购法规知识库 · 法规文件',
        fileName: '政府采购法.pdf',
      },
      {
        name: '中华人民共和国政府采购法',
        clause: '第二十七条、第二十八条',
        source: '采购法规知识库 · 法规文件',
        fileName: '政府采购法.pdf',
      },
    ],
  },
  {
    question: '采购需求如何避免倾向性？',
    answer:
      '采购需求应围绕项目目标和实际履约需要编制，使用功能、性能、服务结果和可验证的客观指标表达，避免直接指定品牌、商标、专利、型号或供应商。资格条件、业绩门槛和评审因素要与项目特点相适应，不能设置与合同履行无关的区域、所有制或规模限制；技术要求和评分标准还应保持一致，并通过市场调查和需求审查留存论证记录。',
    references: [
      {
        name: '中华人民共和国政府采购法实施条例',
        clause: '第二十条',
        source: '采购法规知识库 · 法规文件',
        fileName: '政府采购法实施条例.docx',
      },
      {
        name: '政府采购需求管理办法',
        clause: '第七条、第九条',
        source: '采购法规知识库 · 法规文件',
        fileName: '政府采购需求管理办法.pdf',
      },
    ],
  },
  {
    question: '供应商存在股权关联可以参加投标吗？',
    answer:
      '不能只看“是否有投资关系”这一项直接下结论。若不同供应商的单位负责人为同一人，或者存在直接控股、管理关系，不得参加同一合同项下的政府采购活动；采购人应在资格审查和供应商风险核查中核验股权、实际控制人、董监高任职及关联关系，并将核查结论留痕。属于同一控制关系的，应按规定取消相关供应商参与同一项目的资格。',
    references: [
      {
        name: '中华人民共和国政府采购法实施条例',
        clause: '第十八条',
        source: '采购法规知识库 · 法规文件',
        fileName: '政府采购法实施条例.docx',
      },
    ],
  },
  {
    question: '采购项目流标后如何处理？',
    answer:
      '先确认流标原因并形成书面记录，向相关供应商告知废标理由。若属于合格供应商不足三家、报价超过预算或存在影响采购公正的违法情形，原则上应重新组织采购；采购任务取消的，可以终止项目。若拟改用其他采购方式，应先论证原采购文件和程序是否存在问题，并按规定履行审批后再组织实施，不能直接跳过原因分析。',
    references: [
      {
        name: '中华人民共和国政府采购法',
        clause: '第三十六条',
        source: '采购法规知识库 · 法规文件',
        fileName: '政府采购法.pdf',
      },
      {
        name: '政府采购货物和服务招标投标管理办法',
        clause: '第五十七条',
        source: '采购法规知识库 · 法规文件',
        fileName: '政府采购货物和服务招标投标管理办法.pdf',
      },
    ],
  },
];

const buildPolicyPresetMessages = (): MessageItem[] => [
  {
    id: 'policy-session-welcome',
    role: 'assistant',
    content:
      '您好，我是采购政策助手。下面是本会话预置的政策问答示例，回答均附法规名称、条款号和来源，正式办理前请结合项目实际情况由审核人员确认。',
    timestamp: '',
    status: 'done',
  },
  ...policyPresetQuestions.flatMap((item, index): MessageItem[] => [
    {
      id: `policy-session-question-${index}`,
      role: 'user',
      content: item.question,
      timestamp: '',
    },
    {
      id: `policy-session-answer-${index}`,
      role: 'assistant',
      content: item.answer,
      timestamp: '',
      policyReferences: item.references,
      sources: item.references.map((reference) => reference.name),
      status: 'done',
    },
  ]),
];

const isPolicyChatTitle = (title?: string) =>
  String(title || '').replace(/\s+/g, '') === POLICY_CHAT_TITLE;

const mergePolicyPresetMessages = (historyMessages: MessageItem[]) => {
  if (historyMessages.some((item) => item.id.startsWith('policy-session-'))) {
    return historyMessages;
  }

  return [...buildPolicyPresetMessages(), ...historyMessages];
};

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
        const prefix = text
          .slice(0, jsonStartIndex)
          .trim()
          .replace(/[:：]\s*$/, '');
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

const stripClauseToPlainText = (text?: string) =>
  String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isNumericClause = (text: string) => /^[\d\s.,，、:：\-+/()%]+$/.test(text);

const extractSearchClause = (text?: string) => {
  const normalized = stripClauseToPlainText(text);
  if (!normalized) return '';

  const clauses = normalized
    .split(/[，、,：:；;。！？!?\s]+/g)
    .map((item) => stripClauseToPlainText(item))
    .filter(Boolean);

  if (clauses.length === 0) {
    return normalized;
  }

  if (clauses.length > 1 && isNumericClause(clauses[0])) {
    return clauses[1];
  }

  return clauses[0];
};

const extractPptSearchKeyword = (text?: string) => {
  const normalized = stripClauseToPlainText(text);
  if (!normalized) return '';
  const withoutLeadingDigits = normalized.replace(/^\d+[\d\s.,，、:：\-+/()%]*/, '').trim();
  return (withoutLeadingDigits || normalized).slice(0, 6);
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

const getReferenceDocuments = (reference?: ChatReference): ReferenceDocumentItem[] => {
  const chunks = getReferenceChunks(reference);
  const documentMap = new Map<string, ReferenceDocumentItem>();

  chunks.forEach((chunk, index) => {
    const key = String(chunk.docId ?? chunk.file_name ?? chunk.file_path ?? index);
    const fileName = getReferenceChunkFileName(chunk);
    const existing = documentMap.get(key);

    if (!existing) {
      documentMap.set(key, {
        key,
        fileName,
        docId: chunk.docId,
        filePath: chunk.file_path,
        chunks: [chunk],
        knowledgeBaseIds: Array.isArray(chunk.knowledge_base_id)
          ? [...chunk.knowledge_base_id]
          : [],
        bestScore: typeof chunk.score === 'number' ? chunk.score : undefined,
      });
      return;
    }

    existing.chunks.push(chunk);
    if (Array.isArray(chunk.knowledge_base_id)) {
      existing.knowledgeBaseIds = Array.from(
        new Set([...existing.knowledgeBaseIds, ...chunk.knowledge_base_id]),
      );
    }
    if (typeof chunk.score === 'number') {
      existing.bestScore =
        existing.bestScore === undefined ? chunk.score : Math.max(existing.bestScore, chunk.score);
    }
  });

  return Array.from(documentMap.values());
};

const normalizeDocumentName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[\s_\-—–·.,，。；;：:()（）【】［］]/g, '');

const getPolicyReferenceNameCandidates = (reference: PolicyReference) => {
  const nameWithoutPrefix = reference.name.replace(/^中华人民共和国/, '');
  return Array.from(
    new Set(
      [reference.fileName, reference.name, nameWithoutPrefix]
        .map(normalizeDocumentName)
        .filter(Boolean),
    ),
  );
};

const findPolicyReferenceDocument = (
  reference: PolicyReference,
  documents: ReferenceDocumentLookupItem[],
) => {
  if (reference.docId !== undefined && reference.docId !== null && reference.docId !== '') {
    return documents.find((item) => String(item.id) === String(reference.docId));
  }

  const candidates = getPolicyReferenceNameCandidates(reference);
  const exactMatch = documents
    .filter((item) => candidates.includes(normalizeDocumentName(item.fileName)))
    .sort((left, right) => Number(Boolean(left.isFallback)) - Number(Boolean(right.isFallback)))[0];
  if (exactMatch) {
    return exactMatch;
  }

  return documents
    .map((item) => {
      const normalizedName = normalizeDocumentName(item.fileName);
      const matched = candidates.some(
        (candidate) => normalizedName.includes(candidate) || candidate.includes(normalizedName),
      );
      return matched ? item : null;
    })
    .filter((item): item is ReferenceDocumentLookupItem => Boolean(item))
    .sort(
      (left, right) =>
        Number(Boolean(left.isFallback)) - Number(Boolean(right.isFallback)) ||
        right.fileName.length - left.fileName.length,
    )[0];
};

const getPolicyReferenceDocuments = (
  references: PolicyReference[],
  documents: ReferenceDocumentLookupItem[],
): PolicyReferenceDocumentItem[] => {
  const documentMap = new Map<string, PolicyReferenceDocumentItem>();

  references.forEach((reference, index) => {
    const matchedDocument = findPolicyReferenceDocument(reference, documents);
    const fileName = matchedDocument?.fileName || reference.fileName;
    const docId = reference.docId ?? matchedDocument?.id;
    const documentKey = docId ?? normalizeDocumentName(fileName);
    const key = String(documentKey || index);
    const existing = documentMap.get(key);

    if (existing) {
      existing.references.push(reference);
      return;
    }

    documentMap.set(key, {
      key,
      fileName,
      docId,
      filePath: reference.filePath ?? matchedDocument?.filePath,
      references: [reference],
    });
  });

  return Array.from(documentMap.values());
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
  const [referenceDocuments, setReferenceDocuments] = useState<ReferenceDocumentLookupItem[]>(() =>
    policyDocumentMocks.map((document) => ({
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      isFallback: true,
    })),
  );
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

  const policyPresetChatId = useMemo(
    () => chats.find((item) => isPolicyChatTitle(item.title))?.id ?? chats[0]?.id,
    [chats],
  );

  const showPolicyPresetMessages = Boolean(
    activeChat && policyPresetChatId !== undefined && activeChat.id === policyPresetChatId,
  );

  const visibleChatMessages = useMemo(() => {
    const currentMessages = (activeChat?.messages || []) as MessageItem[];
    return showPolicyPresetMessages ? mergePolicyPresetMessages(currentMessages) : currentMessages;
  }, [activeChat, showPolicyPresetMessages]);

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
        const firstPolicyChat =
          normalized.find((item) => isPolicyChatTitle(item.title)) || normalized[0];

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
          return firstPolicyChat?.id ?? normalized[0]?.id ?? '';
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
    let active = true;

    const loadReferenceDocuments = async () => {
      try {
        const response: any = await request(`${API_PREFIX}/biz/document/page`, {
          method: 'GET',
          params: { pageNo: 1, pageSize: 1000 },
        });
        if (!active) return;

        const documents = pickList(response)
          .map((item: any) => ({
            id: item.id ?? item.documentId,
            fileName: String(item.name ?? item.fileName ?? item.documentName ?? '').trim(),
            filePath: item.filePath,
            fileType: item.fileType,
          }))
          .filter(
            (item: ReferenceDocumentLookupItem) =>
              item.id !== undefined && item.id !== null && item.id !== '' && item.fileName,
          );
        setReferenceDocuments([
          ...documents,
          ...policyDocumentMocks.map((document) => ({
            id: document.id,
            fileName: document.fileName,
            fileType: document.fileType,
            isFallback: true,
          })),
        ]);
      } catch {
        if (active) {
          setReferenceDocuments(
            policyDocumentMocks.map((document) => ({
              id: document.id,
              fileName: document.fileName,
              fileType: document.fileType,
              isFallback: true,
            })),
          );
        }
      }
    };

    void loadReferenceDocuments();

    return () => {
      active = false;
    };
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

        const shouldShowPolicyPresets = showPolicyPresetMessages;
        updateChatMessages(activeChatId, () =>
          shouldShowPolicyPresets ? mergePolicyPresetMessages(historyMessages) : historyMessages,
        );
        loadedChatMessagesRef.current[chatKey] = true;
      } catch (error: any) {
        message.error(error?.message || '加载聊天记录失败');
      } finally {
        setMessagesLoading(false);
      }
    };

    void loadCurrentChatMessages();
  }, [activeChat?.title, activeChatId, showPolicyPresetMessages]);

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

  const handleOpenReferenceDoc = (chunk: ReferenceChunkItem, fallbackDocId?: number | string) => {
    const documentId = chunk.docId ?? fallbackDocId;
    if (documentId === undefined || documentId === null || documentId === '') {
      message.warning('未获取到文档ID');
      return;
    }

    const query = new URLSearchParams();
    const fileName = getReferenceChunkFileName(chunk);
    const searchKeyword =
      fileName.toLowerCase().endsWith('.ppt') || fileName.toLowerCase().endsWith('.pptx')
        ? extractPptSearchKeyword(chunk.text)
        : extractSearchClause(chunk.text);
    if (fileName) {
      query.set('title', fileName);
      const fileType = fileName.split('.').pop();
      if (fileType) {
        query.set('type', fileType);
      }
    }
    if (chunk.file_path) {
      query.set('filePath', chunk.file_path);
    }
    if (searchKeyword) {
      query.set('keyword', searchKeyword);
      query.set('previewMode', 'original');
    }

    history.push(
      `/data/document/${encodeURIComponent(String(documentId))}${
        query.toString() ? `?${query.toString()}` : ''
      }`,
    );
  };

  const handleOpenPolicyReferenceDoc = (referenceDocument: PolicyReferenceDocumentItem) => {
    if (
      referenceDocument.docId === undefined ||
      referenceDocument.docId === null ||
      referenceDocument.docId === ''
    ) {
      message.warning('引用文件尚未关联文档数据，请先在文档中心完成导入');
      return;
    }

    handleOpenReferenceDoc(
      {
        docId: referenceDocument.docId,
        file_name: referenceDocument.fileName,
        file_path: referenceDocument.filePath,
        text: referenceDocument.references.map((item) => item.clause).join('；'),
        chunk_index: 1,
      },
      referenceDocument.docId,
    );
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
                  {showPolicyPresetMessages && <Tag color="blue">内置政策问答</Tag>}
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

          {!activeChat || visibleChatMessages.length === 0 ? (
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
              {visibleChatMessages.map((msg) => (
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
                      {msg.role === 'assistant' ? (
                        <div className="message-assistant-stack">
                          <div
                            className={`message-bubble ${msg.role}`}
                            style={{
                              padding: '14px 18px',
                              borderRadius: '16px 16px 16px 4px',
                            }}
                          >
                            <div className="message-answer-section">
                              <div
                                className="message-answer-body"
                                style={{ lineHeight: 1.7 }}
                                dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                              />
                            </div>
                            {msg.policyReferences && msg.policyReferences.length > 0 && (
                              <div className="policy-citation-card">
                                <div className="policy-citation-header">
                                  <strong>引用依据</strong>
                                  <span>法规文件 · 命中分块</span>
                                </div>
                                <div className="policy-citation-list message-reference-doc-list">
                                  {getPolicyReferenceDocuments(
                                    msg.policyReferences,
                                    referenceDocuments,
                                  ).map((referenceDocument) => (
                                    <Tooltip
                                      key={`${msg.id}-${referenceDocument.key}`}
                                      placement="rightTop"
                                      overlayClassName="message-reference-tooltip-overlay"
                                      title={
                                        <div className="message-reference-tooltip">
                                          <div className="message-reference-tooltip-title">
                                            {referenceDocument.fileName}
                                          </div>
                                          <div className="message-reference-tooltip-meta">
                                            <span>
                                              命中分块：{referenceDocument.references.length}
                                            </span>
                                            <span>来源：采购法规知识库</span>
                                          </div>
                                          <div className="message-reference-tooltip-section">
                                            <div className="message-reference-tooltip-label">
                                              引用条款
                                            </div>
                                            <div className="message-reference-tooltip-chunks">
                                              {referenceDocument.references.map((reference) => (
                                                <div
                                                  key={`${referenceDocument.key}-${reference.clause}`}
                                                  className="message-reference-tooltip-chunk"
                                                  title="点击打开站内文档详情"
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenPolicyReferenceDoc(referenceDocument);
                                                  }}
                                                >
                                                  <div className="message-reference-tooltip-chunk-meta">
                                                    {reference.name} · {reference.clause}
                                                  </div>
                                                  <div className="message-reference-tooltip-chunk-text">
                                                    {reference.source}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      }
                                    >
                                      <div
                                        className="message-reference-doc-item policy-reference-doc-item"
                                        title={
                                          referenceDocument.docId
                                            ? '点击打开站内文档详情并定位到引用条款'
                                            : '该引用文件尚未关联文档详情'
                                        }
                                        onClick={() =>
                                          handleOpenPolicyReferenceDoc(referenceDocument)
                                        }
                                      >
                                        <div className="message-reference-doc-icon">
                                          <FileTextOutlined />
                                        </div>
                                        <div className="message-reference-doc-main">
                                          <div className="message-reference-doc-line">
                                            <div className="message-reference-doc-name">
                                              {referenceDocument.fileName}
                                            </div>
                                            <div className="message-reference-doc-meta">
                                              {`命中 ${referenceDocument.references.length} 个块`}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: 11,
                                color: '#94a3b8',
                                marginTop: 8,
                                textAlign: 'right',
                              }}
                            >
                              {msg.timestamp && <span>{msg.timestamp}</span>}
                            </div>
                          </div>
                          {Number(msg.reference?.total ?? 0) > 0 && (
                            <div className="message-reference-panel message-reference-panel-detached">
                              <div className="message-reference-doc-list">
                                {getReferenceDocuments(msg.reference).map((doc) => (
                                  <Tooltip
                                    key={doc.key}
                                    placement="rightTop"
                                    overlayClassName="message-reference-tooltip-overlay"
                                    title={
                                      <div className="message-reference-tooltip">
                                        <div className="message-reference-tooltip-title">
                                          {doc.fileName}
                                        </div>
                                        <div className="message-reference-tooltip-meta">
                                          <span>命中分块：{doc.chunks.length}</span>
                                          <span>
                                            最高相似度：{formatReferenceScore(doc.bestScore)}
                                          </span>
                                        </div>
                                        {doc.knowledgeBaseIds.length > 0 && (
                                          <div className="message-reference-tooltip-section">
                                            <div className="message-reference-tooltip-label">
                                              知识库
                                            </div>
                                            <div className="message-reference-tooltip-links">
                                              {doc.knowledgeBaseIds.map((knowledgeBaseId) => (
                                                <Button
                                                  key={String(knowledgeBaseId)}
                                                  size="small"
                                                  type="link"
                                                  style={{ paddingInline: 0, height: 'auto' }}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenKnowledgeBase(knowledgeBaseId);
                                                  }}
                                                >
                                                  {activeAssistantKnowledgeBaseMap[
                                                    String(knowledgeBaseId)
                                                  ] || `知识库 ${knowledgeBaseId}`}
                                                </Button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <div className="message-reference-tooltip-section">
                                          <div className="message-reference-tooltip-label">
                                            命中分块
                                          </div>
                                          <div className="message-reference-tooltip-chunks">
                                            {doc.chunks.map((chunk, index) => (
                                              <div
                                                key={`${doc.key}-${chunk.chunk_index ?? index}`}
                                                className="message-reference-tooltip-chunk"
                                                title="点击查看文档并定位到该命中内容"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  handleOpenReferenceDoc(chunk, doc.docId);
                                                }}
                                              >
                                                <div className="message-reference-tooltip-chunk-meta">
                                                  {` 第${formatReferenceValue(
                                                    chunk.chunk_index,
                                                  )}分块`}
                                                  {typeof chunk.score === 'number' &&
                                                    ` · 相似度 ${formatReferenceScore(chunk.score)}`}
                                                </div>
                                                <div className="message-reference-tooltip-chunk-text">
                                                  {formatReferenceValue(chunk.text)}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    }
                                  >
                                    <div
                                      className="message-reference-doc-item"
                                      title={
                                        doc.docId
                                          ? '点击打开站内文档详情并定位到引用内容'
                                          : '该引用暂未关联文档详情'
                                      }
                                      onClick={() =>
                                        handleOpenReferenceDoc(doc.chunks[0], doc.docId)
                                      }
                                    >
                                      <div className="message-reference-doc-icon">
                                        <FileTextOutlined />
                                      </div>
                                      <div className="message-reference-doc-main">
                                        <div className="message-reference-doc-line">
                                          <div className="message-reference-doc-name">
                                            {doc.fileName}
                                          </div>
                                          <div className="message-reference-doc-meta">
                                            {`命中 ${doc.chunks.length} 个分块`}
                                            {/* {doc.bestScore !== undefined &&
                                              ` · 最高相似度 ${formatReferenceScore(doc.bestScore)}`} */}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </Tooltip>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`message-bubble ${msg.role}`}
                          style={{
                            padding: '14px 18px',
                            borderRadius: '16px 16px 4px 16px',
                          }}
                        >
                          <div
                            style={{ lineHeight: 1.7 }}
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                          />
                          <div
                            style={{
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.75)',
                              marginTop: 8,
                              textAlign: 'right',
                            }}
                          >
                            {msg.timestamp && <span>{msg.timestamp}</span>}
                          </div>
                        </div>
                      )}
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
