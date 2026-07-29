"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { history, useLocation } from "@umijs/max";
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Segmented,
  Select,
  Slider,
  Space,
  Spin,
  Tag,
  Tooltip,
  message,
} from "antd";
import {
  CloseOutlined,
  DownloadOutlined,
  EditOutlined,
  ExpandOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagsOutlined,
  UserOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  LinkOutlined,
  PlusOutlined,
  DeleteOutlined,
  ClusterOutlined,
  CloudUploadOutlined,
  UploadOutlined,
  SlidersOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import type { EntityRelationGraphRef } from "@/components/Graph/EntityRelationGraph";
import EntityRelationGraph, { getEntityTypePalette } from "@/components/Graph/EntityRelationGraph";
import {

  getNodeDetail,
  hasPresetEntityRecord,
  hashText,
  type EntityGraphData,
  type EntityGraphLink,
  type EntityGraphNode,
  type EntityGraphNodeType,
  type EntityNodeDetail,
  type SourceDocument,
} from "@/data/entityGraphMock";
import { getGraphEntities, expandGraphNode, createGraphNode, updateGraphNode, deleteGraphNode, renameGraphEntity, type GraphEntityResult, type GraphExpandResult, type SearchGraphNode, type SearchGraphLink } from "@/services/biz/graph";
import { getEntityTypePage, type EntityTypeItem } from "@/services/biz/entity-type";
import CommunityAnalysisView, { CommunityMiddleCanvas, CommunityRightSidebar } from "./CommunityAnalysisView";

const typeMeta: Record<EntityGraphNodeType, { label: string; color: string; countColor: string }> = {
  center: { label: "中心实体", color: "#2563eb", countColor: "#dbeafe" },
  entity: { label: "关联实体", color: "#7c3aed", countColor: "#ede9fe" },
  value: { label: "属性值", color: "#0f766e", countColor: "#ccfbf1" },
};

type WorkspaceMode = "auto-upload" | "manual-upload";

function getGraphWay(workspaceMode: WorkspaceMode) {
  return workspaceMode === "auto-upload" ? "auto_read" : "front_upload";
}

function getWorkspaceModeFromParams(source: string | null, accessMode: string | null): WorkspaceMode {
  if (accessMode === "manual-upload" || accessMode === "front_upload") {
    return "manual-upload";
  }
  if (source === "页面上传") {
    return "manual-upload";
  }
  return "auto-upload";
}

function getExpandNodeKind(node: EntityGraphNode) {
  return node.type === "value" ? "property" : "entity";
}

export interface GraphCommunity {
  id: string;
  name: string;
  seedNodeId: string;
  nodeIds: string[];
  relationCount: number;
  bridgeCount: number;
  density: string;
}

interface EntityOverride {
  desc?: string;
  tag?: string[];
  avp?: Array<[string, string]>;
}

export interface NodeExpandState {
  cursor?: number | string;
  nextCursor?: number | string;
  hasMore?: boolean;
  loading?: boolean;
  nodes: string[];
  links: string[];
}

interface EntityFormValues {
  nodeKind?: "entity" | "property";
  name?: string;
  type?: string;
  description?: string;
  desc?: string;
  tagsText?: string;
  relation?: string;
  attrKey?: string;
  attrValue?: string;
}

interface RelationFormValues {
  source: string;
  target: string;
  relation: string;
}

function getRelationKey(link: EntityGraphLink) {
  return `${link.source}__${link.relation}__${link.target}`;
}

function getNodeTypeLabel(type: EntityGraphNodeType) {
  return typeMeta[type].label;
}

function buildRelationConfidence(link: EntityGraphLink) {
  const score = 0.82 + (hashText(getRelationKey(link)) % 16) / 100;
  return score.toFixed(2);
}

function parseTagInput(value?: string) {
  return (value || "")
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractResultData<T>(response: any): T {
  return (response?.data?.data ?? response?.data ?? response ?? {}) as T;
}

function mapSourceDocuments(
  documents?: Array<{ documentId?: number | string; documentName?: string }>,
): SourceDocument[] {
  return (documents || [])
    .map((doc) => {
      const id = String(doc?.documentId ?? "").trim();
      const title = String(doc?.documentName ?? "").trim();
      if (!id || !title) {
        return null;
      }
      const lowerTitle = title.toLowerCase();
      const type: SourceDocument["type"] = lowerTitle.endsWith(".pdf") ? "pdf" : "docx";
      return {
        id,
        title,
        location: title,
        type,
      };
    })
    .filter(Boolean) as SourceDocument[];
}

function checkApiResponse(res: any, defaultErrorMsg = "操作失败") {
  if (res === false) {
    throw new Error(defaultErrorMsg);
  }
  if (res && typeof res === "object") {
    const code = res.code ?? res.status;
    const success = res.success;
    if ((code !== undefined && Number(code) !== 200 && Number(code) !== 0) || success === false) {
      throw new Error(res.msg || res.message || defaultErrorMsg);
    }
  }
}

function createEmptyGraph(centerId = ""): EntityGraphData {
  return {
    centerId,
    nodes: [],
    links: [],
  };
}

function buildCommunities(graph: EntityGraphData): GraphCommunity[] {
  const topLevelNodes = graph.nodes.filter((node) => node.parentId === graph.centerId);
  const communityMap = new Map<string, Set<string>>();

  topLevelNodes.forEach((node) => {
    communityMap.set(node.id, new Set([graph.centerId, node.id]));
  });

  graph.nodes.forEach((node) => {
    if (node.id === graph.centerId) {
      return;
    }
    const communityId = node.branchId || node.parentId || node.id;
    const targetId = communityMap.has(communityId)
      ? communityId
      : topLevelNodes[0]?.id || graph.centerId;

    if (!communityMap.has(targetId)) {
      communityMap.set(targetId, new Set([graph.centerId]));
    }

    communityMap.get(targetId)!.add(node.id);
  });

  return Array.from(communityMap.entries())
    .map(([communityId, nodeIds]) => {
      const ids = Array.from(nodeIds);
      const idSet = new Set(ids);
      const seedNode =
        graph.nodes.find((node) => node.id === communityId) ||
        graph.nodes.find((node) => node.id !== graph.centerId) ||
        graph.nodes[0];
      const relationCount = graph.links.filter(
        (link) => idSet.has(link.source) && idSet.has(link.target),
      ).length;
      const bridgeCount = graph.links.filter(
        (link) =>
          (idSet.has(link.source) && !idSet.has(link.target)) ||
          (!idSet.has(link.source) && idSet.has(link.target)),
      ).length;
      const denominator = Math.max(ids.length - 1, 1);

      return {
        id: communityId,
        name: seedNode?.name || communityId,
        seedNodeId: seedNode?.id || communityId,
        nodeIds: ids,
        relationCount,
        bridgeCount,
        density: (relationCount / denominator).toFixed(1),
      };
    })
    .sort((a, b) => b.nodeIds.length - a.nodeIds.length)
    .slice(0, 8);
}

export default function GraphPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const graphRef = useRef<EntityRelationGraphRef>(null);
  const graphCanvasRef = useRef<HTMLElement | null>(null);

  const incomingEntity = searchParams.get("entity");
  const incomingEntityId = searchParams.get("entityId");
  const incomingEntityType = searchParams.get("type") || searchParams.get("entityType");
  const incomingSource = searchParams.get("source");
  const incomingAccessMode = searchParams.get("accessMode");
  const initialEntity = incomingEntity || "";
  const initialWorkspaceMode = getWorkspaceModeFromParams(incomingSource, incomingAccessMode);

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialWorkspaceMode);
  const [graphViewMode, setGraphViewMode] = useState<"raw" | "community">("raw");
  const [keyword, setKeyword] = useState(initialEntity);
  const [graphLoading, setGraphLoading] = useState(false);
  const [entityTypeLoading, setEntityTypeLoading] = useState(false);
  const [graphData, setGraphData] = useState<EntityGraphData>(() => createEmptyGraph(initialEntity));
  const [previewCursor, setPreviewCursor] = useState<string | number | undefined>(undefined);
  const [entityListHasMore, setEntityListHasMore] = useState<boolean>(true);
  const [entityListLoading, setEntityListLoading] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [nodeExpandMap, setNodeExpandMap] = useState<Record<string, NodeExpandState>>({});
  const [entityTypes, setEntityTypes] = useState<EntityTypeItem[]>([]);
  const [activeEntityTypeName, setActiveEntityTypeName] = useState<string | null>(
    incomingEntityType || null,
  );
  const [entityNameKeyword, setEntityNameKeyword] = useState(initialEntity);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [nodeScale, setNodeScale] = useState(1);
  const [linkWidth, setLinkWidth] = useState(1.4);
  const [labelMaxLength, setLabelMaxLength] = useState(12);
  const [showNodes, setShowNodes] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [entityOverrides, setEntityOverrides] = useState<Record<string, EntityOverride>>({});
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [entityModalMode, setEntityModalMode] = useState<"add" | "edit">("edit");
  const [entitySubmitting, setEntitySubmitting] = useState(false);
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [editingRelationKey, setEditingRelationKey] = useState<string | null>(null);
  const entitySubmittingRef = useRef(false);
  const [entityForm] = Form.useForm<EntityFormValues>();
  const [relationForm] = Form.useForm<RelationFormValues>();

  useEffect(() => {
    if (initialEntity) {
      void handleSearch(
        initialEntity,
        initialWorkspaceMode,
        incomingEntityType || undefined,
        incomingEntityId || undefined,
      );
    }
  }, [initialEntity, initialWorkspaceMode, incomingEntityType, incomingEntityId]);

  useEffect(() => {
    void loadEntityTypes();
  }, []);

  const entityNameOptions = useMemo(() => {
    const keywordValue = entityNameKeyword.trim().toLowerCase();
    return graphData.nodes.filter((node) => {
      if (node.type === "value") {
        return false;
      }
      if (!keywordValue) {
        return true;
      }
      return node.name.toLowerCase().includes(keywordValue);
    });
  }, [entityNameKeyword, graphData.nodes]);

  const communities = useMemo(() => buildCommunities(graphData), [graphData]);
  const activeCommunity = useMemo(
    () => communities.find((community) => community.id === activeCommunityId) || null,
    [activeCommunityId, communities],
  );

  const filteredGraphData = useMemo(() => {
    const hasNameFilter = Boolean(entityNameKeyword.trim());
    const focusIds = new Set(entityNameOptions.map((node) => node.id));

    const nodes = graphData.nodes.filter((node) => {
      if (!hasNameFilter) {
        return true;
      }
      if (focusIds.has(node.id) || node.id === graphData.centerId || node.type === "center") {
        return true;
      }
      return graphData.links.some(
        (l) =>
          (l.source === node.id && focusIds.has(l.target)) ||
          (l.target === node.id && focusIds.has(l.source)),
      );
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    return {
      centerId: graphData.centerId,
      nodes,
      links: graphData.links.filter(
        (link) => nodeIds.has(link.source) && nodeIds.has(link.target),
      ),
    };
  }, [entityNameKeyword, entityNameOptions, graphData]);

  const communityGraphData = useMemo(() => {
    if (communities.length === 0) {
      return filteredGraphData;
    }
    const centerNode = graphData.nodes.find((n) => n.id === graphData.centerId || n.type === "center");
    const nextNodes: EntityGraphNode[] = [];
    if (centerNode) {
      nextNodes.push({
        ...centerNode,
        type: "center",
      });
    }
    const communityMap = new Map<string, GraphCommunity>();
    const nodeToCommunityMap = new Map<string, string>();

    communities.forEach((community) => {
      communityMap.set(community.id, community);
      community.nodeIds.forEach((nid) => {
        if (nid !== graphData.centerId) {
          nodeToCommunityMap.set(nid, community.id);
        }
      });

      nextNodes.push({
        id: `comm_${community.id}`,
        name: `${community.name} 社区`,
        type: "entity",
        entityType: "社区",
        desc: `该社区共包含 ${community.nodeIds.length} 个实体，${community.relationCount} 条内部关联，${community.bridgeCount} 个桥接点，密度 ${community.density}。`,
        tag: ["社区聚类", `${community.nodeIds.length}节点`],
        expandable: false,
        relationCount: community.relationCount,
        branchId: community.id,
      });
    });

    const addedCoreNodeIds = new Set<string>();
    const nextLinks: EntityGraphLink[] = [];

    communities.forEach((community) => {
      if (graphData.centerId) {
        nextLinks.push({
          source: graphData.centerId,
          target: `comm_${community.id}`,
          relation: `社区归属 (${community.nodeIds.length})`,
        });
      }

      const candidateIds = community.nodeIds.filter(
        (nid) => nid !== graphData.centerId && nid !== community.id,
      );
      const coreIds = candidateIds.slice(0, 2);
      coreIds.forEach((coreId) => {
        const origNode = graphData.nodes.find((n) => n.id === coreId);
        if (origNode && !addedCoreNodeIds.has(origNode.id)) {
          addedCoreNodeIds.add(origNode.id);
          nextNodes.push({
            ...origNode,
            type: "entity",
            entityType: origNode.entityType || "核心实体",
            desc: origNode.desc || `社区 ${community.name} 核心成员`,
            tag: ["核心成员", ...(origNode.tag || [])],
            branchId: community.id,
          });
          nextLinks.push({
            source: `comm_${community.id}`,
            target: origNode.id,
            relation: "核心成员",
          });
        }
      });
    });

    const bridgeCounts = new Map<string, number>();
    graphData.links.forEach((link) => {
      const sourceComm = nodeToCommunityMap.get(link.source);
      const targetComm = nodeToCommunityMap.get(link.target);
      if (sourceComm && targetComm && sourceComm !== targetComm) {
        const pairKey =
          sourceComm < targetComm
            ? `${sourceComm}__${targetComm}`
            : `${targetComm}__${sourceComm}`;
        bridgeCounts.set(pairKey, (bridgeCounts.get(pairKey) || 0) + 1);
      }
    });

    bridgeCounts.forEach((count, pairKey) => {
      const [c1, c2] = pairKey.split("__");
      nextLinks.push({
        source: `comm_${c1}`,
        target: `comm_${c2}`,
        relation: `社区间桥接 (${count})`,
      });
    });

    return {
      centerId: graphData.centerId,
      nodes: nextNodes,
      links: nextLinks,
    };
  }, [communities, filteredGraphData, graphData]);

  const currentDisplayGraphData = useMemo(
    () => (graphViewMode === "community" ? communityGraphData : filteredGraphData),
    [communityGraphData, filteredGraphData, graphViewMode],
  );

  const selectedNode = useMemo(
    () => {
      const allNodes = graphViewMode === "community" ? communityGraphData.nodes : graphData.nodes;
      return allNodes.find((node) => node.id === selectedNodeId) ?? graphData.nodes.find((node) => node.id === selectedNodeId) ?? null;
    },
    [communityGraphData.nodes, graphData.nodes, graphViewMode, selectedNodeId],
  );

  const selectedDetail = useMemo(() => {
    const nodeName = selectedNode?.name || graphData.centerId;
    const baseDetail = getNodeDetail(nodeName);
    const override = selectedNode
      ? entityOverrides[selectedNode.id] || entityOverrides[selectedNode.name]
      : entityOverrides[nodeName];
    return {
      ...baseDetail,
      desc: override?.desc ?? selectedNode?.desc ?? baseDetail.desc,
      tag: override?.tag ?? selectedNode?.tag ?? baseDetail.tag,
      avp: override?.avp ?? [],
      sourceDocuments: selectedNode?.sourceDocuments ?? [],
    } as EntityNodeDetail;
  }, [entityOverrides, graphData.centerId, selectedNode]);

  const selectedRelations = useMemo(() => {
    if (!selectedNode) {
      return [];
    }
    const allLinks = graphViewMode === "community" ? communityGraphData.links : graphData.links;
    return allLinks.filter(
      (link) => link.source === selectedNode.id || link.target === selectedNode.id,
    );
  }, [communityGraphData.links, graphData.links, graphViewMode, selectedNode]);

  const selectedPropertyList = useMemo(() => {
    if (!selectedNode) {
      return [];
    }
    const override = entityOverrides[selectedNode.id] || entityOverrides[selectedNode.name];
    const overrideAvp = override?.avp || [];

    const graphAvp =
      selectedNode.type === "value"
        ? [[selectedNode.relationFromParent || selectedNode.desc || "属性", selectedNode.name] as [string, string]]
        : graphData.nodes
            .filter((node) => node.type === "value" && node.parentId === selectedNode.id)
            .map((node) => [node.relationFromParent || node.desc || "属性", node.name] as [string, string]);

    return [...overrideAvp, ...graphAvp].filter(
      ([label, value], index, array) =>
        array.findIndex((item) => item[0] === label && item[1] === value) === index,
    );
  }, [entityOverrides, graphData.nodes, selectedNode]);

  const canShowRelationLoadActions = useMemo(() => {
    if (!selectedNode?.expandable) {
      return false;
    }
    if (selectedRelations.length === 0) {
      return false;
    }
    return nodeExpandMap[selectedNode.id]?.hasMore !== false;
  }, [nodeExpandMap, selectedNode, selectedRelations.length]);

  const graphSummary = useMemo(
    () => ({
      nodeCount: graphData.nodes.length,
      relationCount: graphData.links.length,
      expandedCount: expandedNodeIds.size,
      visibleCount: currentDisplayGraphData.nodes.length,
    }),
    [
      currentDisplayGraphData.nodes.length,
      expandedNodeIds.size,
      graphData.links.length,
      graphData.nodes.length,
    ],
  );

  async function loadEntityTypes() {
    try {
      setEntityTypeLoading(true);
      const response = await getEntityTypePage({
        pageNo: 1,
        pageSize: 100,
      });
      const result = extractResultData<{ list?: EntityTypeItem[]; records?: EntityTypeItem[] }>(response);
      const list = result?.list || result?.records || [];
      setEntityTypes(list);
      
      if (!initialEntity) {
        if (list.length > 0 && !activeEntityTypeName) {
          const defaultName = list[0].name;
          setActiveEntityTypeName(defaultName);
          void handleLoadGraphEntities(defaultName);
        } else {
          void handleLoadGraphEntities(activeEntityTypeName || undefined);
        }
      }
    } catch (error) {
      console.error(error);
      setEntityTypes([]);
      message.error("实体类型加载失败");
      if (!initialEntity) void handleLoadGraphEntities();
    } finally {
      setEntityTypeLoading(false);
    }
  }

  async function handleSearch(
    entityName = keyword,
    mode = workspaceMode,
    overrideType?: string,
    preferredEntityId?: string,
  ) {
    const target = entityName.trim();
    if (!target) {
      message.warning("请输入实体名称后再检索");
      return;
    }

    try {
      setGraphLoading(true);
      const targetType = overrideType !== undefined ? overrideType : activeEntityTypeName || undefined;
      const response = await getGraphEntities({
        way: getGraphWay(mode),
        nodeKind: "entity",
        entityType: targetType || undefined,
        name: target,
        pageSize: 20,
      });
      const result = extractResultData<GraphEntityResult>(response);
      const nodes: EntityGraphNode[] = (result?.list || []).map((item) => ({
        id: String(item.nodeId || item.graphNodeId || item.name || "").trim(),
        name: item.name,
        type: item.nodeKind === "entity" ? "entity" : "value",
        nodeKind: item.nodeKind,
        entityType: item.type || undefined,
        desc: item.value || "",
        tag: item.type ? [item.type] : [],
        expandable: item.nodeKind === "entity",
        relationCount: 0,
      }));
      const preferredNode =
        nodes.find((node) => String(node.id) === String(preferredEntityId || "")) ||
        nodes.find((node) => node.name === target) ||
        nodes[0];
      const nextGraph: EntityGraphData = {
        centerId: preferredNode?.id || nodes[0]?.id || "",
        nodes,
        links: [],
      };

      setKeyword(target);
      setGraphData(nextGraph);
      setSelectedNodeId(preferredNode?.id || nextGraph.nodes[0]?.id || "");
      setExpandedNodeIds(new Set());
      setNodeExpandMap({});
      setPreviewCursor(result?.nextCursor);
      setEntityListHasMore(result?.hasMore !== false);
      setActiveEntityTypeName(targetType || null);
      setEntityNameKeyword(target);
      setActiveCommunityId(null);
      setLinkWidth(1.4);
      window.setTimeout(() => graphRef.current?.resetZoom(), 40);
      if (preferredNode?.expandable) {
        window.setTimeout(() => handleNodeExpand(preferredNode), 80);
      }

      if (nodes.length === 0) {
        message.info("未检索到相关图谱实体");
      }
    } catch (error) {
      console.error(error);
      setKeyword(target);
      setGraphData(createEmptyGraph(target));
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
      setActiveEntityTypeName(overrideType !== undefined ? overrideType : activeEntityTypeName);
      setEntityNameKeyword(target);
      setActiveCommunityId(null);
      message.error("图谱检索失败");
    } finally {
      setGraphLoading(false);
    }
  }

  async function handleLoadGraphEntities(
    overrideType?: string,
    resetCursor = false,
    mode: "replace" | "append" = "replace",
    workspaceOverride?: WorkspaceMode,
  ) {
    if (entityListLoading) return;
    if (!resetCursor && entityListHasMore === false) {
      message.info("暂无更多实体数据");
      return;
    }

    try {
      setEntityListLoading(true);
      if (resetCursor) {
        setGraphLoading(true);
      }
      const targetType = overrideType !== undefined ? overrideType : activeEntityTypeName;
      const cursorToUse = resetCursor ? undefined : previewCursor;
      const response = await getGraphEntities({
        way: getGraphWay(workspaceOverride ?? workspaceMode),
        nodeKind: "entity",
        entityType: targetType || undefined,
        name: entityNameKeyword.trim() || undefined,
        cursor: cursorToUse,
        pageSize: 20,
      });
      const result = extractResultData<GraphEntityResult>(response);
      
      const nodes: EntityGraphNode[] = (result?.list || []).map((item) => ({
        id: String(item.nodeId || item.graphNodeId || item.name || "").trim(),
        name: item.name,
        type: item.nodeKind === "entity" ? "entity" : "value",
        nodeKind: item.nodeKind,
        entityType: item.type || undefined,
        desc: item.value || "",
        tag: item.type ? [item.type] : [],
        expandable: item.nodeKind === "entity",
        relationCount: 0,
      }));

      setPreviewCursor(result?.nextCursor);
      setEntityListHasMore(result?.hasMore !== false);

      if (mode === "append" && !resetCursor) {
        setGraphData((prev) => {
          const existingIds = new Set(prev.nodes.map((n) => n.id));
          const newUniqueNodes = nodes.filter((n) => !existingIds.has(n.id));
          return {
            ...prev,
            nodes: [...prev.nodes, ...newUniqueNodes],
          };
        });
      } else {
        const nextGraph: EntityGraphData = {
          centerId: nodes[0]?.id || "",
          nodes,
          links: [],
        };

        setKeyword("");
        setGraphData(nextGraph);
        setSelectedNodeId(nextGraph.centerId || nextGraph.nodes[0]?.id || "");
        setExpandedNodeIds(new Set());
        setNodeExpandMap({});
        setActiveCommunityId(null);
        setLinkWidth(1.4);
        window.setTimeout(() => graphRef.current?.resetZoom(), 40);
      }

      if (nodes.length === 0) {
        message.info("当前暂无可展示的图谱数据");
      }
    } catch (error) {
      console.error(error);
      setGraphData(createEmptyGraph(""));
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
      setActiveCommunityId(null);
      setEntityListHasMore(false);
      message.error("图谱加载失败");
    } finally {
      setEntityListLoading(false);
      setGraphLoading(false);
    }
  }

  function switchWorkspaceMode(mode: WorkspaceMode) {
    setWorkspaceMode(mode);
    void handleLoadGraphEntities(activeEntityTypeName || undefined, true, "replace", mode);
    if (keyword.trim()) {
      void handleSearch(
        keyword,
        mode,
        activeEntityTypeName || undefined,
        selectedNodeId || incomingEntityId || undefined,
      );
    }
  }

  async function handleNodeExpand(node: EntityGraphNode, mode: "append" | "replace" = "append") {
    setSelectedNodeId(node.id);
    if (!node.expandable) {
      return;
    }

    const currentNodeState = nodeExpandMap[node.id] || {
      hasMore: true,
      loading: false,
      nodes: [],
      links: [],
    };

    if (currentNodeState.loading) {
      return;
    }

    if (currentNodeState.hasMore === false) {
      message.info("该节点暂无更多可展开关系");
      return;
    }

    try {
      setNodeExpandMap((prev) => ({
        ...prev,
        [node.id]: {
          ...(prev[node.id] || currentNodeState),
          loading: true,
        },
      }));

      const requestCursor = currentNodeState.nextCursor;
      const response = await expandGraphNode({
        way: getGraphWay(workspaceMode),
        nodeId: String(node.id),
        nodeKind: getExpandNodeKind(node),
        direction: "both",
        includeProperty: true,
        limit: 20,
        cursor: requestCursor,
      });
      checkApiResponse(response, "展开节点失败");

      const result = extractResultData<GraphExpandResult>(response);

      const rawNodes = Array.isArray(result?.nodes) ? result.nodes : [];
      const rawLinks = Array.isArray(result?.links) ? result.links : [];

      const validNodes = rawNodes
        .map((n) => {
          if (!n) return null;
          const nid = String(n.id ?? (n as any).nodeId ?? (n as any).graphNodeId ?? n.name ?? "").trim();
          if (!nid) return null;
          const nodeKind = String((n as any).nodeKind ?? "").trim();
          const nodeType =
            nodeKind === "property"
              ? "value"
              : n.type === "value" || n.type === "center" || n.type === "entity"
                ? n.type
                : "entity";
          return {
            ...n,
            id: nid,
            name: String(n.name ?? nid).trim(),
            type: nodeType,
            nodeKind: nodeKind || (nodeType === "value" ? "property" : "entity"),
            expandable: nodeType !== "value" && Boolean((n as any).expandable ?? true),
            sourceDocuments: mapSourceDocuments(n.sourceDocuments),
          };
        })
        .filter(Boolean) as SearchGraphNode[];

      const validLinks = rawLinks
        .map((l) => {
          if (!l) return null;
          const source = String(l.source ?? "").trim();
          const target = String(l.target ?? "").trim();
          const relation = String(l.relation ?? "关联").trim();
          if (!source || !target) return null;
          return {
            ...l,
            source,
            target,
            relation,
          };
        })
        .filter(Boolean) as SearchGraphLink[];

      if (!validNodes.length && !validLinks.length) {
        message.info(mode === "replace" ? "暂无其他可展示的新关联关系" : "该节点暂无更多可展开关系");
        setNodeExpandMap((prev) => ({
          ...prev,
          [node.id]: {
            ...(prev[node.id] || currentNodeState),
            hasMore: false,
            loading: false,
          },
        }));
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          next.add(node.id);
          return next;
        });
        return;
      }

      const newNodesIds = validNodes.map((n) => n.id);
      const newLinksKeys = validLinks.map((l) => `${l.source}-${l.target}-${l.relation}`);

      setGraphData((prev) => {
        const nextNodesMap = new Map(prev.nodes.map((n) => [n.id, n]));
        const nextLinksMap = new Map(prev.links.map((l) => [`${l.source}-${l.target}-${l.relation}`, l]));
        
        if (mode === "replace") {
          const historyLinks = new Set(currentNodeState.links || []);
          historyLinks.forEach((k) => nextLinksMap.delete(k));
          (currentNodeState.nodes || []).forEach((nid) => {
            const stillReferenced = Array.from(nextLinksMap.values()).some(
              (l) => l?.source === nid || l?.target === nid,
            );
            if (!stillReferenced && nid !== prev.centerId && nid !== node.id) {
              nextNodesMap.delete(nid);
            }
          });
        }

        validNodes.forEach((n) => {
          const existingNode = nextNodesMap.get(n.id);
          nextNodesMap.set(n.id, {
            ...(existingNode || {}),
            ...(n as any),
            sourceDocuments: n.sourceDocuments ?? existingNode?.sourceDocuments ?? [],
          });
        });
        
        validLinks.forEach((l) => {
          nextLinksMap.set(`${l.source}-${l.target}-${l.relation}`, l);
        });

        return {
          ...prev,
          centerId: node.id,
          nodes: Array.from(nextNodesMap.values()),
          links: Array.from(nextLinksMap.values()),
        };
      });

      setNodeExpandMap((prev) => {
        const prevNodeState = prev[node.id] || { nodes: [], links: [] };
        const mergedNodes =
          mode === "append"
            ? Array.from(new Set([...(prevNodeState.nodes || []), ...newNodesIds]))
            : newNodesIds;
        const mergedLinks =
          mode === "append"
            ? Array.from(new Set([...(prevNodeState.links || []), ...newLinksKeys]))
            : newLinksKeys;

        return {
          ...prev,
          [node.id]: {
            cursor: requestCursor,
            nextCursor: result.nextCursor,
            hasMore: result.hasMore !== false,
            loading: false,
            nodes: mergedNodes,
            links: mergedLinks,
          },
        };
      });

      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
      });
    } catch (error) {
      console.error(error);
      message.error("节点拓展失败");
      setNodeExpandMap((prev) => {
        if (!prev[node.id]) return prev;
        return {
          ...prev,
          [node.id]: {
            ...prev[node.id],
            loading: false,
          },
        };
      });
    }
  }

  function handleNodeClick(node: EntityGraphNode) {
    setSelectedNodeId(node.id);
    if (node.type !== "value" && node.expandable && !expandedNodeIds.has(node.id)) {
      handleNodeExpand(node);
    }
  }

  function handleEntityTypeChange(typeName: string | null) {
    if (activeEntityTypeName === typeName) return;
    setActiveEntityTypeName(typeName);
    setEntityNameKeyword("");
    if (typeName) {
      void handleLoadGraphEntities(typeName, true);
    } else {
      void handleLoadGraphEntities(undefined, true);
    }
  }

  function handleEntityNameSelect(node: EntityGraphNode) {
    setSelectedNodeId(node.id);
    if (node.type !== "value" && node.expandable && !expandedNodeIds.has(node.id)) {
      handleNodeExpand(node);
    }
    window.setTimeout(() => graphRef.current?.resetZoom(), 40);
  }

  function handleFocusCommunity(community: GraphCommunity) {
    setActiveCommunityId(community.id);
    if (graphViewMode === "community") {
      setSelectedNodeId(`comm_${community.id}`);
    } else {
      setSelectedNodeId(community.seedNodeId);
    }
    window.setTimeout(() => graphRef.current?.resetZoom(), 40);
  }

  function handleClearCommunity() {
    setActiveCommunityId(null);
    if (graphViewMode === "community") {
      setSelectedNodeId(graphData.centerId);
    }
    window.setTimeout(() => graphRef.current?.resetZoom(), 40);
  }

  function handleOpenDocument(doc: SourceDocument) {
    const query = new URLSearchParams({
      title: doc.title,
      type: doc.type,
      location: doc.location,
      fromEntity: selectedNode?.name || graphData.centerId,
    });
    history.push(`/data/document/${encodeURIComponent(doc.id)}?${query.toString()}`);
  }

  function openAddEntityModal() {
    entityForm.setFieldsValue({
      nodeKind: "entity",
      name: "",
      type: activeEntityTypeName || (entityTypes[0]?.name) || "药品",
      description: "",
      desc: "",
      tagsText: "",
      relation: "关联",
      attrKey: "",
      attrValue: "",
    });
    setEntityModalMode("add");
    setEntityModalOpen(true);
  }

  function openEditEntityModal() {
    if (!selectedNode) {
      return;
    }
    const isValueNode = selectedNode.type === "value";
    entityForm.setFieldsValue({
      nodeKind: isValueNode ? "property" : "entity",
      name: selectedNode.name,
      type: selectedNode.entityType || selectedNode.tag?.[0] || activeEntityTypeName || "药品",
      description: selectedDetail.desc || selectedNode.desc || "",
      desc: selectedDetail.desc || selectedNode.desc || "",
      tagsText: selectedDetail.tag.join(", "),
      relation: selectedNode.relationFromParent || "关联",
      attrKey: selectedNode.relationFromParent || "",
      attrValue: selectedNode.name || selectedNode.desc || "",
    });
    setEntityModalMode("edit");
    setEntityModalOpen(true);
  }

  async function handleSubmitEntity() {
    if (entitySubmittingRef.current) {
      return;
    }

    entitySubmittingRef.current = true;
    setEntitySubmitting(true);

    try {
      const values = await entityForm.validateFields();
      const currentWay = getGraphWay(workspaceMode);
      const isProperty = values.nodeKind === "property";

      if (entityModalMode === "add") {
        if (isProperty) {
          if (!selectedNode || selectedNode.type === "value") {
            message.warning("新建属性时，必须先选定一个已存在的目标实体");
            return;
          }
          const parentNode = selectedNode;
          const nextAttrKey = (values.attrKey || "").trim();
          const nextAttrValue = (values.attrValue || "").trim();
          if (!nextAttrKey || !nextAttrValue) {
            return;
          }
          const targetNodeId = String(parentNode.id);
          const res = await createGraphNode({
            way: currentWay,
            nodeKind: "property",
            entityId: targetNodeId,
            attrKey: nextAttrKey,
            attrValue: nextAttrValue,
          });
          checkApiResponse(res, "新建属性失败");

          const valNodeId = `${parentNode.id}_prop_${Date.now()}`;
          const valueNode: EntityGraphNode = {
            id: valNodeId,
            name: nextAttrValue,
            type: "value",
            desc: `${nextAttrKey}: ${nextAttrValue}`,
            tag: [nextAttrKey],
            expandable: false,
            relationCount: 1,
            parentId: parentNode.id,
            relationFromParent: nextAttrKey,
            depth: (parentNode.depth ?? 0) + 1,
          };
          setGraphData((prev) => ({
            ...prev,
            nodes: [...prev.nodes, valueNode],
            links: [
              ...prev.links,
              {
                source: parentNode.id,
                target: valNodeId,
                relation: nextAttrKey,
              },
            ],
          }));
          setEntityOverrides((prev) => {
            const old = prev[parentNode.id] || {};
            const oldAvp = old.avp || selectedDetail.avp || [];
            return {
              ...prev,
              [parentNode.id]: {
                ...old,
                avp: [...oldAvp, [nextAttrKey, nextAttrValue]],
              },
            };
          });
          message.success("属性已成功新建并在图谱和属性列表中显示");
          setEntityModalOpen(false);
          return;
        }

        const nextName = (values.name || "").trim();
        if (!nextName) {
          return;
        }
        const nextType = (values.type || "").trim() || "其他";
        const nextDescription = (values.description || values.desc || "").trim();

        const res = await createGraphNode({
          way: currentWay,
          nodeKind: "entity",
          name: nextName,
          type: nextType,
          description: nextDescription,
        });
        checkApiResponse(res, "新建实体失败");

        const createdId = String((res as any)?.nodeId || (res as any)?.id || nextName);
        const nextNode: EntityGraphNode = {
          id: createdId,
          name: nextName,
          type: "entity",
          entityType: nextType,
          desc: nextDescription || "",
          tag: [nextType],
          expandable: true,
          relationCount: 0,
          depth: 1,
          branchId: createdId,
        };

        setGraphData((prev) => ({
          ...prev,
          nodes: [...prev.nodes.filter((n) => n.id !== createdId), nextNode],
          links: prev.links,
        }));
        setEntityOverrides((prev) => ({
          ...prev,
          [createdId]: {
            desc: nextDescription || "",
            tag: [nextType],
            avp: [],
          },
          [nextName]: {
            desc: nextDescription || "",
            tag: [nextType],
            avp: [],
          },
        }));
        setSelectedNodeId(createdId);
        message.success("实体已成功新建并在画布中显示");
        setEntityModalOpen(false);
        return;
      }

      if (!selectedNode) {
        return;
      }

      const targetNodeId = String(selectedNode.id);
      if (isProperty) {
        const nextAttrKey = (values.attrKey || "").trim();
        const nextAttrValue = (values.attrValue || "").trim();
        if (!nextAttrKey || !nextAttrValue) {
          return;
        }
        const res = await updateGraphNode({
          way: currentWay,
          nodeId: targetNodeId,
          nodeKind: "property",
          attrKey: nextAttrKey,
          attrValue: nextAttrValue,
        });
        checkApiResponse(res, "更新属性失败");
        setGraphData((prev) => ({
          ...prev,
          nodes: prev.nodes.map((node) => {
            if (node.id === selectedNode.id) {
              return {
                ...node,
                name: nextAttrValue,
                desc: `${nextAttrKey}: ${nextAttrValue}`,
                relationFromParent: nextAttrKey,
              };
            }
            return node;
          }),
          links: prev.links.map((link) => {
            if (link.target === selectedNode.id) {
              return { ...link, relation: nextAttrKey };
            }
            return link;
          }),
        }));
        message.success("属性已更新");
        setEntityModalOpen(false);
        return;
      }

      const nextName = (values.name || "").trim();
      if (!nextName) {
        return;
      }
      const nextType = (values.type || "").trim() || "其他";
      const nextDescription = (values.description || values.desc || "").trim();

      const res = await renameGraphEntity({
        way: currentWay,
        nodeId: targetNodeId,
        newName: nextName,
      });
      checkApiResponse(res, "修改实体失败");

      setGraphData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              name: nextName,
              entityType: nextType,
              desc: nextDescription,
              tag: [nextType],
            };
          }
          return node;
        }),
      }));
      setEntityOverrides((prev) => ({
        ...prev,
        [selectedNode.id]: {
          ...(prev[selectedNode.id] || {}),
          desc: nextDescription,
          tag: [nextType],
        },
        [nextName]: {
          ...(prev[nextName] || {}),
          desc: nextDescription,
          tag: [nextType],
        },
      }));

      message.success("实体已更新");
      setEntityModalOpen(false);
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.message || (entityModalMode === "add" ? "新增失败" : "编辑失败"));
    } finally {
      entitySubmittingRef.current = false;
      setEntitySubmitting(false);
    }
  }

  function handleDeleteEntity() {
    if (!selectedNode) {
      return;
    }

    const nodeName = selectedNode.name || selectedNode.id;
    Modal.confirm({
      title: "确认删除节点",
      content: `确定要删除「${nodeName}」吗？删除后在图谱中将不可恢复。`,
      okText: "确定删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          const deleteId = selectedNode.id;
          const targetNodeId = String(deleteId);
          const res = await deleteGraphNode({
            way: getGraphWay(workspaceMode),
            nodeId: targetNodeId,
            nodeKind: selectedNode.type === "value" ? "property" : "entity",
          });
          checkApiResponse(res, "删除失败");

          setGraphData((prev) => {
            const nextNodes = prev.nodes.filter((node) => node.id !== deleteId);
            const nextLinks = prev.links.filter((link) => link.source !== deleteId && link.target !== deleteId);
            const nextCenterId = prev.centerId === deleteId ? (nextNodes[0]?.id || "") : prev.centerId;
            return {
              centerId: nextCenterId,
              nodes: nextNodes,
              links: nextLinks,
            };
          });
          setEntityOverrides((prev) => {
            const next = { ...prev };
            delete next[deleteId];
            return next;
          });

          setSelectedNodeId((prevSelected) => {
            if (prevSelected === deleteId) {
              const remainingNode = graphData.nodes.find((n) => n.id !== deleteId);
              return remainingNode?.id || "";
            }
            return prevSelected;
          });

          message.success("节点已删除");
        } catch (error: any) {
          message.error(error?.message || "删除失败");
        }
      },
    });
  }

  function openAddRelationModal() {
    if (!selectedNode) {
      return;
    }
    relationForm.setFieldsValue({
      source: selectedNode.id,
      target:
        graphData.centerId === selectedNode.id
          ? graphData.nodes.find((node) => node.id !== selectedNode.id)?.id || ""
          : graphData.centerId,
      relation: "",
    });
    setEditingRelationKey(null);
    setRelationModalOpen(true);
  }

  function openEditRelationModal(link: EntityGraphLink) {
    relationForm.setFieldsValue({
      source: link.source,
      target: link.target,
      relation: link.relation,
    });
    setEditingRelationKey(getRelationKey(link));
    setRelationModalOpen(true);
  }

  async function handleSubmitRelation() {
    const values = await relationForm.validateFields();
    const nextRelation: EntityGraphLink = {
      source: values.source,
      target: values.target,
      relation: values.relation.trim(),
    };

    if (!nextRelation.relation) {
      return;
    }
    if (nextRelation.source === nextRelation.target) {
      message.warning("关系两端不能是同一个实体");
      return;
    }

    setGraphData((prev) => {
      const links = editingRelationKey
        ? prev.links.map((link) =>
            getRelationKey(link) === editingRelationKey ? nextRelation : link,
          )
        : [...prev.links, nextRelation];

      return {
        ...prev,
        links: links.filter(
          (link, index, array) =>
            array.findIndex((item) => getRelationKey(item) === getRelationKey(link)) === index,
        ),
      };
    });

    setRelationModalOpen(false);
    setEditingRelationKey(null);
    message.success(editingRelationKey ? "关系已更新" : "关系已新增");
  }

  function handleDeleteRelation(link: EntityGraphLink) {
    const relationKey = getRelationKey(link);
    setGraphData((prev) => ({
      ...prev,
      links: prev.links.filter((item) => getRelationKey(item) !== relationKey),
    }));
    message.success("关系已删除");
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(graphData, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${graphData.centerId || "graph"}-graph.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function handleFullscreen() {
    const canvas = graphCanvasRef.current;
    if (!canvas) {
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await canvas.requestFullscreen();
  }

  return (
    <>
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
          style={{
            height: "calc(100vh - 112px)",
            display: "grid",
            gridTemplateColumns: `${leftPanelCollapsed ? "0px" : "320px"} 1fr ${rightPanelCollapsed ? "0px" : "350px"}`,
            background: "#f7f9fc",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid #e5edf8",
          }}
        >
        <aside
          className="hide-scrollbar"
          style={{
            background: "#fff",
            borderRight: leftPanelCollapsed ? "none" : "1px solid #e5e7eb",
            padding: leftPanelCollapsed ? 0 : 16,
            overflowY: "auto",
            overflowX: "hidden",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#eef2ff",
                color: "#3b82f6",
                display: "grid",
                placeItems: "center",
                fontSize: 18,
              }}
            >
              <ApiOutlined />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", lineHeight: 1.2 }}>图谱检索</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>知识图谱实体检索</div>
            </div>
            <Button
              type="text"
              onClick={() => setLeftPanelCollapsed(true)}
              style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 14, padding: 0, flexShrink: 0 }}
            >
              {"<"}
            </Button>
          </div>

          <SectionBlock title="文档类型">
            <div style={{ display: "grid", gap: 10 }}>
              <ModeSelectCard
                title="自动上传"
                description="查看自动上传来源对应的知识图谱数据"
                active={workspaceMode === "auto-upload"}
                accent="#3b82f6"
                icon={<CloudUploadOutlined />}
                onClick={() => switchWorkspaceMode("auto-upload")}
              />
              <ModeSelectCard
                title="手动上传"
                description="查看页面上传来源对应的知识图谱数据"
                active={workspaceMode === "manual-upload"}
                accent="#3b82f6"
                icon={<UploadOutlined />}
                onClick={() => switchWorkspaceMode("manual-upload")}
              />
            </div>
          </SectionBlock>

          <SectionBlock
            title="实体类型"
            extra={
              <span onClick={() => handleEntityTypeChange(null)}>清除筛选</span>
            }
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div
                className="hide-scrollbar"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  maxHeight: 260,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {entityTypes.map((item) => {
                  const active = activeEntityTypeName === item.name;
                  const palette = getEntityTypePalette(item.name);
                  return (
                    <Tooltip key={String(item.id)} title={item.name} placement="top">
                      <button
                        type="button"
                        onClick={() => handleEntityTypeChange(item.name)}
                        style={{
                          display: "block",
                          width: "100%",
                          height: 40,
                          padding: "0 8px",
                          borderRadius: 12,
                          border: active ? `1px solid ${palette.stroke}` : `1px solid ${palette.stroke}88`,
                          background: active ? `${palette.strong}18` : `${palette.strong}08`,
                          color: active ? palette.strong : palette.strong,
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 13,
                          fontWeight: active ? 700 : 600,
                          textAlign: "center",
                          lineHeight: "38px",
                          boxShadow: active ? `inset 0 0 0 1px ${palette.strong}22` : "none",
                        }}
                      >
                        {item.name}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>

              {entityTypeLoading ? <Spin size="small" /> : null}
              {!entityTypeLoading && entityTypes.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无实体类型" />
              ) : null}
            </div>
          </SectionBlock>

          <SectionBlock
            title="实体名称"
            extra={
              entityListHasMore !== false ? (
                <Space size={12}>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => void handleLoadGraphEntities(undefined, false, "replace")}
                    loading={entityListLoading}
                    disabled={entityListLoading}
                    style={{ padding: 0, fontSize: 13 }}
                  >
                    换一批
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => void handleLoadGraphEntities(undefined, false, "append")}
                    loading={entityListLoading}
                    disabled={entityListLoading}
                    style={{ padding: 0, fontSize: 13 }}
                  >
                    加载更多
                  </Button>
                </Space>
              ) : null
            }
          >
            <Input
              value={entityNameKeyword}
              onChange={(event) => setEntityNameKeyword(event.target.value)}
              prefix={<SearchOutlined style={{ color: "#94a3b8", marginRight: 4 }} />}
              placeholder="输入实体名称筛选"
              allowClear
              style={{ height: 40, borderRadius: 12 }}
            />

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <div
                className="hide-scrollbar"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  maxHeight: 260,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {entityNameOptions.map((node) => {
                  const active = selectedNodeId === node.id;
                  return (
                    <Tooltip key={node.id} title={node.name} placement="top">
                      <button
                        type="button"
                        onClick={() => handleEntityNameSelect(node)}
                        style={{
                          display: "block",
                          width: "100%",
                          height: 40,
                          padding: "0 8px",
                          borderRadius: 12,
                          border: active
                            ? `1px solid ${typeMeta[node.type].color}`
                            : "1px solid #e2e8f0",
                          background: active ? `${typeMeta[node.type].color}12` : "#fff",
                          color: active ? typeMeta[node.type].color : "#475569",
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: 13,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          lineHeight: "38px",
                        }}
                      >
                        {node.name}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>

              {entityListLoading ? <Spin size="small" /> : null}
              {!entityListLoading && entityNameOptions.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前筛选下暂无实体" />
              ) : null}
            </div>
          </SectionBlock>

          <div
            style={{
              marginTop: 28,
              border: "1px solid #eef2f7",
              borderRadius: 16,
              padding: "16px",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3b82f6", fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
              <SlidersOutlined /> 显示设置
            </div>
            
            <SliderRow
              label="节点大小"
              min={0.8}
              max={1.45}
              step={0.05}
              value={nodeScale}
              onChange={setNodeScale}
              displayValue={`${Math.round(((nodeScale - 0.8) / 0.65) * 100)}%`}
            />
            <SliderRow
              label="连线粗细"
              min={1}
              max={3.2}
              step={0.2}
              value={linkWidth}
              onChange={setLinkWidth}
              displayValue={`${Math.round(((linkWidth - 1) / 2.2) * 100)}%`}
            />
            <SliderRow
              label="节点字数"
              min={2}
              max={60}
              step={1}
              value={labelMaxLength}
              onChange={setLabelMaxLength}
              displayValue={`${Math.round(((labelMaxLength - 2) / 58) * 100)}%`}
            />
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <CheckboxOptionRow
                label="显示节点"
                hint="控制图谱节点显示"
                checked={showNodes}
                onChange={setShowNodes}
              />
              <CheckboxOptionRow
                label="显示关系"
                hint="控制关系连线显示"
                checked={showLinks}
                onChange={setShowLinks}
              />
            </div>
          </div>

          <SectionBlock title="图谱概览">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              <OverviewMetricCard label="节点总数" value={String(graphSummary.nodeCount)} accent="#2563eb" />
              <OverviewMetricCard label="关系总数" value={String(graphSummary.relationCount)} accent="#7c3aed" />
              <OverviewMetricCard label="已展开" value={String(graphSummary.expandedCount)} accent="#0f766e" />
              <OverviewMetricCard label="当前可见" value={String(graphSummary.visibleCount)} accent="#b45309" />
            </div>

          </SectionBlock>
        </aside>

        <main
          ref={graphCanvasRef}
          style={{
            position: "relative",
            background: "#f8fafc",
            overflow: "hidden",
            minHeight: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {/* 视图模式双向切换 Tab 按钮 - 全局顶置显示 */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 220,
              zIndex: 100,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(4px)",
              borderRadius: 12,
              padding: "6px 8px",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
              border: "1px solid #eef2f7",
            }}
          >
            <Segmented
              value={graphViewMode}
              onChange={(val) => {
                const mode = val as "raw" | "community";
                setGraphViewMode(mode);
                if (mode === "raw" && selectedNodeId.startsWith("comm_")) {
                  const commId = selectedNodeId.replace("comm_", "");
                  const targetComm = communities.find((c) => c.id === commId);
                  setSelectedNodeId(targetComm?.seedNodeId || graphData.centerId);
                } else if (mode === "community" && activeCommunityId) {
                  setSelectedNodeId(`comm_${activeCommunityId}`);
                }
                window.setTimeout(() => graphRef.current?.resetZoom(), 40);
              }}
              options={[
                {
                  label: (
                    <div style={{ padding: "0 6px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <ApiOutlined />
                      <span>原始图</span>
                    </div>
                  ),
                  value: "raw",
                },
                {
                  label: (
                    <div style={{ padding: "0 6px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <ClusterOutlined />
                      <span>社区网络图</span>
                    </div>
                  ),
                  value: "community",
                },
              ]}
            />
          </div>

          {graphViewMode === "community" ? (
            <CommunityMiddleCanvas
              graphData={graphData}
              communities={communities}
              activeCommunity={activeCommunity}
              activeCommunityId={activeCommunityId}
              onFocusCommunity={handleFocusCommunity}
              onClearCommunity={handleClearCommunity}
              graphViewMode={graphViewMode}
              onSwitchViewMode={(mode) => {
                setGraphViewMode(mode);
                if (mode === "raw" && selectedNodeId.startsWith("comm_")) {
                  const commId = selectedNodeId.replace("comm_", "");
                  const targetComm = communities.find((c) => c.id === commId);
                  setSelectedNodeId(targetComm?.seedNodeId || graphData.centerId);
                } else if (mode === "community" && activeCommunityId) {
                  setSelectedNodeId(`comm_${activeCommunityId}`);
                }
                window.setTimeout(() => graphRef.current?.resetZoom(), 40);
              }}
              nodeScale={nodeScale}
              graphRef={graphRef}
            />
          ) : (
            <>
              {leftPanelCollapsed ? (
            <Button
              type="default"
              onClick={() => setLeftPanelCollapsed(false)}
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                padding: 0,
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
              }}
            >
              {">"}
            </Button>
          ) : null}
          {rightPanelCollapsed ? (
            <Button
              type="default"
              onClick={() => setRightPanelCollapsed(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                padding: 0,
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
              }}
            >
              {"<"}
            </Button>
          ) : null}

          {/* 图例 */}
          <div 
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(4px)",
              borderRadius: 12,
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              border: "1px solid #f1f5f9",
              padding: 16,
              zIndex: 10,
              width: 192,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b", marginBottom: 12 }}>节点类型</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#94a3b8" }}></div>
                <span style={{ fontSize: 12, color: "#475569" }}>实体 (实心圆)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 16, borderRadius: 8, border: "1px dashed #94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}></div>
                <span style={{ fontSize: 12, color: "#475569" }}>属性 (虚线胶囊)</span>
              </div>
            </div>
            
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b", marginBottom: 12 }}>实体类型</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", rowGap: 10, columnGap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#5D5CDE" }}></div>
                <span style={{ fontSize: 12, color: "#475569" }}>中心实体</span>
              </div>
              {entityTypes.map(item => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: getEntityTypePalette(item.name).strong }}></div>
                  <span style={{ fontSize: 12, color: "#475569" }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <Card
            styles={{ body: { padding: "8px 16px" } }}
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
              borderRadius: 14,
            }}
          >
            <Space split={<span style={{ width: 1, height: 18, background: "#e5e7eb" }} />}>
              <Button type="text" icon={<ZoomInOutlined />} onClick={() => graphRef.current?.zoomIn()}>
                放大
              </Button>
              <Button type="text" icon={<ZoomOutOutlined />} onClick={() => graphRef.current?.zoomOut()}>
                缩小
              </Button>
              <Button type="text" icon={<ReloadOutlined />} onClick={() => graphRef.current?.resetZoom()}>
                重置
              </Button>
              {/* <Button type="text" icon={<ReloadOutlined />} onClick={() => void handleLoadGraphEntities()}>
                换一批
              </Button> */}
              <Button type="text" icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
              <Button type="text" icon={<ExpandOutlined />} onClick={handleFullscreen}>
                全屏
              </Button>
            </Space>
          </Card>

          {graphLoading ? (
            <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
              <Spin size="large" tip="图谱检索中..." />
            </div>
          ) : currentDisplayGraphData.nodes.length > 0 ? (
            <EntityRelationGraph
              actionRef={graphRef}
              data={currentDisplayGraphData}
              selectedNodeId={selectedNodeId}
              height="100%"
              nodeScale={nodeScale}
              linkWidth={linkWidth}
              labelMaxLength={labelMaxLength}
              showNodes={showNodes}
              showLinks={showLinks}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeExpand}
            />
          ) : (
            <Empty description="当前筛选条件下暂无图谱数据" style={{ marginTop: 220 }} />
          )}
        </>
        )}
        </main>

        {graphViewMode === "community" ? (
          <CommunityRightSidebar
            graphData={graphData}
            communities={communities}
            activeCommunity={activeCommunity}
            activeCommunityId={activeCommunityId}
            onFocusCommunity={handleFocusCommunity}
            onClearCommunity={handleClearCommunity}
            graphViewMode={graphViewMode}
            onSwitchViewMode={(mode) => setGraphViewMode(mode)}
            nodeScale={nodeScale}
            graphRef={graphRef}
          />
        ) : (
          <aside
          style={{
            background: "#fff",
            borderLeft: rightPanelCollapsed ? "none" : "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px 16px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>实体详情</div>
            <Space size={4}>
              <Button
                type="text"
                onClick={() => setRightPanelCollapsed(true)}
                style={{ width: 28, height: 28, borderRadius: 14, padding: 0 }}
              >
                {">"}
              </Button>
              {/* <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setSelectedNodeId(graphData.centerId)}
              /> */}
            </Space>
          </div>

          <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {selectedNode ? (
              <>
                <div
                  style={{
                    marginBottom: 20,
                    padding: 16,
                    borderRadius: 16,
                    border: "1px solid #eef2f7",
                  }}
                >
                  <Space align="start" size={12}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: selectedNode.type === "center" ? "#2563eb" : "#7c3aed",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        fontSize: 24,
                      }}
                    >
                      <EntityIcon type={selectedNode.type} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
                        {selectedNode.name}
                      </div>
                      <Space size={6} style={{ marginTop: 8 }} wrap>
                        {selectedDetail.tag.map((tag) => (
                          <Tag
                            key={tag}
                            style={{
                              margin: 0,
                              background: "#f0f5ff",
                              color: "#5c8ced",
                              border: "none",
                              borderRadius: 10,
                              padding: "2px 8px",
                            }}
                          >
                            {tag}
                          </Tag>
                        ))}
                        <Tag
                          style={{
                            margin: 0,
                            background: "#f0f5ff",
                            color: "#5c8ced",
                            border: "none",
                            borderRadius: 10,
                            padding: "2px 8px",
                          }}
                        >
                          {getNodeTypeLabel(selectedNode.type)}
                        </Tag>
                      </Space>
                    </div>
                  </Space>

                  <div
                    style={{
                      marginTop: 16,
                      color: "#64748b",
                      lineHeight: 1.6,
                      fontSize: 13,
                    }}
                  >
                    {selectedDetail.desc}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10 }}>
                    基础信息
                  </div>
                  <div
                    style={{
                      border: "1px solid #eef2f7",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <DetailGridRow label="实体名称" value={selectedNode.name} bordered />
                    <DetailGridRow label="节点类型" value={getNodeTypeLabel(selectedNode.type)} bordered />
                    <DetailGridRow
                      label="来源方式"
                      value={hasPresetEntityRecord(selectedNode.name) ? "预置数据" : "动态图谱扩展"}
                      bordered
                    />
                    <DetailGridRow
                      label="展开来源"
                      value={
                        selectedNode.parentId
                          ? `${selectedNode.parentId} / ${selectedNode.relationFromParent || "关联"}`
                          : "检索中心节点"
                      }
                      bordered={false}
                    />
                  </div>
                </div>

                <PanelSection
                  title="关联关系"
                  icon={<LinkOutlined style={{ color: "#3b82f6" }} />}
                  extra={
                    <Space size={12}>
                      {canShowRelationLoadActions && (
                        <>
                          <Button
                            size="small"
                            type="link"
                            onClick={() => handleNodeExpand(selectedNode, "replace")}
                            loading={Boolean(nodeExpandMap[selectedNode.id]?.loading)}
                            disabled={Boolean(nodeExpandMap[selectedNode.id]?.loading)}
                            style={{ padding: 0, fontSize: 13 }}
                          >
                            换一批
                          </Button>
                          <Button
                            size="small"
                            type="link"
                            onClick={() => handleNodeExpand(selectedNode, "append")}
                            loading={Boolean(nodeExpandMap[selectedNode.id]?.loading)}
                            disabled={Boolean(nodeExpandMap[selectedNode.id]?.loading)}
                            style={{ padding: 0, fontSize: 13 }}
                          >
                            加载更多
                          </Button>
                        </>
                      )}
                      <Button
                        size="small"
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={openAddRelationModal}
                        style={{ padding: 0, fontSize: 13 }}
                      >
                        新增关系
                      </Button>
                    </Space>
                  }
                >
                  {selectedRelations.length > 0 ? (
                    selectedRelations.map((link) => {
                      if (!link || !link.source || !link.target) return null;
                      const targetId = link.source === selectedNode.id ? link.target : link.source;
                      const targetNode = graphData.nodes.find((node) => node.id === targetId) || null;
                      return (
                        <div
                          key={getRelationKey(link)}
                          style={{
                            border: "1px solid #eef2f7",
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 10,
                            background: "#fff",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <Space size={8}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "#f0f5ff",
                                  color: "#3b82f6",
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                <UserOutlined style={{ fontSize: 14 }} />
                              </div>
                              <strong style={{ color: "#1f2937", fontSize: 14 }}>{link.relation}</strong>
                            </Space>
                            <Space size={6} style={{ color: "#64748b", fontSize: 12 }}>
                              置信度
                              <span
                                style={{
                                  background: "#ecfdf5",
                                  color: "#10b981",
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontWeight: 600,
                                }}
                              >
                                {buildRelationConfidence(link)}
                              </span>
                            </Space>
                          </div>
                          
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderTop: "1px dashed #e2e8f0",
                              paddingTop: 12,
                            }}
                          >
                            <span style={{ color: "#64748b", fontSize: 13 }}>{targetId}</span>
                            <Space size={12}>
                              <a
                                style={{ color: "#3b82f6", fontSize: 13, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                                onClick={() => openEditRelationModal(link)}
                              >
                                <EditOutlined /> 编辑
                              </a>
                              <Popconfirm
                                title="确认删除这条关系吗？"
                                onConfirm={() => handleDeleteRelation(link)}
                              >
                                <a style={{ color: "#ef4444", fontSize: 13, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                                  <DeleteOutlined /> 删除
                                </a>
                              </Popconfirm>
                            </Space>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前实体暂无关系" />
                  )}
                </PanelSection>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10 }}>
                    属性信息
                  </div>
                  {selectedPropertyList.length > 0 ? (
                    <div
                      style={{
                        border: "1px solid #eef2f7",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      {selectedPropertyList.slice(0, 5).map(([label, value], index) => (
                        <DetailGridRow
                          key={`${label}-${value}-${index}`}
                          label={label}
                          value={value}
                          bordered={index !== selectedPropertyList.slice(0, 5).length - 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前实体暂无属性信息" />
                  )}
                </div>



                <PanelSection
                  title="来源文档"
                  icon={<FileTextOutlined style={{ color: "#3b82f6" }} />}
                >
                  {selectedDetail.sourceDocuments.length > 0 ? selectedDetail.sourceDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleOpenDocument(doc)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        border: "1px solid #eef2f7",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: doc.type === "pdf" ? "#fef2f2" : "#ecfdf5",
                          color: doc.type === "pdf" ? "#ef4444" : "#10b981",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          fontSize: 20,
                        }}
                      >
                        {doc.type === "pdf" ? <FilePdfOutlined /> : <FileTextOutlined />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            color: "#1f2937",
                            fontWeight: 600,
                            fontSize: 14,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginBottom: 4,
                          }}
                        >
                          {doc.title}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{doc.location}</div>
                      </div>
                      <div style={{ color: "#3b82f6", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                        查看详情 <span style={{ fontSize: 12, fontWeight: 700 }}>↗</span>
                      </div>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前实体暂无来源文档" />}
                </PanelSection>
              </>
            ) : (
              <Empty description="点击图谱节点查看实体详情" />
            )}
          </div>

          <div
            style={{
              padding: "14px 16px",
              borderTop: "1px solid #e5e7eb",
              background: "#fff",
              flexShrink: 0,
              position: "sticky",
              bottom: 0,
              zIndex: 10,
              boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.03)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Button
                style={{ width: "100%", height: 38, borderRadius: 19, padding: "0 4px" }}
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAddEntityModal}
              >
                新增
              </Button>
              <Button
                style={{ width: "100%", height: 38, borderRadius: 19, padding: "0 4px" }}
                icon={<EditOutlined />}
                disabled={!selectedNode}
                onClick={openEditEntityModal}
              >
                编辑
              </Button>
              <Button
                style={{ width: "100%", height: 38, borderRadius: 19, padding: "0 4px" }}
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedNode}
                onClick={handleDeleteEntity}
              >
                删除
              </Button>
            </div>
          </div>
        </aside>
        )}
      </div>

      <Modal
        title={entityModalMode === "add" ? "新增图谱节点（实体 / 属性）" : "编辑图谱节点"}
        open={entityModalOpen}
        onCancel={() => {
          if (entitySubmittingRef.current) {
            return;
          }
          setEntityModalOpen(false);
        }}
        onOk={handleSubmitEntity}
        okButtonProps={{ loading: entitySubmitting }}
        cancelButtonProps={{ disabled: entitySubmitting }}
        maskClosable={!entitySubmitting}
        keyboard={!entitySubmitting}
        destroyOnHidden
      >
        <Form form={entityForm} layout="vertical" initialValues={{ nodeKind: "entity" }}>
          {entityModalMode === "add" && (!selectedNode || selectedNode.type === "value") && (
            <Alert
              message="新建属性需绑定已存在的目标实体；当前未选定实体，仅支持新建实体。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item name="nodeKind" label="节点种类" rules={[{ required: true }]}>
            <Radio.Group
              disabled={entityModalMode === "edit"}
              options={[
                { label: "新建实体 (Entity)", value: "entity" },
                {
                  label: "新建属性 (Property)",
                  value: "property",
                  disabled: !selectedNode || selectedNode.type === "value",
                },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.nodeKind !== currentValues.nodeKind}
          >
            {({ getFieldValue }) =>
              getFieldValue("nodeKind") === "property" ? (
                <>
                  <Form.Item
                    name="attrKey"
                    label="属性名（Key）"
                    rules={[{ required: true, message: "请输入属性名称（如：性状、适应症）" }]}
                  >
                    <Input placeholder="请输入属性名称（如：适应症）" />
                  </Form.Item>
                  <Form.Item
                    name="attrValue"
                    label="属性内容（Value）"
                    rules={[{ required: true, message: "请输入属性内容" }]}
                  >
                    <Input.TextArea rows={3} placeholder="请输入属性内容（如：用于缓解轻至中度疼痛）" />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item name="name" label="实体名称" rules={[{ required: true, message: "请输入实体名称" }]}>
                    <Input placeholder="请输入实体名称（如：阿司匹林）" />
                  </Form.Item>
                  <Form.Item name="type" label="实体类型" rules={[{ required: true, message: "请选择或输入实体类型" }]}>
                    <AutoComplete
                      options={entityTypes.map((item) => ({ label: item.name, value: item.name }))}
                      placeholder="请选择或输入实体类型（如：药品）"
                      filterOption={(inputValue, option) =>
                        String(option?.label || option?.value || "")
                          .toLowerCase()
                          .includes(inputValue.toLowerCase())
                      }
                    />
                  </Form.Item>
                  <Form.Item name="description" label="实体描述">
                    <Input.TextArea rows={3} placeholder="请输入实体描述（如：解热镇痛药）" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingRelationKey ? "编辑关系" : "新增关系"}
        open={relationModalOpen}
        onCancel={() => {
          setRelationModalOpen(false);
          setEditingRelationKey(null);
        }}
        onOk={handleSubmitRelation}
        destroyOnHidden
      >
        <Form form={relationForm} layout="vertical">
          <Form.Item name="source" label="源实体" rules={[{ required: true, message: "请选择源实体" }]}>
            <Select options={graphData.nodes.map((node) => ({ label: node.name, value: node.id }))} showSearch />
          </Form.Item>
          <Form.Item name="target" label="目标实体" rules={[{ required: true, message: "请选择目标实体" }]}>
            <Select options={graphData.nodes.map((node) => ({ label: node.name, value: node.id }))} showSearch />
          </Form.Item>
          <Form.Item name="relation" label="关系名称" rules={[{ required: true, message: "请输入关系名称" }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function SectionBlock({
  title,
  extra,
  children,
}: {
  title: string | ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>{title}</div>
        {extra && <div style={{ fontSize: 13, color: "#3b82f6", cursor: "pointer" }}>{extra}</div>}
      </div>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  displayValue,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  displayValue?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", fontSize: 13, marginBottom: 8 }}>
        <span>{label}</span>
        {displayValue && <span style={{ color: "#64748b" }}>{displayValue}</span>}
      </div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} tooltip={{ formatter: null }} />
    </div>
  );
}

function CheckboxOptionRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        border: checked ? "1px solid #bfd3f7" : "1px solid #e2e8f0",
        background: checked ? "#f8fbff" : "#ffffff",
        borderRadius: 12,
        cursor: "pointer",
      }}
    >
      <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: "#0f172a", fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{hint}</div>
      </div>
    </label>
  );
}

function OverviewMetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #edf1f5",
        background: "#ffffff",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: accent,
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0, flex: 1, color: "#64748b", fontSize: 12, lineHeight: 1.2 }}>
        {label}
      </div>
      <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function ModeSelectCard({
  title,
  description,
  active,
  accent,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  active: boolean;
  accent: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: 16,
        border: active ? `1px solid ${accent}` : "1px solid #e2e8f0",
        background: active ? `${accent}0a` : "#ffffff",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: active ? accent : "#f1f5f9",
          color: active ? "#ffffff" : "#94a3b8",
          display: "grid",
          placeItems: "center",
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{title}</div>
        <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{description}</div>
      </div>
    </button>
  );
}



function PanelSection({
  title,
  extra,
  children,
  icon,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#475569" }}>
          {icon}
          {title}
        </div>
        {extra ? <div style={{ color: "#94a3b8", fontSize: 13, whiteSpace: "nowrap" }}>{extra}</div> : null}
      </div>
      {children}
    </section>
  );
}

function DetailGridRow({ label, value, bordered = true }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: bordered ? "1px solid #eef2f7" : "none",
        background: "#fff",
      }}
    >
      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
      <strong style={{ color: "#334155", fontSize: 13, textAlign: "right" }}>{value}</strong>
    </div>
  );
}

function EntityIcon({ type }: { type: EntityGraphNodeType }): ReactNode {
  if (type === "center") {
    return <SearchOutlined />;
  }
  if (type === "entity") {
    return <UserOutlined />;
  }
  return <TagsOutlined />;
}

function EntityTypeDot({ type }: { type: EntityGraphNodeType }) {
  const colorMap: Record<EntityGraphNodeType, string> = {
    center: "#2563eb",
    entity: "#7c3aed",
    value: "#0f766e",
  };

  return (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: `${colorMap[type]}18`,
        color: colorMap[type],
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <EntityIcon type={type} />
    </span>
  );
}
