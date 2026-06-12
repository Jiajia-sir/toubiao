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
  Input,
  Row,
  Slider,
  Space,
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
  createGraphFromEntity,
  expandGraphWithEntity,
  getNodeDetail,
  getSuggestedEntities,
  hasPresetEntityRecord,
  hashText,
  type EntityGraphData,
  type EntityGraphLink,
  type EntityGraphNode,
  type EntityGraphNodeType,
  type SourceDocument,
} from "@/data/entityGraphMock";

const DEFAULT_ENTITY = "刘德华";

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

function buildInitialGraph(entityName: string) {
  return createGraphFromEntity(entityName);
}

function collectExpandedNodeIds(graph: EntityGraphData) {
  return new Set(graph.links.map((link) => link.source));
}

function collectRelationOptions(graph: EntityGraphData) {
  return Array.from(new Set(graph.links.map((link) => link.relation)));
}

export default function GraphPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const graphRef = useRef<EntityRelationGraphRef>(null);
  const graphCanvasRef = useRef<HTMLElement | null>(null);
  const previousRelationOptionsRef = useRef<string[]>([]);

  const incomingEntity = searchParams.get("entity");
  const initialEntity = incomingEntity || DEFAULT_ENTITY;
  const initialGraph = useMemo(() => buildInitialGraph(initialEntity), [initialEntity]);

  const [keyword, setKeyword] = useState(initialEntity);
  const [graphData, setGraphData] = useState<EntityGraphData>(() => initialGraph);
  const [selectedNodeId, setSelectedNodeId] = useState(initialEntity);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() =>
    collectExpandedNodeIds(initialGraph),
  );
  const [checkedNodeTypes, setCheckedNodeTypes] = useState<EntityGraphNodeType[]>([
    "center",
    "entity",
    "value",
  ]);
  const [checkedRelations, setCheckedRelations] = useState<string[]>(() =>
    collectRelationOptions(initialGraph),
  );
  const [nodeScale, setNodeScale] = useState(1);
  const [linkWidth, setLinkWidth] = useState(1.4);
  const [labelMaxLength, setLabelMaxLength] = useState(6);
  const [showNodes, setShowNodes] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [showRelationLabels, setShowRelationLabels] = useState(true);

  useEffect(() => {
    if (!incomingEntity) return;
    handleSearch(incomingEntity);
  }, [incomingEntity]);

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

  const filteredGraphData = useMemo(() => {
    const visibleNodeIds = new Set(
      graphData.nodes
        .filter((node) => checkedNodeTypes.includes(node.type))
        .map((node) => node.id),
    );

    return {
      centerId: graphData.centerId,
      nodes: graphData.nodes.filter((node) => visibleNodeIds.has(node.id)),
      links: graphData.links.filter(
        (link) =>
          visibleNodeIds.has(link.source) &&
          visibleNodeIds.has(link.target) &&
          checkedRelations.includes(link.relation),
      ),
    };
  }, [checkedNodeTypes, checkedRelations, graphData]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId],
  );

  const selectedDetail = useMemo(
    () => getNodeDetail(selectedNode?.name || graphData.centerId),
    [graphData.centerId, selectedNode?.name],
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

  function handleSearch(entityName = keyword) {
    const target = entityName.trim() || DEFAULT_ENTITY;
    const nextGraph = buildInitialGraph(target);
    const nextRelations = collectRelationOptions(nextGraph);

    setKeyword(target);
    setGraphData(nextGraph);
    setSelectedNodeId(nextGraph.centerId);
    setExpandedNodeIds(collectExpandedNodeIds(nextGraph));
    setCheckedNodeTypes(["center", "entity", "value"]);
    setCheckedRelations(nextRelations);
    setLinkWidth(1.4);
    previousRelationOptionsRef.current = nextRelations;
    window.setTimeout(() => graphRef.current?.resetZoom(), 40);

    if (!hasPresetEntityRecord(target)) {
      message.info("当前实体使用动态 mock 数据生成，支持继续点击节点展开。");
    }
  }

  function handleNodeClick(node: EntityGraphNode) {
    setSelectedNodeId(node.id);
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
            onClick={() => handleSearch()}
          >
            开始检索
          </Button>

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
                    onClick={() => handleSearch(item)}
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
              <Button type="text" icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
              <Button type="text" icon={<ExpandOutlined />} onClick={handleFullscreen}>
                全屏
              </Button>
            </Space>
          </Card>

          {filteredGraphData.nodes.length > 0 ? (
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Button
                style={{ width: "100%", height: 40, borderRadius: 10 }}
                icon={<EditOutlined />}
              >
                编辑
              </Button>
              {/* disabled={!selectedNode || expandedNodeIds.has(selectedNode.id)} */}
              <Button
                style={{ width: "100%", height: 40, borderRadius: 10 }}
                type="primary"
                icon={<FolderOpenOutlined />}
                onClick={() => selectedNode && handleNodeClick(selectedNode)}
              >
                查看更多
              </Button>
            </div>
          </div>
        </aside>
      </div>
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

function PanelSection({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: string;
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
        {extra ? (
          <div style={{ color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>{extra}</div>
        ) : null}
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
