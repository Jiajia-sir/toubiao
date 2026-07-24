'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { request } from '@umijs/max';
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  BookOutlined,
  ClearOutlined,
  CopyOutlined,
  DeleteOutlined,
  DislikeOutlined,
  EditOutlined,
  LikeOutlined,
  PlusOutlined,
  SendOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { API_PREFIX } from '@/constants';
import { getKnowledgeBaseList } from '@/services/biz/knowledge-base';
import './SmartQA.css';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type MessageItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  confidence?: number;
};

type AssistantItem = {
  id: number | string;
  name: string;
  openingStatement?: string;
  prompt?: string;
  chatModelName: string;
  chatModelUrl: string;
  embeddingModelName: string;
  embeddingModelUrl: string;
  knowledgeBaseIds: Array<number | string>;
  enabled: number;
};

type ChatItem = {
  id: number | string;
  assistantId: number | string;
  title: string;
  createTime?: string;
  messages: MessageItem[];
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
  chatModelName: string;
  chatModelUrl: string;
  embeddingModelName: string;
  embeddingModelUrl: string;
  knowledgeBaseIds: Array<number | string>;
  enabled: boolean;
};

const assistantSeeds: AssistantItem[] = [
  {
    id: 1,
    name: '法规问答助理',
    openingStatement: '你好，我可以基于已选择知识库回答法规和制度问题。',
    prompt: '请严格基于知识库内容进行回答。',
    chatModelName: 'qwen2.5-72b-instruct',
    chatModelUrl: 'http://127.0.0.1:8000/v1',
    embeddingModelName: 'bge-large-zh',
    embeddingModelUrl: 'http://127.0.0.1:8001/embed',
    knowledgeBaseIds: [1, 2],
    enabled: 1,
  },
  {
    id: 2,
    name: '客服知识助理',
    openingStatement: '你好，我可以帮助你整理常见问题与标准答复。',
    prompt: '优先给出简洁、结构化回答。',
    chatModelName: 'deepseek-chat',
    chatModelUrl: 'http://127.0.0.1:8100/v1',
    embeddingModelName: 'bge-m3',
    embeddingModelUrl: 'http://127.0.0.1:8101/embed',
    knowledgeBaseIds: [3],
    enabled: 1,
  },
];

const chatSeeds: ChatItem[] = [
  {
    id: 101,
    assistantId: 1,
    title: '法规问答',
    createTime: '今天 10:20',
    messages: [],
  },
  {
    id: 102,
    assistantId: 1,
    title: '制度核对',
    createTime: '今天 11:05',
    messages: [],
  },
  {
    id: 201,
    assistantId: 2,
    title: '售后话术整理',
    createTime: '昨天 16:40',
    messages: [],
  },
];

const parseMarkdown = (text: string): string => {
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<em>$1</em>');
  const tableRegex = /(\|.*\|)\n(\|[-\s|:]+\|)\n((?:\|.*\|\n?)*)/g;
  html = html.replace(tableRegex, (_match, header, _separator, body) => {
    const headerCells = header
      .split('|')
      .filter((cell: string) => cell.trim())
      .map(
        (cell: string) =>
          `<th style="padding:8px 12px;background:#f5f5f5;border:1px solid #e8e8e8;font-weight:600">${cell.trim()}</th>`,
      )
      .join('');
    const bodyRows = body
      .trim()
      .split('\n')
      .map((row: string) => {
        const cells = row
          .split('|')
          .filter((cell: string) => cell.trim())
          .map(
            (cell: string) =>
              `<td style="padding:8px 12px;border:1px solid #e8e8e8">${cell.trim()}</td>`,
          )
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');
    return `<table style="border-collapse:collapse;margin:12px 0;width:100%"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });
  return html.replace(/\n/g, '<br>');
};

const buildAssistantReply = (question: string, assistant?: AssistantItem) => {
  const assistantName = assistant?.name || '当前助理';
  const modelName = assistant?.chatModelName || '未配置模型';

  return {
    content: `**${assistantName}** 已收到你的问题。\n\n当前问答模型：**${modelName}**\n\n问题内容：${question}\n\n这是前端演示版对话区，后续只需要把这里替换成真实发送消息与拉取回复接口即可。`,
    sources: ['助理配置', '聊天演示模式'],
    confidence: 0.91,
  };
};

export default function RagSystemPage() {
  const [assistantForm] = Form.useForm<AssistantFormValues>();
  const [assistants, setAssistants] = useState<AssistantItem[]>(assistantSeeds);
  const [chats, setChats] = useState<ChatItem[]>(chatSeeds);
  const [knowledgeOptions, setKnowledgeOptions] = useState<KnowledgeBaseOption[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<AssistantItem | null>(null);
  const [savingAssistant, setSavingAssistant] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeAssistantId, setActiveAssistantId] = useState<number | string>(assistantSeeds[0]?.id ?? '');
  const activeAssistant = useMemo(
    () => assistants.find((item) => item.id === activeAssistantId),
    [assistants, activeAssistantId],
  );

  const assistantChats = useMemo(
    () => chats.filter((item) => item.assistantId === activeAssistantId),
    [chats, activeAssistantId],
  );

  const [activeChatId, setActiveChatId] = useState<number | string>(assistantChats[0]?.id ?? '');

  useEffect(() => {
    setActiveChatId((prev) => {
      if (assistantChats.some((item) => item.id === prev)) {
        return prev;
      }
      return assistantChats[0]?.id ?? '';
    });
  }, [assistantChats]);

  const activeChat = useMemo(
    () => chats.find((item) => item.id === activeChatId),
    [chats, activeChatId],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, messagesLoading]);

  useEffect(() => {
    const loadKnowledgeBases = async () => {
      setLoadingKnowledge(true);
      try {
        const response: any = await getKnowledgeBaseList();
        const list = Array.isArray(response?.list)
          ? response.list
          : Array.isArray(response?.data?.list)
            ? response.data.list
            : Array.isArray(response?.rows)
              ? response.rows
              : [];
        setKnowledgeOptions(
          list.map((item: any) => ({
            label: String(item.name ?? item.label ?? item.id),
            value: item.id,
          })),
        );
      } catch {
        setKnowledgeOptions([
          { label: '默认知识库 A', value: 1 },
          { label: '默认知识库 B', value: 2 },
          { label: '默认知识库 C', value: 3 },
        ]);
      } finally {
        setLoadingKnowledge(false);
      }
    };

    void loadKnowledgeBases();
  }, []);

  const openCreateAssistant = () => {
    setEditingAssistant(null);
    assistantForm.resetFields();
    assistantForm.setFieldsValue({
      name: '',
      openingStatement: '',
      prompt: '',
      chatModelName: '',
      chatModelUrl: '',
      embeddingModelName: '',
      embeddingModelUrl: '',
      knowledgeBaseIds: [],
      enabled: true,
    });
    setAssistantModalOpen(true);
  };

  const openEditAssistant = (assistant: AssistantItem) => {
    setEditingAssistant(assistant);
    assistantForm.setFieldsValue({
      id: assistant.id,
      name: assistant.name,
      openingStatement: assistant.openingStatement,
      prompt: assistant.prompt,
      chatModelName: assistant.chatModelName,
      chatModelUrl: assistant.chatModelUrl,
      embeddingModelName: assistant.embeddingModelName,
      embeddingModelUrl: assistant.embeddingModelUrl,
      knowledgeBaseIds: assistant.knowledgeBaseIds,
      enabled: assistant.enabled === 1,
    });
    setAssistantModalOpen(true);
  };

  const handleSaveAssistant = async () => {
    try {
      const values = await assistantForm.validateFields();
      const payload = {
        ...(editingAssistant?.id ? { id: editingAssistant.id } : {}),
        name: values.name,
        openingStatement: values.openingStatement,
        prompt: values.prompt,
        chatModelName: values.chatModelName,
        chatModelUrl: values.chatModelUrl,
        embeddingModelName: values.embeddingModelName,
        embeddingModelUrl: values.embeddingModelUrl,
        knowledgeBaseIds: values.knowledgeBaseIds,
        enabled: values.enabled ? 1 : 0,
      };

      setSavingAssistant(true);

      if (editingAssistant) {
        await request(`${API_PREFIX}/biz/qa-assistant/update`, {
          method: 'PUT',
          data: payload,
        });
        setAssistants((prev) =>
          prev.map((item) =>
            item.id === editingAssistant.id ? ({ ...item, ...payload } as AssistantItem) : item,
          ),
        );
        message.success('助理已更新');
      } else {
        const response: any = await request(`${API_PREFIX}/biz/qa-assistant/create`, {
          method: 'POST',
          data: payload,
        });
        const nextId = response?.data ?? Date.now();
        const nextAssistant: AssistantItem = {
          id: nextId,
          ...payload,
        };
        setAssistants((prev) => [nextAssistant, ...prev]);
        setActiveAssistantId(nextId);
        message.success('助理已创建');
      }

      setAssistantModalOpen(false);
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(editingAssistant ? '更新助理失败' : '创建助理失败');
    } finally {
      setSavingAssistant(false);
    }
  };

  const handleCreateChat = async () => {
    if (!activeAssistant) {
      message.warning('请先选择助理');
      return;
    }

    setCreatingChat(true);
    try {
      const title = `${activeAssistant.name} ${assistantChats.length + 1}`;
      const response: any = await request(`${API_PREFIX}/biz/qa-chat/create`, {
        method: 'POST',
        data: {
          assistantId: activeAssistant.id,
          title,
        },
      });
      const chatId = response?.data ?? Date.now();
      const nextChat: ChatItem = {
        id: chatId,
        assistantId: activeAssistant.id,
        title,
        createTime: '刚刚',
        messages: activeAssistant.openingStatement
          ? [
              {
                id: `opening-${chatId}`,
                role: 'assistant',
                content: activeAssistant.openingStatement,
                timestamp: new Date().toLocaleTimeString(),
              },
            ]
          : [],
      };
      setChats((prev) => [nextChat, ...prev]);
      setActiveChatId(chatId);
      message.success('会话已创建');
    } catch {
      message.error('创建会话失败');
    } finally {
      setCreatingChat(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeChat || !activeAssistant || messagesLoading) {
      return;
    }

    const question = inputValue.trim();
    const userMessage: MessageItem = {
      id: `${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              messages: [...chat.messages, userMessage],
            }
          : chat,
      ),
    );
    setInputValue('');
    setMessagesLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const reply = buildAssistantReply(question, activeAssistant);
    const assistantMessage: MessageItem = {
      id: `${Date.now() + 1}`,
      role: 'assistant',
      content: reply.content,
      timestamp: new Date().toLocaleTimeString(),
      sources: reply.sources,
      confidence: reply.confidence,
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              messages: [...chat.messages, assistantMessage],
            }
          : chat,
      ),
    );
    setMessagesLoading(false);
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  };

  return (
    <div className="smart-qa-page">
      <div className="smart-qa-workspace">
        <aside className="assistant-sidebar">
          <div className="sidebar-header">
            <div>
              <div className="sidebar-title">助理</div>
              <div className="sidebar-subtitle">配置模型与知识库</div>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateAssistant}>
              新增
            </Button>
          </div>

          <div className="sidebar-list">
            {assistants.map((assistant) => (
              <div
                key={assistant.id}
                className={`sidebar-card ${assistant.id === activeAssistantId ? 'active' : ''}`}
                onClick={() => setActiveAssistantId(assistant.id)}
              >
                <div className="sidebar-card-title-row">
                  <div className="sidebar-card-title">{assistant.name}</div>
                  <Space size={4}>
                    <Tooltip title="编辑助理">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditAssistant(assistant);
                        }}
                      />
                    </Tooltip>
                  </Space>
                </div>
                <div className="sidebar-card-meta">{assistant.chatModelName}</div>
                <div className="sidebar-card-meta">{assistant.embeddingModelName}</div>
                <div className="sidebar-card-tags">
                  <Tag color={assistant.enabled === 1 ? 'success' : 'default'}>
                    {assistant.enabled === 1 ? '启用' : '停用'}
                  </Tag>
                  <Tag>{assistant.knowledgeBaseIds.length} 个知识库</Tag>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <div>
              <div className="sidebar-title">问答</div>
              <div className="sidebar-subtitle">
                {activeAssistant ? `${activeAssistant.name} 的会话` : '请选择助理'}
              </div>
            </div>
            <Button
              type="primary"
              ghost
              icon={<PlusOutlined />}
              disabled={!activeAssistant}
              loading={creatingChat}
              onClick={() => void handleCreateChat()}
            >
              新建
            </Button>
          </div>

          {activeAssistant ? (
            <div className="sidebar-list">
              {assistantChats.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无问答会话" />
              ) : (
                assistantChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`sidebar-card ${chat.id === activeChatId ? 'active' : ''}`}
                    onClick={() => setActiveChatId(chat.id)}
                  >
                    <div className="sidebar-card-title">{chat.title}</div>
                    <div className="sidebar-card-meta">{chat.createTime || '未记录时间'}</div>
                    <div className="sidebar-card-meta">{chat.messages.length} 条消息</div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="sidebar-empty">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择左侧助理" />
            </div>
          )}
        </aside>

        <section className="smart-qa-container">
          <div
            style={{
              padding: '8px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <Space>
              <span className="smart-qa-title" style={{ fontSize: 16, fontWeight: 600 }}>
                {activeChat?.title || '智能问答'}
              </span>
              {activeAssistant && <Tag className="source-tag">{activeAssistant.name}</Tag>}
            </Space>
            <Space>
              {activeAssistant && (
                <Tooltip title="编辑当前助理">
                  <Button
                    className="clear-button"
                    icon={<SettingOutlined />}
                    onClick={() => openEditAssistant(activeAssistant)}
                  />
                </Tooltip>
              )}
              <Tooltip title="清空当前对话">
                <Button
                  className="clear-button"
                  icon={<ClearOutlined />}
                  onClick={() => {
                    if (!activeChat) return;
                    setChats((prev) =>
                      prev.map((chat) =>
                        chat.id === activeChat.id ? { ...chat, messages: [] } : chat,
                      ),
                    );
                  }}
                />
              </Tooltip>
            </Space>
          </div>

          <div className="messages-area">
            {!activeAssistant || !activeChat ? (
              <div className="chat-empty-state">
                <div className="robot-avatar-container">
                  <div className="robot-avatar">
                    <div className="robot-antenna" />
                    <div className="robot-screen">
                      <div className="robot-eye" />
                      <div className="robot-eye" />
                    </div>
                  </div>
                </div>
                <Paragraph
                  style={{
                    maxWidth: 720,
                    textAlign: 'center',
                    fontSize: 14,
                    color: '#64748b',
                    marginBottom: 0,
                  }}
                >
                  先在左侧选择助理，再在中间选择或新建一个问答会话。
                </Paragraph>
              </div>
            ) : activeChat.messages.length === 0 ? (
              <div className="chat-empty-state">
                <div className="robot-avatar-container">
                  <div className="robot-avatar">
                    <div className="robot-antenna" />
                    <div className="robot-screen">
                      <div className="robot-eye" />
                      <div className="robot-eye" />
                    </div>
                  </div>
                </div>
                <Paragraph
                  style={{
                    maxWidth: 720,
                    textAlign: 'center',
                    fontSize: 14,
                    color: '#64748b',
                    marginBottom: 0,
                  }}
                >
                  {activeAssistant.openingStatement ||
                    '你好，我是你的问答助理，输入问题即可开始对话。'}
                </Paragraph>
              </div>
            ) : (
              activeChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 20,
                  }}
                >
                  <div
                    className="message-bubble"
                    style={{
                      maxWidth: '90%',
                      display: 'flex',
                      gap: 12,
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    <div
                      className={msg.role === 'user' ? 'user-avatar' : 'ai-avatar'}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {msg.role === 'user' ? (
                        <UserOutlined style={{ color: '#fff', fontSize: 16 }} />
                      ) : (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <rect x="4" y="4" width="16" height="16" rx="4" fill="#3b82f6" />
                          <rect
                            x="6"
                            y="6"
                            width="12"
                            height="9"
                            rx="2"
                            fill="rgba(30,58,138,0.7)"
                          />
                          <rect x="8" y="8.5" width="3" height="3" rx="0.8" fill="#60a5fa" />
                          <rect x="13" y="8.5" width="3" height="3" rx="0.8" fill="#60a5fa" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          marginBottom: 4,
                          textAlign: msg.role === 'user' ? 'right' : 'left',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          {msg.role === 'user' ? '我' : activeAssistant.name}
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
                          style={{ lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                        />
                        {msg.role === 'assistant' && (
                          <div
                            style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: '1px solid #f0f0f0',
                            }}
                          >
                            {msg.sources && (
                              <div style={{ marginBottom: 8 }}>
                                <Text style={{ fontSize: 12, color: '#64748b' }}>
                                  <BookOutlined /> 参考来源：
                                </Text>
                                {msg.sources.map((source) => (
                                  <Tag
                                    key={source}
                                    className="source-tag"
                                    style={{ marginLeft: 4, fontSize: 11 }}
                                  >
                                    {source}
                                  </Tag>
                                ))}
                              </div>
                            )}
                            {typeof msg.confidence === 'number' && (
                              <div style={{ marginBottom: 8 }}>
                                <Text style={{ fontSize: 12, color: '#64748b' }}>置信度：</Text>
                                <Progress
                                  className="confidence-progress"
                                  percent={Math.round(msg.confidence * 100)}
                                  size="small"
                                  style={{ width: 100, display: 'inline-block', marginLeft: 8 }}
                                  strokeColor={{ '0%': '#3b82f6', '100%': '#1d4ed8' }}
                                  trailColor="rgba(59, 130, 246, 0.1)"
                                />
                              </div>
                            )}
                            <Space>
                              <Tooltip title="复制">
                                <Button
                                  className="action-button"
                                  size="small"
                                  icon={<CopyOutlined />}
                                  onClick={() => void handleCopy(msg.content)}
                                />
                              </Tooltip>
                              <Tooltip title="有用">
                                <Button className="action-button" size="small" icon={<LikeOutlined />} />
                              </Tooltip>
                              <Tooltip title="无用">
                                <Button
                                  className="action-button"
                                  size="small"
                                  icon={<DislikeOutlined />}
                                />
                              </Tooltip>
                            </Space>
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 11,
                            color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#999',
                            marginTop: 8,
                            textAlign: 'right',
                          }}
                        >
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {messagesLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div
                    className="ai-avatar"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="4" width="16" height="16" rx="4" fill="#3b82f6" />
                      <rect
                        x="6"
                        y="6"
                        width="12"
                        height="9"
                        rx="2"
                        fill="rgba(30,58,138,0.7)"
                      />
                      <rect x="8" y="8.5" width="3" height="3" rx="0.8" fill="#60a5fa">
                        <animate
                          attributeName="opacity"
                          values="1;0.3;1"
                          dur="3s"
                          repeatCount="indefinite"
                          keyTimes="0;0.45;0.55"
                        />
                      </rect>
                      <rect x="13" y="8.5" width="3" height="3" rx="0.8" fill="#60a5fa">
                        <animate
                          attributeName="opacity"
                          values="1;0.3;1"
                          dur="3s"
                          repeatCount="indefinite"
                          keyTimes="0;0.45;0.55"
                        />
                      </rect>
                    </svg>
                  </div>
                  <div
                    className="message-bubble assistant"
                    style={{ padding: '14px 18px', borderRadius: '16px 16px 16px 4px' }}
                  >
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

          <div className="input-area">
            <div style={{ display: 'flex', gap: 8 }}>
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={activeChat ? '输入问题...' : '先选择左侧会话...'}
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                style={{ flex: 1 }}
                disabled={!activeChat}
              />
              <Button
                className="send-button"
                icon={<SendOutlined />}
                onClick={() => void handleSend()}
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
        title={editingAssistant ? '编辑助理' : '新增助理'}
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
              rules={[{ required: true, message: '请输入助理名称' }]}
            >
              <Input placeholder="例如：法规问答助理" />
            </Form.Item>

            <Form.Item
              name="enabled"
              label="是否启用"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item name="chatModelName" label="问答模型名称" rules={[{ required: true }]}>
              <Input placeholder="例如：qwen2.5-72b-instruct" />
            </Form.Item>

            <Form.Item name="chatModelUrl" label="问答模型地址" rules={[{ required: true }]}>
              <Input placeholder="例如：http://127.0.0.1:8000/v1" />
            </Form.Item>

            <Form.Item
              name="embeddingModelName"
              label="向量模型名称"
              rules={[{ required: true }]}
            >
              <Input placeholder="例如：bge-large-zh" />
            </Form.Item>

            <Form.Item
              name="embeddingModelUrl"
              label="向量模型地址"
              rules={[{ required: true }]}
            >
              <Input placeholder="例如：http://127.0.0.1:8001/embed" />
            </Form.Item>
          </div>

          <Form.Item name="knowledgeBaseIds" label="关联知识库" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              loading={loadingKnowledge}
              options={knowledgeOptions}
              placeholder="选择一个或多个知识库"
            />
          </Form.Item>

          <Form.Item name="openingStatement" label="开场白">
            <Input.TextArea rows={3} placeholder="例如：你好，我可以根据知识库为你回答问题。" />
          </Form.Item>

          <Form.Item name="prompt" label="提示词">
            <Input.TextArea rows={4} placeholder="例如：请严格基于知识库内容回答。" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
