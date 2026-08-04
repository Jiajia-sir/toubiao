/**
 * 后台管理接口前缀
 * - 开发环境: /admin-api
 * - 生产环境: /prod-api/admin-api
 */
export const API_PREFIX =
  process.env.NODE_ENV === "production" ? "/prod-api/admin-api" : "/admin-api";

/**
 * 社区网络图接口前缀
 * - 开发环境: /community-api
 * - 生产环境: /prod-api/community-api
 */
export const COMMUNITY_API_PREFIX =
  process.env.NODE_ENV === "production" ? "/prod-api/community-api" : "/community-api";
