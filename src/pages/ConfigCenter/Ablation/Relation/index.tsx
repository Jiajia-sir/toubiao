"use client";

import OperationManagerPage from "../OperationManagerPage";
import { ablationPageConfigs } from "../config";

export default function RelationAblationPage() {
  return <OperationManagerPage config={ablationPageConfigs[1]} />;
}
