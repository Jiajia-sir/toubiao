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
  type EntityGraphNode,
  type EntityGraphNodeType,
  type EntityNodeDetail,
  type SourceDocument,
} from "@/data/entityGraphMock";
import { randomPreviewGraph, searchGraph, type SearchGraphResult } from "@/services/biz/graph";
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
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
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
      return;
    }
    void handleLoadRandomPreview();
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
      const detailTags = getNodeDetail(node.name).tag;
      if (activeEntityTypeName && !detailTags.includes(activeEntityTypeName) && node.name !== activeEntityTypeName) {
        return false;
      }
      if (!keywordValue) {
        return true;
      }
      return node.name.toLowerCase().includes(keywordValue);
    });
  }, [activeEntityTypeName, entityNameKeyword, graphData.nodes]);

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
      if (node.id === graphData.centerId || node.type === "center") {
        return true;
      }
      if (!hasTypeFilter && !hasNameFilter) {
        return true;
      }
      if (hasTypeFilter && !focusIds.has(node.id)) {
        return false;
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
      setEntityTypes(result?.list || result?.records || []);
    } catch (error) {
      console.error(error);
      setEntityTypes([]);
      message.error("实体类型加载失败");
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

  async function handleLoadRandomPreview() {
    try {
      setGraphLoading(true);
      const response = await randomPreviewGraph({ nodeLimit: 10, linkLimit: 8 });
      const result = extractResultData<SearchGraphResult>(response);
      const nextGraph = buildGraphFromSearchResult(result, "");

      setKeyword("");
      setGraphData(nextGraph);
      setSelectedNodeId(nextGraph.centerId || nextGraph.nodes[0]?.id || "");
      setExpandedNodeIds(collectExpandedNodeIds(nextGraph));
      setActiveEntityTypeName(null);
      setEntityNameKeyword("");
      setActiveCommunityId(null);
      setLinkWidth(1.4);
      window.setTimeout(() => graphRef.current?.resetZoom(), 40);

      if (nextGraph.nodes.length === 0) {
        message.info("当前暂无可展示的图谱数据");
      }
    } catch (error) {
      console.error(error);
      setGraphData(createEmptyGraph(""));
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
      setActiveEntityTypeName(null);
      setEntityNameKeyword("");
      setActiveCommunityId(null);
      message.error("图谱加载失败");
    } finally {
      setGraphLoading(false);
    }
  }

  function switchWorkspaceMode(mode: WorkspaceMode) {
    setWorkspaceMode(mode);
    if (keyword.trim()) {
      void handleSearch(keyword, mode);
    }
  }

  function handleNodeExpand(node: EntityGraphNode) {
    setSelectedNodeId(node.id);
    if (!node.expandable || expandedNodeIds.has(node.id)) {
      return;
    }

    const result = expandGraphWithEntity(graphData, node.id);
    if (!result.expanded) {
      message.info("该节点暂无更多可展开关系");
      return;
    }

    setGraphData(result.graph);
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(node.id);
      return next;
    });
  }

  function handleNodeClick(node: EntityGraphNode) {
    setSelectedNodeId(node.id);
    if (node.expandable && !expandedNodeIds.has(node.id)) {
      handleNodeExpand(node);
    }
  }

  function handleEntityTypeChange(typeName: string | null) {
    setActiveEntityTypeName(typeName);
    setEntityNameKeyword("");
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
            onPressEnter={() => void handleSearch()}
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="搜索实体名称"
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

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>文档类型</div>
            <ModeSelectCard
              title="自动上传"
              description="查看自动上传来源对应的知识图谱数据。"
              active={workspaceMode === "auto-upload"}
              accent="#2563eb"
              onClick={() => switchWorkspaceMode("auto-upload")}
            />
            <ModeSelectCard
              title="手动上传"
              description="查看页面上传来源对应的知识图谱数据。"
              active={workspaceMode === "manual-upload"}
              accent="#0f766e"
              onClick={() => switchWorkspaceMode("manual-upload")}
            />
          </div>

          <SectionBlock title="实体类型">
            <div style={{ display: "grid", gap: 8 }}>
              <button
                type="button"
                onClick={() => handleEntityTypeChange(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: activeEntityTypeName === null ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: activeEntityTypeName === null ? "#eff6ff" : "#fff",
                  color: activeEntityTypeName === null ? "#2563eb" : "#1f2937",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontWeight: 600 }}>全部类型</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>清除筛选</span>
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                  maxHeight: 260,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {entityTypes.map((item) => {
                  const active = activeEntityTypeName === item.name;
                  return (
                    <button
                      key={String(item.id)}
                      type="button"
                      onClick={() => handleEntityTypeChange(item.name)}
                      title={item.name}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 4,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
                        background: active ? "#eff6ff" : "#fff",
                        cursor: "pointer",
                        minWidth: 0,
                        overflow: "hidden",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: "100%",
                          color: active ? "#2563eb" : "#1f2937",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </span>
                      <span style={{ fontSize: 11, color: item.description ? "#64748b" : "#94a3b8" }}>
                        {item.description || "点击筛选"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {entityTypeLoading ? <Spin size="small" /> : null}
              {!entityTypeLoading && entityTypes.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无实体类型" />
              ) : null}
            </div>
          </SectionBlock>

          <SectionBlock title="实体名称">
            <Input
              value={entityNameKeyword}
              onChange={(event) => setEntityNameKeyword(event.target.value)}
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              placeholder="输入实体名称筛选"
              allowClear
              style={{ height: 40 }}
            />

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
                maxHeight: 260,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {entityNameOptions.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleEntityNameSelect(node)}
                  title={node.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 6,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border:
                      selectedNodeId === node.id
                        ? `1px solid ${typeMeta[node.type].color}`
                        : "1px solid #e2e8f0",
                    background:
                      selectedNodeId === node.id ? `${typeMeta[node.type].color}12` : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      minWidth: 0,
                      overflow: "hidden",
                    }}
                  >
                    <EntityTypeDot type={node.type} />
                    <span
                      style={{
                        color: "#1f2937",
                        fontWeight: 600,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                        display: "block",
                        flex: 1,
                      }}
                    >
                      {node.name}
                    </span>
                  </div>
                  <span
                    style={{
                      color: "#94a3b8",
                      fontSize: 11,
                      lineHeight: 1,
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {node.expandable && !expandedNodeIds.has(node.id) ? "点击展开" : "已展示"}
                  </span>
                </button>
              ))}
              {entityNameOptions.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前筛选下暂无实体" />
              ) : null}
            </div>
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
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
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
          </SectionBlock>

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
                      value={hasPresetEntityRecord(selectedNode.name) ? "预置数据" : "动态图谱扩展"}
                    />
                    <DetailGridRow
                      label="展开来源"
                      value={
                        selectedNode.parentId
                          ? `${selectedNode.parentId} / ${selectedNode.relationFromParent || "关联"}`
                          : "检索中心节点"
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
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前实体暂无关系" />
                  )}
                </PanelSection>

                <PanelSection title="属性信息">
                  {selectedDetail.avp.slice(0, 5).map(([label, value], index) => (
                    <div
                      key={`${label}-${value}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom:
                          index === selectedDetail.avp.slice(0, 5).length - 1
                            ? "none"
                            : "1px solid #eef2f7",
                      }}
                    >
                      <span style={{ color: "#64748b" }}>{label}</span>
                      <strong style={{ color: "#334155", textAlign: "right" }}>{value}</strong>
                    </div>
                  ))}
                </PanelSection>

                <PanelSection
                  title="社区网络发现"
                  extra={
                    activeCommunity ? (
                      <Button size="small" type="link" onClick={handleClearCommunity}>
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

                <PanelSection title="来源文档">
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
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: "#64748b", marginBottom: 6 }}>{label}</div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
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
}: {
  title: string;
  description: string;
  active: boolean;
  accent: string;
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
      <div style={{ color: "#0f172a", fontWeight: 700 }}>{title}</div>
      <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>{description}</div>
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
