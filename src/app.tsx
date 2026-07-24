import { Footer, Question, SelectLang, AvatarDropdown, AvatarName } from '@/components';
import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig, RequestConfig } from '@umijs/max';
import { history, Link, request as umiRequest } from '@umijs/max';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { getAccessToken, getRefreshToken, getTokenExpireTime, setSessionToken } from './access';
import { ensureRemoteMenu, getRemoteMenu, getUserInfo, patchRouteWithRemoteMenus, refreshToken, setRemoteMenu } from './services/session';
import { PageEnum } from './enums/pagesEnums';
import { handleAuthExpired } from './utils/authRedirect';

// ========== Token 刷新队列机制 ==========
// 参考 data-processing-platform 的无感知刷新实现

/** 请求队列 - 存储刷新期间等待的请求配置 */
let requestQueue: Array<{ url: string; options: any; resolve: (value: any) => void; reject: (reason?: any) => void }> = [];
/** 是否正在刷新 token */
let isRefreshingToken = false;
/** 忽略的错误消息 - 避免重复提示 */
const ignoreRefreshMsgs = ["无效的刷新令牌", "刷新令牌已过期"];
/** 重试请求的标志 header key */
const RETRY_HEADER_KEY = 'X-Retry-After-Refresh';

const isDev = process.env.NODE_ENV === 'development';

function normalizeMenuText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    const elementLike = value as { props?: { children?: unknown } };
    const children = elementLike.props?.children;

    if (typeof children === 'string' || typeof children === 'number') {
      return String(children);
    }

    if (Array.isArray(children)) {
      const text = children
        .filter((item) => typeof item === 'string' || typeof item === 'number')
        .join('');
      if (text) {
        return text;
      }
    }
  }

  return fallback;
}

function normalizeMenuItems<T extends Record<string, any>>(items?: T[]): T[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const name = normalizeMenuText(item.name, item.path || '');
    const title = normalizeMenuText(item.title, name);
    const breadcrumbName = normalizeMenuText(item.breadcrumbName, title);
    const label = normalizeMenuText(item.label, name);

    return {
      ...item,
      name,
      title,
      breadcrumbName,
      label,
      children: normalizeMenuItems(item.children),
      routes: normalizeMenuItems(item.routes),
    };
  });
}

function normalizeRouteItems<T extends Record<string, any>>(items?: T[]): T[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const name = normalizeMenuText(item.name, item.path || '');
    const title = normalizeMenuText(item.title, name);
    const breadcrumbName = normalizeMenuText(item.breadcrumbName, title);

    return {
      ...item,
      name,
      title,
      breadcrumbName,
      children: normalizeRouteItems(item.children),
      routes: normalizeRouteItems(item.routes),
    };
  });
}



/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      const response = await getUserInfo({
        skipErrorHandler: true,
      });
      if (response.code === 200 && response.data) {
        const { user, permissions, roles } = response.data;
        if (user.avatar === '') {
          user.avatar =
            'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png';
        }
        return {
          ...user,
          userId: user.id,
          nickName: user.nickname,
          permissions,
          roles,
        } as API.CurrentUser;
      }
    } catch (error) {
      console.log(error);
      handleAuthExpired();
    }
    return undefined;
  };
  // 如果不是登录页面，执行
  const { location } = history;
  if (location.pathname !== PageEnum.LOGIN && getAccessToken()) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  return {
    actionsRender: () => [<Question key="doc" />, <SelectLang key="SelectLang" />],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown menu="True">{avatarChildren}</AvatarDropdown>;
      },
    },
    waterMarkProps: {
      // content: initialState?.currentUser?.nickName,
    },
    menu: {
      locale: false,
      // 每当 initialState?.currentUser?.userid 发生修改时重新执行 request
      params: {
        userId: initialState?.currentUser?.userId,
      },
      request: async () => {
        if (!initialState?.currentUser?.userId) {
          return [];
        }
        return normalizeMenuItems((await ensureRemoteMenu()) as Record<string, any>[]);
      },
      postMenuData: (menuData) => normalizeMenuItems(menuData as Record<string, any>[]),
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== PageEnum.LOGIN) {
        history.push(PageEnum.LOGIN);
      }
    },
    layoutBgImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
        <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
          <LinkOutlined />
          <span>OpenAPI 文档</span>
        </Link>,
      ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          <SettingDrawer
            disableUrlParams
            enableDarkTheme
            settings={initialState?.settings}
            onSettingChange={(settings) => {
              setInitialState((preInitialState) => ({
                ...preInitialState,
                settings,
              }));
            }}
          />
        </>
      );
    },
    ...initialState?.settings,
  };
};

export async function onRouteChange({ clientRoutes, location }) {
  void clientRoutes;
  void location;
}

// export function patchRoutes({ routes, routeComponents }) {
//   console.log('patchRoutes', routes, routeComponents);
// }


export async function patchClientRoutes({ routes }) {
  // console.log('patchClientRoutes', routes);
  patchRouteWithRemoteMenus(routes);
  normalizeRouteItems(routes as Record<string, any>[]);
}

export function render(oldRender: () => void) {
  const token = getAccessToken();
  if(!token || token?.length === 0) {
    oldRender();
    return;
  }

  ensureRemoteMenu()
    .catch(() => {
      setRemoteMenu(null);
    })
    .finally(() => {
      oldRender();
    });
}

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
const checkRegion = 5 * 60 * 1000;

function normalizeRequestParams(options: { params?: Record<string, any> }) {
  const params = options.params;
  if (!params) {
    return options;
  }

  if (typeof params.pageNo === 'undefined') {
    if (typeof params.current !== 'undefined') {
      params.pageNo = params.current;
    } else if (typeof params.currentPage !== 'undefined') {
      params.pageNo = params.currentPage;
    }
  }

  return options;
}

function setAlias(target: Record<string, any>, sourceKey: string, targetKey: string, valueTransform?: (value: any) => any) {
  if (typeof target[targetKey] === 'undefined' && typeof target[sourceKey] !== 'undefined') {
    target[targetKey] = valueTransform ? valueTransform(target[sourceKey]) : target[sourceKey];
  }
}

function mapYudaoMenuTypeToLegacy(value: any) {
  if (value === 1 || value === '1') {
    return 'M';
  }
  if (value === 2 || value === '2') {
    return 'C';
  }
  if (value === 3 || value === '3') {
    return 'F';
  }
  return value;
}

function normalizeYudaoEntity(target: any, visited: WeakSet<object>) {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (visited.has(target)) {
    return target;
  }
  visited.add(target);

  if (Array.isArray(target)) {
    target.forEach((item) => normalizeYudaoEntity(item, visited));
    return target;
  }

  Object.values(target).forEach((value) => {
    if (value && typeof value === 'object') {
      normalizeYudaoEntity(value, visited);
    }
  });

  const isYudaoMenuType =
    target.type === 1 ||
    target.type === 2 ||
    target.type === 3 ||
    target.type === '1' ||
    target.type === '2' ||
    target.type === '3' ||
    target.type === 'M' ||
    target.type === 'C' ||
    target.type === 'F';
  const isMenu =
    typeof target.menuType !== 'undefined' ||
    typeof target.permission !== 'undefined' ||
    typeof target.componentName !== 'undefined' ||
    typeof target.alwaysShow !== 'undefined' ||
    typeof target.keepAlive !== 'undefined' ||
    (typeof target.parentId !== 'undefined' && isYudaoMenuType) ||
    (typeof target.parentId !== 'undefined' &&
      (typeof target.component !== 'undefined' || typeof target.path !== 'undefined') &&
      typeof target.leaderUserId === 'undefined');
  const isUser =
    typeof target.username !== 'undefined' ||
    typeof target.nickname !== 'undefined' ||
    typeof target.mobile !== 'undefined' ||
    (typeof target.deptName !== 'undefined' && !isMenu);
  const isRole =
    typeof target.dataScope !== 'undefined' ||
    (typeof target.code !== 'undefined' &&
      typeof target.menuType === 'undefined' &&
      typeof target.value === 'undefined' &&
      typeof target.username === 'undefined' &&
      typeof target.leaderUserId === 'undefined' &&
      !isMenu);
  const isDept =
    !isMenu &&
    (typeof target.leaderUserId !== 'undefined' ||
      (typeof target.parentId !== 'undefined' &&
        typeof target.menuType === 'undefined' &&
        typeof target.component === 'undefined' &&
        typeof target.permission === 'undefined' &&
        typeof target.keepAlive === 'undefined' &&
        typeof target.dictType === 'undefined' &&
        !isYudaoMenuType));
  const isDictData = typeof target.label !== 'undefined' && typeof target.value !== 'undefined';
  const isDictType =
    !isMenu &&
    typeof target.type !== 'undefined' &&
    typeof target.parentId === 'undefined' &&
    typeof target.label === 'undefined' &&
    typeof target.value === 'undefined' &&
    typeof target.menuType === 'undefined' &&
    typeof target.username === 'undefined';
  const isPost =
    !isRole &&
    !isDictType &&
    !isDictData &&
    !isMenu &&
    typeof target.id !== 'undefined' &&
    typeof target.name !== 'undefined' &&
    typeof target.code === 'undefined' &&
    typeof target.username === 'undefined' &&
    typeof target.menuType === 'undefined' &&
    typeof target.parentId === 'undefined';

  if (isUser) {
    setAlias(target, 'id', 'userId');
    setAlias(target, 'username', 'userName');
    setAlias(target, 'nickname', 'nickName');
    setAlias(target, 'mobile', 'phonenumber');
  }

  if (isRole) {
    setAlias(target, 'id', 'roleId');
    setAlias(target, 'name', 'roleName');
    setAlias(target, 'code', 'roleKey');
    setAlias(target, 'sort', 'roleSort');
  }

  if (isDept) {
    setAlias(target, 'id', 'deptId');
    setAlias(target, 'name', 'deptName');
    setAlias(target, 'sort', 'orderNum');
    setAlias(target, 'leaderUserId', 'leader');
  }

  if (isMenu) {
    setAlias(target, 'id', 'menuId');
    setAlias(target, 'name', 'menuName');
    setAlias(target, 'sort', 'orderNum');
    setAlias(target, 'permission', 'perms');
    setAlias(target, 'type', 'menuType', mapYudaoMenuTypeToLegacy);
    setAlias(target, 'keepAlive', 'isCache', (value) => (value ? 0 : 1));
  }

  if (isDictType) {
    setAlias(target, 'id', 'dictId');
    setAlias(target, 'name', 'dictName');
    setAlias(target, 'type', 'dictType');
  }

  if (isDictData) {
    setAlias(target, 'id', 'dictCode');
    setAlias(target, 'label', 'dictLabel');
    setAlias(target, 'value', 'dictValue');
    setAlias(target, 'sort', 'dictSort');
  }

  if (isPost) {
    setAlias(target, 'id', 'postId');
    setAlias(target, 'name', 'postName');
    setAlias(target, 'sort', 'postSort');
  }

  if (typeof target.label === 'undefined') {
    if (typeof target.name !== 'undefined') {
      target.label = target.name;
    } else if (typeof target.menuName !== 'undefined') {
      target.label = target.menuName;
    } else if (typeof target.deptName !== 'undefined') {
      target.label = target.deptName;
    }
  }

  return target;
}

function normalizeYudaoResult(result: any) {
  if (!result || typeof result !== 'object') {
    return result;
  }

  if (result.code === 0) {
    result.code = 200;
  }

  if (typeof result.msg === 'undefined' && typeof result.message === 'string') {
    result.msg = result.message;
  }

  const payload = result.data;
  if (typeof payload === 'undefined' || payload === null) {
    return result;
  }

  normalizeYudaoEntity(payload, new WeakSet<object>());

  if (Array.isArray(payload)) {
    if (typeof result.rows === 'undefined') {
      result.rows = payload;
    }
    if (typeof result.total === 'undefined') {
      result.total = payload.length;
    }
    return result;
  }

  if (typeof payload === 'object') {
    Object.keys(payload).forEach((key) => {
      if (typeof result[key] === 'undefined') {
        result[key] = payload[key];
      }
    });

    if (Array.isArray(payload.list) && typeof result.rows === 'undefined') {
      result.rows = payload.list;
    }
    if (Array.isArray(payload.records) && typeof result.rows === 'undefined') {
      result.rows = payload.records;
    }
    if (typeof payload.total !== 'undefined' && typeof result.total === 'undefined') {
      result.total = payload.total;
    }
    if (typeof payload.pageSize !== 'undefined' && typeof result.pageSize === 'undefined') {
      result.pageSize = payload.pageSize;
    }
    if (typeof payload.pageNo !== 'undefined' && typeof result.current === 'undefined') {
      result.current = payload.pageNo;
    }
    if (Array.isArray(payload.menuIds) && typeof result.checkedKeys === 'undefined') {
      result.checkedKeys = payload.menuIds;
    }
    if (Array.isArray(payload.deptIds) && typeof result.checkedKeys === 'undefined') {
      result.checkedKeys = payload.deptIds;
    }
    if (Array.isArray(payload.menus) && typeof result.menus === 'undefined') {
      result.menus = payload.menus;
    }
    if (Array.isArray(payload.depts) && typeof result.depts === 'undefined') {
      result.depts = payload.depts;
    }
  }

  return result;
}

/**
 * 执行 token 刷新
 * 成功：更新 token，重放队列中的请求
 * 失败：提示用户重新登录
 */
async function doRefreshToken(): Promise<boolean> {
  const refreshTokenStr = getRefreshToken();
  if (!refreshTokenStr) {
    return false;
  }

  try {
    const res = await refreshToken(refreshTokenStr);
    if (res.code === 200 && res.data) {
      // 计算新的过期时间（默认 12 小时，与登录时一致）
      const current = new Date();
      const expireTime = current.setTime(current.getTime() + 1000 * 12 * 60 * 60);
      setSessionToken(res.data.accessToken, res.data.refreshToken, expireTime);
      return true;
    }
    return false;
  } catch (e) {
    console.error('刷新 token 失败:', e);
    return false;
  }
}

export const request = {
  ...errorConfig,
  requestInterceptors: [
    (url: any, options: { headers: any; params?: Record<string, any> }) => {
      const headers = options.headers ? options.headers : [];
      console.log('request ====>:', url);
      const authHeader = headers['Authorization'];
      const isToken = headers['isToken'];
      const isLoginPage = history.location.pathname === PageEnum.LOGIN;

      if (!authHeader && isToken !== false) {
        const expireTime = getTokenExpireTime();
        if (expireTime) {
          const left = Number(expireTime) - new Date().getTime();
          const refreshTokenStr = getRefreshToken();

          if (left < checkRegion && refreshTokenStr) {
            // token 即将过期或已过期，但有 refreshToken
            if (left < 0) {
              // token 已过期，由响应拦截器处理 401 进行刷新
              // 这里不设置 Authorization，让请求发出后由响应拦截器捕获 401
            } else {
              // token 即将过期但还未过期，正常设置 Authorization
              // 响应拦截器会在收到 401 时自动刷新
              const accessToken = getAccessToken();
              if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
              }
            }
          } else {
            // token 未过期，正常设置 Authorization
            const accessToken = getAccessToken();
            if (accessToken) {
              headers['Authorization'] = `Bearer ${accessToken}`;
            }
          }
        } else {
          // 没有过期时间信息，可能是旧版本数据
          const accessToken = getAccessToken();
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          } else if (!isLoginPage) {
            handleAuthExpired();
          }
        }
      }
      normalizeRequestParams(options);
      return { url, options };
    },
  ],
  responseInterceptors: [
    async (response: any) => {
      // 适配 yudao 框架的 CommonResult 响应格式
      // 后端成功响应 code 为 0，统一转换为 200 以兼容前端现有判断逻辑
      normalizeYudaoResult(response?.data);

      const data = response?.data;
      const statusCode = response?.status;
      const bizCode = data?.code;
      const msg = data?.msg || '';

      // 忽略特定的刷新相关错误消息
      if (ignoreRefreshMsgs.includes(msg)) {
        return Promise.reject(msg);
      }

      // 处理 401 未认证响应
      if (statusCode === 401 || bizCode === 401) {
        // 检查是否是重试请求（避免无限循环）
        const config = response.config || {};
        const isRetryRequest = config.headers?.[RETRY_HEADER_KEY] === 'true';

        // 如果是重试请求仍然返回 401，说明刷新后的 token 也无效了，直接跳转登录页
        if (isRetryRequest) {
          handleAuthExpired();
          return Promise.reject('登录状态已过期，请重新登录');
        }

        // 保存原始请求的 url 和 options，用于重试
        // response.config 是 axios 的请求配置，包含完整的请求信息
        const originalUrl = config.url || '';
        const originalOptions: any = {
          method: config.method?.toUpperCase() || 'GET',
          headers: { ...config.headers },
        };

        // 提取请求参数
        if (config.params) {
          originalOptions.params = config.params;
        }
        if (config.data) {
          originalOptions.data = config.data;
        }
        // 保留其他可能需要的配置
        if (config.responseType) {
          originalOptions.responseType = config.responseType;
        }
        if (config.timeout) {
          originalOptions.timeout = config.timeout;
        }

        // 如果正在刷新中，将当前请求加入队列等待
        if (isRefreshingToken) {
          return new Promise((resolve, reject) => {
            requestQueue.push({
              url: originalUrl,
              options: originalOptions,
              resolve,
              reject,
            });
          });
        }

        // 开始刷新
        isRefreshingToken = true;

        try {
          const success = await doRefreshToken();

          if (success) {
            // 刷新成功，重放队列中的所有请求
            const queue = [...requestQueue];
            requestQueue = [];

            // 异步重放队列中的请求（不阻塞当前请求）
            queue.forEach((item) => {
              const accessToken = getAccessToken();
              if (accessToken) {
                item.options.headers = {
                  ...item.options.headers,
                  Authorization: `Bearer ${accessToken}`,
                  [RETRY_HEADER_KEY]: 'true', // 标记为重试请求
                };
              }
              // 使用 skipErrorHandler 避免重复处理错误
              umiRequest(item.url, { ...item.options, skipErrorHandler: true })
                .then(item.resolve)
                .catch(item.reject);
            });

            // 用新 token 重新发起当前请求
            const accessToken = getAccessToken();
            if (accessToken) {
              originalOptions.headers['Authorization'] = `Bearer ${accessToken}`;
            }
            // 标记为重试请求，避免无限循环
            originalOptions.headers[RETRY_HEADER_KEY] = 'true';
            // 重新发起请求，使用 skipErrorHandler 避免重复处理错误
            return umiRequest(originalUrl, { ...originalOptions, skipErrorHandler: true });
          } else {
            // 刷新失败，拒绝队列中的所有请求
            const queue = [...requestQueue];
            requestQueue = [];
            queue.forEach((item) => item.reject('登录状态已过期，请重新登录'));

            handleAuthExpired();
            return Promise.reject('登录状态已过期，请重新登录');
          }
        } finally {
          // 清理状态
          isRefreshingToken = false;
        }
      }

      return response;
    },
  ],
};
