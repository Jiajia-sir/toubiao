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
}

export interface ChatItem {
  id: BizId;
  assistantId: BizId;
  title: string;
  createTime?: string | number;
  messages: any[];
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

export const normalizeAssistant = (item: any): AssistantItem => ({
  id: item.id,
  name: String(item.name ?? ''),
  openingStatement: item.openingStatement ?? '',
  prompt: item.prompt ?? '',
  chatModelName: item.chatModelName ?? '',
  chatModelUrl: item.chatModelUrl ?? '',
  embeddingModelName: item.embeddingModelName ?? '',
  embeddingModelUrl: item.embeddingModelUrl ?? '',
  knowledgeBaseIds: toIdArray(item.knowledgeBaseIds),
});

export const normalizeChat = (item: any): ChatItem => ({
  id: item.id,
  assistantId: item.assistantId,
  title: String(item.title ?? ''),
  createTime: item.updateTime ?? item.createTime ?? '',
  messages: Array.isArray(item.messages) ? item.messages : [],
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
