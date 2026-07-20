import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface DataSourceObjectItem {
  objectName: string;
  objectKind: string;
  schemaName?: string;
  remark?: string;
}

export interface DataSourceFieldItem {
  fieldName: string;
  fieldType: string;
  nullable?: boolean;
  primaryKey?: boolean;
  remark?: string;
}

export interface DataSourcePreviewResult {
  objectName: string;
  objectKind: string;
  columns: string[];
  rows: Array<Record<string, any>>;
}

export async function listDataSourceObjects(id: number | string) {
  return request(`${API_PREFIX}/biz/data-source/objects`, {
    method: 'GET',
    params: { id },
  });
}

export async function listDataSourceFields(id: number | string, objectName: string) {
  return request(`${API_PREFIX}/biz/data-source/fields`, {
    method: 'GET',
    params: { id, objectName },
  });
}

export async function previewDataSourceObject(
  id: number | string,
  objectName: string,
  limit = 20,
) {
  return request(`${API_PREFIX}/biz/data-source/preview`, {
    method: 'GET',
    params: { id, objectName, limit },
  });
}

export interface ImportObjectScope {
  objectName: string;
  objectKind?: string;
  columns?: string[];
  keyFields?: string[];
  filterExpr?: string;
}

export interface ImportTaskPayload {
  id?: number;
  name: string;
  dataSourceId: number;
  extractMode?: string;
  scheduleType?: string;
  cronExpr?: string;
  scheduleConfig?: Record<string, any>;
  batchSize?: number;
  maxRowsPerObject?: number;
  writeMode?: string;
  enabled?: number;
  remark?: string;
  objects: ImportObjectScope[];
  cursorConfig?: Record<string, any>;
}

export interface ImportTaskRecord {
  id: number;
  name: string;
  dataSourceId: number;
  dataSourceName?: string;
  sourceType: string;
  extractMode: string;
  scheduleType: string;
  cronExpr?: string;
  batchSize: number;
  writeMode: string;
  enabled: number;
  lastSuccessRunId?: number;
  lastRunStatus?: string;
  lastRunTime?: string;
  remark?: string;
  objects?: ImportObjectScope[];
  createTime?: string;
  updateTime?: string;
}

export interface ImportRunRecord {
  id: number;
  taskId: number;
  dataSourceId: number;
  taskName?: string;
  sourceType?: string;
  triggerType?: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  readCount?: number;
  writeCount?: number;
  failCount?: number;
  skipCount?: number;
  byteCount?: number;
  progressPercent?: number;
  errorCode?: string;
  errorMessage?: string;
  createTime?: string;
}

export interface ImportStatsOverview {
  taskCount: number;
  enabledTaskCount: number;
  runningCount: number;
  todayRunCount: number;
  todaySuccessRunCount: number;
  todayFailRunCount: number;
  todayReadCount: number;
  todayWriteCount: number;
  todayFailCount: number;
  totalReadCount: number;
  totalWriteCount: number;
  totalFailCount: number;
}

function extractData<T = any>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

export async function createImportTask(data: ImportTaskPayload) {
  return request(`${API_PREFIX}/biz/import-task/create`, { method: 'POST', data });
}

export async function updateImportTask(data: ImportTaskPayload) {
  return request(`${API_PREFIX}/biz/import-task/update`, { method: 'PUT', data });
}

export async function deleteImportTask(id: number | string) {
  return request(`${API_PREFIX}/biz/import-task/delete`, { method: 'DELETE', params: { id } });
}

export async function getImportTask(id: number | string) {
  return request(`${API_PREFIX}/biz/import-task/get`, { method: 'GET', params: { id } });
}

export async function getImportTaskPage(params: Record<string, any>) {
  return request(`${API_PREFIX}/biz/import-task/page`, { method: 'GET', params });
}

export async function enableImportTask(id: number | string, enabled: number) {
  return request(`${API_PREFIX}/biz/import-task/enable`, {
    method: 'POST',
    params: { id, enabled },
  });
}

export async function triggerImportTask(id: number | string, triggerType = 'MANUAL') {
  return request(`${API_PREFIX}/biz/import-task/trigger`, {
    method: 'POST',
    params: { id, triggerType },
  });
}

export async function getImportRunPage(params: Record<string, any>) {
  return request(`${API_PREFIX}/biz/import-run/page`, { method: 'GET', params });
}

export async function getImportRun(id: number | string) {
  return request(`${API_PREFIX}/biz/import-run/get`, { method: 'GET', params: { id } });
}

export async function retryImportRun(id: number | string) {
  return request(`${API_PREFIX}/biz/import-run/retry`, { method: 'POST', params: { id } });
}

export async function stopImportRun(id: number | string) {
  return request(`${API_PREFIX}/biz/import-run/stop`, { method: 'POST', params: { id } });
}

export interface ImportTaskResult {
  taskId: number;
  taskName: string;
  dataSourceId: number;
  dataSourceName?: string;
  sourceType?: string;
  lastRunStatus?: string;
  lastRunTime?: string;
  lastRunId?: number;
  totalRecordCount?: number;
  lastReadCount?: number;
  lastWriteCount?: number;
  lastFailCount?: number;
  lastByteCount?: number;
  lastProgressPercent?: number;
  lastErrorMessage?: string;
  objectStats?: Array<{
    objectName: string;
    objectKind?: string;
    recordCount?: number;
    lastExtractedAt?: string;
  }>;
  recentRuns?: Array<{
    runId: number;
    status?: string;
    triggerType?: string;
    startedAt?: string;
    finishedAt?: string;
    readCount?: number;
    writeCount?: number;
    failCount?: number;
    byteCount?: number;
    progressPercent?: number;
    errorMessage?: string;
  }>;
}

export async function getImportTaskResult(id: number | string) {
  return request(`${API_PREFIX}/biz/import-task/result`, { method: 'GET', params: { id } });
}

export async function getImportStatsOverview() {
  return request(`${API_PREFIX}/biz/import-stats/overview`, { method: 'GET' });
}

export async function getImportRecordPage(params: Record<string, any>) {
  return request(`${API_PREFIX}/biz/import-record/page`, { method: 'GET', params });
}

export async function physicalDeleteImportRecord(id: number | string) {
  return request(`${API_PREFIX}/biz/import-record/delete`, { method: 'DELETE', params: { id } });
}

export async function physicalDeleteImportRecordBatch(ids: Array<number | string>) {
  return request(`${API_PREFIX}/biz/import-record/delete-batch`, { method: 'DELETE', data: ids });
}


export { extractData };
