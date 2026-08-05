import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface EmbedModelConfigPageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  providerType?: string;
  apiType?: string;
  enabled?: number;
}

export interface EmbedModelConfigSaveParams {
  id?: number | string;
  name: string;
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKey?: string;
  dimension?: number;
  defaulted?: number;
  enabled: number;
  sort?: number;
  remark?: string;
  vectorStrategy?: {
    type: 'sentence' | 'summary' | 'custom';
    sentences_per_chunk?: number;
    sentence_overlap?: number;
    separators?: string[];
    source_chars_per_summary?: number;
    summary_max_tokens?: number;
    llm?: {
      base_url: string;
      model: string;
    };
    chunk_size?: number;
    chunk_overlap?: number;
  };
}

export interface EmbedModelConfigTestParams {
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKey?: string;
  testText?: string;
  expectedDimension?: number;
}

export interface EmbedModelConfigItem {
  id: number;
  name: string;
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKeyMasked?: string;
  dimension?: number;
  defaulted?: number;
  enabled: number;
  sort?: number;
  remark?: string;
  createTime?: string;
  vectorStrategy?: EmbedModelConfigSaveParams['vectorStrategy'];
}

export interface EmbedModelConfigTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  dimension?: number;
  responsePreview?: string;
}

export async function getEmbedModelConfigPage(params: EmbedModelConfigPageParams) {
  return request(`${API_PREFIX}/biz/embed-model-config/page`, {
    method: 'GET',
    params,
  });
}

export async function addEmbedModelConfig(data: EmbedModelConfigSaveParams) {
  return request(`${API_PREFIX}/biz/embed-model-config/create`, {
    method: 'POST',
    data,
  });
}

export async function updateEmbedModelConfig(data: EmbedModelConfigSaveParams) {
  return request(`${API_PREFIX}/biz/embed-model-config/update`, {
    method: 'PUT',
    data,
  });
}

export async function removeEmbedModelConfig(id: number | string) {
  return request(`${API_PREFIX}/biz/embed-model-config/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function testEmbedModelConfig(data: EmbedModelConfigTestParams) {
  return request(`${API_PREFIX}/biz/embed-model-config/test`, {
    method: 'POST',
    data,
  });
}
