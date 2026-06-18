import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface KnowledgeBaseParams {
  id?: number | string;
  name: string;
  description: string;
  color: string;
  enabled: string | boolean | number;
}

export interface KnowledgeBasePageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
}

export interface KnowledgeBaseItem {
  id: number | string;
  name: string;
  description: string;
  color: string;
  enabled: string | boolean | number;
  documentCount?: number;
  entityCount?: number;
  createTime?: string;
}

export interface KnowledgeBasePageResult {
  list: KnowledgeBaseItem[];
  total: number;
}

export async function addKnowledgeBase(data: KnowledgeBaseParams) {
  return request(`${API_PREFIX}/biz/knowledge-base/create`, {
    method: 'POST',
    data,
  });
}

export async function updateKnowledgeBase(data: KnowledgeBaseParams) {
  return request(`${API_PREFIX}/biz/knowledge-base/update`, {
    method: 'PUT',
    data,
  });
}

export async function removeKnowledgeBase(id: number | string) {
  return request(`${API_PREFIX}/biz/knowledge-base/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function getKnowledgeBasePage(params: KnowledgeBasePageParams) {
  return request<KnowledgeBasePageResult>(`${API_PREFIX}/biz/knowledge-base/page`, {
    method: 'GET',
    params,
  });
}

export async function getKnowledgeBaseList(params?: Partial<KnowledgeBasePageParams>) {
  return getKnowledgeBasePage({
    pageNo: params?.pageNo ?? 1,
    pageSize: params?.pageSize ?? 1000,
    name: params?.name,
  });
}
