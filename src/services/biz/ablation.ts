import { request } from '@umijs/max';
import { COMMUNITY_API_PREFIX } from '@/constants';

const ABLATION_API_PREFIX = `${COMMUNITY_API_PREFIX}/api/v1`;

export interface AblationEntity {
  name?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  entity_id?: string;
  description?: string;
  [key: string]: unknown;
}

export interface AblationRelation {
  head_entity_id?: string;
  relationCode?: string;
  tail_entity_id?: string;
  evidence?: string;
  [key: string]: unknown;
}

export interface AblationResolution {
  mention?: string;
  canonical_entity?: string;
  entity_id?: string;
  description?: string;
  [key: string]: unknown;
}

export interface AblationGlobalEntity {
  entity_id?: string;
  standard_name?: string;
  type?: string;
  aliases?: string[];
  languages?: string[];
  source_docs?: string[];
  source_entities?: Array<Record<string, unknown>>;
  attributes?: Record<string, unknown>;
  descriptions?: string[];
  [key: string]: unknown;
}

export interface AblationStatistics {
  input_graph_count?: number | string;
  entity_count?: number | string;
  attribute_count?: number | string;
  relation_count?: number | string;
  mapping_count?: number | string;
  resolution_count?: number | string;
  llm_resolution_count?: number | string;
  [key: string]: number | string | undefined;
}

export interface AblationResult {
  entities?: AblationEntity[];
  relations?: AblationRelation[];
  resolutions?: AblationResolution[];
  global_entities?: AblationGlobalEntity[];
  statistics?: AblationStatistics;
  [key: string]: unknown;
}

export interface AblationTask {
  id?: number | string;
  task_id?: number | string;
  taskId?: number | string;
  melt_task_id?: number | string;
  meltTaskId?: number | string;
  task_name?: string;
  taskName?: string;
  name?: string;
  status?: number | string;
  state?: number | string;
  status_code?: number | string;
  statusCode?: number | string;
  error_message?: string | null;
  created_at?: string | number;
  createdAt?: string | number;
  create_time?: string | number;
  createTime?: string | number;
  [key: string]: unknown;
}

export interface AblationTaskPage {
  list?: AblationTask[];
  tasks?: AblationTask[];
  items?: AblationTask[];
  records?: AblationTask[];
  total?: number;
  count?: number;
  [key: string]: unknown;
}

export interface AblationApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: unknown;
  [key: string]: unknown;
}

export interface UploadAblationParams {
  files: File[];
  fileLanguages: Record<string, string>;
  taskName: string;
}

/**
 * 兼容 umi-request 返回响应体和 axios 响应体两种形态。
 */
export function unwrapAblationResponse(response: unknown): unknown {
  const value = response as Record<string, any> | null;
  if (
    value &&
    value.data &&
    typeof value.data === 'object' &&
    typeof value.success === 'undefined' &&
    typeof value.error === 'undefined' &&
    typeof value.code === 'undefined'
  ) {
    return value.data;
  }
  return response;
}

export function getAblationPayload<T = unknown>(response: unknown): T {
  const body = unwrapAblationResponse(response) as AblationApiResponse<T> | T | null;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as AblationApiResponse<T>).data as T;
  }
  return body as T;
}

export function uploadAblation(params: UploadAblationParams) {
  const formData = new FormData();
  params.files.forEach((file) => {
    formData.append('files', file, file.name);
  });
  formData.append('file_languages', JSON.stringify(params.fileLanguages));
  formData.append('task_name', params.taskName);

  return request<AblationApiResponse<AblationResult>>(`${ABLATION_API_PREFIX}/graph/ablation`, {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
}

export function getAblationTaskPage(page = 1, pageSize = 20) {
  return request<AblationApiResponse<AblationTaskPage | AblationTask[]>>(
    `${ABLATION_API_PREFIX}/melt-tasks`,
    {
      method: 'GET',
      params: { page, page_size: pageSize },
    },
  );
}

export function getAblationTaskResult(taskId: number | string) {
  return request<AblationApiResponse<AblationResult>>(
    `${ABLATION_API_PREFIX}/melt-tasks/${encodeURIComponent(String(taskId))}/result`,
    { method: 'GET' },
  );
}

export function deleteAblationTask(taskId: number | string) {
  return request<AblationApiResponse>(
    `${ABLATION_API_PREFIX}/melt-tasks/${encodeURIComponent(String(taskId))}`,
    { method: 'DELETE' },
  );
}
