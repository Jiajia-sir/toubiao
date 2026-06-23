"use client";

import { history } from "@umijs/max";
import { clearSessionToken } from "@/access";
import { PageEnum } from "@/enums/pagesEnums";
import { setRemoteMenu } from "@/services/session";

let redirecting = false;

export function handleAuthExpired() {
  clearSessionToken();
  setRemoteMenu(null);

  if (redirecting) {
    return;
  }

  if (history.location.pathname === PageEnum.LOGIN) {
    return;
  }

  redirecting = true;
  history.replace(PageEnum.LOGIN);

  window.setTimeout(() => {
    redirecting = false;
  }, 300);
}
