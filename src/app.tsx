import { Footer, Question, SelectLang, AvatarDropdown, AvatarName } from '@/components';
import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { getAccessToken, getRefreshToken, getTokenExpireTime } from './access';
import { ensureRemoteMenu, getRemoteMenu, getRoutersInfo, getUserInfo, patchRouteWithRemoteMenus, setRemoteMenu } from './services/session';
import { PageEnum } from './enums/pagesEnums';
import { handleAuthExpired } from './utils/authRedirect';

const isDev = process.env.NODE_ENV === 'development';



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
        return ensureRemoteMenu();
      },
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
}

export function render(oldRender: () => void) {
  // console.log('render get routers', oldRender)
  const token = getAccessToken();
  if(!token || token?.length === 0) {
    oldRender();
    return;
  }
  getRoutersInfo().then(res => {
    setRemoteMenu(res);
    oldRender()
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

  const isUser =
    typeof target.username !== 'undefined' ||
    typeof target.nickname !== 'undefined' ||
    typeof target.mobile !== 'undefined' ||
    typeof target.deptName !== 'undefined';
  const isRole =
    typeof target.dataScope !== 'undefined' ||
    (typeof target.code !== 'undefined' &&
      typeof target.menuType === 'undefined' &&
      typeof target.value === 'undefined' &&
      typeof target.username === 'undefined' &&
      typeof target.leaderUserId === 'undefined');
  const isDept =
    typeof target.leaderUserId !== 'undefined' ||
    (typeof target.parentId !== 'undefined' &&
      typeof target.menuType === 'undefined' &&
      typeof target.component === 'undefined' &&
      typeof target.dictType === 'undefined');
  const isMenu =
    typeof target.menuType !== 'undefined' ||
    typeof target.permission !== 'undefined' ||
    typeof target.componentName !== 'undefined' ||
    typeof target.alwaysShow !== 'undefined';
  const isDictData = typeof target.label !== 'undefined' && typeof target.value !== 'undefined';
  const isDictType =
    typeof target.type !== 'undefined' &&
    typeof target.label === 'undefined' &&
    typeof target.value === 'undefined' &&
    typeof target.menuType === 'undefined' &&
    typeof target.username === 'undefined';
  const isPost =
    !isRole &&
    !isDictType &&
    !isDictData &&
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
          const refreshToken = getRefreshToken();
          if (left < checkRegion && refreshToken) {
            if (left < 0) {
              handleAuthExpired();
            }
          } else {
            const accessToken = getAccessToken();
            if (accessToken) {
              headers['Authorization'] = `Bearer ${accessToken}`;
            }
          }
        } else {
          if (!isLoginPage) {
            handleAuthExpired();
          }
        }
      }
      normalizeRequestParams(options);
      return { url, options };
    },
  ],
  responseInterceptors: [
    (response: any) => {
      // 适配 yudao 框架的 CommonResult 响应格式
      // 后端成功响应 code 为 0，统一转换为 200 以兼容前端现有判断逻辑
      normalizeYudaoResult(response?.data);
      if (response?.status === 401 || response?.data?.code === 401) {
        handleAuthExpired();
      }
      return response;
    },
  ],
};
