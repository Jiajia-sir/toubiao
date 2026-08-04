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
  enabled: number;
  sort?: number;
  remark?: string;
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
  enabled: number;
  sort?: number;
  remark?: string;
  createTime?: string;
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
