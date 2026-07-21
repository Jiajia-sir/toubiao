import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

function buildCollectHostConfigPageQuery(params?: Record<string, any>) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && typeof item !== 'undefined' && item !== '') {
          searchParams.append(key, String(item));
        }
      });
      return;
    }
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
}

export interface CollectHostConfigPayload {
  id?: number;
  hostName: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  status: number;
}

export interface CollectHostConfigPageParams {
  pageNo: number;
  pageSize: number;
  hostName?: string;
  ip?: string;
  port?: number;
  status?: number;
  createTime?: string[];
}

export interface CollectHostConfigItem {
  id: number;
  hostName: string;
  ip: string;
  port: number;
  username: string;
  password?: string;
  status: number;
  createTime?: string;
  updateTime?: string;
}

export async function createCollectHostConfig(data: CollectHostConfigPayload) {
  return request(`${API_PREFIX}/biz/collect-host-config/create`, {
    method: 'POST',
    data,
  });
}

export async function updateCollectHostConfig(data: CollectHostConfigPayload) {
  return request(`${API_PREFIX}/biz/collect-host-config/update`, {
    method: 'PUT',
    data,
  });
}

export async function getCollectHostConfigPage(params: CollectHostConfigPageParams) {
  return request(`${API_PREFIX}/biz/collect-host-config/page`, {
    method: 'GET',
    params,
    paramsSerializer: (value) => buildCollectHostConfigPageQuery(value as Record<string, any>),
  });
}

export async function testCollectHostConfigConnection(id: number | string) {
  return request(`${API_PREFIX}/biz/collect-host-config/test-connection`, {
    method: 'GET',
    params: { id },
  });
}

export async function toggleCollectHostConfigEnable(id: number | string) {
  return request(`${API_PREFIX}/biz/collect-host-config/enable`, {
    method: 'POST',
    params: { id },
  });
}

export async function removeCollectHostConfig(id: number | string) {
  return request(`${API_PREFIX}/biz/collect-host-config/delete`, {
    method: 'DELETE',
    params: { id },
  });
}
