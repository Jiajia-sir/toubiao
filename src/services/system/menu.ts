import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

function mapMenuTypeToLegacy(value: any) {
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

function normalizeMenuItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return item;
  }
  const menuId = item.menuId ?? item.id;
  const menuName = item.menuName ?? item.name;
  const children = Array.isArray(item.children)
    ? item.children.map((child: any) => normalizeMenuItem(child))
    : item.children;
  return {
    ...item,
    menuId,
    menuName,
    parentId: typeof item.parentId === 'undefined' || item.parentId === null ? 0 : item.parentId,
    orderNum: item.orderNum ?? item.sort ?? 0,
    perms: item.perms ?? item.permission,
    menuType: item.menuType ?? mapMenuTypeToLegacy(item.type),
    isCache:
      typeof item.isCache !== 'undefined'
        ? item.isCache
        : typeof item.keepAlive === 'boolean'
          ? item.keepAlive
            ? 0
            : 1
          : item.isCache,
    children,
  };
}

function extractMenuList(res: any): any[] {
  if (Array.isArray(res?.data)) {
    return res.data;
  }
  if (Array.isArray(res?.rows)) {
    return res.rows;
  }
  if (Array.isArray(res?.data?.list)) {
    return res.data.list;
  }
  if (Array.isArray(res?.data?.records)) {
    return res.data.records;
  }
  return [];
}

function flattenMenuList(list: any[]): any[] {
  const result: any[] = [];
  const walk = (nodes: any[]) => {
    (nodes || []).forEach((node) => {
      if (!node || typeof node !== 'object') {
        return;
      }
      const children = node.children;
      const next = { ...node };
      delete next.children;
      result.push(next);
      if (Array.isArray(children) && children.length > 0) {
        walk(children);
      }
    });
  };
  walk(list);
  return result;
}

function mapLegacyMenuType(value: any) {
  if (value === 'M' || value === 1 || value === '1') {
    return 1;
  }
  if (value === 'C' || value === 2 || value === '2') {
    return 2;
  }
  if (value === 'F' || value === 3 || value === '3') {
    return 3;
  }
  return value;
}

function normalizeBoolean(value: any) {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }
  return value;
}

function transformMenuPayload(params: API.System.Menu) {
  return {
    id: params.menuId,
    parentId: params.parentId ?? 0,
    name: params.menuName,
    icon: params.icon,
    type: mapLegacyMenuType(params.menuType),
    sort: params.orderNum,
    path: params.path,
    component: params.component,
    permission: params.perms,
    query: params.query,
    visible: normalizeBoolean(params.visible),
    status: typeof params.status === 'string' ? Number(params.status) : params.status,
    keepAlive: `${params.isCache}` === '0',
  };
}

function transformMenuListParams(params?: API.System.MenuListParams) {
  if (!params) {
    return params;
  }
  return {
    ...params,
    name: params.menuName,
    permission: params.perms,
    type: mapLegacyMenuType(params.menuType),
  };
}

async function deleteMenuById(id: string, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/menu/delete`, {
    method: 'DELETE',
    params: { id },
    ...(options || {}),
  });
}

// 查询菜单权限列表
export async function getMenuList(params?: API.System.MenuListParams, options?: { [key: string]: any }) {
  const res = await request<API.System.MenuPageResult>(`${API_PREFIX}/system/menu/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params: transformMenuListParams(params),
    ...(options || {}),
  });
  const list = flattenMenuList(extractMenuList(res)).map((item) => normalizeMenuItem(item));
  return {
    ...res,
    data: list,
    rows: list,
    total: typeof res.total === 'number' ? res.total : list.length,
    success: res.code === 200 || res.code === 0 || typeof res.code === 'undefined',
  };
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
    data: transformMenuPayload(params),
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
    data: transformMenuPayload(params),
    ...(options || {})
  });
}

// 删除菜单权限
export async function removeMenu(ids: string, options?: { [key: string]: any }) {
  const idList = ids.split(',').map((item) => item.trim()).filter(Boolean);
  const responses = await Promise.all(idList.map((id) => deleteMenuById(id, options)));
  return responses[responses.length - 1];
}

// 查询菜单树
export function getMenuTree() {
  return request(`${API_PREFIX}/system/menu/list`, {
    method: 'GET',
  });
}
