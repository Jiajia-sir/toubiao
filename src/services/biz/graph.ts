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

export async function randomPreviewGraph(params?: { nodeLimit?: number; linkLimit?: number }) {
  return request<SearchGraphResult>(`${API_PREFIX}/biz/graph/random-preview`, {
    method: "GET",
    params,
  });
}
