import { formatTreeData } from '@/utils/tree';
import { request } from '@umijs/max';
import { DataNode } from 'antd/es/tree';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

function transformUserPayload(params: API.System.User) {
  return {
    id: params.userId,
    deptId: params.deptId,
    username: params.userName,
    nickname: params.nickName,
    email: params.email,
    mobile: params.phonenumber,
    sex: params.sex,
    password: params.password,
    status: typeof params.status === 'string' ? Number(params.status) : params.status,
    remark: params.remark,
    postIds: (params as any).postIds || [],
    roleIds: (params as any).roleIds || [],
  };
}

function transformUserListParams(params?: API.System.UserListParams) {
  if (!params) {
    return params;
  }
  return {
    ...params,
    username: params.userName,
    nickname: params.nickName,
    mobile: params.phonenumber,
  };
}

async function deleteUserById(id: string, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/user/delete`, {
    method: 'DELETE',
    params: { id },
    ...(options || {}),
  });
}

// 查询用户信息列表
export async function getUserList(params?: API.System.UserListParams, options?: { [key: string]: any }) {
  return request<API.System.UserPageResult>(`${API_PREFIX}/system/user/page`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params: transformUserListParams(params),
    ...(options || {})
  });
}

// 查询用户信息详细
export function getUser(userId: number, options?: { [key: string]: any }) {
  return request<API.System.UserInfoResult>(`${API_PREFIX}/system/user/get`, {
    method: 'GET',
    params: { id: userId },
    ...(options || {})
  });
}

// 新增用户信息
export async function addUser(params: API.System.User, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/user/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: transformUserPayload(params),
    ...(options || {})
  });
}

// 修改用户信息
export async function updateUser(params: API.System.User, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/user/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: transformUserPayload(params),
    ...(options || {})
  });
}

// 删除用户信息
export async function removeUser(ids: string, options?: { [key: string]: any }) {
  const idList = ids.split(',').map((item) => item.trim()).filter(Boolean);
  const responses = await Promise.all(idList.map((id) => deleteUserById(id, options)));
  return responses[responses.length - 1];
}

// 导出用户信息
export function exportUser(params?: API.System.UserListParams, options?: { [key: string]: any }) {
  return downLoadXlsx(`${API_PREFIX}/system/user/export`, { params }, `user_${new Date().getTime()}.xlsx`);
}

// 用户状态修改
export function changeUserStatus(userId: number, status: string) {
  const data = {
    id: userId,
    status
  }
  return request<API.Result>(`${API_PREFIX}/system/user/update-status`, {
    method: 'put',
    data: data
  })
}

// 查询用户个人信息
export function getUserProfile() {
  return request(`${API_PREFIX}/system/user/profile/get`, {
    method: 'get'
  })
}

export function updateUserProfile(data: API.CurrentUser) {
  return request<API.Result>(`${API_PREFIX}/system/user/profile/update`, {
    method: 'put',
    data: data
  })
}

// 用户密码重置（管理员重置指定用户密码）
export function resetUserPwd(userId: number, password: string) {
  const data = {
    id: userId,
    password
  }
  return request<API.Result>(`${API_PREFIX}/system/user/update-password`, {
    method: 'put',
    data: data
  })
}

// 用户个人密码重置
export function updateUserPwd(oldPassword: string, newPassword: string) {
  const data = {
    oldPassword,
    newPassword
  }
  return request<API.Result>(`${API_PREFIX}/system/user/profile/update-password`, {
    method: 'put',
    data: data
  })
}

// 用户头像上传
export function uploadAvatar(data: any) {
  return request(`${API_PREFIX}/system/user/profile/update-avatar`, {
    method: 'post',
    data: data
  })
}

// 查询授权角色
export function getAuthRole(userId: number) {
  return request(`${API_PREFIX}/system/permission/list-user-roles`, {
    method: 'get',
    params: { userId }
  })
}

// 保存授权角色
export function updateAuthRole(data: Record<string, any>) {
  return request(`${API_PREFIX}/system/permission/assign-user-role`, {
    method: 'post',
    data: data
  })
}

// 获取部门树
export function getDeptTree(params: any): Promise<DataNode[]> {
  return new Promise((resolve) => {
    request(`${API_PREFIX}/system/dept/list`, {
      method: 'get',
      params,
    }).then((res: any) => {
      if (res && res.code === 200) {
        const treeData = formatTreeData(res.data);
        resolve(treeData);
      } else {
        resolve([]);
      }
    });
  });
}
