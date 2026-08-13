"use client";

export interface MockEntityRecord {
  entity: string;
  desc: string;
  tag: string[];
  avp: Array<[string, string]>;
}

export interface SourceDocument {
  id: string;
  title: string;
  location: string;
  type: "docx" | "pdf";
}

export type EntityGraphNodeType = "center" | "entity" | "value";

export interface EntityGraphNode {
  id: string;
  name: string;
  type: EntityGraphNodeType;
  desc?: string;
  tag?: string[];
  avp?: Array<[string, string]>;
  expandable?: boolean;
  relationCount?: number;
  parentId?: string;
  relationFromParent?: string;
  depth?: number;
  dragParentId?: string;
  dragDepth?: number;
  branchId?: string;
  entityType?: string;
  nodeKind?: string;
  color?: string;
  sourceDocuments?: SourceDocument[];
}

export interface EntityGraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface EntityGraphData {
  centerId: string;
  nodes: EntityGraphNode[];
  links: EntityGraphLink[];
}

export interface EntityNodeDetail {
  entity: string;
  desc: string;
  tag: string[];
  avp: Array<[string, string]>;
  expandable: boolean;
  sourceDocuments: SourceDocument[];
}

const presetEntityMap: Record<string, MockEntityRecord> = {
  刘德华: {
    entity: "刘德华",
    desc: "刘德华，中国香港男演员、歌手、制片人。",
    tag: ["人物", "演员", "歌手"],
    avp: [
      ["职业", "演员"],
      ["职业", "歌手"],
      ["出生地", "中国香港"],
      ["代表作品", "无间道"],
      ["代表作品", "天若有情"],
      ["国籍", "中国"],
      ["合作演员", "梁朝伟"],
      ["活跃领域", "华语乐坛"],
    ],
  },
  演员: {
    entity: "演员",
    desc: "演员是影视、戏剧等表演艺术中的职业角色。",
    tag: ["职业", "艺术领域"],
    avp: [
      ["职业类别", "表演艺术"],
      ["相关人物", "刘德华"],
      ["相关人物", "周润发"],
      ["相关人物", "梁朝伟"],
      ["相关领域", "电影"],
      ["典型地区", "中国香港"],
    ],
  },
  歌手: {
    entity: "歌手",
    desc: "歌手是以演唱为主要职业的人物类型。",
    tag: ["职业", "音乐领域"],
    avp: [
      ["职业类别", "音乐表演"],
      ["相关人物", "刘德华"],
      ["相关人物", "张学友"],
      ["代表能力", "演唱"],
      ["活跃领域", "华语乐坛"],
      ["相关产业", "流行音乐"],
    ],
  },
  中国香港: {
    entity: "中国香港",
    desc: "中国香港通常指中华人民共和国香港特别行政区。",
    tag: ["地区", "城市"],
    avp: [
      ["所属国家", "中国"],
      ["别名", "香港"],
      ["代表人物", "刘德华"],
      ["代表人物", "周润发"],
      ["地区类型", "特别行政区"],
      ["代表产业", "香港电影"],
    ],
  },
  中国: {
    entity: "中国",
    desc: "中国是位于东亚的国家。",
    tag: ["国家", "地区"],
    avp: [
      ["包含地区", "中国香港"],
      ["著名人物", "刘德华"],
      ["著名人物", "张学友"],
      ["简称", "中国"],
      ["文化领域", "华语乐坛"],
      ["影视产业", "中国电影"],
    ],
  },
  无间道: {
    entity: "无间道",
    desc: "《无间道》是一部中国香港警匪题材电影。",
    tag: ["作品", "电影"],
    avp: [
      ["作品类型", "电影"],
      ["主演", "刘德华"],
      ["主演", "梁朝伟"],
      ["上映地区", "中国香港"],
      ["题材", "警匪"],
      ["所属产业", "香港电影"],
    ],
  },
  天若有情: {
    entity: "天若有情",
    desc: "《天若有情》是刘德华主演的经典电影作品之一。",
    tag: ["作品", "电影"],
    avp: [
      ["作品类型", "电影"],
      ["主演", "刘德华"],
      ["上映地区", "中国香港"],
      ["情感主题", "爱情"],
      ["关联领域", "中国电影"],
      ["同类作品", "英雄本色"],
    ],
  },
  梁朝伟: {
    entity: "梁朝伟",
    desc: "梁朝伟，中国香港男演员，以文艺片和警匪片表演著称。",
    tag: ["人物", "演员"],
    avp: [
      ["职业", "演员"],
      ["出生地", "中国香港"],
      ["代表作品", "无间道"],
      ["合作演员", "刘德华"],
      ["活跃领域", "香港电影"],
      ["相关类型", "文艺电影"],
    ],
  },
  周润发: {
    entity: "周润发",
    desc: "周润发，中国香港男演员。",
    tag: ["人物", "演员"],
    avp: [
      ["职业", "演员"],
      ["出生地", "中国香港"],
      ["代表作品", "英雄本色"],
      ["活跃领域", "香港电影"],
      ["相关题材", "警匪"],
      ["关联职业", "演员"],
    ],
  },
  张学友: {
    entity: "张学友",
    desc: "张学友，中国香港男歌手、演员。",
    tag: ["人物", "歌手", "演员"],
    avp: [
      ["职业", "歌手"],
      ["职业", "演员"],
      ["出生地", "中国香港"],
      ["活跃领域", "华语乐坛"],
      ["相关人物", "刘德华"],
      ["代表类型", "流行音乐"],
    ],
  },
  英雄本色: {
    entity: "英雄本色",
    desc: "《英雄本色》是中国香港经典警匪电影。",
    tag: ["作品", "电影"],
    avp: [
      ["作品类型", "电影"],
      ["主演", "周润发"],
      ["上映地区", "中国香港"],
      ["题材", "警匪"],
      ["所属产业", "香港电影"],
      ["同类作品", "无间道"],
    ],
  },
  电影: {
    entity: "电影",
    desc: "电影是一种综合视听艺术形式。",
    tag: ["艺术形式"],
    avp: [
      ["相关职业", "演员"],
      ["代表作品", "无间道"],
      ["代表作品", "天若有情"],
      ["常见题材", "警匪"],
      ["相关产业", "中国电影"],
      ["关联地区", "中国香港"],
    ],
  },
  香港: {
    entity: "香港",
    desc: "香港是中国的特别行政区之一。",
    tag: ["地区", "别名"],
    avp: [
      ["所属国家", "中国"],
      ["正式名称", "中国香港"],
      ["代表产业", "香港电影"],
      ["代表人物", "刘德华"],
    ],
  },
  华语乐坛: {
    entity: "华语乐坛",
    desc: "华语乐坛指以华语音乐创作为核心的音乐文化领域。",
    tag: ["领域", "音乐"],
    avp: [
      ["代表人物", "刘德华"],
      ["代表人物", "张学友"],
      ["相关职业", "歌手"],
      ["关联产业", "流行音乐"],
      ["主要地区", "中国香港"],
      ["上位概念", "华语文化"],
    ],
  },
  香港电影: {
    entity: "香港电影",
    desc: "香港电影是华语电影工业的重要组成部分。",
    tag: ["产业", "电影"],
    avp: [
      ["代表作品", "无间道"],
      ["代表作品", "英雄本色"],
      ["代表人物", "梁朝伟"],
      ["代表人物", "周润发"],
      ["所属地区", "中国香港"],
      ["关联题材", "警匪"],
    ],
  },
  中国电影: {
    entity: "中国电影",
    desc: "中国电影是中国影视文化产业中的重要组成部分。",
    tag: ["产业", "电影"],
    avp: [
      ["代表地区", "中国香港"],
      ["代表职业", "演员"],
      ["典型题材", "爱情"],
      ["相关作品", "天若有情"],
      ["上位概念", "电影"],
      ["关联人物", "刘德华"],
    ],
  },
  表演艺术: {
    entity: "表演艺术",
    desc: "表演艺术是以现场或镜头前表演为核心的艺术形式。",
    tag: ["领域", "艺术"],
    avp: [
      ["典型职业", "演员"],
      ["典型职业", "歌手"],
      ["相关作品", "无间道"],
      ["相关产业", "电影"],
      ["关联地区", "中国香港"],
      ["上位概念", "艺术文化"],
    ],
  },
  音乐表演: {
    entity: "音乐表演",
    desc: "音乐表演是以演唱或演奏为核心的艺术活动。",
    tag: ["领域", "音乐"],
    avp: [
      ["典型职业", "歌手"],
      ["相关人物", "张学友"],
      ["相关人物", "刘德华"],
      ["关联领域", "华语乐坛"],
      ["上位概念", "表演艺术"],
      ["关联风格", "流行音乐"],
    ],
  },
  流行音乐: {
    entity: "流行音乐",
    desc: "流行音乐是面向大众传播和消费的音乐类型。",
    tag: ["领域", "音乐"],
    avp: [
      ["代表职业", "歌手"],
      ["关联人物", "张学友"],
      ["关联人物", "刘德华"],
      ["主要市场", "华语乐坛"],
      ["上位概念", "音乐表演"],
      ["关联类型", "情歌"],
    ],
  },
  警匪: {
    entity: "警匪",
    desc: "警匪是华语电影中的常见题材类型。",
    tag: ["题材", "电影"],
    avp: [
      ["代表作品", "无间道"],
      ["代表作品", "英雄本色"],
      ["相关产业", "香港电影"],
      ["关联人物", "梁朝伟"],
      ["关联人物", "周润发"],
      ["上位概念", "电影题材"],
    ],
  },
  爱情: {
    entity: "爱情",
    desc: "爱情是电影和音乐作品中常见的主题之一。",
    tag: ["主题", "文艺"],
    avp: [
      ["代表作品", "天若有情"],
      ["相关题材", "文艺电影"],
      ["关联领域", "中国电影"],
      ["关联表达", "情歌"],
      ["相关人物", "刘德华"],
      ["上位概念", "情感主题"],
    ],
  },
  特别行政区: {
    entity: "特别行政区",
    desc: "特别行政区是中国行政区划中的一种特殊类型。",
    tag: ["地区类型"],
    avp: [
      ["代表地区", "中国香港"],
      ["所属国家", "中国"],
      ["上位概念", "行政区划"],
      ["关联产业", "香港电影"],
    ],
  },
};

const personPool = ["刘德华", "梁朝伟", "周润发", "张学友"];
const workPool = ["无间道", "天若有情", "英雄本色"];
const placePool = ["中国香港", "中国", "香港"];
const domainPool = [
  "电影",
  "华语乐坛",
  "香港电影",
  "中国电影",
  "表演艺术",
  "音乐表演",
  "流行音乐",
];
const topicPool = ["警匪", "爱情", "文艺电影", "情歌", "电影题材", "情感主题"];

export function hashText(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

function pickFromPool(pool: string[], seed: number, offset: number) {
  return pool[(seed + offset) % pool.length];
}

function inferTags(name: string) {
  if (name.includes("香港") || name.includes("中国")) return ["地区", "扩展实体"];
  if (name.includes("电影") || name.includes("无间道") || name.includes("本色")) {
    return ["作品", "电影"];
  }
  if (name.includes("人物")) return ["人物", "扩展实体"];
  if (name.includes("机构")) return ["机构", "扩展实体"];
  if (name.includes("地区")) return ["地区", "扩展实体"];
  if (name.includes("概念")) return ["概念", "扩展实体"];
  if (name.includes("事件")) return ["事件", "扩展实体"];
  if (name.includes("演员") || name.includes("歌手")) return ["职业", "扩展实体"];
  if (name.includes("乐坛") || name.includes("音乐")) return ["领域", "音乐"];
  if (name.includes("警匪") || name.includes("爱情")) return ["主题", "扩展实体"];
  return ["实体", "扩展节点"];
}

function buildGeneratedRecord(entityName: string): MockEntityRecord {
  const seed = hashText(entityName);
  const tags = inferTags(entityName);
  const domain = pickFromPool(domainPool, seed, 4);
  const topic = pickFromPool(topicPool, seed, 5);
  const place = pickFromPool(placePool, seed, 3);
  const personA = `${entityName}人物A`;
  const personB = `${entityName}人物B`;
  const workA = `${entityName}作品A`;
  const workB = `${entityName}作品B`;
  const orgA = `${entityName}机构A`;
  const orgB = `${entityName}机构B`;
  const conceptA = `${entityName}关联概念A`;
  const conceptB = `${entityName}延伸概念B`;
  const eventA = `${entityName}事件A`;

  return {
    entity: entityName,
    desc: `${entityName} 是当前 mock 知识图谱中的扩展实体，用于演示多层级关系展开效果。`,
    tag: tags,
    avp: [
      ["相关人物", personA],
      ["相关人物", personB],
      ["相关作品", workA],
      ["相关作品", workB],
      ["关联机构", orgA],
      ["关联机构", orgB],
      ["所属地区", place],
      ["关联领域", domain],
      ["相关主题", topic],
      ["延伸概念", conceptA],
      ["衍生节点", conceptB],
      ["关联事件", eventA],
    ],
  };
}

function getResolvedRecord(entityName: string) {
  return presetEntityMap[entityName] ?? buildGeneratedRecord(entityName);
}

function buildSourceDocuments(entityName: string): SourceDocument[] {
  const seed = hashText(entityName);
  return [
    {
      id: `doc-${seed}-1`,
      title: `${entityName}知识抽取结果.docx`,
      location: `提取于第${(seed % 18) + 3}页`,
      type: "docx",
    },
    {
      id: `doc-${seed}-2`,
      title: `${entityName}关系分析报告.pdf`,
      location: `提取于第${(seed % 26) + 8}页`,
      type: "pdf",
    },
  ];
}

export function hasPresetEntityRecord(entityName: string) {
  return Boolean(presetEntityMap[entityName]);
}

export function getMockEntityRecord(entityName: string) {
  return getResolvedRecord(entityName);
}

export function getSuggestedEntities() {
  return [
    "刘德华",
    "演员",
    "歌手",
    "中国香港",
    "无间道",
    "天若有情",
    "香港电影",
    "华语乐坛",
  ];
}

export function getNodeType(entityName: string, centerId: string): EntityGraphNodeType {
  if (entityName === centerId) return "center";
  return hasPresetEntityRecord(entityName) ? "entity" : "value";
}

interface GraphNodeBuildOptions {
  parentId?: string;
  relationFromParent?: string;
  depth?: number;
  branchId?: string;
  forceType?: EntityGraphNodeType;
}

export function toGraphNode(
  entityName: string,
  centerId: string,
  options: GraphNodeBuildOptions = {},
): EntityGraphNode {
  const record = getResolvedRecord(entityName);
  return {
    id: entityName,
    name: entityName,
    type: options.forceType ?? getNodeType(entityName, centerId),
    desc: record.desc,
    tag: record.tag,
    expandable: true,
    relationCount: record.avp.length,
    parentId: options.parentId,
    relationFromParent: options.relationFromParent,
    depth: options.depth ?? (entityName === centerId ? 0 : 1),
    branchId: options.branchId ?? entityName,
  };
}

export function createGraphFromEntity(entityName: string): EntityGraphData {
  const record = getResolvedRecord(entityName);
  const nodeMap = new Map<string, EntityGraphNode>();
  const linkMap = new Map<string, EntityGraphLink>();

  nodeMap.set(
    record.entity,
    toGraphNode(record.entity, record.entity, {
      depth: 0,
      branchId: record.entity,
      forceType: "center",
    }),
  );

  record.avp.forEach(([relation, value]) => {
    nodeMap.set(
      value,
      toGraphNode(value, record.entity, {
        parentId: record.entity,
        relationFromParent: relation,
        depth: 1,
        branchId: value,
      }),
    );
    linkMap.set(`${record.entity}__${relation}__${value}`, {
      source: record.entity,
      target: value,
      relation,
    });
  });

  return {
    centerId: record.entity,
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values()),
  };
}

function mergeGraphNode(
  existing: EntityGraphNode | undefined,
  incoming: EntityGraphNode,
  fallbackDepth: number,
): EntityGraphNode {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    desc: existing.desc || incoming.desc,
    tag: existing.tag?.length ? existing.tag : incoming.tag,
    expandable: true,
    relationCount: Math.max(existing.relationCount || 0, incoming.relationCount || 0),
    branchId: existing.branchId || incoming.branchId,
    parentId: existing.parentId || incoming.parentId,
    relationFromParent: existing.relationFromParent || incoming.relationFromParent,
    depth: Math.min(existing.depth ?? fallbackDepth, incoming.depth ?? fallbackDepth),
    type:
      existing.type === "center"
        ? "center"
        : existing.type === "entity" || incoming.type === "entity"
          ? "entity"
          : "value",
  };
}

export function createLargeGraphFromEntity(
  entityName: string,
  initialNodeCount = 5000,
): EntityGraphData {
  const baseGraph = createGraphFromEntity(entityName);
  if (initialNodeCount <= baseGraph.nodes.length) {
    return baseGraph;
  }

  const nodeMap = new Map<string, EntityGraphNode>(
    baseGraph.nodes.map((node) => [node.id, node]),
  );
  const linkMap = new Map<string, EntityGraphLink>(
    baseGraph.links.map((link) => [
      `${link.source}__${link.relation}__${link.target}`,
      link,
    ]),
  );
  const expandedNodeIds = new Set<string>([baseGraph.centerId]);
  const queue: EntityGraphNode[] = baseGraph.nodes
    .filter((node) => node.id !== baseGraph.centerId)
    .sort((a, b) => {
      const relationCompare = (a.relationFromParent || "").localeCompare(
        b.relationFromParent || "",
        "zh-CN",
      );
      if (relationCompare !== 0) return relationCompare;
      return a.name.localeCompare(b.name, "zh-CN");
    });

  while (queue.length > 0 && nodeMap.size < initialNodeCount) {
    const sourceNode = queue.shift()!;
    if (expandedNodeIds.has(sourceNode.id)) {
      continue;
    }

    expandedNodeIds.add(sourceNode.id);
    const record = getResolvedRecord(sourceNode.id);
    const nextDepth = (sourceNode.depth ?? 0) + 1;

    for (const [relation, value] of record.avp) {
      if (nodeMap.size >= initialNodeCount) {
        break;
      }

      const branchId =
        sourceNode.type === "center"
          ? value
          : sourceNode.branchId || sourceNode.parentId || sourceNode.id;
      const nextNode = toGraphNode(value, baseGraph.centerId, {
        parentId: sourceNode.id,
        relationFromParent: relation,
        depth: nextDepth,
        branchId,
      });

      if (!nodeMap.has(value)) {
        nodeMap.set(value, nextNode);
        queue.push(nextNode);
      } else {
        const existing = nodeMap.get(value);
        nodeMap.set(value, mergeGraphNode(existing, nextNode, nextDepth));
      }

      const key = `${sourceNode.id}__${relation}__${value}`;
      if (!linkMap.has(key)) {
        linkMap.set(key, {
          source: sourceNode.id,
          target: value,
          relation,
        });
      }
    }
  }

  return {
    centerId: baseGraph.centerId,
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values()),
  };
}

export function expandGraphWithEntity(
  currentGraph: EntityGraphData,
  entityName: string,
): {
  graph: EntityGraphData;
  expanded: boolean;
  record: MockEntityRecord | null;
} {
  const record = getResolvedRecord(entityName);
  const sourceNode = currentGraph.nodes.find((node) => node.id === entityName);
  if (!record || !sourceNode) {
    return {
      graph: currentGraph,
      expanded: false,
      record: null,
    };
  }

  const nextDepth = (sourceNode.depth ?? 0) + 1;
  const nodeMap = new Map<string, EntityGraphNode>(
    currentGraph.nodes.map((node) => [
      node.id,
      node.id === currentGraph.centerId
        ? { ...node, type: "center", expandable: true, depth: 0 }
        : { ...node, expandable: true },
    ]),
  );
  const linkMap = new Map<string, EntityGraphLink>(
    currentGraph.links.map((link) => [
      `${link.source}__${link.relation}__${link.target}`,
      link,
    ]),
  );

  record.avp.forEach(([relation, value]) => {
    const branchId =
      sourceNode.type === "center"
        ? value
        : sourceNode.branchId || sourceNode.parentId || sourceNode.id;

    const nextNode = toGraphNode(value, currentGraph.centerId, {
      parentId: sourceNode.id,
      relationFromParent: relation,
      depth: nextDepth,
      branchId,
    });

    if (!nodeMap.has(value)) {
      nodeMap.set(value, nextNode);
    } else {
      const existing = nodeMap.get(value);
      nodeMap.set(value, mergeGraphNode(existing, nextNode, nextDepth));
    }

    const key = `${record.entity}__${relation}__${value}`;
    if (!linkMap.has(key)) {
      linkMap.set(key, {
        source: record.entity,
        target: value,
        relation,
      });
    }
  });

  return {
    expanded: true,
    record,
    graph: {
      centerId: currentGraph.centerId,
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values()),
    },
  };
}

export function getNodeDetail(nodeName: string): EntityNodeDetail {
  const record = getResolvedRecord(nodeName);
  return {
    entity: record.entity,
    desc: record.desc,
    tag: record.tag,
    avp: record.avp,
    expandable: true,
    sourceDocuments: buildSourceDocuments(nodeName),
  };
}
