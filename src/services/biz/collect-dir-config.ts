import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface CollectDirConfigPayload {
  id?: number;
  name: string;
  catalogId: number;
  channelConfigId: number;
  knowledgeBaseIds: string;
  fileTagIds: string;
  enableOcr: number;
  enableTrans: number;
  enableExtract: number;
  inputPath: string;
  errorPath: string;
  backPath: string;
  hostId: number;
  pollInterval: number;
}

export interface CollectDirConfigPageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  inputPath?: string;
  errorPath?: string;
  backPath?: string;
  hostId?: number;
  status?: number;
  createTime?: string[];
}

export interface CollectDirConfigItem {
  id: number;
  name: string;
  catalogId: number;
  catalogName?: string;
  channelConfigId: number;
  channelConfigName?: string;
  knowledgeBaseIds: string;
  knowledgeBaseNames?: string;
  fileTagIds: string;
  fileTagNames?: string;
  enableOcr: number;
  enableTrans: number;
  enableExtract: number;
  inputPath: string;
  errorPath: string;
  backPath: string;
  hostId: number;
  hostName?: string;
  pollInterval: number;
  status?: number;
  createTime?: string;
  updateTime?: string;
}

export async function createCollectDirConfig(data: CollectDirConfigPayload) {
  return request(`${API_PREFIX}/biz/collect-dir-config/create`, {
    method: 'POST',
    data,
  });
}

export async function updateCollectDirConfig(data: CollectDirConfigPayload) {
  return request(`${API_PREFIX}/biz/collect-dir-config/update`, {
    method: 'PUT',
    data,
  });
}

export async function getCollectDirConfigPage(params: CollectDirConfigPageParams) {
  return request(`${API_PREFIX}/biz/collect-dir-config/page`, {
    method: 'GET',
    params,
  });
}

export async function removeCollectDirConfig(id: number | string) {
  return request(`${API_PREFIX}/biz/collect-dir-config/delete`, {
    method: 'DELETE',
    params: { id },
  });
}
