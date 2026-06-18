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
  description?: string;
}

export interface KnowledgeExtractConfigPageResult {
  list: KnowledgeExtractConfigItem[];
  total: number;
}

export async function getKnowledgeExtractConfigPage(params: KnowledgeExtractConfigPageParams) {
  return request<KnowledgeExtractConfigPageResult>(`${API_PREFIX}/biz/extract-template/page`, {
    method: 'GET',
    params,
  });
}
