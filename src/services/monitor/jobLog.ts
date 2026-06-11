import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询定时任务调度日志列表
export async function getJobLogList(params?: API.Monitor.JobLogListParams) {
  return request<API.Monitor.JobLogPageResult>(`${API_PREFIX}/infra/job-log/page`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params
  });
}

// 删除定时任务调度日志 — 后端无此接口，暂不实现
export async function removeJobLog(jobLogId: string) {
  return request<API.Result>(`${API_PREFIX}/infra/job-log/page`, {
    method: 'GET'
  });
}

// 清空调度日志 — 后端无此接口，暂不实现
export function cleanJobLog() {
  return request(`${API_PREFIX}/infra/job-log/page`, {
    method: 'GET'
  })
}

// 导出定时任务调度日志
export function exportJobLog(params?: API.Monitor.JobLogListParams) {
  return downLoadXlsx(`${API_PREFIX}/infra/job-log/export-excel`, { params }, `joblog_${new Date().getTime()}.xlsx`);
}
