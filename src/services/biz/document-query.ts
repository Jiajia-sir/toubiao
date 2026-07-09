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

export interface DocumentKnowledgeBaseFacetItem {
  id?: number | string;
  name?: string;
  count?: number;
}

export interface DocumentFacetResult {
  knowledgeBaseCounts?: DocumentKnowledgeBaseFacetItem[];
  fileTypeCounts?: Array<{
    fileType?: string;
    count?: number;
  }>;
  [key: string]: any;
}

export interface DocumentViewParams {
  id: number | string;
  esId?: string;
  keyword?: string;
}

export interface DocumentHtmlChunkPageParams {
  pageNo: number;
  pageSize: number;
  docId: number | string;
  keyword: string;
  contextSize: number;
}

export async function queryDocuments(data: DocumentQueryParams) {
  return request<DocumentQueryResult>(`${API_PREFIX}/biz/document-query/query`, {
    method: "POST",
    data,
  });
}

export async function getDocumentFacet(data: DocumentQueryParams) {
  return request<DocumentFacetResult>(`${API_PREFIX}/biz/document-query/facet`, {
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

export async function viewDocument(data: DocumentViewParams) {
  return request(`${API_PREFIX}/biz/document-query/view`, {
    method: "POST",
    data,
  });
}

export async function getDocumentHtmlChunkPage(data: DocumentHtmlChunkPageParams) {
  return request(`${API_PREFIX}/biz/document-query/html-chunk-page`, {
    method: "POST",
    data,
  });
}
