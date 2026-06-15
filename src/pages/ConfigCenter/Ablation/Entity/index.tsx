"use client";

import OperationManagerPage from "../OperationManagerPage";
import { ablationPageConfigs } from "../config";

export default function EntityAblationPage() {
  return <OperationManagerPage config={ablationPageConfigs[0]} />;
}
