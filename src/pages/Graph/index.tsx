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
} from "@ant-design/icons";
import type { EntityRelationGraphRef } from "@/components/Graph/EntityRelationGraph";
import EntityRelationGraph from "@/components/Graph/EntityRelationGraph";
import {
  expandGraphWithEntity,
  getNodeDetail,
  getSuggestedEntities,
  hasPresetEntityRecord,
  hashText,
  type EntityGraphData,
  type EntityGraphLink,
  type EntityNodeDetail,
  type EntityGraphNode,
  type EntityGraphNodeType,
  type SourceDocument,
} from "@/data/entityGraphMock";
import { randomPreviewGraph, searchGraph, type SearchGraphResult } from "@/services/biz/graph";

const typeMeta: Record<
  EntityGraphNodeType,
  { label: string; color: string; countColor: string }
> = {
  center: { label: "中心实体", color: "#2563eb", countColor: "#dbeafe" },
  entity: { label: "相关实体", color: "#7c3aed", countColor: "#ede9fe" },
  value: { label: "属性值", color: "#0f766e", countColor: "#ccfbf1" },
};

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

function collectRelationOptions(graph: EntityGraphData) {
  return Array.from(new Set(graph.links.map((link) => link.relation)));
}

function parseTagInput(value?: string) {
  return (value || "")
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type WorkspaceMode = "auto-upload" | "manual-upload" | "full-graph" | "community";

interface UploadTask {
  id: string;
  name: string;
  status: "running" | "waiting" | "done";
  source: "auto" | "manual";
  entityCount: number;
  updatedAt: string;
}

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

const MOCK_UPLOAD_TASKS: UploadTask[] = [
  {
    id: "auto-1",
    name: "政策法规周报增量包",
    status: "running",
    source: "auto",
    entityCount: 124,
    updatedAt: "09:40",
  },
  {
    id: "auto-2",
    name: "项目归档资料夜间扫描",
    status: "waiting",
    source: "auto",
    entityCount: 86,
    updatedAt: "08:15",
  },
  {
    id: "manual-1",
    name: "客户调研纪要.docx",
    status: "done",
    source: "manual",
    entityCount: 42,
    updatedAt: "昨天 18:24",
  },
];

function buildCommunities(graph: EntityGraphData): GraphCommunity[] {
  const topLevelNodes = graph.nodes.filter((node) => node.parentId === graph.centerId);
  const communityMap = new Map<string, Set<string>>();

  topLevelNodes.forEach((node) => {
    communityMap.set(node.id, new Set([graph.centerId, node.id]));
  });

  graph.nodes.forEach((node) => {
    if (node.id === graph.centerId) return;
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
        return {
          source,
          target,
          relation,
        };
      })
      .filter(Boolean) as EntityGraphData["links"],
  };
}

export default function GraphPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const graphRef = useRef<EntityRelationGraphRef>(null);
  const graphCanvasRef = useRef<HTMLElement | null>(null);
  const previousRelationOptionsRef = useRef<string[]>([]);

  const incomingEntity = searchParams.get("entity");
  const initialEntity = incomingEntity || "";
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("auto-upload");

  const [keyword, setKeyword] = useState(initialEntity);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphData, setGraphData] = useState<EntityGraphData>(() => createEmptyGraph(initialEntity));
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [checkedNodeTypes, setCheckedNodeTypes] = useState<EntityGraphNodeType[]>([
    "center",
    "entity",
    "value",
  ]);
  const [checkedRelations, setCheckedRelations] = useState<string[]>([]);
  const [nodeScale, setNodeScale] = useState(1);
  const [linkWidth, setLinkWidth] = useState(1.4);
  const [labelMaxLength, setLabelMaxLength] = useState(6);
  const [showNodes, setShowNodes] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [showRelationLabels, setShowRelationLabels] = useState(true);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>(MOCK_UPLOAD_TASKS);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
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
      return;
    }
    void handleLoadRandomPreview();
  }, [initialEntity]);

  const relationOptions = useMemo(() => collectRelationOptions(graphData), [graphData]);

  useEffect(() => {
    const previous = previousRelationOptionsRef.current;
    const appended = relationOptions.filter((item) => !previous.includes(item));
    if (appended.length > 0) {
      setCheckedRelations((prev) => Array.from(new Set([...prev, ...appended])));
    }
    previousRelationOptionsRef.current = relationOptions;
  }, [relationOptions]);

  const typeCounts = useMemo(
    () =>
      graphData.nodes.reduce(
        (acc, node) => {
          acc[node.type] += 1;
          return acc;
        },
        { center: 0, entity: 0, value: 0 } as Record<EntityGraphNodeType, number>,
      ),
    [graphData.nodes],
  );

  const relationCounts = useMemo(() => {
    const result = new Map<string, number>();
    graphData.links.forEach((link) => {
      result.set(link.relation, (result.get(link.relation) || 0) + 1);
    });
    return result;
  }, [graphData.links]);

  const communities = useMemo(() => buildCommunities(graphData), [graphData]);
  const activeCommunity = useMemo(
    () => communities.find((community) => community.id === activeCommunityId) || null,
    [activeCommunityId, communities],
  );
  const visibleUploadTasks = useMemo(() => {
    if (workspaceMode === "auto-upload") {
      return uploadTasks.filter((task) => task.source === "auto");
    }
    if (workspaceMode === "manual-upload") {
      return uploadTasks.filter((task) => task.source === "manual");
    }
    return uploadTasks;
  }, [uploadTasks, workspaceMode]);

  const filteredGraphData = useMemo(() => {
    const visibleNodeIds = new Set(
      graphData.nodes
        .filter((node) => checkedNodeTypes.includes(node.type))
        .map((node) => node.id),
    );
    const communityNodeIds =
      workspaceMode === "community" && activeCommunity
        ? new Set(activeCommunity.nodeIds)
        : null;

    return {
      centerId: graphData.centerId,
      nodes: graphData.nodes.filter(
        (node) =>
          visibleNodeIds.has(node.id) &&
          (!communityNodeIds || communityNodeIds.has(node.id) || node.id === graphData.centerId),
      ),
      links: graphData.links.filter(
        (link) =>
          visibleNodeIds.has(link.source) &&
          visibleNodeIds.has(link.target) &&
          checkedRelations.includes(link.relation) &&
          (!communityNodeIds ||
            ((communityNodeIds.has(link.source) || link.source === graphData.centerId) &&
              (communityNodeIds.has(link.target) || link.target === graphData.centerId))),
      ),
    };
  }, [activeCommunity, checkedNodeTypes, checkedRelations, graphData, workspaceMode]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId],
  );

  const selectedDetail = useMemo(
    () => {
      const nodeName = selectedNode?.name || graphData.centerId;
      const baseDetail = getNodeDetail(nodeName);
      const override = entityOverrides[nodeName];
      return {
        ...baseDetail,
        desc: override?.desc ?? baseDetail.desc,
        tag: override?.tag ?? baseDetail.tag,
        avp: override?.avp ?? baseDetail.avp,
      } as EntityNodeDetail;
    },
    [entityOverrides, graphData.centerId, selectedNode?.name],
  );

  const selectedRelations = useMemo(() => {
    if (!selectedNode) return [];
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
      const nextRelations = collectRelationOptions(nextGraph);

      setKeyword(target);
      setGraphData(nextGraph);
      setSelectedNodeId(nextGraph.nodes[0]?.id || "");
      setExpandedNodeIds(collectExpandedNodeIds(nextGraph));
      setCheckedNodeTypes(["center", "entity", "value"]);
      setCheckedRelations(nextRelations);
      setActiveCommunityId(null);
      setLinkWidth(1.4);
      previousRelationOptionsRef.current = nextRelations;
      window.setTimeout(() => graphRef.current?.resetZoom(), 40);

      if (nextGraph.nodes.length === 0) {
        message.info("未检索到相关图谱实体。");
      }
    } catch (error) {
      console.error(error);
      setKeyword(target);
      setGraphData(createEmptyGraph(target));
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
      setCheckedRelations([]);
      setActiveCommunityId(null);
      previousRelationOptionsRef.current = [];
      message.error("图谱检索失败");
    } finally {
      setGraphLoading(false);
    }
  }

  async function handleLoadRandomPreview() {
    try {
      setGraphLoading(true);
      const response = await randomPreviewGraph({ nodeLimit: 10, linkLimit: 8 });
      const result = extractResultData<SearchGraphResult>(response);
      const nextGraph = buildGraphFromSearchResult(result, "");
      const nextRelations = collectRelationOptions(nextGraph);

      setKeyword("");
      setGraphData(nextGraph);
      setSelectedNodeId(nextGraph.centerId || nextGraph.nodes[0]?.id || "");
      setExpandedNodeIds(collectExpandedNodeIds(nextGraph));
      setCheckedNodeTypes(["center", "entity", "value"]);
      setCheckedRelations(nextRelations);
      setActiveCommunityId(null);
      setLinkWidth(1.4);
      previousRelationOptionsRef.current = nextRelations;
      window.setTimeout(() => graphRef.current?.resetZoom(), 40);

      if (nextGraph.nodes.length === 0) {
        message.info("当前暂无可展示的随机图谱。");
      }
    } catch (error) {
      console.error(error);
      setGraphData(createEmptyGraph(""));
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
      setCheckedRelations([]);
      setActiveCommunityId(null);
      previousRelationOptionsRef.current = [];
      message.error("随机图谱加载失败");
    } finally {
      setGraphLoading(false);
    }
  }

  function switchWorkspaceMode(mode: WorkspaceMode) {
    setWorkspaceMode(mode);
    void handleSearch(keyword, mode);
  }

  function handleNodeClick(node: EntityGraphNode) {
    setSelectedNodeId(node.id);
  }

  function handleNodeExpand(node: EntityGraphNode) {
    setSelectedNodeId(node.id);
    if (node.id.startsWith("entity-") || node.id.startsWith("value-")) {
      message.info("节点展开接口待接入，当前先支持图谱检索。");
      return;
    }
    if (expandedNodeIds.has(node.id)) return;

    const result = expandGraphWithEntity(graphData, node.id);
    if (!result.expanded) {
      message.info("该节点暂时没有更多可展开关系。");
      return;
    }

    setGraphData(result.graph);
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(node.id);
      return next;
    });
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

  function handleAutoUpload() {
    setUploadTasks((prev) =>
      prev.map((task, index) =>
        task.source === "auto"
          ? {
              ...task,
              status: index === 0 ? "done" : "running",
              updatedAt: "刚刚",
              entityCount: task.entityCount + 8,
            }
          : task,
      ),
    );
    message.success("自动上传任务已刷新，并同步最新增量实体。");
  }

  function handleFocusCommunity(community: GraphCommunity) {
    setWorkspaceMode("community");
    if (workspaceMode !== "community") {
      handleSearch(keyword, "community");
    }
    if (!graphData.nodes.some((node) => node.id === community.seedNodeId)) {
      message.warning("当前社区节点未加载完成，请重试。");
      return;
    }
    setActiveCommunityId(community.id);
    setSelectedNodeId(community.seedNodeId);
    window.setTimeout(() => graphRef.current?.resetZoom(), 40);
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
    if (!selectedNode) return;
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
    if (!nextName) return;

    if (entityModalMode === "add") {
      if (values.type === "center") {
        message.warning("新增实体不支持设置为中心实体。");
        return;
      }
      if (graphData.nodes.some((node) => node.id === nextName)) {
        message.warning("实体名称已存在，请使用不同名称。");
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
          desc: values.desc.trim() || `${nextName} 的自定义实体描述。`,
          tag: parseTagInput(values.tagsText),
          avp: [],
        },
      }));
      setSelectedNodeId(nextName);
      setEntityModalOpen(false);
      message.success("实体已新增。");
      return;
    }

    if (!selectedNode) return;
    const prevName = selectedNode.id;
    const renamed = prevName !== nextName;
    if (renamed && graphData.nodes.some((node) => node.id === nextName)) {
      message.warning("目标实体名称已存在，请更换。");
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
    message.success("实体已更新。");
  }

  function handleDeleteEntity() {
    if (!selectedNode) return;
    if (selectedNode.id === graphData.centerId) {
      message.warning("中心实体不允许删除。");
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
    message.success("实体已删除。");
  }

  function openAddRelationModal() {
    if (!selectedNode) return;
    relationForm.setFieldsValue({
      source: selectedNode.id,
      target: graphData.centerId === selectedNode.id ? graphData.nodes.find((node) => node.id !== selectedNode.id)?.id || "" : graphData.centerId,
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

    if (!nextRelation.relation) return;
    if (nextRelation.source === nextRelation.target) {
      message.warning("关系两端不能是同一实体。");
      return;
    }

    setGraphData((prev) => {
      const links = editingRelationKey
        ? prev.links.map((link) =>
            getRelationKey(link) === editingRelationKey ? nextRelation : link,
          )
        : [...prev.links, nextRelation];
      const uniqueLinks = links.filter(
        (link, index, array) => array.findIndex((item) => getRelationKey(item) === getRelationKey(link)) === index,
      );
      return { ...prev, links: uniqueLinks };
    });
    setRelationModalOpen(false);
    setEditingRelationKey(null);
    message.success(editingRelationKey ? "关系已更新。" : "关系已新增。");
  }

  function handleDeleteRelation(link: EntityGraphLink) {
    const relationKey = getRelationKey(link);
    setGraphData((prev) => ({
      ...prev,
      links: prev.links.filter((item) => getRelationKey(item) !== relationKey),
    }));
    message.success("关系已删除。");
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(graphData, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${graphData.centerId}-graph.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function handleFullscreen() {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await canvas.requestFullscreen();
  }

  return (
    <>
      <div
        style={{
          height: "calc(100vh - 112px)",
          display: "grid",
          gridTemplateColumns: "300px 1fr 350px",
          gap: 0,
          background: "#f7f9fc",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid #e5edf8",
        }}
      >
        <aside
          style={{
            background: "#fff",
            borderRight: "1px solid #e5e7eb",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 14 }}>
            图谱检索
          </div>
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => handleSearch()}
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="搜索实体或关系"
            allowClear
            style={{ height: 40 }}
          />
          <Button
            type="primary"
            block
            style={{
              marginTop: 12,
              height: 40,
              background: "#2563eb",
              boxShadow: "0 10px 18px rgba(37, 99, 235, 0.18)",
            }}
            onClick={() => void handleSearch()}
          >
            开始检索
          </Button>
          <div style={{ display: "grid", gap: 10, marginTop: 16, marginBottom: 26 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>工作区模式</div>
              <ModeSelectCard
                title="自动上传"
                description="面向批量增量文件，自动抽取实体并刷新图谱。"
                active={workspaceMode === "auto-upload"}
                accent="#2563eb"
                onClick={() => switchWorkspaceMode("auto-upload")}
                extra={
                  <Button type="primary" size="small" onClick={handleAutoUpload}>
                    立即同步
                  </Button>
                }
              />
              <ModeSelectCard
                title="手动上传"
                description="仅筛选手动上传来源的图谱数据与任务记录。"
                active={workspaceMode === "manual-upload"}
                accent="#0f766e"
                onClick={() => switchWorkspaceMode("manual-upload")}
              />
              <ModeSelectCard
                title="整个图谱展示"
                description="切换到全量图谱视图，展示更多关联路径与分支。"
                active={workspaceMode === "full-graph"}
                accent="#7c3aed"
                onClick={() => switchWorkspaceMode("full-graph")}
              />
              <ModeSelectCard
                title="社区网络发现"
                description="基于全图分支自动识别社区，查看桥接关系与团簇密度。"
                active={workspaceMode === "community"}
                accent="#b45309"
                onClick={() => switchWorkspaceMode("community")}
              />
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>上传任务</div>
              <div style={{ display: "grid", gap: 10 }}>
                {visibleUploadTasks.slice(0, 4).map((task) => (
                  <UploadTaskCard key={task.id} task={task} />
                ))}
                {visibleUploadTasks.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="当前过滤条件下暂无上传任务"
                  />
                ) : null}
              </div>
            </div>
          <SectionBlock title="实体类型">
            <Checkbox.Group
              style={{ display: "grid", gap: 12 }}
              value={checkedNodeTypes}
              onChange={(value) => setCheckedNodeTypes(value as EntityGraphNodeType[])}
            >
              {(["center", "entity", "value"] as EntityGraphNodeType[]).map((type) => (
                <Checkbox key={type} value={type}>
                  <span style={{ color: typeMeta[type].color, fontWeight: 600 }}>
                    {typeMeta[type].label}
                  </span>
                  <span style={{ color: "#64748b" }}> ({typeCounts[type]})</span>
                </Checkbox>
              ))}
            </Checkbox.Group>
          </SectionBlock>

          <SectionBlock title="关系类型">
            <Checkbox.Group
              style={{ display: "grid", gap: 12 }}
              value={checkedRelations}
              onChange={(value) => setCheckedRelations(value as string[])}
            >
              {relationOptions.map((relation) => (
                <Checkbox key={relation} value={relation}>
                  <span style={{ color: "#334155" }}>{relation}</span>
                  <span style={{ color: "#64748b" }}> ({relationCounts.get(relation) || 0})</span>
                </Checkbox>
              ))}
            </Checkbox.Group>
          </SectionBlock>

          <SectionBlock title="显示设置">
            <SliderRow
              label="节点大小"
              min={0.8}
              max={1.45}
              step={0.05}
              value={nodeScale}
              onChange={setNodeScale}
            />
            <SliderRow
              label="连线粗细"
              min={1}
              max={3.2}
              step={0.2}
              value={linkWidth}
              onChange={setLinkWidth}
            />
            <SliderRow
              label="节点字数"
              min={2}
              max={20}
              step={1}
              value={labelMaxLength}
              onChange={setLabelMaxLength}
            />
            <SliderRow
              label="已展开层级"
              min={1}
              max={5}
              step={1}
              value={Math.min(Math.max(graphSummary.expandedCount, 1), 5)}
              onChange={() => {}}
              disabled
            />
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              <CheckboxOptionRow
                label="显示节点"
                hint="控制图谱节点显隐"
                checked={showNodes}
                onChange={setShowNodes}
              />
              <CheckboxOptionRow
                label="显示关系"
                hint="控制关系连线显隐"
                checked={showLinks}
                onChange={setShowLinks}
              />
            </div>
          </SectionBlock>

          <SectionBlock title="图谱概览">
            <div
              style={{
                background: "#fafbfc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 8,
                  borderBottom: "1px solid #edf1f5",
                }}
              >
                <div style={{ color: "#64748b", fontSize: 12, flexShrink: 0 }}>当前中心</div>
                <div
                  style={{
                    color: "#0f172a",
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    wordBreak: "break-all",
                    textAlign: "right",
                  }}
                >
                  {graphData.centerId}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <OverviewMetricCard label="节点总数" value={String(graphSummary.nodeCount)} accent="#2563eb" />
                <OverviewMetricCard
                  label="关系总数"
                  value={String(graphSummary.relationCount)}
                  accent="#7c3aed"
                />
                <OverviewMetricCard
                  label="已展开节点"
                  value={String(graphSummary.expandedCount)}
                  accent="#0f766e"
                />
                <OverviewMetricCard
                  label="当前可见"
                  value={String(graphSummary.visibleCount)}
                  accent="#b45309"
                />
              </div>
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
              <Button type="text" icon={<ReloadOutlined />} onClick={() => void handleLoadRandomPreview()}>
                换一批
              </Button>
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

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {selectedNode ? (
              <>
                <div
                  style={{
                    marginBottom: 16,
                    paddingBottom: 16,
                    borderBottom: "1px solid #edf1f5",
                  }}
                >
                  <Space align="start" size={12}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: selectedNode.type === "center" ? "#dbeafe" : "#eef2ff",
                        color: selectedNode.type === "center" ? "#2563eb" : "#7c3aed",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <EntityIcon type={selectedNode.type} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
                        {selectedNode.name}
                      </div>
                      <Space size={8} style={{ marginTop: 8 }} wrap>
                        {selectedDetail.tag.map((tag) => (
                          <Tag key={tag} color="blue">
                            {tag}
                          </Tag>
                        ))}
                        <Tag color={selectedNode.type === "center" ? "geekblue" : "default"}>
                          {getNodeTypeLabel(selectedNode.type)}
                        </Tag>
                      </Space>
                    </div>
                  </Space>
                  <div
                    style={{
                      marginTop: 16,
                      borderRadius: 12,
                      background: "#f8fafc",
                      padding: 14,
                      color: "#475569",
                      lineHeight: 1.8,
                    }}
                  >
                    {selectedDetail.desc}
                  </div>
                  <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                    <DetailGridRow label="实体名称" value={selectedNode.name} />
                    <DetailGridRow label="节点类型" value={getNodeTypeLabel(selectedNode.type)} />
                    <DetailGridRow
                      label="来源方式"
                      value={hasPresetEntityRecord(selectedNode.name) ? "预置 mock 数据" : "动态扩展 mock 数据"}
                    />
                    <DetailGridRow
                      label="展开来源"
                      value={
                        selectedNode.parentId
                          ? `${selectedNode.parentId} / ${selectedNode.relationFromParent || "关联"}`
                          : "搜索中心节点"
                      }
                    />
                  </div>
                </div>

                <PanelSection
                  title="关联关系"
                  extra={
                    <Button size="small" type="link" onClick={openAddRelationModal}>
                      新增关系
                    </Button>
                  }
                >
                  {selectedRelations.length > 0 ? (
                    selectedRelations.slice(0, 5).map((link) => {
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
                          <Row align="middle">
                            <Col span={16}>
                              <Space size={8}>
                                <EntityTypeDot type={targetNode?.type || "value"} />
                                <strong style={{ color: "#1f2937" }}>{link.relation}</strong>
                              </Space>
                            </Col>
                            <Col span={8} style={{ textAlign: "right", color: "#94a3b8", fontSize: 12 }}>
                              置信度 {buildRelationConfidence(link)}
                            </Col>
                          </Row>
                          <Space size={8} style={{ marginTop: 8, color: "#475569" }}>
                            <EntityIcon type={targetNode?.type || "value"} />
                            <span>{targetId}</span>
                          </Space>
                          <Space size={6} style={{ marginTop: 10 }}>
                            <Button size="small" type="link" onClick={() => openEditRelationModal(link)}>
                              编辑
                            </Button>
                            <Popconfirm title="确认删除这条关系吗？" onConfirm={() => handleDeleteRelation(link)}>
                              <Button size="small" type="link" danger>
                                删除
                              </Button>
                            </Popconfirm>
                          </Space>
                        </div>
                      );
                    })
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击节点后加载关联关系" />
                  )}
                </PanelSection>

                <PanelSection
                  title="属性信息"
                >
                  {selectedDetail.avp.slice(0, 5).map(([label, value], index) => (
                    <div
                      key={`${label}-${value}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom:
                          index === selectedDetail.avp.slice(0, 12).length - 1
                            ? "none"
                            : "1px solid #eef2f7",
                      }}
                    >
                      <span style={{ color: "#64748b" }}>{label}</span>
                      <strong style={{ color: "#334155", textAlign: "right" }}>{value}</strong>
                    </div>
                  ))}
                </PanelSection>

                <PanelSection title="来源文档">
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>社区网络发现</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 4, marginBottom: 10 }}>
                    {activeCommunity
                      ? `当前聚焦 ${activeCommunity.name} 社区`
                      : "基于当前图谱结构自动识别高关联社区"}
                  </div>
                  <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                    {communities.slice(0, 4).map((community) => (
                      <CommunityCard
                        key={community.id}
                        community={community}
                        active={activeCommunityId === community.id}
                        onClick={() => handleFocusCommunity(community)}
                      />
                    ))}
                    {communities.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="当前图谱规模较小，展开更多节点后可进行社区发现"
                      />
                    ) : null}
                  </div>
                  {selectedDetail.sourceDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleOpenDocument(doc)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        border: "1px solid #eef2f7",
                        borderRadius: 12,
                        padding: 10,
                        marginBottom: 10,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: doc.type === "pdf" ? "#fff1f2" : "#eff6ff",
                          color: doc.type === "pdf" ? "#ef4444" : "#2563eb",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {doc.type === "pdf" ? <FilePdfOutlined /> : <FileTextOutlined />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            color: "#334155",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc.title}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>{doc.location}</div>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 12 }}>查看详情</div>
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
                style={{ width: "100%", height: 40, borderRadius: 10 }}
                icon={<EditOutlined />}
                onClick={openEditEntityModal}
              >
                编辑
              </Button>
              <Button style={{ width: "100%", height: 40, borderRadius: 10 }} onClick={openAddEntityModal}>
                新增实体
              </Button>
              {/* disabled={!selectedNode || expandedNodeIds.has(selectedNode.id)} */}
              <Button
                style={{ width: "100%", height: 40, borderRadius: 10 }}
                type={selectedNode?.id === graphData.centerId ? "primary" : "default"}
                danger={selectedNode?.id !== graphData.centerId}
                icon={selectedNode?.id === graphData.centerId ? <FolderOpenOutlined /> : undefined}
                onClick={() =>
                  selectedNode?.id === graphData.centerId
                    ? selectedNode && handleNodeExpand(selectedNode)
                    : handleDeleteEntity()
                }
              >
                {selectedNode?.id === graphData.centerId ? "查看更多" : "删除实体"}
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
                { label: "相关实体", value: "entity" },
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
            <Input placeholder="例如：关联、属于、合作" />
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
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: 26 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#1f2937",
          marginBottom: 14,
        }}
      >
        {title}
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
  disabled,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: "#64748b", marginBottom: 6 }}>{label}</div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} disabled={disabled} />
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
  extra,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  accent: string;
  extra?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 12,
        borderRadius: 14,
        border: active ? `1px solid ${accent}` : "1px solid #e2e8f0",
        background: active ? `${accent}12` : "#ffffff",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ color: "#0f172a", fontWeight: 700 }}>{title}</div>
        {extra}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>{description}</div>
    </button>
  );
}

function UploadTaskCard({ task }: { task: UploadTask }) {
  const statusMap: Record<UploadTask["status"], { label: string; color: string; background: string }> =
    {
      running: { label: "运行中", color: "#2563eb", background: "#dbeafe" },
      waiting: { label: "等待中", color: "#b45309", background: "#fef3c7" },
      done: { label: "已完成", color: "#0f766e", background: "#ccfbf1" },
    };
  const status = statusMap[task.status];

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ color: "#0f172a", fontWeight: 600, minWidth: 0, flex: 1 }}>{task.name}</div>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            color: status.color,
            background: status.background,
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {status.label}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 8, color: "#64748b", fontSize: 12 }}>
        <span>{task.source === "auto" ? "自动上传" : "手动上传"}</span>
        <span>{task.entityCount} 个实体</span>
        <span>{task.updatedAt}</span>
      </div>
    </div>
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
        border: active ? "1px solid #f59e0b" : "1px solid #e2e8f0",
        background: active ? "#fff7ed" : "#fff",
        borderRadius: 12,
        padding: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <strong style={{ color: "#1f2937" }}>{community.name}</strong>
        <span style={{ color: "#b45309", fontSize: 12 }}>{community.nodeIds.length} 节点</span>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, color: "#64748b", fontSize: 12, flexWrap: "wrap" }}>
        <span>{community.relationCount} 条关系</span>
        <span>{community.bridgeCount} 个桥接点</span>
        <span>密度 {community.density}</span>
      </div>
    </button>
  );
}

function PanelSection({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: "1px solid #edf1f5",
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
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{title}</div>
        {extra ? <div style={{ color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>{extra}</div> : null}
      </div>
      {children}
    </section>
  );
}

function DetailGridRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ color: "#334155", textAlign: "right" }}>{value}</strong>
    </div>
  );
}

function EntityIcon({ type }: { type: EntityGraphNodeType }): ReactNode {
  if (type === "center") return <SearchOutlined />;
  if (type === "entity") return <UserOutlined />;
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
