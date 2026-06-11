import { API_PREFIX } from '@/constants';
import { request } from '@umijs/max';

/** 登录接口 POST /admin-api/system/auth/login */
export async function login(body: { username: string; password: string }, options?: Record<string, any>) {
  return request<API.LoginResult>(`${API_PREFIX}/system/auth/login`, {
    method: 'POST',
    headers: {
      isToken: false,
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 退出登录接口 POST /admin-api/system/auth/logout */
export async function logout() {
  return request<Record<string, any>>(`${API_PREFIX}/system/auth/logout`, {
    method: 'POST',
  });
}

// 发送手机验证码
export async function getMobileCaptcha(mobile: string) {
  return request(`${API_PREFIX}/system/auth/send-sms-code`, {
    method: 'POST',
    data: { mobile },
  });
}
