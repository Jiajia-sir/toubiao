import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

// 查询缓存名称列表 — 后端无此接口，使用 Redis 监控信息代替
export function listCacheName() {
  return request<API.Monitor.CacheNamesResponse>(`${API_PREFIX}/infra/redis/get-monitor-info`, {
    method: 'get'
  })
}

// 查询缓存键名列表 — 后端无此接口
export function listCacheKey(cacheName: string) {
  return request<API.Monitor.CacheKeysResponse>(`${API_PREFIX}/infra/redis/get-monitor-info`, {
    method: 'get'
  })
}

// 查询缓存内容 — 后端无此接口
export function getCacheValue(cacheName: string, cacheKey: string) {
  return request<API.Monitor.CacheValueResponse>(`${API_PREFIX}/infra/redis/get-monitor-info`, {
    method: 'get'
  })
}

// 清理指定名称缓存 — 后端无此接口
export function clearCacheName(cacheName: string) {
  return request<API.Result>(`${API_PREFIX}/infra/redis/get-monitor-info`, {
    method: 'get'
  })
}

// 清理指定键名缓存 — 后端无此接口
export function clearCacheKey(cacheKey: string) {
  return request<API.Result>(`${API_PREFIX}/infra/redis/get-monitor-info`, {
    method: 'get'
  })
}

// 清理全部缓存 — 后端无此接口
export function clearCacheAll() {
  return request<API.Result>(`${API_PREFIX}/infra/redis/get-monitor-info`, {
    method: 'get'
  })
}
