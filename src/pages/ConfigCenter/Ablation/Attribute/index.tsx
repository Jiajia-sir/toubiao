"use client";

import OperationManagerPage from "../OperationManagerPage";
import { ablationPageConfigs } from "../config";

export default function AttributeAblationPage() {
  return <OperationManagerPage config={ablationPageConfigs[2]} />;
}
