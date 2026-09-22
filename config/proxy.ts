/**
 * @doc https://umijs.org/docs/guides/proxy
 */

const COMMUNITY_API_PROXY_TARGET =
  process.env.COMMUNITY_API_PROXY_TARGET ||
  process.env.REACT_APP_COMMUNITY_API_PROXY_TARGET ||
  'http://192.168.31.55:50011';

const communityApiProxy: Record<string, any> = COMMUNITY_API_PROXY_TARGET
  ? {
      '/community-api/': {
        target: COMMUNITY_API_PROXY_TARGET,
        changeOrigin: true,
        pathRewrite: { '^/community-api': '' },
      },
    }
  : {};

export default {
  dev: {
    // localhost:8000/admin-api/** -> http://localhost:8080/admin-api/**
    '/admin-api/': {
      target: 'http://localhost:42026',
      // target: 'http://192.168.31.150:42026', // 临时后端地址
      changeOrigin: true,
    },
    // 不知道这啥，没用到
    // '/profile/avatar/': {
    //   target: 'http://192.168.31.244:42026',
    //   changeOrigin: true,
    // },
    //算法-问答
    '/api/': {
      target: 'http://192.168.31.55:7860',
      changeOrigin: true,
    },
    //算法-消融
    '/ablation/': {
      target: 'http://192.168.31.55:50011',
      changeOrigin: true,
    },
    ...communityApiProxy,
  },

  test: {
    '/api/': {
      target: 'https://proapi.azurewebsites.net',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
    ...communityApiProxy,
  },

  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
    ...communityApiProxy,
  },
};
