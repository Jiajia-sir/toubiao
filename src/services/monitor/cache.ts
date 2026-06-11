import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

// 获取缓存监控信息
export async function getCacheInfo() {
  return request<API.Monitor.CacheInfoResult>(`${API_PREFIX}/infra/redis/get-monitor-info`, {
    method: 'GET',
  });
}
