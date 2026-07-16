import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface DashboardOverviewCount {
  documentTotal?: number;
  dataSourceTotal?: number;
  knowledgeBaseTotal?: number;
  entityTotal?: number;
}

export interface DashboardImportTrendItem {
  statDate: string;
  count: number;
}

export interface DashboardImportTrend {
  last7Days?: DashboardImportTrendItem[];
  last15Days?: DashboardImportTrendItem[];
  last30Days?: DashboardImportTrendItem[];
  last90Days?: DashboardImportTrendItem[];
}

export interface DashboardFileTypeCountItem {
  fileType: string;
  count: number;
}

interface CommonResult<T> {
  code?: number;
  data?: T;
  msg?: string;
  [key: string]: any;
}

const unwrapResult = <T>(response: CommonResult<T> | T | undefined): T => {
  if (response && typeof response === 'object' && 'data' in (response as CommonResult<T>)) {
    return ((response as CommonResult<T>).data ?? {}) as T;
  }
  return (response ?? {}) as T;
};

const unwrapArrayResult = <T>(response: CommonResult<T[]> | T[] | undefined): T[] => {
  if (response && typeof response === 'object' && 'data' in (response as CommonResult<T[]>)) {
    return ((response as CommonResult<T[]>).data ?? []) as T[];
  }
  return (response ?? []) as T[];
};

export async function getDashboardOverviewCount() {
  const response = await request<CommonResult<DashboardOverviewCount>>(`${API_PREFIX}/biz/document/overview-count`, {
    method: 'GET',
  });
  return unwrapResult<DashboardOverviewCount>(response);
}

export async function getDashboardImportTrend() {
  const response = await request<CommonResult<DashboardImportTrend>>(`${API_PREFIX}/biz/document/import-trend`, {
    method: 'GET',
  });
  return unwrapResult<DashboardImportTrend>(response);
}

export async function getDashboardFileTypeCount() {
  const response = await request<CommonResult<DashboardFileTypeCountItem[]>>(`${API_PREFIX}/biz/document/file-type-count`, {
    method: 'GET',
  });
  return unwrapArrayResult<DashboardFileTypeCountItem>(response);
}
