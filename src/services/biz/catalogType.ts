import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface CatalogTypeParams {
  id?: number | string;
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  status?: string;
}

export interface CatalogTypePageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  createTime?: string[];
}

function buildCatalogTypePageQuery(params?: Record<string, any>) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && typeof item !== 'undefined' && item !== '') {
          searchParams.append(key, String(item));
        }
      });
      return;
    }
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
}

export async function addCatalogType(data: CatalogTypeParams) {
  return request(`${API_PREFIX}/biz/catalog-type/create`, {
    method: 'POST',
    data,
  });
}

export async function updateCatalogType(data: CatalogTypeParams) {
  return request(`${API_PREFIX}/biz/catalog-type/update`, {
    method: 'PUT',
    data,
  });
}

export async function removeCatalogType(id: number | string) {
  return request(`${API_PREFIX}/biz/catalog-type/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function getCatalogTypePage(params: CatalogTypePageParams) {
  return request(`${API_PREFIX}/biz/catalog-type/page`, {
    method: 'GET',
    params,
    paramsSerializer: (value) => buildCatalogTypePageQuery(value as Record<string, any>),
  });
}

export async function getCatalogTypeList() {
  return request(`${API_PREFIX}/biz/catalog-type/list`, {
    method: 'GET',
  });
}

export async function getCatalogType(id: number | string) {
  return request(`${API_PREFIX}/biz/catalog-type/get`, {
    method: 'GET',
    params: { id },
  });
}
