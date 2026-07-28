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
  tag?: string[];
  avp?: Array<[string, string]>;
  expandable?: boolean;
  relationCount?: number;
  parentId?: string;
  relationFromParent?: string;
  depth?: number;
  branchId?: string;
  sourceDocuments?: Array<{
    documentId?: number | string;
    documentName?: string;
  }>;
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

export async function searchGraph(params: { entity: string; way?: string }) {
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

export interface RenameRelationReqVO {
  way?: string;
  headEntityId: number | string;
  tailEntityId: number | string;
  newRelationName: string;
}

export async function renameRelationBetween(data: RenameRelationReqVO) {
  return request<boolean | string | Record<string, any>>(`${API_PREFIX}/biz/graph/relation/rename-between`, {
    method: "POST",
    data,
  });
}

export interface DeleteRelationReqVO {
  way?: string;
  headEntityId: number | string;
  tailEntityId: number | string;
}

export async function deleteRelationBetween(data: DeleteRelationReqVO) {
  return request<boolean | string | Record<string, any>>(`${API_PREFIX}/biz/graph/relation/delete-between`, {
    method: "POST",
    data,
  });
}

export interface CreateEntityWithRelationReqVO {
  way?: string;
  headEntityId: number | string;
  headName?: string;
  headType?: string;
  headDescription?: string;
  tailEntityId: number | string;
  tailName?: string;
  tailType?: string;
  tailDescription?: string;
  relationCode: string;
  documentId?: number | string;
  evidence?: string;
}

export async function createEntityWithRelation(data: CreateEntityWithRelationReqVO) {
  return request<boolean | string | Record<string, any>>(`${API_PREFIX}/biz/graph/entity/create-with-relation`, {
    method: "POST",
    data,
  });
}

export interface CreateGraphNodeReqVO {
  way?: string;
  nodeKind: "entity" | "property";
  name?: string;
  type?: string;
  description?: string;
  entityId?: number | string;
  attrKey?: string;
  attrValue?: string;
}

export async function createGraphNode(data: CreateGraphNodeReqVO) {
  return request<boolean | string | Record<string, any>>(`${API_PREFIX}/biz/graph/node/create`, {
    method: "POST",
    data,
  });
}

export interface RenameGraphEntityReqVO {
  way?: string;
  nodeId: number | string;
  newName: string;
}

export async function renameGraphEntity(data: RenameGraphEntityReqVO) {
  return request<boolean | string | Record<string, any>>(`${API_PREFIX}/biz/graph/entity/rename`, {
    method: "POST",
    data,
  });
}

export interface UpdateGraphNodeReqVO {
  way?: string;
  nodeId?: number | string;
  nodeKind?: "entity" | "property";
  name?: string;
  type?: string;
  description?: string;
  newName?: string;
  entityId?: number | string;
  attrKey?: string;
  attrValue?: string;
}

export async function updateGraphNode(data: UpdateGraphNodeReqVO) {
  return request<boolean | string | Record<string, any>>(`${API_PREFIX}/biz/graph/node/update`, {
    method: "POST",
    data,
  });
}

export interface DeleteGraphNodeReqVO {
  way?: string;
  nodeId: number | string;
  nodeKind: "entity" | "property";
}

export async function deleteGraphNode(data: DeleteGraphNodeReqVO) {
  return request<boolean | string | Record<string, any>>(`${API_PREFIX}/biz/graph/node/delete`, {
    method: "POST",
    data,
  });
}
