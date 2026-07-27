"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { history, useLocation } from "@umijs/max";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
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
  getSuggestedEntities,
  hasPresetEntityRecord,
  hashText,
  type EntityGraphData,
  type EntityGraphLink,
  type EntityGraphNode,
  type EntityGraphNodeType,
  type EntityNodeDetail,
  type SourceDocument,
} from "@/data/entityGraphMock";
import { getGraphEntities, searchGraph, expandGraphNode, type SearchGraphResult, type GraphEntityResult, type GraphExpandResult, type SearchGraphNode, type SearchGraphLink } from "@/services/biz/graph";
import { getEntityTypePage, type EntityTypeItem } from "@/services/biz/entity-type";

const typeMeta: Record<EntityGraphNodeType, { label: string; color: string; countColor: string }> = {
  center: { label: "中心实体", color: "#2563eb", countColor: "#dbeafe" },
  entity: { label: "关联实体", color: "#7c3aed", countColor: "#ede9fe" },
  value: { label: "属性值", color: "#0f766e", countColor: "#ccfbf1" },
};

type WorkspaceMode = "auto-upload" | "manual-upload";

interface GraphCommunity {
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
  name: string;
  type: EntityGraphNodeType;
  desc: string;
  tagsText?: string;
  relation?: string;
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

function collectExpandedNodeIds(graph: EntityGraphData) {
  return new Set(graph.links.map((link) => link.source));
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

function buildGraphFromSearchResult(result: SearchGraphResult, fallbackCenterName: string): EntityGraphData {
  const rawNodes = Array.isArray(result?.nodes) ? result.nodes : [];
  const rawLinks = Array.isArray(result?.links) ? result.links : [];

  return {
    centerId: String(result?.centerId ?? fallbackCenterName),
    nodes: rawNodes
      .map((node) => {
        const nodeId = String(node?.id ?? "").trim();
        const nodeName = String(node?.name ?? "").trim();
        if (!nodeId || !nodeName) {
          return null;
        }

        return {
          id: nodeId,
          name: nodeName,
          type: node?.type ?? (nodeId === result?.centerId ? "center" : "entity"),
          desc: node?.desc,
          expandable: Boolean(node?.expandable),
          relationCount: Number(node?.relationCount ?? 0),
          parentId: node?.parentId,
          relationFromParent: node?.relationFromParent,
          depth: Number(node?.depth ?? (node?.type === "center" ? 0 : 1)),
          branchId: node?.branchId ?? nodeId,
        };
      })
      .filter(Boolean) as EntityGraphData["nodes"],
    links: rawLinks
      .map((link) => {
        const source = String(link?.source ?? "").trim();
        const target = String(link?.target ?? "").trim();
        const relation = String(link?.relation ?? "").trim();
        if (!source || !target || !relation) {
          return null;
        }
        return { source, target, relation };
      })
      .filter(Boolean) as EntityGraphData["links"],
  };
}

export default function GraphPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const graphRef = useRef<EntityRelationGraphRef>(null);
  const graphCanvasRef = useRef<HTMLElement | null>(null);

  const incomingEntity = searchParams.get("entity");
  const initialEntity = incomingEntity || "";

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("auto-upload");
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
  const [activeEntityTypeName, setActiveEntityTypeName] = useState<string | null>(null);
  const [entityNameKeyword, setEntityNameKeyword] = useState("");
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [nodeScale, setNodeScale] = useState(1);
  const [linkWidth, setLinkWidth] = useState(1.4);
  const [labelMaxLength, setLabelMaxLength] = useState(6);
  const [showNodes, setShowNodes] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [entityOverrides, setEntityOverrides] = useState<Record<string, EntityOverride>>({});
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [entityModalMode, setEntityModalMode] = useState<"add" | "edit">("edit");
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [editingRelationKey, setEditingRelationKey] = useState<string | null>(null);
  const [entityForm] = Form.useForm<EntityFormValues>();
  const [relationForm] = Form.useForm<RelationFormValues>();

  useEffect(() => {
    if (initialEntity) {
      void handleSearch(initialEntity, workspaceMode);
    }
  }, [initialEntity]);

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
    const hasTypeFilter = Boolean(activeEntityTypeName);
    const hasNameFilter = Boolean(entityNameKeyword.trim());
    const focusIds = new Set(entityNameOptions.map((node) => node.id));
    const communityNodeIds = activeCommunity
      ? new Set([...activeCommunity.nodeIds, graphData.centerId])
      : null;

    const nodes = graphData.nodes.filter((node) => {
      if (communityNodeIds && !communityNodeIds.has(node.id)) {
        return false;
      }
      if (node.id === graphData.centerId || node.type === "center" || expandedNodeIds.has(node.id)) {
        return true;
      }
      const isConnectedToExpanded = graphData.links.some(
        (l) =>
          (l.source === node.id && (l.target === graphData.centerId || expandedNodeIds.has(l.target))) ||
          (l.target === node.id && (l.source === graphData.centerId || expandedNodeIds.has(l.source))),
      );
      if (isConnectedToExpanded) {
        return true;
      }
      if (!hasNameFilter) {
        return true;
      }
      return focusIds.has(node.id);
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    return {
      centerId: graphData.centerId,
      nodes,
      links: graphData.links.filter(
        (link) => nodeIds.has(link.source) && nodeIds.has(link.target),
      ),
    };
  }, [activeCommunity, activeEntityTypeName, entityNameKeyword, entityNameOptions, graphData]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId],
  );

  const selectedDetail = useMemo(() => {
    const nodeName = selectedNode?.name || graphData.centerId;
    const baseDetail = getNodeDetail(nodeName);
    const override = entityOverrides[nodeName];
    return {
      ...baseDetail,
      desc: override?.desc ?? baseDetail.desc,
      tag: override?.tag ?? baseDetail.tag,
      avp: override?.avp ?? baseDetail.avp,
    } as EntityNodeDetail;
  }, [entityOverrides, graphData.centerId, selectedNode?.name]);

  const selectedRelations = useMemo(() => {
    if (!selectedNode) {
      return [];
    }
    return graphData.links.filter(
      (link) => link.source === selectedNode.id || link.target === selectedNode.id,
    );
  }, [graphData.links, selectedNode]);

  const graphSummary = useMemo(
    () => ({
      nodeCount: graphData.nodes.length,
      relationCount: graphData.links.length,
      expandedCount: expandedNodeIds.size,
      visibleCount: filteredGraphData.nodes.length,
    }),
    [
      expandedNodeIds.size,
      filteredGraphData.nodes.length,
      graphData.links.length,
      graphData.nodes.length,
    ],
  );

  const suggestedEntities = useMemo(() => getSuggestedEntities(), []);

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
          void handleLoadGraphEntities();
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

  async function handleSearch(entityName = keyword, mode = workspaceMode) {
    const target = entityName.trim();
    if (!target) {
      message.warning("请输入实体名称后再检索");
      return;
    }

    try {
      setGraphLoading(true);
      const response = await searchGraph({ entity: target, mode });
      const result = extractResultData<SearchGraphResult>(response);
      const nextGraph = buildGraphFromSearchResult(result, target);

      setKeyword(target);
      setGraphData(nextGraph);
      setSelectedNodeId(nextGraph.nodes[0]?.id || "");
      setExpandedNodeIds(collectExpandedNodeIds(nextGraph));
      setNodeExpandMap({});
      setActiveEntityTypeName(null);
      setEntityNameKeyword("");
      setActiveCommunityId(null);
      setLinkWidth(1.4);
      window.setTimeout(() => graphRef.current?.resetZoom(), 40);

      if (nextGraph.nodes.length === 0) {
        message.info("未检索到相关图谱实体");
      }
    } catch (error) {
      console.error(error);
      setKeyword(target);
      setGraphData(createEmptyGraph(target));
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
      setActiveEntityTypeName(null);
      setEntityNameKeyword("");
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
        way: workspaceMode === "auto-upload" ? "auto_read" : "front_upload",
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
    if (keyword.trim()) {
      void handleSearch(keyword, mode);
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
        way: workspaceMode === "auto-upload" ? "auto_read" : "front_upload",
        nodeId: node.id,
        nodeKind: "entity",
        direction: "both",
        includeProperty: true,
        limit: 20,
        cursor: requestCursor,
      });

      const result = extractResultData<GraphExpandResult>(response);

      const rawNodes = Array.isArray(result?.nodes) ? result.nodes : [];
      const rawLinks = Array.isArray(result?.links) ? result.links : [];

      const validNodes = rawNodes
        .map((n) => {
          if (!n) return null;
          const nid = String(n.id ?? (n as any).nodeId ?? (n as any).graphNodeId ?? n.name ?? "").trim();
          if (!nid) return null;
          return {
            ...n,
            id: nid,
            name: String(n.name ?? nid).trim(),
            type: n.type ?? "entity",
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
          if (!nextNodesMap.has(n.id)) {
            nextNodesMap.set(n.id, n as any);
          }
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
    if (node.expandable && !expandedNodeIds.has(node.id)) {
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
    if (node.expandable && !expandedNodeIds.has(node.id)) {
      handleNodeExpand(node);
    }
    window.setTimeout(() => graphRef.current?.resetZoom(), 40);
  }

  function handleFocusCommunity(community: GraphCommunity) {
    setActiveCommunityId(community.id);
    setSelectedNodeId(community.seedNodeId);
    window.setTimeout(() => graphRef.current?.resetZoom(), 40);
  }

  function handleClearCommunity() {
    setActiveCommunityId(null);
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
      name: "",
      type: "entity",
      desc: "",
      tagsText: "",
      relation: "",
    });
    setEntityModalMode("add");
    setEntityModalOpen(true);
  }

  function openEditEntityModal() {
    if (!selectedNode) {
      return;
    }
    entityForm.setFieldsValue({
      name: selectedNode.name,
      type: selectedNode.type,
      desc: selectedDetail.desc,
      tagsText: selectedDetail.tag.join(", "),
      relation: selectedNode.relationFromParent || "",
    });
    setEntityModalMode("edit");
    setEntityModalOpen(true);
  }

  async function handleSubmitEntity() {
    const values = await entityForm.validateFields();
    const nextName = values.name.trim();
    if (!nextName) {
      return;
    }

    if (entityModalMode === "add") {
      if (values.type === "center") {
        message.warning("新增实体不支持设置为中心实体");
        return;
      }
      if (graphData.nodes.some((node) => node.id === nextName)) {
        message.warning("实体名称已存在");
        return;
      }

      const parentNode = selectedNode || graphData.nodes.find((node) => node.id === graphData.centerId);
      const nextNode: EntityGraphNode = {
        id: nextName,
        name: nextName,
        type: values.type,
        expandable: true,
        relationCount: 1,
        parentId: parentNode?.id,
        relationFromParent: values.relation?.trim() || "关联",
        depth: parentNode ? (parentNode.depth ?? 0) + 1 : 1,
        branchId: parentNode?.type === "center" ? nextName : parentNode?.branchId || parentNode?.id || nextName,
      };

      setGraphData((prev) => ({
        ...prev,
        nodes: [...prev.nodes, nextNode],
        links: parentNode
          ? [
              ...prev.links,
              {
                source: parentNode.id,
                target: nextName,
                relation: values.relation?.trim() || "关联",
              },
            ]
          : prev.links,
      }));
      setEntityOverrides((prev) => ({
        ...prev,
        [nextName]: {
          desc: values.desc.trim() || `${nextName} 的自定义实体描述`,
          tag: parseTagInput(values.tagsText),
          avp: [],
        },
      }));
      setSelectedNodeId(nextName);
      setEntityModalOpen(false);
      message.success("实体已新增");
      return;
    }

    if (!selectedNode) {
      return;
    }

    const prevName = selectedNode.id;
    const renamed = prevName !== nextName;
    if (renamed && graphData.nodes.some((node) => node.id === nextName)) {
      message.warning("目标实体名称已存在");
      return;
    }

    setGraphData((prev) => ({
      centerId: prev.centerId === prevName ? nextName : prev.centerId,
      nodes: prev.nodes.map((node) => {
        const nextNode = { ...node };
        if (node.id === prevName) {
          nextNode.id = nextName;
          nextNode.name = nextName;
          nextNode.type = values.type;
          nextNode.relationFromParent = values.relation?.trim() || node.relationFromParent;
        }
        if (node.parentId === prevName) {
          nextNode.parentId = nextName;
        }
        if (node.branchId === prevName) {
          nextNode.branchId = nextName;
        }
        return nextNode;
      }),
      links: prev.links.map((link) => ({
        source: link.source === prevName ? nextName : link.source,
        target: link.target === prevName ? nextName : link.target,
        relation:
          link.target === prevName &&
          link.source === selectedNode.parentId &&
          values.relation?.trim()
            ? values.relation.trim()
            : link.relation,
      })),
    }));
    setEntityOverrides((prev) => {
      const nextOverrides = { ...prev };
      const oldOverride = nextOverrides[prevName];
      delete nextOverrides[prevName];
      nextOverrides[nextName] = {
        desc: values.desc.trim() || oldOverride?.desc || selectedDetail.desc,
        tag: parseTagInput(values.tagsText),
        avp: oldOverride?.avp || selectedDetail.avp,
      };
      return nextOverrides;
    });
    setSelectedNodeId(nextName);
    setEntityModalOpen(false);
    message.success("实体已更新");
  }

  function handleDeleteEntity() {
    if (!selectedNode) {
      return;
    }
    if (selectedNode.id === graphData.centerId) {
      message.warning("中心实体不允许删除");
      return;
    }

    const deleteId = selectedNode.id;
    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((node) => node.id !== deleteId),
      links: prev.links.filter((link) => link.source !== deleteId && link.target !== deleteId),
    }));
    setEntityOverrides((prev) => {
      const next = { ...prev };
      delete next[deleteId];
      return next;
    });
    setSelectedNodeId(graphData.centerId);
    message.success("实体已删除");
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
          gridTemplateColumns: "320px 1fr 350px",
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
            borderRight: "1px solid #e5e7eb",
            padding: 16,
            overflowY: "auto",
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
          </div>

          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => void handleSearch()}
            prefix={<SearchOutlined style={{ color: "#94a3b8", marginRight: 4 }} />}
            placeholder="搜索实体名称"
            allowClear
            style={{ height: 44, borderRadius: 22 }}
          />
          <Button
            type="primary"
            block
            icon={<span style={{ fontSize: 15 }}>✨</span>}
            style={{
              marginTop: 16,
              height: 44,
              borderRadius: 22,
              background: "#3b82f6",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)",
              fontWeight: 600,
            }}
            onClick={() => void handleSearch()}
          >
            开始检索
          </Button>

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
                  return (
                    <Tooltip key={String(item.id)} title={item.name} placement="top">
                      <button
                        type="button"
                        onClick={() => handleEntityTypeChange(item.name)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 6px",
                          borderRadius: 12,
                          border: active ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                          background: active ? "#eff6ff" : "#fff",
                          color: active ? "#3b82f6" : "#475569",
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 13,
                          textAlign: "center",
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
                          padding: "8px 6px",
                          borderRadius: 12,
                          border: active
                            ? `1px solid ${typeMeta[node.type].color}`
                            : "1px solid #e2e8f0",
                          background: active ? `${typeMeta[node.type].color}12` : "#fff",
                          color: active ? typeMeta[node.type].color : "#475569",
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 13,
                          textAlign: "center",
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
              max={20}
              step={1}
              value={labelMaxLength}
              onChange={setLabelMaxLength}
              displayValue={`${Math.round(((labelMaxLength - 2) / 18) * 100)}%`}
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

            <div style={{ marginTop: 14 }}>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>推荐检索</div>
              <Space wrap size={[8, 10]}>
                {suggestedEntities.map((item) => (
                  <Tag
                    key={item}
                    style={{
                      cursor: "pointer",
                      margin: 0,
                      padding: "4px 10px",
                      borderRadius: 999,
                      borderColor: keyword === item ? "#2563eb" : "#d9e2f1",
                      background: keyword === item ? "#eff6ff" : "#fff",
                      color: keyword === item ? "#2563eb" : "#475569",
                    }}
                    onClick={() => void handleSearch(item)}
                  >
                    {item}
                  </Tag>
                ))}
              </Space>
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
          ) : filteredGraphData.nodes.length > 0 ? (
            <EntityRelationGraph
              actionRef={graphRef}
              data={filteredGraphData}
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
        </main>

        <aside
          style={{
            background: "#fff",
            borderLeft: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
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
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setSelectedNodeId(graphData.centerId)}
            />
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
                      {selectedNode.expandable && nodeExpandMap[selectedNode.id]?.hasMore !== false && (
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
                  <div
                    style={{
                      border: "1px solid #eef2f7",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {selectedDetail.avp.slice(0, 5).map(([label, value], index) => (
                      <DetailGridRow
                        key={`${label}-${value}-${index}`}
                        label={label}
                        value={value}
                        bordered={index !== selectedDetail.avp.slice(0, 5).length - 1}
                      />
                    ))}
                  </div>
                </div>

                <PanelSection
                  title="社区网络发现"
                  icon={<ClusterOutlined style={{ color: "#3b82f6" }} />}
                  extra={
                    activeCommunity ? (
                      <Button size="small" type="link" onClick={handleClearCommunity} style={{ padding: 0, fontSize: 13 }}>
                        清除聚焦
                      </Button>
                    ) : null
                  }
                >
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>
                    {activeCommunity
                      ? `当前聚焦：${activeCommunity.name}`
                      : "基于当前图谱结构自动识别高关联社区"}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {communities.slice(0, 4).map((community) => (
                      <CommunityCard
                        key={community.id}
                        community={community}
                        active={activeCommunityId === community.id}
                        onClick={() => handleFocusCommunity(community)}
                      />
                    ))}
                    {communities.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前图谱规模较小，暂无社区发现结果" />
                    ) : null}
                  </div>
                </PanelSection>

                <PanelSection
                  title="来源文档"
                  icon={<FileTextOutlined style={{ color: "#3b82f6" }} />}
                >
                  {selectedDetail.sourceDocuments.map((doc) => (
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
                  ))}
                </PanelSection>
              </>
            ) : (
              <Empty description="点击图谱节点查看实体详情" />
            )}
          </div>

          <div style={{ padding: 16, borderTop: "1px solid #e5e7eb", background: "#fff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Button
                style={{ width: "100%", height: 40, borderRadius: 20 }}
                icon={<EditOutlined />}
                onClick={openEditEntityModal}
              >
                编辑
              </Button>
              <Button style={{ width: "100%", height: 40, borderRadius: 20 }} icon={<PlusOutlined />} onClick={openAddEntityModal}>
                新增实体
              </Button>
              <Button
                style={{ width: "100%", height: 40, borderRadius: 20 }}
                type={selectedNode?.id === graphData.centerId ? "primary" : "default"}
                danger={selectedNode?.id !== graphData.centerId}
                loading={selectedNode?.id === graphData.centerId && Boolean(nodeExpandMap[selectedNode.id]?.loading)}
                disabled={selectedNode?.id === graphData.centerId && Boolean(nodeExpandMap[selectedNode.id]?.loading)}
                onClick={() =>
                  selectedNode?.id === graphData.centerId
                    ? selectedNode && handleNodeExpand(selectedNode)
                    : handleDeleteEntity()
                }
              >
                {selectedNode?.id === graphData.centerId ? (
                  <>查看更多 <span style={{ marginLeft: 4, fontWeight: 700 }}>↗</span></>
                ) : (
                  "删除实体"
                )}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        title={entityModalMode === "add" ? "新增实体" : "编辑实体"}
        open={entityModalOpen}
        onCancel={() => setEntityModalOpen(false)}
        onOk={handleSubmitEntity}
        destroyOnHidden
      >
        <Form form={entityForm} layout="vertical">
          <Form.Item name="name" label="实体名称" rules={[{ required: true, message: "请输入实体名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="节点类型" rules={[{ required: true, message: "请选择节点类型" }]}>
            <Select
              options={[
                { label: "中心实体", value: "center" },
                { label: "关联实体", value: "entity" },
                { label: "属性值", value: "value" },
              ]}
            />
          </Form.Item>
          <Form.Item name="desc" label="实体描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="tagsText" label="标签">
            <Input placeholder="多个标签用逗号分隔" />
          </Form.Item>
          <Form.Item name="relation" label={entityModalMode === "add" ? "与当前节点关系" : "父级关系"}>
            <Input placeholder="例如：关联、属于、包含" />
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

function CommunityCard({
  community,
  active,
  onClick,
}: {
  community: GraphCommunity;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: active ? "1px solid #f59e0b" : "1px solid #eef2f7",
        background: active ? "#fff7ed" : "#fff",
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <strong style={{ color: "#1f2937", fontSize: 15 }}>{community.name}</strong>
        <span
          style={{
            background: "#ffedd5",
            color: "#ea580c",
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          {community.nodeIds.length} 节点
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 0", textAlign: "center" }}>
          <div style={{ color: "#1f2937", fontWeight: 700, fontSize: 16 }}>{community.relationCount}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>条关系</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 0", textAlign: "center" }}>
          <div style={{ color: "#1f2937", fontWeight: 700, fontSize: 16 }}>{community.bridgeCount}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>个桥接点</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 0", textAlign: "center" }}>
          <div style={{ color: "#1f2937", fontWeight: 700, fontSize: 16 }}>{community.density}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>密度</div>
        </div>
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
