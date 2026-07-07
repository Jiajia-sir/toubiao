"use client";

import { clearSessionToken } from "@/access";
import { PageEnum } from "@/enums/pagesEnums";
import { setRemoteMenu } from "@/services/session";
import { history } from "@umijs/max";
import { message, Modal } from "antd";

let isRedirectingToLogin = false;

function resetAuthState() {
  clearSessionToken();
  setRemoteMenu(null);
  Modal.destroyAll();
}

export function handleAuthExpired() {
  if (isRedirectingToLogin) {
    return;
  }

  resetAuthState();

  if (history.location.pathname === PageEnum.LOGIN) {
    return;
  }

  isRedirectingToLogin = true;
  message.warning("登录状态已过期，请重新登录");
  history.replace(PageEnum.LOGIN);
  setTimeout(() => {
    isRedirectingToLogin = false;
  }, 0);
}

export function redirectToLogin() {
  resetAuthState();

  if (history.location.pathname === PageEnum.LOGIN) {
    return;
  }

  history.replace(PageEnum.LOGIN);
}
