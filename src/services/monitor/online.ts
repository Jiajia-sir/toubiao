import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

// 查询在线用户列表 — 后端无此接口，暂用空实现
export async function getOnlineUserList(params?: API.Monitor.OnlineUserListParams) {
  return request<API.Monitor.OnlineUserPageResult>(`${API_PREFIX}/system/user/page`, {
    method: 'GET',
    params,
  });
}

// 强退用户 — 后端无此接口，暂用空实现
export async function forceLogout(tokenId: string) {
  return request(`${API_PREFIX}/system/user/page`, {
    method: 'GET',
  });
}
