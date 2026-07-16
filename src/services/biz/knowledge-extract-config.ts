import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface KnowledgeExtractConfigPageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  enabled?: '启用' | '停用';
  granularity?: '粗颗粒度' | '细颗粒度';
  modelName?: string;
}

export interface KnowledgeExtractConfigItem {
  id: number | string;
  name: string;
  isBuiltin: boolean;
  tags?: string[];
  createTime?: string;
  creator?: string;
  granularity: '粗颗粒度' | '细颗粒度';
  enabled: '启用' | '停用';
  modelName?: string;
  modelId?: number | string;
  description?: string;
  sortNo?: number;
  splitMode?: '字数' | '段落';
  blockSize?: number;
  generatedPrompt?: string;
  extractSchema?: Record<string, any>;
  configSnapshot?: Record<string, any>;
  temperatureEnabled?: boolean;
  temperature?: number;
  topPEnabled?: boolean;
  topP?: number;
  presencePenaltyEnabled?: boolean;
  presencePenalty?: number;
  frequencyPenaltyEnabled?: boolean;
  frequencyPenalty?: number;
  maxTokensEnabled?: boolean;
  maxTokens?: number;
}

export interface KnowledgeExtractConfigPageResult {
  list: KnowledgeExtractConfigItem[];
  total: number;
}

export interface KnowledgeExtractTemplateSaveParams {
  id?: number | string;
  name: string;
  description?: string;
  enabled: '启用' | '停用';
  isBuiltin: boolean;
  tags: string[];
  splitMode: '字数' | '段落';
  blockSize: number;
  granularity: '粗颗粒度' | '细颗粒度';
  modelName: string;
  modelId: number | string;
  temperatureEnabled?: boolean;
  temperature?: number;
  topPEnabled?: boolean;
  topP?: number;
  presencePenaltyEnabled?: boolean;
  presencePenalty?: number;
  frequencyPenaltyEnabled?: boolean;
  frequencyPenalty?: number;
  maxTokensEnabled?: boolean;
  maxTokens?: number;
  generatedPrompt?: string;
  extractSchema?: Record<string, any>;
  configSnapshot?: Record<string, any>;
  sortNo?: number;
}

export interface KnowledgeExtractTemplateSortItem {
  id: number | string;
  sortNo: number;
}

export async function getKnowledgeExtractConfigPage(params: KnowledgeExtractConfigPageParams) {
  return request<KnowledgeExtractConfigPageResult>(`${API_PREFIX}/biz/extract-template/page`, {
    method: 'GET',
    params,
  });
}

export async function getKnowledgeExtractConfigDetail(id: number | string) {
  return request<KnowledgeExtractConfigItem>(`${API_PREFIX}/biz/extract-template/get`, {
    method: 'GET',
    params: { id },
  });
}

export async function createKnowledgeExtractConfig(data: KnowledgeExtractTemplateSaveParams) {
  return request(`${API_PREFIX}/biz/extract-template/create`, {
    method: 'POST',
    data,
  });
}

export async function updateKnowledgeExtractConfig(data: KnowledgeExtractTemplateSaveParams) {
  return request(`${API_PREFIX}/biz/extract-template/update`, {
    method: 'PUT',
    data,
  });
}

export async function removeKnowledgeExtractConfig(id: number | string) {
  return request(`${API_PREFIX}/biz/extract-template/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function updateKnowledgeExtractConfigSort(items: KnowledgeExtractTemplateSortItem[]) {
  return request(`${API_PREFIX}/biz/extract-template/update-sort`, {
    method: 'PUT',
    data: { items },
  });
}
