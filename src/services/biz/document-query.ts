import { request } from "@umijs/max";
import { API_PREFIX } from "@/constants";

export interface DocumentQueryFieldWeight {
  fieldName: string;
  weight: number;
}

export interface DocumentQueryParams {
  pageNo: number;
  pageSize: number;
  keyword: string;
  queryStrategy: number;
  slop: number;
  fieldWeights: DocumentQueryFieldWeight[];
  advanceSearch: string;
  sortField: "_score" | "createTime";
  sortOrder: "asc" | "desc";
  knowledgeBaseId: Array<number | string>;
  fileTypes: string[];
  catalogIds: Array<number | string>;
  fileTagIdList: Array<number | string>;
  directoryIds: Array<number | string>;
  accessModes: string[];
  entityTypes: string[];
  entityNames: string[];
  createTime: string[];
}

export interface DocumentQueryResult {
  list?: any[];
  total?: number;
  [key: string]: any;
}

export async function queryDocuments(data: DocumentQueryParams) {
  return request<DocumentQueryResult>(`${API_PREFIX}/biz/document-query/query`, {
    method: "POST",
    data,
  });
}

export async function getDocumentFileTypeCount() {
  return request(`${API_PREFIX}/biz/document-query/file-type-count`, {
    method: "POST",
  });
}

export async function getDocumentAccessModeCount() {
  return request(`${API_PREFIX}/biz/document-query/access-mode-count`, {
    method: "POST",
  });
}
