import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询菜单权限列表
export async function getMenuList(params?: API.System.MenuListParams, options?: { [key: string]: any }) {
  return request<API.System.MenuPageResult>(`${API_PREFIX}/system/menu/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params,
    ...(options || {}),
  });
}

// 查询菜单权限详细
export function getMenu(menuId: number, options?: { [key: string]: any }) {
  return request<API.System.MenuInfoResult>(`${API_PREFIX}/system/menu/get`, {
    method: 'GET',
    params: { id: menuId },
    ...(options || {})
  });
}

// 新增菜单权限
export async function addMenu(params: API.System.Menu, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/menu/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params,
    ...(options || {})
  });
}

// 修改菜单权限
export async function updateMenu(params: API.System.Menu, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/menu/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params,
    ...(options || {})
  });
}

// 删除菜单权限
export async function removeMenu(ids: string, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/menu/delete`, {
    method: 'DELETE',
    params: { ids },
    ...(options || {})
  });
}

// 查询菜单树
export function getMenuTree() {
  return request(`${API_PREFIX}/system/menu/list`, {
    method: 'GET',
  });
}
