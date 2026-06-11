// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>(`${API_PREFIX}/notices`, {
    method: 'GET',
    ...(options || {}),
  });
}
