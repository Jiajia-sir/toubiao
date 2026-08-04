/**
 * @doc https://umijs.org/docs/guides/proxy
 */

const COMMUNITY_API_PROXY_TARGET =
  process.env.COMMUNITY_API_PROXY_TARGET ||
  process.env.REACT_APP_COMMUNITY_API_PROXY_TARGET ||
  "http://192.168.31.55:50011";

const communityApiProxy: Record<string, any> = COMMUNITY_API_PROXY_TARGET
  ? {
      "/community-api/": {
        target: COMMUNITY_API_PROXY_TARGET,
        changeOrigin: true,
        pathRewrite: { "^/community-api": "" },
      },
    }
  : {};

export default {
  dev: {
    "/admin-api/": {
      target: "http://192.168.31.244:42026",
      changeOrigin: true,
    },
    "/profile/avatar/": {
      target: "http://192.168.31.244:42026",
      changeOrigin: true,
    },
    ...communityApiProxy,
  },

  test: {
    "/api/": {
      target: "https://proapi.azurewebsites.net",
      changeOrigin: true,
      pathRewrite: { "^": "" },
    },
    ...communityApiProxy,
  },

  pre: {
    "/api/": {
      target: "your pre url",
      changeOrigin: true,
      pathRewrite: { "^": "" },
    },
    ...communityApiProxy,
  },
};
