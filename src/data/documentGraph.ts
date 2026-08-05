export type EntityType = 'person' | 'organization' | 'time' | 'term' | 'product' | 'project';

export interface ExtractedEntity {
  id: string;
  name: string;
  type: EntityType;
}

export interface KnowledgeGraphNode {
  id: string;
  name: string;
  type: EntityType;
  category?: EntityType;
  symbolSize?: number;
  expanded?: boolean;
  loaded?: boolean;
  hasMore?: boolean;
  neighborTotal?: number;
  nextOffset?: number;
  description?: string;
  properties?: Record<string, string>;
  sourceDocuments?: SourceDocument[];
  x?: number;
  y?: number;
}

export interface KnowledgeGraphLink {
  source: string;
  target: string;
  relation: string;
  confidence?: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
}

export interface NeighborQuery {
  depth?: number;
  limit?: number;
  offset?: number;
}

export interface NeighborResponse {
  centerNode: KnowledgeGraphNode;
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
  hasMore: boolean;
  nextOffset: number;
  total: number;
}

export interface ParseStep {
  name: string;
  duration: string;
  completed: boolean;
  status?: 'completed' | 'pending' | 'failed';
}

export interface SourceDocument {
  id: string;
  title: string;
  location: string;
  type: 'docx' | 'pdf';
}

export interface DocumentParseDetail {
  id: string;
  title: string;
  type: string;
  size: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  uploader: string;
  uploadedAt: string;
  knowledgeBase: string;
  keywords: string[];
  tags: string[];
  parseSteps: ParseStep[];
  entities: Record<EntityType, ExtractedEntity[]>;
  content: string[];
  graph: KnowledgeGraphData;
}

export const entityTypeMeta: Record<EntityType, { label: string; color: string; bg: string }> = {
  person: { label: '人物', color: '#2f6fed', bg: '#eaf2ff' },
  organization: { label: '组织', color: '#16a34a', bg: '#e9f8ef' },
  time: { label: '时间', color: '#f97316', bg: '#fff2e8' },
  term: { label: '技术术语', color: '#8b5cf6', bg: '#f3edff' },
  product: { label: '产品', color: '#10b981', bg: '#e8fbf4' },
  project: { label: '项目', color: '#84cc16', bg: '#f2fbe6' },
};
