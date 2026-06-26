"use client";

import { history } from "@umijs/max";
import { Modal } from "antd";
import { clearSessionToken } from "@/access";
import { PageEnum } from "@/enums/pagesEnums";
import { setRemoteMenu } from "@/services/session";

let isShowingRelogin = false;

/**
 * 处理认证过期 - 弹窗提示用户重新登录
 * 参考 data-processing-platform 的实现
 */
export function handleAuthExpired() {
  clearSessionToken();
  setRemoteMenu(null);

  // 防止重复弹窗
  if (isShowingRelogin) {
    return;
  }

  // 如果已经在登录页，不处理
  if (history.location.pathname === PageEnum.LOGIN) {
    return;
  }

  isShowingRelogin = true;

  Modal.confirm({
    title: "系统提示",
    content: "登录状态已过期，您可以继续留在该页面，或者重新登录",
    okText: "重新登录",
    cancelText: "取消",
    onOk() {
      isShowingRelogin = false;
      history.replace(PageEnum.LOGIN);
    },
    onCancel() {
      isShowingRelogin = false;
    },
  });
}

/**
 * 直接跳转到登录页（用于 refreshToken 刷新失败等必须登出的场景）
 */
export function redirectToLogin() {
  clearSessionToken();
  setRemoteMenu(null);

  if (history.location.pathname === PageEnum.LOGIN) {
    return;
  }

  history.replace(PageEnum.LOGIN);
}
