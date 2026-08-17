import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export type GraphOpLogWay = 'auto_read' | 'front_upload';
export type GraphOpLogAction = 'create' | 'update' | 'delete';

export interface GraphEntityOpLogPageParams {
  pageNo: number;
  pageSize: number;
  way?: GraphOpLogWay;
  action?: GraphOpLogAction;
  operatorName?: string;
  createTime?: string[];
}

export interface GraphEntityOpLogItem {
  id?: number | string;
  logId?: number | string;
  opLogId?: number | string;
  way?: string;
  action?: string;
  operatorName?: string;
  userName?: string;
  nickName?: string;
  createBy?: string;
  entityName?: string;
  nodeName?: string;
  name?: string;
  headName?: string;
  tailName?: string;
  entityType?: string;
  nodeType?: string;
  type?: string;
  documentName?: string;
  docName?: string;
  fileName?: string;
  content?: string;
  description?: string;
  remark?: string;
  opDesc?: string;
  detail?: string;
  beforeData?: any;
  afterData?: any;
  oldValue?: any;
  newValue?: any;
  before?: any;
  after?: any;
  createTime?: string | number;
  operateTime?: string | number;
  opTime?: string | number;
  [key: string]: any;
}

function buildQuery(params?: Record<string, any>) {
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

export async function getGraphEntityOpLogPage(params: GraphEntityOpLogPageParams) {
  return request(`${API_PREFIX}/biz/graph-entity-op-log/page`, {
    method: 'GET',
    params,
    paramsSerializer: (value) => buildQuery(value as Record<string, any>),
  });
}
