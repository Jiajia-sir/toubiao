import { handleTree } from '@/utils/tree';
import { request } from '@umijs/max';
import { DataNode } from 'antd/es/tree';
import { downLoadXlsx, resolveBlob } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

function transformUserPayload(params: API.System.User) {
  return {
    id: params.userId,
    deptId: params.deptId,
    username: (params as any).username ?? params.userName,
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
    username: (params as any).username ?? params.userName,
    nickname: params.nickName,
    mobile: params.phonenumber,
  };
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
  const data = transformUserPayload(params) as Record<string, any>;
  data.id = params.userId;
  if (!data.password) {
    delete data.password;
  }
  return request<API.Result>(`${API_PREFIX}/system/user/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data,
    ...(options || {})
  });
}

// 删除用户信息
export async function removeUser(ids: string, options?: { [key: string]: any }) {
  const idList = ids
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
  return request<API.Result>(`${API_PREFIX}/system/user/deleteBatch`, {
    method: 'POST',
    data: {
      ids: idList,
    },
    ...(options || {}),
  });
}

export function moveUserDeptBatch(userIds: number[], deptId: number) {
  return request<API.Result>(`${API_PREFIX}/system/user/moveDeptBatch`, {
    method: 'POST',
    data: {
      userIds,
      deptId,
    },
  });
}

// 导出用户信息
export function exportUser(params?: API.System.UserListParams, options?: { [key: string]: any }) {
  return downLoadXlsx(
    `${API_PREFIX}/system/user/export`,
    { params: transformUserListParams(params), ...(options || {}) },
    `user_${new Date().getTime()}.xlsx`,
    'GET',
  );
}

export function getUserImportTemplate() {
  return request(`${API_PREFIX}/system/user/get-import-template`, {
    method: 'GET',
    responseType: 'blob',
    getResponse: true,
  }).then((res) => {
    resolveBlob(res, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
}

export interface ImportUserResult {
  code: number;
  data?: {
    createUsernames?: string[] | Record<string, string>;
    updateUsernames?: string[] | Record<string, string>;
    failureUsernames?: string[] | Record<string, string>;
  };
  msg?: string;
}

export function importUser(file: File, updateSupport = false) {
  const data = new FormData();
  data.append('file', file);
  data.append('updateSupport', String(updateSupport));
  return request<ImportUserResult>(`${API_PREFIX}/system/user/import`, {
    method: 'POST',
    data,
  });
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
        const deptList = (res.data || []).map((item: any) => {
          const id = item.id ?? item.deptId;
          const name = item.name ?? item.deptName ?? item.label ?? item.title;
          return {
            ...item,
            id,
            key: id,
            title: name,
            value: id,
            label: name,
            parentId: item.parentId ?? 0,
          };
        });
        const treeData = handleTree(deptList, 'id');
        resolve(treeData);
      } else {
        resolve([]);
      }
    });
  });
}
