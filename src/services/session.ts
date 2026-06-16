import { API_PREFIX } from '@/constants';
import { createIcon } from '@/utils/IconUtil';
import { MenuDataItem } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import React, { lazy } from 'react';

let remoteMenu: any = null;

const componentSegmentAliasMap: Record<string, string> = {
  Loginlog: 'Logininfor',
  Operatelog: 'Operlog',
};

export function getRemoteMenu() {
  return remoteMenu;
}

export function setRemoteMenu(data: any) {
  remoteMenu = data;
}

export async function ensureRemoteMenu() {
  if (remoteMenu && Array.isArray(remoteMenu)) {
    return remoteMenu;
  }
  const menus = await getRoutersInfo();
  setRemoteMenu(menus);
  return menus;
}

export function getFirstMenuPath(menuData?: MenuDataItem[]): string | undefined {
  if (!menuData || menuData.length === 0) {
    return undefined;
  }

  for (const item of menuData) {
    if (item.hideInMenu) {
      continue;
    }
    if (item.routes && item.routes.length > 0) {
      const childPath = getFirstMenuPath(item.routes as MenuDataItem[]);
      if (childPath) {
        return childPath;
      }
    }
    if (item.path && item.path !== '/') {
      return item.path;
    }
  }

  return undefined;
}

function normalizeComponentPath(componentPath: string) {
  return componentPath
    .split('/')
    .map((segment) => componentSegmentAliasMap[segment] || segment)
    .join('/');
}

function joinMenuPath(parentPath: string, currentPath: string) {
  if (!currentPath) {
    return parentPath || '/';
  }
  if (currentPath.startsWith('/')) {
    return currentPath;
  }
  const normalizedParent = parentPath ? parentPath.replace(/\/+$/, '') : '';
  return `${normalizedParent}/${currentPath}`.replace(/\/{2,}/g, '/');
}

function patchRouteItems(route: any, menu: any, parentPath: string) {
  for (const menuItem of menu) {
    const fullPath = joinMenuPath(parentPath, menuItem.path);

    if (
      !menuItem.component ||
      menuItem.component === 'Layout' ||
      menuItem.component === 'ParentView'
    ) {
      if (menuItem.routes) {
        let newItem = route.routes?.find((routeChild: any) => routeChild.path === fullPath);
        if (!newItem) {
          newItem = {
            path: fullPath,
            routes: [],
            children: [],
          };
          route.routes.push(newItem);
        }
        patchRouteItems(newItem, menuItem.routes, fullPath);
      }
      continue;
    }

    const normalizedComponent = normalizeComponentPath(menuItem.component);
    const names: string[] = normalizedComponent.split('/');
    let path = '';
    names.forEach((name) => {
      if (path.length > 0) {
        path += '/';
      }
      if (name !== 'index') {
        path += name.at(0)?.toUpperCase() + name.substring(1);
      } else {
        path += name;
      }
    });

    if (!path.endsWith('.tsx')) {
      path += '.tsx';
    }
    if (route.routes === undefined) {
      route.routes = [];
    }
    if (route.children === undefined) {
      route.children = [];
    }

    const existedRoute = route.routes.find((routeChild: any) => routeChild.path === fullPath);
    if (existedRoute) {
      continue;
    }

    const newRoute = {
      element: React.createElement(lazy(() => import('@/pages/' + path))),
      path: fullPath,
    };
    route.children.push(newRoute);
    route.routes.push(newRoute);
  }
}

export function patchRouteWithRemoteMenus(routes: any) {
  if (remoteMenu === null) {
    return;
  }
  let proLayout = null;
  for (const routeItem of routes) {
    if (routeItem.id === 'ant-design-pro-layout') {
      proLayout = routeItem;
      break;
    }
  }
  if (!proLayout) {
    return;
  }
  if (!proLayout.routes) {
    proLayout.routes = [];
  }
  if (!proLayout.children) {
    proLayout.children = [];
  }
  patchRouteItems(proLayout, remoteMenu, '');
}

export async function getUserInfo(options?: Record<string, any>) {
  return request<API.UserInfoResult>(`${API_PREFIX}/system/auth/get-permission-info`, {
    method: 'GET',
    ...(options || {}),
  });
}

export async function refreshToken(refreshTokenStr: string) {
  return request(`${API_PREFIX}/system/auth/refresh-token`, {
    method: 'POST',
    params: { refreshToken: refreshTokenStr },
  });
}

export function convertCompatRouters(childrens: API.RoutersMenuItem[]): any[] {
  return childrens.map((item: API.RoutersMenuItem) => {
    return {
      path: item.path,
      icon: createIcon(item.meta.icon),
      name: item.meta.title,
      routes: item.children ? convertCompatRouters(item.children) : undefined,
      hideChildrenInMenu: item.hidden,
      hideInMenu: item.hidden,
      component: item.component,
      authority: item.perms,
    };
  });
}

function transformMenus(menus: any[], parentPath = ''): any[] {
  return menus.map((item: any) => {
    const path = joinMenuPath(parentPath, item.path);
    const children = item.children ? transformMenus(item.children, path) : undefined;
    return {
      path,
      name: item.name,
      icon: item.icon ? createIcon(item.icon) : undefined,
      component: item.component,
      routes: children,
      children,
      hideInMenu: item.visible === false,
      hideChildrenInMenu: item.visible === false,
      meta: {
        title: item.name,
        icon: item.icon,
      },
    };
  });
}

export async function getRoutersInfo(): Promise<MenuDataItem[]> {
  try {
    const res = await getUserInfo();
    if (res.code === 200 && res.data?.menus) {
      return transformMenus(res.data.menus);
    }
    return [];
  } catch (error) {
    console.error('获取路由菜单失败:', error);
    return [];
  }
}

export function getMatchMenuItem(
  path: string,
  menuData: MenuDataItem[] | undefined,
): MenuDataItem[] {
  if (!menuData) return [];
  let items: MenuDataItem[] = [];
  menuData.forEach((item) => {
    if (item.path) {
      if (item.path === path) {
        items.push(item);
        return;
      }
      if (path.length >= item.path.length) {
        const exp = `${item.path}/*`;
        if (path.match(exp)) {
          if (item.routes) {
            const subItem: MenuDataItem[] = getMatchMenuItem(path, item.routes);
            items = items.concat(subItem);
          } else {
            const paths = path.split('/');
            if (paths.length >= 2 && item.path === `/${paths[1]}`) {
              items.push(item);
            }
          }
        }
      }
    }
  });
  return items;
}
