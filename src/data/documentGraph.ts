export type EntityType = "person" | "organization" | "time" | "term" | "product" | "project";

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
  status?: "completed" | "pending" | "failed";
}

export interface SourceDocument {
  id: string;
  title: string;
  location: string;
  type: "docx" | "pdf";
}

export interface DocumentParseDetail {
  id: string;
  title: string;
  type: string;
  size: string;
  status: "completed" | "running" | "pending" | "failed";
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
  person: { label: "人物", color: "#2f6fed", bg: "#eaf2ff" },
  organization: { label: "组织", color: "#16a34a", bg: "#e9f8ef" },
  time: { label: "时间", color: "#f97316", bg: "#fff2e8" },
  term: { label: "技术术语", color: "#8b5cf6", bg: "#f3edff" },
  product: { label: "产品", color: "#10b981", bg: "#e8fbf4" },
  project: { label: "项目", color: "#84cc16", bg: "#f2fbe6" },
};

const baseGraph: KnowledgeGraphData = {
  nodes: [
    {
      id: "org-tech-a",
      name: "科技公司A",
      type: "organization",
      description: "一家专注于知识管理、智能解析与图谱构建的平台型企业。",
      properties: {
        实体ID: "ENT-20240001",
        成立时间: "2016-03-15",
        总部地点: "北京市海淀区",
        员工规模: "500-1000人",
        所属行业: "人工智能",
      },
      sourceDocuments: [
        { id: "src-1", title: "2024年度企业年报.docx", location: "提取于第12页", type: "docx" },
        { id: "src-2", title: "行业独角兽企业研究.pdf", location: "提取于第47页", type: "pdf" },
      ],
    },
    {
      id: "person-zhangsan",
      name: "张三",
      type: "person",
      description: "科技公司A 创始人，长期负责企业知识管理产品方向。",
      properties: { 职务: "创始人", 关联企业: "科技公司A", 置信度: "0.98" },
      sourceDocuments: [{ id: "src-1", title: "2024年度企业年报.docx", location: "提取于第12页", type: "docx" }],
    },
    {
      id: "person-lisi",
      name: "李四",
      type: "person",
      description: "科技公司A CTO，负责智能解析和图谱构建平台研发。",
      properties: { 职务: "CTO", 负责方向: "知识图谱", 置信度: "0.95" },
      sourceDocuments: [{ id: "src-2", title: "行业独角兽企业研究.pdf", location: "提取于第47页", type: "pdf" }],
    },
    {
      id: "org-invest-b",
      name: "投资机构B",
      type: "organization",
      description: "科技公司A 的主要投资方之一。",
      properties: { 关系类型: "投资方", 置信度: "0.92" },
    },
    {
      id: "product-x",
      name: "产品X",
      type: "product",
      description: "面向企业知识库场景的智能解析与图谱构建产品。",
      properties: { 产品定位: "企业知识管理", 核心能力: "解析、检索、图谱", 置信度: "0.99" },
      sourceDocuments: [{ id: "src-1", title: "2024年度企业年报.docx", location: "提取于第18页", type: "docx" }],
    },
    { id: "project-alpha", name: "开源项目Alpha", type: "project" },
    { id: "term-ocr", name: "OCR", type: "term" },
    { id: "term-api", name: "API", type: "term" },
    { id: "term-pdf", name: "PDF", type: "term" },
    { id: "term-kg", name: "知识图谱", type: "term" },
    { id: "time-20260415", name: "2026年4月15日", type: "time" },
    { id: "time-20260420", name: "2026年4月20日", type: "time" },
    { id: "time-3y", name: "3年", type: "time" },
    { id: "org-product", name: "产品部", type: "organization" },
    { id: "org-tech", name: "技术部", type: "organization" },
    { id: "org-ops", name: "运维部", type: "organization" },
  ],
  links: [
    { source: "org-tech-a", target: "person-zhangsan", relation: "创始人", confidence: 0.98 },
    { source: "org-tech-a", target: "person-lisi", relation: "CTO", confidence: 0.95 },
    { source: "org-tech-a", target: "org-invest-b", relation: "投资方", confidence: 0.92 },
    { source: "org-tech-a", target: "product-x", relation: "核心产品", confidence: 0.99 },
    { source: "person-lisi", target: "project-alpha", relation: "负责", confidence: 0.88 },
    { source: "product-x", target: "term-ocr", relation: "包含能力", confidence: 0.91 },
    { source: "product-x", target: "term-api", relation: "开放接口", confidence: 0.86 },
    { source: "product-x", target: "term-kg", relation: "核心能力", confidence: 0.96 },
    { source: "org-tech-a", target: "time-20260415", relation: "创建日期", confidence: 0.9 },
    { source: "org-tech-a", target: "time-20260420", relation: "更新日期", confidence: 0.9 },
    { source: "org-tech-a", target: "org-product", relation: "下设部门", confidence: 0.93 },
    { source: "org-tech-a", target: "org-tech", relation: "下设部门", confidence: 0.93 },
    { source: "org-tech-a", target: "org-ops", relation: "下设部门", confidence: 0.93 },
  ],
};

export const documentParseDetails: DocumentParseDetail[] = [
  {
    id: "1",
    title: "产品需求文档V2.1.pdf",
    type: "PDF",
    size: "8.7 MB",
    status: "completed",
    uploader: "王五",
    uploadedAt: "2026-04-22 10:15",
    knowledgeBase: "产品研发库",
    keywords: ["知识管理", "智能解析", "OCR识别", "全文检索", "知识图谱", "API接口", "文件上传"],
    tags: ["产品文档", "功能需求", "非功能需求", "文件管理", "智能解析", "系统性能", "安全合规"],
    parseSteps: [
      { name: "文件上传", duration: "00:00:02", completed: true },
      { name: "文本提取", duration: "00:00:15", completed: true },
      { name: "关键词提取", duration: "00:00:08", completed: true },
      { name: "实体抽取", duration: "00:00:03", completed: true },
      { name: "标签分类", duration: "00:00:22", completed: true },
    ],
    entities: {
      person: [
        { id: "person-zhangsan", name: "张三", type: "person" },
        { id: "person-lisi", name: "李四", type: "person" },
        { id: "person-wangwu", name: "王五", type: "person" },
      ],
      organization: [
        { id: "org-product", name: "产品部", type: "organization" },
        { id: "org-tech", name: "技术部", type: "organization" },
        { id: "org-ops", name: "运维部", type: "organization" },
      ],
      time: [
        { id: "time-20260415", name: "2026年4月15日", type: "time" },
        { id: "time-20260420", name: "2026年4月20日", type: "time" },
        { id: "time-3y", name: "3年", type: "time" },
      ],
      term: [
        { id: "term-ocr", name: "OCR", type: "term" },
        { id: "term-api", name: "API", type: "term" },
        { id: "term-pdf", name: "PDF", type: "term" },
        { id: "term-kg", name: "知识图谱", type: "term" },
      ],
      product: [{ id: "product-x", name: "产品X", type: "product" }],
      project: [{ id: "project-alpha", name: "项目X", type: "project" }],
    },
    content: [
      "本产品是面向企业级用户的知识管理平台，旨在帮助企业实现知识的数字化存储、智能解析、高效检索和共享协作，提升企业知识资产的利用率和员工工作效率。",
      "V2.1版本在原有功能基础上，重点优化了文件解析引擎的准确率，新增了知识图谱构建功能，增强了全文检索能力，并提供了更丰富的API接口支持二次开发。",
      "文档导入模块支持上传 Word、Excel、PPT、PDF、图片、音频、视频等格式，并自动完成文本提取、关键词提取、实体抽取和标签分类。",
    ],
    graph: baseGraph,
  },
];

export function getDocumentParseDetail(id: string) {
  return documentParseDetails.find((item) => item.id === id) || documentParseDetails[0];
}

export function buildGraphByEntity(entityName: string): KnowledgeGraphData {
  const matched = baseGraph.nodes.find((node) => node.name === entityName) || baseGraph.nodes[0];
  const relatedLinks = baseGraph.links.filter(
    (link) => link.source === matched.id || link.target === matched.id,
  );
  const relatedNodeIds = new Set<string>([matched.id]);
  relatedLinks.forEach((link) => {
    relatedNodeIds.add(link.source);
    relatedNodeIds.add(link.target);
  });

  return {
    nodes: baseGraph.nodes.filter((node) => relatedNodeIds.has(node.id)),
    links: relatedLinks,
  };
}
