import { request } from '@umijs/max';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询字典数据列表
export async function getDictDataList(
  params?: API.System.DictDataListParams,
  options?: { [key: string]: any },
) {
  return request<API.System.DictDataPageResult>(`${API_PREFIX}/system/dict-data/page`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params,
    ...(options || {}),
  });
}

// 查询字典数据详细
export function getDictData(dictCode: number, options?: { [key: string]: any }) {
  return request<API.System.DictDataInfoResult>(`${API_PREFIX}/system/dict-data/get`, {
    method: 'GET',
    params: { id: dictCode },
    ...(options || {}),
  });
}

// 新增字典数据
export async function addDictData(params: API.System.DictData, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/dict-data/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params,
    ...(options || {}),
  });
}

// 修改字典数据
export async function updateDictData(params: API.System.DictData, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/dict-data/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params,
    ...(options || {}),
  });
}

// 删除字典数据
export async function removeDictData(ids: string, options?: { [key: string]: any }) {
  return request<API.Result>(`${API_PREFIX}/system/dict-data/delete`, {
    method: 'DELETE',
    params: { ids },
    ...(options || {}),
  });
}

// 导出字典数据
export function exportDictData(
  params?: API.System.DictDataListParams,
  options?: { [key: string]: any },
) {
  return downLoadXlsx(`${API_PREFIX}/system/dict-data/export-excel`, { params }, `dict_data_${new Date().getTime()}.xlsx`);
}
