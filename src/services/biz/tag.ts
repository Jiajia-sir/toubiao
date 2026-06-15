import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface TagParams {
  id?: number;
  tag: string;
  color: string;
}

export interface TagPageParams {
  pageNo: number;
  pageSize: number;
  color?: string;
  tag?: string;
}

export interface TagItem {
  id: number;
  tag: string;
  color: string;
  createTime?: string;
  creator?: string;
  usageCount?: number;
}

export interface TagPageResult {
  list: TagItem[];
  total: number;
}

export async function addTag(data: TagParams) {
  return request(`${API_PREFIX}/biz/tag/create`, {
    method: 'POST',
    data,
  });
}

export async function updateTag(data: TagParams) {
  return request(`${API_PREFIX}/biz/tag/update`, {
    method: 'PUT',
    data,
  });
}

export async function removeTag(id: number | string) {
  return request(`${API_PREFIX}/biz/tag/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function getTagPage(params: TagPageParams) {
  return request(`${API_PREFIX}/biz/tag/page`, {
    method: 'GET',
    params,
  });
}
