import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询系统访问记录列表
export async function getLogininforList(params?: API.Monitor.LogininforListParams) {
  return request<API.Monitor.LogininforPageResult>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params
  });
}

// 查询系统访问记录详细 — 后端无此接口
export function getLogininfor(infoId: number) {
  return request<API.Monitor.LogininforInfoResult>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET'
  });
}

// 新增系统访问记录 — 后端无此接口
export async function addLogininfor(params: API.Monitor.Logininfor) {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET'
  });
}

// 修改系统访问记录 — 后端无此接口
export async function updateLogininfor(params: API.Monitor.Logininfor) {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET'
  });
}

// 删除系统访问记录 — 后端无此接口
export async function removeLogininfor(ids: string) {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET'
  });
}

// 导出系统访问记录
export function exportLogininfor(params?: API.Monitor.LogininforListParams) {
  return downLoadXlsx(`${API_PREFIX}/system/login-log/export`, { params }, `logininfor_${new Date().getTime()}.xlsx`);
}

// 解锁用户登录状态 — 后端无此接口
export function unlockLogininfor(userName: string) {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'get'
  })
}

// 清空登录日志 — 后端无此接口
export function cleanLogininfor() {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'get'
  })
}
