/**
 * API 请求前缀
 * - 开发环境: /admin-api（直接代理到后端）
 * - 生产环境: /prod-api/admin-api（nginx 去掉 /prod-api，后端收到 /admin-api/xxx）
 */
export const API_PREFIX = process.env.NODE_ENV === 'production' ? '/prod-api/admin-api' : '/admin-api';
