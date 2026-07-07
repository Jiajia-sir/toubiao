import { request } from "@umijs/max";
import { API_PREFIX } from "@/constants";

export interface EntityTypeItem {
  id: number | string;
  name: string;
  description?: string;
  enabled?: string;
  icon?: string;
  color?: string;
  bgColor?: string;
  entityCount?: number;
  isSystem?: boolean;
  createTime?: string;
}

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

export interface EntityTypePageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  description?: string;
  enabled?: string;
  createTime?: string[];
}

export interface EntityTypeAttributeItem {
  id: number | string;
  entityTypeConfigId: number | string;
  name: string;
  code?: string;
  dataType: string;
  description?: string;
  createTime?: string;
}

export interface EntityTypeAttributeParams {
  id?: number | string;
  entityTypeConfigId: number | string;
  name: string;
  code?: string;
  dataType: string;
  description?: string;
}

export interface EntityTypeAttributePageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  dataType?: string;
  createTime?: string[];
  entityTypeConfigId?: number | string;
}

export async function addEntityType(data: EntityTypeParams) {
  return request(`${API_PREFIX}/biz/entity-type-config/create`, {
    method: "POST",
    data,
  });
}

export async function updateEntityType(data: EntityTypeParams) {
  return request(`${API_PREFIX}/biz/entity-type-config/update`, {
    method: "PUT",
    data,
  });
}

export async function removeEntityType(id: number | string) {
  return request(`${API_PREFIX}/biz/entity-type-config/delete`, {
    method: "DELETE",
    params: { id },
  });
}

export async function getEntityTypePage(params: EntityTypePageParams) {
  return request(`${API_PREFIX}/biz/entity-type-config/page`, {
    method: "GET",
    params,
  });
}

export async function getEntityTypeList() {
  return request<EntityTypeItem[]>(`${API_PREFIX}/biz/entity-type-config/list`, {
    method: "GET",
  });
}

export async function addEntityTypeAttribute(data: EntityTypeAttributeParams) {
  return request(`${API_PREFIX}/biz/entity-type-attribute-config/create`, {
    method: "POST",
    data,
  });
}

export async function updateEntityTypeAttribute(data: EntityTypeAttributeParams) {
  return request(`${API_PREFIX}/biz/entity-type-attribute-config/update`, {
    method: "PUT",
    data,
  });
}

export async function removeEntityTypeAttribute(id: number | string) {
  return request(`${API_PREFIX}/biz/entity-type-attribute-config/delete`, {
    method: "DELETE",
    params: { id },
  });
}

export async function getEntityTypeAttributePage(
  params: EntityTypeAttributePageParams,
) {
  return request(`${API_PREFIX}/biz/entity-type-attribute-config/page`, {
    method: "GET",
    params,
  });
}

export async function getEntityTypeAttributeList(entityTypeConfigId: number | string) {
  return request<EntityTypeAttributeItem[]>(
    `${API_PREFIX}/biz/entity-type-attribute-config/list-by-entity-type-id`,
    {
      method: "GET",
      params: { entityTypeConfigId },
    },
  );
}
