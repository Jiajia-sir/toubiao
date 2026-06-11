import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询部门列表
export async function getDeptList(params?: API.System.DeptListParams) {
  return request<API.System.DeptPageResult>(`${API_PREFIX}/system/dept/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params
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
    data: params
  });
}

// 修改部门
export async function updateDept(params: API.System.Dept) {
  return request<API.Result>(`${API_PREFIX}/system/dept/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 删除部门
export async function removeDept(ids: string) {
  return request<API.Result>(`${API_PREFIX}/system/dept/delete`, {
    method: 'DELETE',
    params: { ids }
  });
}
