import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

// 获取服务器信息 — 后端无此接口，暂用空实现
export async function getServerInfo() {
  return request(`${API_PREFIX}/infra/redis/get-monitor-info`, {
    method: 'GET',
  });
}
