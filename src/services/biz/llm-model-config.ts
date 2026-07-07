import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface LlmModelConfigPageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  providerType?: string;
  apiType?: string;
  enabled?: number;
}

export interface LlmModelConfigSaveParams {
  id?: number | string;
  name: string;
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKey?: string;
  enabled: number;
  sort?: number;
  remark?: string;
}

export interface LlmModelConfigTestParams {
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKey?: string;
  testPrompt?: string;
}

export interface LlmModelConfigItem {
  id: number;
  name: string;
  providerType: string;
  apiType: string;
  baseUrl: string;
  modelCode: string;
  apiKeyMasked?: string;
  enabled: number;
  sort?: number;
  remark?: string;
  createTime?: string;
}

export interface LlmModelConfigTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  responsePreview?: string;
}

export async function getLlmModelConfigPage(params: LlmModelConfigPageParams) {
  return request(`${API_PREFIX}/biz/llm-model-config/page`, {
    method: 'GET',
    params,
  });
}

export async function getLlmModelConfigList() {
  return request(`${API_PREFIX}/biz/llm-model-config/list`, {
    method: 'GET',
  });
}

export async function addLlmModelConfig(data: LlmModelConfigSaveParams) {
  return request(`${API_PREFIX}/biz/llm-model-config/create`, {
    method: 'POST',
    data,
  });
}

export async function updateLlmModelConfig(data: LlmModelConfigSaveParams) {
  return request(`${API_PREFIX}/biz/llm-model-config/update`, {
    method: 'PUT',
    data,
  });
}

export async function removeLlmModelConfig(id: number | string) {
  return request(`${API_PREFIX}/biz/llm-model-config/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function testLlmModelConfig(data: LlmModelConfigTestParams) {
  return request(`${API_PREFIX}/biz/llm-model-config/test`, {
    method: 'POST',
    data,
  });
}
