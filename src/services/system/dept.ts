import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

function transformDeptPayload(params: API.System.Dept) {
  const leaderUserId =
    typeof (params as any).leaderUserId !== 'undefined'
      ? (params as any).leaderUserId
      : typeof params.leader === 'number'
        ? params.leader
        : typeof params.leader === 'string' && /^\d+$/.test(params.leader)
          ? Number(params.leader)
          : undefined;

  return {
    id: params.deptId,
    parentId: params.parentId,
    name: params.deptName,
    sort: params.orderNum,
    leaderUserId,
    phone: params.phone,
    email: params.email,
    status: typeof params.status === 'string' ? Number(params.status) : params.status,
  };
}

function transformDeptListParams(params?: API.System.DeptListParams) {
  if (!params) {
    return params;
  }
  return {
    ...params,
    name: params.deptName,
  };
}

async function deleteDeptById(id: string) {
  return request<API.Result>(`${API_PREFIX}/system/dept/delete`, {
    method: 'DELETE',
    params: { id }
  });
}

// 查询部门列表
export async function getDeptList(params?: API.System.DeptListParams) {
  return request<API.System.DeptPageResult>(`${API_PREFIX}/system/dept/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params: transformDeptListParams(params)
  });
}

// 查询部门列表（排除节点）— 后端无此接口，使用 list 代替
export function getDeptListExcludeChild(deptId: number) {
  return request(`${API_PREFIX}/system/dept/list`, {
    method: 'get',
  });
}

// 查询部门详细
export function getDept(deptId: number) {
  return request<API.System.DeptInfoResult>(`${API_PREFIX}/system/dept/get`, {
    method: 'GET',
    params: { id: deptId }
  });
}

// 新增部门
export async function addDept(params: API.System.Dept) {
  return request<API.Result>(`${API_PREFIX}/system/dept/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: transformDeptPayload(params)
  });
}

// 修改部门
export async function updateDept(params: API.System.Dept) {
  return request<API.Result>(`${API_PREFIX}/system/dept/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: transformDeptPayload(params)
  });
}

// 删除部门
export async function removeDept(ids: string) {
  const idList = ids.split(',').map((item) => item.trim()).filter(Boolean);
  const responses = await Promise.all(idList.map((id) => deleteDeptById(id)));
  return responses[responses.length - 1];
}
