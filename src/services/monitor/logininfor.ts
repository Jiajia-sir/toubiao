import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

function normalizeLogininforRecord(record: any): API.Monitor.Logininfor {
  return {
    ...record,
    infoId: record.infoId ?? record.id,
    userName: record.userName ?? record.username,
    ipaddr: record.ipaddr ?? record.userIp,
    status:
      typeof record.status !== 'undefined'
        ? record.status
        : typeof record.result !== 'undefined'
          ? String(record.result)
          : '',
    loginTime: record.loginTime ?? record.createTime,
    msg: record.msg ?? '',
    loginLocation: record.loginLocation ?? '',
    browser: record.browser ?? '',
    os: record.os ?? '',
  };
}

export async function getLogininforList(params?: API.Monitor.LogininforListParams) {
  const response = await request<API.Monitor.LogininforPageResult>(
    `${API_PREFIX}/system/login-log/page`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
      params,
    },
  );

  return {
    ...response,
    rows: Array.isArray(response?.rows) ? response.rows.map(normalizeLogininforRecord) : [],
  };
}

export function getLogininfor(infoId: number) {
  return request<API.Monitor.LogininforInfoResult>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET',
  });
}

export async function addLogininfor(params: API.Monitor.Logininfor) {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET',
  });
}

export async function updateLogininfor(params: API.Monitor.Logininfor) {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET',
  });
}

export async function removeLogininfor(ids: string) {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'GET',
  });
}

export function exportLogininfor(params?: API.Monitor.LogininforListParams) {
  return downLoadXlsx(`${API_PREFIX}/system/login-log/export`, { params }, `登录日志.xls`, 'GET');
}

export function unlockLogininfor(userName: string) {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'get',
  });
}

export function cleanLogininfor() {
  return request<API.Result>(`${API_PREFIX}/system/login-log/page`, {
    method: 'get',
  });
}
