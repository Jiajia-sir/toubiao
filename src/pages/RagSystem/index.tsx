'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { history, request, useModel } from '@umijs/max';
import {
  ClearOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
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
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { getAccessToken } from '@/access';
import { API_PREFIX } from '@/constants';
import { getKnowledgeBaseList } from '@/services/biz/knowledge-base';
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

const formatDateTime = (value?: string) => {
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

export default function RagSystemPage() {
  const { initialState } = useModel('@@initialState');
  const [assistantForm] = Form.useForm<AssistantFormValues>();
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

    const requestPromise = (async () => {
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
        if (chatRequestRef.current?.promise === requestPromise) {
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
        const response: any = await getKnowledgeBaseList();
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
          const baseTimestamp = formatDateTime(item.createTime);
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

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  };

  const handleOpenReferenceDoc = (chunk: ReferenceChunkItem) => {
    if (!chunk.docId) {
      message.warning('未获取到文档ID');
      return;
    }
    history.push(`/data/document/${chunk.docId}`);
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
          console.log('response headers:', Object.fromEntries(response.headers.entries()));
          console.groupEnd();
          if (!response.ok) {
            throw new Error(`对话接口连接失败：${response.status}`);
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

          if (chunk?.code && chunk.code !== 200) {
            throw new Error(chunk.msg || '对话接口返回失败');
          }

          const chunkData = chunk?.data;
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
            void persistChatRound(
              latestAnswerSnapshot,
              latestReference,
            );
            console.log('%cQA STREAM DONE', qaConsoleStyles.done, {
              reason: 'chunk.data.done',
              sources: chunkData.sources ?? chunkData.sourceList ?? [],
              time: new Date().toLocaleString('zh-CN'),
            });
            finishStreamMessage({
              content: latestAnswerSnapshot,
              reference: latestReference,
              sources:
                sourceNames.length > 0
                  ? sourceNames
                  : chunkData.sources ?? chunkData.sourceList,
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
                const kbNames = item.knowledgeBaseIds
                  .map(
                    (id) =>
                      knowledgeOptions.find((option) => option.value === id)?.label ||
                      `知识库 ${id}`,
                  )
                  .slice(0, 2);

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
                        <div
                          style={{ lineHeight: 1.7 }}
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                        />
                        {msg.role === 'assistant' && (
                          <div className="message-tools">
                            {Number(msg.reference?.total ?? 0) > 0 && (
                              <div
                                style={{
                                  width: '100%',
                                  marginBottom: 10,
                                  padding: '10px 12px',
                                  borderRadius: 12,
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#475569',
                                    marginBottom: 8,
                                  }}
                                >
                                  引用文档
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {getUniqueReferenceChunks(msg.reference).map((chunk, index) => (
                                    <Button
                                      key={`${chunk.docId ?? chunk.file_name ?? index}`}
                                      size="small"
                                      type="default"
                                      onClick={() => handleOpenReferenceDoc(chunk)}
                                    >
                                      {getReferenceChunkFileName(chunk)}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {msg.sources?.map((source) => (
                              <span key={source} className="sidebar-mini-tag">
                                {source}
                              </span>
                            ))}
                            <Tooltip title="复制">
                              <Button
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => void handleCopy(msg.content)}
                              />
                            </Tooltip>
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
        width={720}
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

            <Form.Item
              name="chatModelName"
              label="问答模型名称"
              rules={[{ required: true, message: '请输入问答模型名称' }]}
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

            <Form.Item
              name="embeddingModelName"
              label="向量模型名称"
              rules={[{ required: true, message: '请输入向量模型名称' }]}
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
    </div>
  );
}
