import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface EntityTypeParams {
  id?: number | string;
  name: string;
  description: string;
  enabled?: string;
  icon?: string;
  color?: string;
  bgColor?: string;
  entityCount?: number;
  isSystem?: boolean;
}

export async function addEntityType(data: EntityTypeParams) {
  return request(`${API_PREFIX}/biz/entity-type-config/create`, {
    method: 'POST',
    data,
  });
}

export async function updateEntityType(data: EntityTypeParams) {
  return request(`${API_PREFIX}/biz/entity-type-config/update`, {
    method: 'PUT',
    data,
  });
}

export async function removeEntityType(id: number | string) {
  return request(`${API_PREFIX}/biz/entity-type-config/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export interface EntityTypePageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  description?: string;
  enabled?: string;
  createTime?: string[];
}

export async function getEntityTypePage(params: EntityTypePageParams) {
  return request(`${API_PREFIX}/biz/entity-type-config/page`, {
    method: 'GET',
    params,
  });
}
