import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询定时任务调度列表
export async function getJobList(params?: API.Monitor.JobListParams) {
  return request<API.Monitor.JobPageResult>(`${API_PREFIX}/infra/job/page`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params
  });
}

// 查询定时任务调度详细
export function getJob(jobId: number) {
  return request<API.Monitor.JobInfoResult>(`${API_PREFIX}/infra/job/get`, {
    method: 'GET',
    params: { id: jobId }
  });
}

// 新增定时任务调度
export async function addJob(params: API.Monitor.Job) {
  return request<API.Result>(`${API_PREFIX}/infra/job/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 修改定时任务调度
export async function updateJob(params: API.Monitor.Job) {
  return request<API.Result>(`${API_PREFIX}/infra/job/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 删除定时任务调度
export async function removeJob(ids: string) {
  return request<API.Result>(`${API_PREFIX}/infra/job/delete`, {
    method: 'DELETE',
    params: { ids }
  });
}

// 导出定时任务调度
export function exportJob(params?: API.Monitor.JobListParams) {
  return downLoadXlsx(`${API_PREFIX}/infra/job/export-excel`, { params }, `job_${new Date().getTime()}.xlsx`);
}

// 定时任务立即执行一次
export async function runJob(jobId: number, jobGroup: string) {
  const job = {
    id: jobId,
    jobGroup,
  };
  return request(`${API_PREFIX}/infra/job/trigger`, {
    method: 'PUT',
    data: job,
  });
}
