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
    data: params,
  });
}

// 导出操作日志记录
export function exportOperlog(params?: API.Monitor.OperlogListParams) {
  return downLoadXlsx(
    `${API_PREFIX}/system/operate-log/export`,
    { params },
    `操作日志_${new Date().getTime()}.xls`,
    'GET',
  );
}
