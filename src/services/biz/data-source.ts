import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

/**
 * 结构化数据源扩展字段定义。
 * 前端通过该定义动态渲染类型专属表单，避免每增加一种数据库都新增一套页面代码。
 */
export interface DataSourcePropertyField {
  key: string;
  label: string;
  inputType: 'input' | 'password' | 'number';
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface SupportedDataSourceType {
  type: string;
  typeName: string;
  category: 'relational' | 'graph' | 'document' | string;
  categoryName: string;
  defaultPort?: number | null;
  supportsUri: boolean;
  requiredBasicFields: string[];
  propertyFields: DataSourcePropertyField[];
}

export interface DataSourceRecord {
  id: number;
  name: string;
  type: string;
  typeName?: string;
  category: string;
  categoryName?: string;
  description?: string;
  host?: string;
  port?: number | null;
  databaseName?: string;
  username?: string;
  password?: string;
  connectionUri?: string;
  properties?: Record<string, any>;
  status: number;
  lastTestStatus?: number | null;
  lastTestMessage?: string;
  lastTestTime?: string;
  createTime?: string;
  updateTime?: string;
}

export interface DataSourcePayload {
  id?: number;
  name: string;
  type: string;
  description?: string;
  host?: string;
  port?: number | null;
  databaseName?: string;
  username?: string;
  password?: string;
  connectionUri?: string;
  properties?: Record<string, any>;
  status: number;
}

export interface DataSourcePageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  type?: string;
  category?: string;
  status?: number;
}

export interface DataSourceConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
}

export async function createDataSource(data: DataSourcePayload) {
  return request(`${API_PREFIX}/biz/data-source/create`, {
    method: 'POST',
    data,
  });
}

export async function updateDataSource(data: DataSourcePayload) {
  return request(`${API_PREFIX}/biz/data-source/update`, {
    method: 'PUT',
    data,
  });
}

export async function deleteDataSource(id: number | string) {
  return request(`${API_PREFIX}/biz/data-source/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function getDataSourcePage(params: DataSourcePageParams) {
  return request(`${API_PREFIX}/biz/data-source/page`, {
    method: 'GET',
    params,
  });
}

export async function getSupportedDataSourceTypes() {
  return request(`${API_PREFIX}/biz/data-source/supported-types`, {
    method: 'GET',
  });
}

export async function testDataSourceConnection(data: DataSourcePayload) {
  return request(`${API_PREFIX}/biz/data-source/test-connection`, {
    method: 'POST',
    data,
  });
}
