import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export type BizId = number | string;

export interface AssistantItem {
  id: BizId;
  name: string;
  openingStatement?: string;
  prompt?: string;
  chatModelName?: string;
  chatModelUrl?: string;
  embeddingModelName?: string;
  embeddingModelUrl?: string;
  knowledgeBaseIds: BizId[];
  knowledgeBaseNames?: string[];
}

export interface ChatItem {
  id: BizId;
  assistantId: BizId;
  title: string;
  createTime?: string | number;
  messages: any[];
}

export interface ReferenceChunkItem {
  text?: string;
  score?: number;
  docId?: BizId;
  page?: number;
  knowledge_base_id?: BizId[];
  file_name?: string;
  file_path?: string;
  chunk_index?: number;
}

export interface ChatReference {
  total?: number;
  chunks?: ReferenceChunkItem[];
}

export interface ChatMessageRecord {
  id: BizId;
  chatId: BizId;
  messageIndex?: number;
  question?: string;
  answer?: string;
  reference?: ChatReference;
  createTime?: string;
}

export interface AssistantSaveParams {
  id?: BizId;
  name: string;
  openingStatement?: string;
  prompt?: string;
  chatModelName: string;
  chatModelUrl: string;
  embeddingModelName: string;
  embeddingModelUrl: string;
  knowledgeBaseIds: BizId[];
}

const getResponseMessage = (response: any, fallback: string) =>
  response?.msg || response?.message || response?.data?.msg || fallback;

export const isSuccessResponse = (response: any) => {
  if (!response || typeof response !== 'object') return true;
  if (typeof response.code === 'number') return response.code === 200;
  return true;
};

export const assertSuccessResponse = <T>(response: T, fallback: string) => {
  if (!isSuccessResponse(response)) {
    throw new Error(getResponseMessage(response, fallback));
  }
  return response;
};

export const getResponseData = <T>(response: any): T | undefined =>
  (response?.data?.data ?? response?.data ?? response) as T | undefined;

export const pickList = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.list)) return response.list;
  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response?.data?.list)) return response.data.list;
  if (Array.isArray(response?.data?.rows)) return response.data.rows;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const toIdArray = (value: unknown): BizId[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined && item !== null && item !== '');
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value === undefined || value === null || value === '') {
    return [];
  }
  return [value as BizId];
};

const toKnowledgeBasePairs = (value: unknown): Array<{ id: BizId; name: string }> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const id = (item as any).id;
      if (id === undefined || id === null || id === '') return null;
      return {
        id,
        name: String((item as any).name ?? id),
      };
    })
    .filter(Boolean) as Array<{ id: BizId; name: string }>;
};

export const normalizeAssistant = (item: any): AssistantItem => {
  const knowledgeBasePairs = toKnowledgeBasePairs(item.knowledgeBaseDOS);
  return {
    id: item.id,
    name: String(item.name ?? ''),
    openingStatement: item.openingStatement ?? '',
    prompt: item.prompt ?? '',
    chatModelName: item.chatModelName ?? '',
    chatModelUrl: item.chatModelUrl ?? '',
    embeddingModelName: item.embeddingModelName ?? '',
    embeddingModelUrl: item.embeddingModelUrl ?? '',
    knowledgeBaseIds:
      knowledgeBasePairs.length > 0
        ? knowledgeBasePairs.map((knowledgeBase) => knowledgeBase.id)
        : toIdArray(item.knowledgeBaseIds),
    knowledgeBaseNames:
      knowledgeBasePairs.length > 0
        ? knowledgeBasePairs.map((knowledgeBase) => knowledgeBase.name)
        : undefined,
  };
};

export const normalizeChat = (item: any): ChatItem => ({
  id: item.id,
  assistantId: item.assistantId,
  title: String(item.title ?? ''),
  createTime: item.updateTime ?? item.createTime ?? '',
  messages: Array.isArray(item.messages) ? item.messages : [],
});

export const normalizeChatMessage = (item: any): ChatMessageRecord => ({
  id: item.id,
  chatId: item.chatId,
  messageIndex: item.messageIndex,
  question: item.question ?? '',
  answer: item.answer ?? '',
  reference: item.reference ?? { total: 0, chunks: [] },
  createTime: item.createTime ?? '',
});

export async function getAssistantList() {
  return request(`${API_PREFIX}/biz/qa-assistant/page`, {
    method: 'GET',
    params: { pageNo: 1, pageSize: 999 },
  });
}

export async function saveAssistant(data: AssistantSaveParams) {
  if (data.id !== undefined && data.id !== null && data.id !== '') {
    return request(`${API_PREFIX}/biz/qa-assistant/update`, {
      method: 'PUT',
      data,
    });
  }

  return request(`${API_PREFIX}/biz/qa-assistant/create`, {
    method: 'POST',
    data,
  });
}

export async function removeAssistant(id: BizId) {
  return request(`${API_PREFIX}/biz/qa-assistant/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function getChatList(assistantId: BizId) {
  const response = await request(`${API_PREFIX}/biz/qa-chat/page`, {
    method: 'GET',
    params: { pageNo: 1, pageSize: 999, assistantId },
  });
  return pickList(assertSuccessResponse(response, '加载会话列表失败'));
}

export async function createChat(data: { assistantId: BizId; title: string }) {
  return request(`${API_PREFIX}/biz/qa-chat/create`, {
    method: 'POST',
    data,
  });
}

export async function removeChat(id: BizId) {
  return request(`${API_PREFIX}/biz/qa-chat/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function saveChatMessage(data: {
  chatId: BizId;
  question: string;
  answer: string;
  reference?: ChatReference;
}) {
  return request(`${API_PREFIX}/biz/qa-chat/savaChat`, {
    method: 'POST',
    data,
  });
}

export async function getChatMessages(chatId: BizId) {
  const response = await request(`${API_PREFIX}/biz/qa-chat/messages`, {
    method: 'GET',
    params: { chatId },
  });
  return pickList(assertSuccessResponse(response, '加载聊天记录失败'));
}
