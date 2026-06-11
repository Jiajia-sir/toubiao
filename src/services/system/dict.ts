import { request } from '@umijs/max';
import { DictValueEnumObj } from '@/components/DictTag';
import { HttpResult } from '@/enums/httpEnum';
import { downLoadXlsx } from '@/utils/downloadfile';
import { API_PREFIX } from '@/constants';

// 查询字典类型列表
export async function getDictTypeList(params?: API.DictTypeListParams) {
  return request(`${API_PREFIX}/system/dict-type/page`, {
    params: {
      ...params,
    },
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}

// 查询字典类型详细
export function getDictType(dictId: string) {
  return request(`${API_PREFIX}/system/dict-type/get`, {
    method: 'GET',
    params: { id: dictId },
  });
}

// 查询字典数据详细（使用 list-all-simple 接口获取全部字典数据）
export async function getDictValueEnum(dictType: string, isDigital?: boolean): Promise<DictValueEnumObj> {
  const resp = await request<any>(`${API_PREFIX}/system/dict-data/list-all-simple`, {
    method: 'GET',
  });
  if(resp.code === HttpResult.SUCCESS) {
    const opts: DictValueEnumObj = {};
    const list = resp.data || [];
    // 按 dictType 过滤
    list.filter((item: any) => item.dictType === dictType).forEach((item: any) => {
      opts[item.value] = {
        text: item.label,
        label: item.label,
        value: isDigital ? Number(item.value) : item.value,
        key: item.id,
        listClass: item.colorType || 'default',
        status: item.colorType || 'default'
      };
    });
    return opts;
  } else {
    return {};
  }
}

export async function getDictSelectOption(dictType: string, isDigital?: boolean) {
  const resp = await request<any>(`${API_PREFIX}/system/dict-data/list-all-simple`, {
    method: 'GET',
  });
  if (resp.code === 200) {
    const list = resp.data || [];
    const options: DictValueEnumObj[] = list
      .filter((item: any) => item.dictType === dictType)
      .map((item: any) => {
        return {
          text: item.label,
          label: item.label,
          value: isDigital ? Number(item.value) : item.value,
          key: item.id,
          listClass: item.colorType || 'default',
          status: item.colorType || 'default'
        };
      });
    return options;
  }
  return [];
};

// 新增字典类型
export async function addDictType(params: API.System.DictType) {
  return request<API.Result>(`${API_PREFIX}/system/dict-type/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 修改字典类型
export async function updateDictType(params: API.System.DictType) {
  return request<API.Result>(`${API_PREFIX}/system/dict-type/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 删除字典类型
export async function removeDictType(ids: string) {
  return request<API.Result>(`${API_PREFIX}/system/dict-type/delete`, {
    method: 'DELETE',
    params: { ids }
  });
}

// 导出字典类型
export function exportDictType(params?: API.System.DictTypeListParams) {
  return downLoadXlsx(`${API_PREFIX}/system/dict-type/export-excel`, { params }, `dict_type_${new Date().getTime()}.xlsx`);
}

// 获取字典选择框列表
export async function getDictTypeOptionSelect(params?: API.DictTypeListParams) {
  return request(`${API_PREFIX}/system/dict-type/list-all-simple`, {
    params: {
      ...params,
    },
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}
