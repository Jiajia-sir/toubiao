import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询参数配置列表
export async function getConfigList(params?: API.System.ConfigListParams) {
  return request<API.System.ConfigPageResult>(`${API_PREFIX}/infra/config/page`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params
  });
}

// 查询参数配置详细
export function getConfig(configId: number) {
  return request<API.System.ConfigInfoResult>(`${API_PREFIX}/infra/config/get`, {
    method: 'GET',
    params: { id: configId }
  });
}

// 新增参数配置
export async function addConfig(params: API.System.Config) {
  return request<API.Result>(`${API_PREFIX}/infra/config/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 修改参数配置
export async function updateConfig(params: API.System.Config) {
  return request<API.Result>(`${API_PREFIX}/infra/config/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 删除参数配置
export async function removeConfig(ids: string) {
  return request<API.Result>(`${API_PREFIX}/infra/config/delete`, {
    method: 'DELETE',
    params: { ids }
  });
}

// 导出参数配置
export function exportConfig(params?: API.System.ConfigListParams) {
  return downLoadXlsx(`${API_PREFIX}/infra/config/export-excel`, { params }, `config_${new Date().getTime()}.xlsx`);
}

// 刷新参数缓存 — 后端无此接口，暂不实现
export function refreshConfigCache() {
  return request<API.Result>(`${API_PREFIX}/infra/config/update`, {
    method: 'put'
  })
}
