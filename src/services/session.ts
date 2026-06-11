import { createIcon } from '@/utils/IconUtil';
import { MenuDataItem } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import React, { lazy } from 'react';
import { API_PREFIX } from '@/constants';


let remoteMenu: any = null;

export function getRemoteMenu() {
  return remoteMenu;
}

export function setRemoteMenu(data: any) {
  remoteMenu = data;
}


function patchRouteItems(route: any, menu: any, parentPath: string) {
  for (const menuItem of menu) {
    // component 为空或为 Layout/ParentView 时，视为目录类型
    if (!menuItem.component || menuItem.component === 'Layout' || menuItem.component === 'ParentView') {
      if (menuItem.routes) {
        let hasItem = false;
        let newItem = null;
        for (const routeChild of route.routes) {
          if (routeChild.path === menuItem.path) {
            hasItem = true;
            newItem = routeChild;
          }
        }
        if (!hasItem) {
          newItem = {
            path: menuItem.path,
            routes: [],
            children: []
          }
          route.routes.push(newItem)
        }
        patchRouteItems(newItem, menuItem.routes, parentPath + menuItem.path + '/');
      }
    } else {
      const names: string[] = menuItem.component.split('/');
      let path = '';
      names.forEach(name => {
        if (path.length > 0) {
          path += '/';
        }
        if (name !== 'index') {
          path += name.at(0)?.toUpperCase() + name.substr(1);
        } else {
          path += name;
        }
      })
      if (!path.endsWith('.tsx')) {
        path += '.tsx'
      }
      if (route.routes === undefined) {
        route.routes = [];
      }
      if (route.children === undefined) {
        route.children = [];
      }
      const newRoute = {
        element: React.createElement(lazy(() => import('@/pages/' + path))),
        path: parentPath + menuItem.path,
      }
      route.children.push(newRoute);
      route.routes.push(newRoute);
    }
  }
}

export function patchRouteWithRemoteMenus(routes: any) {
  if (remoteMenu === null) { return; }
  let proLayout = null;
  for (const routeItem of routes) {
    if (routeItem.id === 'ant-design-pro-layout') {
      proLayout = routeItem;
      break;
    }
  }
  patchRouteItems(proLayout, remoteMenu, '');
}

/** 获取当前用户的权限信息 GET /admin-api/system/auth/get-permission-info */
export async function getUserInfo(options?: Record<string, any>) {
  return request<API.UserInfoResult>(`${API_PREFIX}/system/auth/get-permission-info`, {
    method: 'GET',
    ...(options || {}),
  });
}

// 刷新令牌
export async function refreshToken(refreshTokenStr: string) {
  return request(`${API_PREFIX}/system/auth/refresh-token`, {
    method: 'POST',
    params: { refreshToken: refreshTokenStr },
  })
}

export function convertCompatRouters(childrens: API.RoutersMenuItem[]): any[] {
  return childrens.map((item: API.RoutersMenuItem) => {
    return {
      path: item.path,
      icon: createIcon(item.meta.icon),
      //  icon: item.meta.icon,
      name: item.meta.title,
      routes: item.children ? convertCompatRouters(item.children) : undefined,
      hideChildrenInMenu: item.hidden,
      hideInMenu: item.hidden,
      component: item.component,
      authority: item.perms,
    };
  });
}

/**
 * 将后端 MenuVO 转换为前端路由格式
 * 后端返回: {id, parentId, name, path, component, componentName, icon, visible, keepAlive, alwaysShow, children}
 * 前端需要: {path, name, icon, component, routes, children, hideInMenu, hideChildrenInMenu}
 */
function transformMenus(menus: any[]): any[] {
  return menus.map((item: any) => {
    const children = item.children ? transformMenus(item.children) : undefined;
    return {
      path: item.path,
      name: item.name,
      icon: item.icon ? createIcon(item.icon) : undefined,
      component: item.component,
      routes: children,
      children: children,
      hideInMenu: item.visible === false,
      hideChildrenInMenu: item.visible === false,
      meta: {
        title: item.name,
        icon: item.icon,
      },
    };
  });
}

/**
 * 获取路由菜单信息
 * 从 get-permission-info 接口返回的 menus 字段中提取路由
 */
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
      if (path.length >= item.path?.length) {
        const exp = `${item.path}/*`;
        if (path.match(exp)) {
          if (item.routes) {
            const subpath = path.substr(item.path.length + 1);
            const subItem: MenuDataItem[] = getMatchMenuItem(subpath, item.routes);
            items = items.concat(subItem);
          } else {
            const paths = path.split('/');
            if (paths.length >= 2 && paths[0] === item.path && paths[1] === 'index') {
              items.push(item);
            }
          }
        }
      }
    }
  });
  return items;
}
