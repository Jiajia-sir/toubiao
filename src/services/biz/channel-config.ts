import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

export interface ChannelConfigParams {
  id?: number;
  name: string;
}

export interface ChannelConfigPageParams {
  pageNo: number;
  pageSize: number;
  name?: string;
  createTime?: string[];
}

export interface ChannelConfigItem {
  id: number;
  name: string;
  createTime?: string;
  isSystem?: string;
}

export interface ChannelConfigPageResult {
  list: ChannelConfigItem[];
  total: number;
}

export async function addChannelConfig(data: ChannelConfigParams) {
  return request(`${API_PREFIX}/biz/channel-config/create`, {
    method: 'POST',
    data,
  });
}

export async function updateChannelConfig(data: ChannelConfigParams) {
  return request(`${API_PREFIX}/biz/channel-config/update`, {
    method: 'PUT',
    data,
  });
}

export async function removeChannelConfig(id: number | string) {
  return request(`${API_PREFIX}/biz/channel-config/delete`, {
    method: 'DELETE',
    params: { id },
  });
}

export async function getChannelConfigPage(params: ChannelConfigPageParams) {
  return request(`${API_PREFIX}/biz/channel-config/page`, {
    method: 'GET',
    params,
  });
}
