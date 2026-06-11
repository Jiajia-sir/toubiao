import { ContentType } from '@/enums/httpEnum';
import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

function transformRolePayload(params: API.System.Role) {
  return {
    id: params.roleId,
    name: params.roleName,
    code: params.roleKey,
    sort: params.roleSort,
    status: typeof params.status === 'string' ? Number(params.status) : params.status,
    remark: params.remark,
  };
}

function transformRoleListParams(params?: API.System.RoleListParams) {
  if (!params) {
    return params;
  }
  return {
    ...params,
    name: params.roleName,
    code: params.roleKey,
  };
}

async function deleteRoleById(id: string) {
  return request<API.Result>(`${API_PREFIX}/system/role/delete`, {
    method: 'DELETE',
    params: { id }
  });
}

// 查询角色信息列表（分页）
export async function getRoleList(params?: API.System.RoleListParams) {
  return request<API.System.RolePageResult>(`${API_PREFIX}/system/role/page`, {
    method: 'GET',
    headers: { 'Content-Type': ContentType.FORM_URLENCODED },
    params: transformRoleListParams(params)
  });
}

export async function getRoleSimpleList() {
  return request(`${API_PREFIX}/system/role/list-all-simple`, {
    method: 'GET',
    headers: { 'Content-Type': ContentType.FORM_URLENCODED },
  });
}

// 查询角色信息详细
export function getRole(roleId: number) {
  return request<API.System.RoleInfoResult>(`${API_PREFIX}/system/role/get`, {
    method: 'GET',
    params: { id: roleId }
  });
}

// 新增角色信息
export async function addRole(params: API.System.Role) {
  return request<API.Result>(`${API_PREFIX}/system/role/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: transformRolePayload(params)
  });
}

// 修改角色信息
export async function updateRole(params: API.System.Role) {
  return request<API.Result>(`${API_PREFIX}/system/role/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: transformRolePayload(params)
  });
}

// 删除角色信息
export async function removeRole(ids: string) {
  const idList = ids.split(',').map((item) => item.trim()).filter(Boolean);
  const responses = await Promise.all(idList.map((id) => deleteRoleById(id)));
  return responses[responses.length - 1];
}

// 导出角色信息
export function exportRole(params?: API.System.RoleListParams) {
  return downLoadXlsx(`${API_PREFIX}/system/role/export-excel`, { params }, `role_${new Date().getTime()}.xlsx`);
}

// 获取角色菜单列表
export function getRoleMenuList(roleId: number) {
  return request<API.System.RoleMenuResult>(`${API_PREFIX}/system/permission/list-role-menus`, {
    method: 'get',
    params: { roleId }
  });
}

// 角色数据权限
export function updateRoleDataScope(data: Record<string, any>) {
  return request(`${API_PREFIX}/system/permission/assign-role-data-scope`, {
    method: 'post',
    data
  })
}

// 角色状态修改
export function changeRoleStatus(roleId: number, status: string) {
  const data = {
    id: roleId,
    status
  }
  return request<API.Result>(`${API_PREFIX}/system/role/update-status`, {
    method: 'put',
    data: data
  })
}

// 查询角色已授权用户列表
export function allocatedUserList(params?: API.System.RoleListParams) {
  return request(`${API_PREFIX}/system/permission/list-user-roles`, {
    method: 'get',
    params
  })
}

// 查询角色未授权用户列表
export function unallocatedUserList(params?: API.System.RoleListParams) {
  return request(`${API_PREFIX}/system/user/page`, {
    method: 'get',
    params
  })
}

// 取消用户授权角色
export function authUserCancel(data: any) {
  return request<API.Result>(`${API_PREFIX}/system/permission/assign-user-role`, {
    method: 'post',
    data: data
  })
}

// 批量取消用户授权角色
export function authUserCancelAll(data: any) {
  return request<API.Result>(`${API_PREFIX}/system/permission/assign-user-role`, {
    method: 'post',
    params: data
  })
}

// 授权用户选择
export function authUserSelectAll(data: Record<string, any>) {
  return request<API.Result>(`${API_PREFIX}/system/permission/assign-user-role`, {
    method: 'post',
    params: data,
    headers: { 'Content-Type': ContentType.FORM_URLENCODED },
  })
}

// 根据角色ID查询部门树结构
export function getDeptTreeSelect(roleId: number) {
  return request(`${API_PREFIX}/system/dept/list-all-simple`, {
    method: 'get'
  })
}

export function assignRoleMenu(data: { roleId: number; menuIds: (string | number)[] }) {
  return request(`${API_PREFIX}/system/permission/assign-role-menu`, {
    method: 'post',
    data,
  });
}
