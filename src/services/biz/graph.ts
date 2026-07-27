import { request } from "@umijs/max";
import { API_PREFIX } from "@/constants";

export interface DocumentKnowledgeGraphNode {
  id: number;
  name: string;
  type?: string;
  description?: string;
}

export interface DocumentKnowledgeGraphLink {
  sourceId: number;
  targetId: number;
  relation: string;
  evidence?: string;
}

export interface DocumentKnowledgeGraphResult {
  nodes?: DocumentKnowledgeGraphNode[];
  links?: DocumentKnowledgeGraphLink[];
}

export interface SearchGraphNode {
  id: string;
  name: string;
  type: "center" | "entity" | "value";
  desc?: string;
  expandable?: boolean;
  relationCount?: number;
  parentId?: string;
  relationFromParent?: string;
  depth?: number;
  branchId?: string;
}

export interface SearchGraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface SearchGraphResult {
  centerId?: string;
  nodes?: SearchGraphNode[];
  links?: SearchGraphLink[];
  nextCursor?: number;
}

export async function getDocumentKnowledgeGraph(id: number | string) {
  return request<DocumentKnowledgeGraphResult>(`${API_PREFIX}/biz/graph/document-knowledge-graph`, {
    method: "GET",
    params: { id },
  });
}

export async function searchGraph(params: { entity: string; mode?: string }) {
  return request<SearchGraphResult>(`${API_PREFIX}/biz/graph/search`, {
    method: "GET",
    params,
  });
}

export interface GraphEntityItem {
  nodeId: string;
  graphNodeId: string;
  nodeKind: string;
  name: string;
  type: string;
  value: string | null;
}

export interface GraphEntityResult {
  spaceCode: string;
  list: GraphEntityItem[];
  size: number;
  hasMore: boolean;
  nextCursor: string;
}

export async function getGraphEntities(data: {
  way?: string;
  nodeKind?: string;
  entityType?: string;
  name?: string;
  cursor?: string | number;
  pageSize?: number;
}) {
  return request<GraphEntityResult>(`${API_PREFIX}/biz/graph/entities`, {
    method: "POST",
    data,
  });
}

export interface GraphExpandReqVO {
  way?: string;
  nodeId: number | string;
  nodeKind: string;
  direction?: string;
  includeProperty?: boolean;
  limit?: number;
  cursor?: number | string;
}

export interface GraphExpandResult {
  centerId: string;
  nodes: SearchGraphNode[];
  links: SearchGraphLink[];
  spaceCode?: string;
  centerKind?: string;
  hasMore?: boolean;
  nextCursor?: number | string;
}

export async function expandGraphNode(data: GraphExpandReqVO) {
  return request<GraphExpandResult>(`${API_PREFIX}/biz/graph/expand`, {
    method: "POST",
    data,
  });
}
