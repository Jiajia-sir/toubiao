import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface DocumentPageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  fileType?: string;
  channelId?: number | string;
  status?: string;
}

export interface DocumentPageItem {
  id?: number | string;
  documentId?: number | string;
  fileId?: number | string;
  name?: string;
  fileName?: string;
  documentName?: string;
  filePath?: string;
  fileType?: string;
  fileSizeBytes?: number | string;
  knowledgeBaseIds?: Array<number | string>;
  knowledgeBaseNames?: Array<string>;
  keywords?: string;
  channelName?: string;
  fileTagNames?: Array<number | string>;
  catalogName?: string;
  status?: number | string;
  entityCount?: number | string;
  relationCount?: number | string;
  entities?: any[];
  createTime?: number | string;
  [key: string]: any;
}

export interface DocumentPageResult {
  list?: DocumentPageItem[];
  total?: number;
  [key: string]: any;
}

export function getDocumentPage(params: DocumentPageParams) {
  return request<DocumentPageResult>(`${API_PREFIX}/biz/document/page`, {
    method: 'GET',
    params,
  });
}

export function deleteDocumentBatch(ids: Array<number | string>) {
  return request(`${API_PREFIX}/biz/document/deleteBatch`, {
    method: 'POST',
    data: { ids },
  });
}

export function reAnalysisDocument(ids: Array<number | string>) {
  return request(`${API_PREFIX}/biz/document/reAnalysisDocument`, {
    method: 'POST',
    data: { ids },
  });
}

// 分片初始化任务接口
export function initChunkFileTask(data: {
  fileName: string;
  fileSize: number;
  lastModified: number;
  fingerprint: string;
  sampleHash: string;
  chunkSize: number;
  chunkTotal: number;
}) {
  return request(`${API_PREFIX}/infra/file/shard/init`, {
    method: 'POST',
    data,
  });
}

// 分片上传接口
export function createChunkFileTask(data: FormData) {
  return request(`${API_PREFIX}/infra/file/shard/upload`, {
    method: 'POST',
    data,
    requestType: 'form',
  });
}

// 分片合并接口
export function mergeChunkFileTask(data: { uploadId: string }) {
  return request(`${API_PREFIX}/infra/file/shard/complete`, {
    method: 'POST',
    data,
  });
}

// 素材解析
export function createFileBaseData(data: {
  catalogId: number | string;
  channelId: number | string;
  knowledgeBaseIds?: Array<number | string>;
  fileTagIds?: Array<number | string>;
  enableOcr: number;
  enableTrans: number;
  enableExtract: number;
  files: any[];
}) {
  return request(`${API_PREFIX}/biz/document/create`, {
    method: 'POST',
    data,
  });
}
