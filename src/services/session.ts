import { API_PREFIX } from '@/constants';
import { createIcon } from '@/utils/IconUtil';
import { MenuDataItem } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import React, { lazy } from 'react';

const REMOTE_MENU_STORAGE_KEY = 'remote-menu-cache';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function isSerializedReactElementLike(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    'type' in candidate &&
    'props' in candidate &&
    'key' in candidate &&
    'ref' in candidate &&
    !('$$typeof' in candidate)
  );
}

function sanitizeMenuCache(items: any[]): any[] {
  return items.map((item) => {
    const nextItem: Record<string, any> = {
      ...item,
      icon:
        typeof item?.icon === 'string'
          ? item.icon
          : isSerializedReactElementLike(item?.icon)
            ? undefined
            : item?.icon,
    };

    if (Array.isArray(item?.children)) {
      nextItem.children = sanitizeMenuCache(item.children);
    }

    if (Array.isArray(item?.routes)) {
      nextItem.routes = sanitizeMenuCache(item.routes);
    }

    return nextItem;
  });
}

function readStoredRemoteMenu() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(REMOTE_MENU_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      window.sessionStorage.removeItem(REMOTE_MENU_STORAGE_KEY);
      return null;
    }

    return sanitizeMenuCache(parsedValue);
  } catch (error) {
    window.sessionStorage.removeItem(REMOTE_MENU_STORAGE_KEY);
    return null;
  }
}

let remoteMenu: any = readStoredRemoteMenu();

const componentSegmentAliasMap: Record<string, string> = {
  Loginlog: 'Logininfor',
  Operatelog: 'Operlog',
};

const LOCAL_PROCUREMENT_COCKPIT_MENU = {
  path: '/procurement-cockpit',
  name: '采购数据驾驶舱',
  icon: createIcon('dashboard'),
  component: 'ProcurementCockpit',
  hideInMenu: false,
  hideChildrenInMenu: false,
  flatMenu: false,
  meta: {
    title: '采购数据驾驶舱',
    icon: 'dashboard',
  },
};

function hasMenuPath(items: any[], path: string): boolean {
  return items.some((item) => {
    if (item?.path === path) {
      return true;
    }
    const children = Array.isArray(item?.routes)
      ? item.routes
      : Array.isArray(item?.children)
        ? item.children
        : [];
    return children.length > 0 && hasMenuPath(children, path);
  });
}

function appendLocalFeatureMenus(items: any[]): any[] {
  if (hasMenuPath(items, LOCAL_PROCUREMENT_COCKPIT_MENU.path)) {
    return items;
  }
  return [...items, { ...LOCAL_PROCUREMENT_COCKPIT_MENU }];
}

export function getRemoteMenu() {
  return remoteMenu;
}

export function setRemoteMenu(data: any) {
  remoteMenu = data;

  if (!canUseSessionStorage()) {
    return;
  }

  if (Array.isArray(data) && data.length > 0) {
    window.sessionStorage.setItem(
      REMOTE_MENU_STORAGE_KEY,
      JSON.stringify(sanitizeMenuCache(data)),
    );
    return;
  }

  window.sessionStorage.removeItem(REMOTE_MENU_STORAGE_KEY);
}

export async function ensureRemoteMenu() {
  if (Array.isArray(remoteMenu) && remoteMenu.length > 0) {
    const menus = appendLocalFeatureMenus(remoteMenu);
    if (menus !== remoteMenu) {
      setRemoteMenu(menus);
    }
    return menus;
  }
  const menus = appendLocalFeatureMenus(await getRoutersInfo());
  setRemoteMenu(menus.length > 0 ? menus : null);
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
    const childRoutes = item.routes as MenuDataItem[] | undefined;
    if (childRoutes && childRoutes.length > 0) {
      const childPath = getFirstMenuPath(childRoutes);
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

function normalizeMenuVisible(value: any) {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }
  return undefined;
}

function normalizeMenuType(value: any) {
  if (value === 1 || value === '1' || value === 'M') {
    return 'M';
  }
  if (value === 2 || value === '2' || value === 'C') {
    return 'C';
  }
  if (value === 3 || value === '3' || value === 'F') {
    return 'F';
  }
  return undefined;
}

function normalizeMenuNode(item: any) {
  const menuType = normalizeMenuType(item.menuType ?? item.type);
  const visible = normalizeMenuVisible(item.visible);
  const hidden = typeof item.hidden === 'boolean' ? item.hidden : undefined;
  const title = item.name ?? item.menuName ?? item.title ?? item.meta?.title;
  const icon = item.icon ?? item.meta?.icon;
  const children = Array.isArray(item.children) ? item.children : [];

  return {
    ...item,
    name: title,
    path: item.path ?? '',
    icon,
    component: item.component ?? item.componentName,
    children,
    visible,
    hidden,
    menuType,
  };
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
  return menus
    .map((item: any) => normalizeMenuNode(item))
    .filter((item: any) => item.menuType !== 'F')
    .map((item: any) => {
      const path = joinMenuPath(parentPath, item.path);
      const children = item.children?.length ? transformMenus(item.children, path) : undefined;
      const hiddenInMenu = item.hidden === true || item.visible === false;

      return {
        path,
        name: item.name || path,
        icon: item.icon ? createIcon(item.icon) : undefined,
        component: item.component,
        routes: children,
        children,
        hideInMenu: hiddenInMenu,
        hideChildrenInMenu: hiddenInMenu,
        flatMenu: false,
        meta: {
          title: item.name,
          icon: item.icon,
        },
      };
    })
    .filter((item: any) => item.name);
}

export async function getRoutersInfo(): Promise<MenuDataItem[]> {
  try {
    const res = await getUserInfo();
    if (res.code === 200 && res.data?.menus) {
      return appendLocalFeatureMenus(transformMenus(res.data.menus));
    }
    return [LOCAL_PROCUREMENT_COCKPIT_MENU] as unknown as MenuDataItem[];
  } catch (error) {
    console.error('获取路由菜单失败:', error);
    return [LOCAL_PROCUREMENT_COCKPIT_MENU] as unknown as MenuDataItem[];
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
