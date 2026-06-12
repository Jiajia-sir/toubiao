import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询操作日志记录列表
export async function getOperlogList(params?: API.Monitor.OperlogListParams) {
  return request<API.Monitor.OperlogPageResult>(`${API_PREFIX}/system/operate-log/page`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 查询操作日志记录详细 — 后端无此接口
export function getOperlog(operId: number) {
  return request<API.Monitor.OperlogInfoResult>(`${API_PREFIX}/system/operate-log/page`, {
    method: 'GET'
  });
}

// 新增操作日志记录 — 后端无此接口
export async function addOperlog(params: API.Monitor.Operlog) {
  return request<API.Result>(`${API_PREFIX}/system/operate-log/page`, {
    method: 'GET'
  });
}

// 修改操作日志记录 — 后端无此接口
export async function updateOperlog(params: API.Monitor.Operlog) {
  return request<API.Result>(`${API_PREFIX}/system/operate-log/page`, {
    method: 'GET'
  });
}

// 删除操作日志记录 — 后端无此接口
export async function removeOperlog(ids: string) {
  return request<API.Result>(`${API_PREFIX}/system/operate-log/page`, {
    method: 'GET'
  });
}

export async function cleanAllOperlog() {
  return request<API.Result>(`${API_PREFIX}/system/operate-log/page`, {
    method: 'GET'
  });
}

// 导出操作日志记录
export function exportOperlog(params?: API.Monitor.OperlogListParams) {
  return downLoadXlsx(`${API_PREFIX}/system/operate-log/export`, { params }, `operlog_${new Date().getTime()}.xlsx`);
}
