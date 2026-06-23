"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { history, useLocation, useParams } from "@umijs/max";
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudDownloadOutlined,
  ClusterOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  KeyOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  TagOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
    Modal,
  Progress,
  Row,
  Slider,
  Space,
  Tag,
  Tooltip,
} from "antd";
import { statusConfig } from "@/config/status";
import { entityTypeMeta, getDocumentParseDetail } from "@/data/documentGraph";
import type { EntityGraphData } from "@/data/entityGraphMock";
import EntityRelationGraph from "@/components/Graph/EntityRelationGraph";

type PreviewBlockType = "meta" | "heading" | "paragraph" | "bullet";

export default function DataDetailPage() {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [graphOpen, setGraphOpen] = useState(false);
  const [previewKeyword, setPreviewKeyword] = useState("");
  const [labelMaxLength, setLabelMaxLength] = useState(6);

  const baseDocument = getDocumentParseDetail(params.id || "");
  const sourceTitle = searchParams.get("title");
  const sourceType = searchParams.get("type");
  const sourceLocation = searchParams.get("location");
  const fromEntity = searchParams.get("fromEntity");

  const document = useMemo(
    () => ({
      ...baseDocument,
      title: sourceTitle || baseDocument.title,
      type: sourceType ? sourceType.toUpperCase() : baseDocument.type,
    }),
    [baseDocument, sourceTitle, sourceType],
  );

  const currentStatus = statusConfig[document.status];
  const entityCount = Object.values(document.entities).flat().length;

  const previewBlocks = useMemo(
    () =>
      [
        { type: "meta", value: "版本：V2.1" },
        { type: "meta", value: "更新日期：2026年4月20日" },
        { type: "meta", value: `编写人：产品部 ${document.uploader}` },
        { type: "heading", value: "1. 产品概述" },
        ...document.content.map((item) => ({ type: "paragraph", value: item })),
        { type: "heading", value: "2. 功能需求" },
        {
          type: "paragraph",
          value:
            "支持文件夹管理、文档批量上传、全文检索、实体抽取、关系抽取、标签分类和知识图谱构建。",
        },
        { type: "heading", value: "2.1 文件管理模块" },
        {
          type: "bullet",
          value: "支持上传多种格式的文件，包括 Word、Excel、PPT、PDF、图片、音频、视频等格式。",
        },
        {
          type: "bullet",
          value: "支持文件夹管理，用户可以创建、重命名、移动、删除文件夹。",
        },
        {
          type: "bullet",
          value: "支持文件的批量上传、下载、删除、移动操作。",
        },
        {
          type: "bullet",
          value: "支持文件版本管理，记录文件的修改历史，支持回滚到历史版本。",
        },
        { type: "heading", value: "2.2 智能解析模块" },
        {
          type: "bullet",
          value: "支持对上传的文件进行自动解析，提取文本内容、表格、图片等信息。",
        },
      ] as Array<{ type: PreviewBlockType; value: string }>,
    [document.content, document.uploader],
  );

  const filteredPreviewBlocks = useMemo(() => {
    const keyword = previewKeyword.trim().toLowerCase();
    if (!keyword) return previewBlocks;
    return previewBlocks.filter((block) => block.value.toLowerCase().includes(keyword));
  }, [previewBlocks, previewKeyword]);

  const entityGraphData = useMemo<EntityGraphData>(() => {
    const centerNode = document.graph.nodes[0];
    const centerId = centerNode?.name || "绉戞妧鍏徃A";
    
    return {
      centerId,
      nodes: document.graph.nodes.map(node => ({
        id: node.name,
        name: node.name,
        type: node.name === centerId ? "center" : "entity",
        desc: node.description,
        depth: node.name === centerId ? 0 : 1,
      })),
      links: document.graph.links.map(link => {
        const sourceNode = document.graph.nodes.find(n => n.id === link.source);
        const targetNode = document.graph.nodes.find(n => n.id === link.target);
        return {
          source: sourceNode?.name || link.source,
          target: targetNode?.name || link.target,
          relation: link.relation,
        };
      })
    };
  }, [document.graph]);

  const handleGraphNodeClick = (nodeName: string) => {
    const query = new URLSearchParams({
      entity: nodeName,
      docId: document.id,
    });
    setGraphOpen(false);
    history.push(`/graph?${query.toString()}`);
  };

  return (
    <>
      <div style={{ minHeight: "100%", background: "#f5f7fb", paddingBottom: 12 }}>
        <div style={{ marginBottom: 10, color: "#8a94a6", fontSize: 13 }}>
          <Breadcrumb
            items={[
              { title: "首页" },
              { title: "知识库" },
              { title: <span style={{ color: "#1f2937", fontWeight: 600 }}>文件解析详情</span> },
            ]}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 12, minWidth: 0, flex: 1 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => history.go(-1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderColor: "#dbe3ef",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Space align="center" size={10} wrap>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1f2a44", wordBreak: "break-word" }}>
                  {document.title}
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#16a34a",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#22c55e",
                    }}
                  />
                  {currentStatus.text}
                </span>
              </Space>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                  marginTop: 8,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                <InlineMeta icon={<FilePdfOutlined style={{ color: "#ef4444" }} />} text={`${document.type} 鏂囦欢`} />
                <InlineMeta icon={<AppstoreOutlined />} text={document.size} />
                <InlineMeta icon={<ClockCircleOutlined />} text={`涓婁紶浜?${document.uploadedAt}`} />
                <InlineMeta icon={<UserOutlined />} text={`涓婁紶鑰?${document.uploader}`} />
              </div>
              {/* {(sourceLocation || fromEntity) 
              && (
                <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
                  {sourceLocation ? `鏉ユ簮浣嶇疆锛?{sourceLocation}` : ""}
                  {sourceLocation && fromEntity ? " 路 " : ""}
                  {fromEntity ? `鏉ユ簮瀹炰綋锛?{fromEntity}` : ""}
                </div>
              )} */}
            </div>
          </div>

          <Space wrap size={[8, 8]}>
            <Button icon={<CloudDownloadOutlined />} style={actionButtonStyle}>
              涓嬭浇瑙ｆ瀽缁撴灉
            </Button>
            <Button icon={<ReloadOutlined />} style={actionButtonStyle}>
              閲嶆柊瑙ｆ瀽
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              style={{
                ...actionButtonStyle,
                color: "#fff",
                borderColor: "#2563eb",
                background: "#2563eb",
                boxShadow: "0 10px 18px rgba(37, 99, 235, 0.16)",
              }}
            >
              淇濆瓨鍒扮煡璇嗗簱
            </Button>
          </Space>
        </div>

        <Row gutter={[12, 12]} align="stretch" style={{ marginBottom: 12 }}>
          <Col xs={24} xl={10} style={{ display: "flex" }}>
            <Card
              bordered={false}
              title="瑙ｆ瀽杩涘害"
              style={{ ...surfaceCardStyle, width: "100%", height: "100%" }}
              styles={{ header: { minHeight: 44, padding: "0 14px" }, body: { padding: 12 } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#334155", fontWeight: 600 }}>鏁翠綋杩涘害</span>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>100%</span>
              </div>
              <Progress percent={100} showInfo={false} strokeColor="#16a34a" trailColor="#ebf7ef" />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 10,
                  overflowX: "auto",
                  flexWrap: "nowrap",
                  paddingBottom: 2,
                }}
              >
                {document.parseSteps.map((step) => (
                  <div
                    key={step.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: step.completed ? "#f0fdf4" : "#f8fafc",
                      border: `1px solid ${step.completed ? "#bbf7d0" : "#e2e8f0"}`,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircleFilled style={{ color: step.completed ? "#22c55e" : "#cbd5e1", fontSize: 13 }} />
                    <span style={{ color: "#64748b", fontSize: 12 }}>{step.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={14} style={{ display: "flex" }}>
            <Card
              bordered={false}
              title="鏂囨。缁熻"
              style={{ ...surfaceCardStyle, width: "100%", height: "100%" }}
              styles={{ header: { minHeight: 44, padding: "0 14px" }, body: { padding: 14, height: "100%" } }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                <StatPanel icon={<KeyOutlined />} color="#ef4444" label="关键词" value={document.keywords.length} />
                <StatPanel icon={<ClusterOutlined />} color="#0891b2" label="瀹炰綋鏁伴噺" value={entityCount} />
                <StatPanel icon={<TagOutlined />} color="#0ea5e9" label="鏍囩鏁伴噺" value={document.tags.length} />
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]} align="stretch">
          <Col xs={24} xl={16} style={{ display: "flex" }}>
            <Card
              bordered={false}
              title="鍐呭棰勮"
              extra={
                <Space size={8}>
                  <Button icon={<FileTextOutlined />} style={toolbarIconButtonStyle} />
                  <Button icon={<AppstoreOutlined />} style={toolbarIconButtonStyle} />
                  <Input
                    allowClear
                    value={previewKeyword}
                    onChange={(event) => setPreviewKeyword(event.target.value)}
                    placeholder="鎼滅储鍐呭"
                    prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                    style={{ width: 220 }}
                  />
                </Space>
              }
              style={{ ...surfaceCardStyle, width: "100%", height: "100%" }}
              styles={{ body: { padding: 14, height: "calc(100% - 57px)" } }}
            >
              <div
                style={{
                  border: "1px solid #dfe7f2",
                  borderRadius: 12,
                  background: "#fbfcff",
                  padding: "16px 20px",
                  height: "100%",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1f2a44", marginBottom: 12 }}>
                  {document.title.replace(/\.(pdf|docx)$/i, "")}
                </div>
                <div style={{ display: "grid", gap: 4, color: "#64748b", marginBottom: 18, fontSize: 13 }}>
                  <div>版本：V2.1</div>
                  <div>更新日期：2026年4月20日</div>
                  <div>编写人：产品部 {document.uploader}</div>
                </div>

                {filteredPreviewBlocks.length > 0 ? (
                  filteredPreviewBlocks.map((block, index) => (
                    <PreviewBlock key={`${block.type}-${index}-${block.value}`} type={block.type}>
                      {block.value}
                    </PreviewBlock>
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配内容" style={{ marginTop: 48 }} />
                )}
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={8} style={{ display: "flex" }}>
            <div style={{ display: "grid", gap: 12, width: "100%" }}>
              <Card bordered={false} title="元数据信息" style={surfaceCardStyle} styles={{ body: { padding: 14 } }}>
                <InfoList
                  items={[
                    ["文档标题", document.title.replace(/\.(pdf|docx)$/i, "")],
                    ["版本号", "V2.1"],
                    ["作者", document.uploader],
                    ["创建日期", "2026-04-15"],
                    ["修改日期", "2026-04-20"],
                    ["文件格式", document.type],
                    ["文件大小", document.size],
                    ["语言", "中文"],
                  ]}
                />
              </Card>

              <Card
                bordered={false}
                title="提取关键词"
                extra={<span style={{ color: "#94a3b8" }}>共 {document.keywords.length} 个</span>}
                style={surfaceCardStyle}
                styles={{ body: { padding: 14 } }}
              >
                <Space wrap size={[8, 10]}>
                  {document.keywords.map((item, index) => (
                    <ColorTag key={item} palette={keywordPalettes[index % keywordPalettes.length]}>
                      {item}
                    </ColorTag>
                  ))}
                </Space>
              </Card>

              <Card
                bordered={false}
                title="鎻愬彇瀹炰綋"
                extra={
                  <Space size={8}>
                    <span style={{ color: "#94a3b8" }}>共 {entityCount} 个</span>
                    <Tooltip title="查看本文档知识图谱">
                      <Button
                        type="text"
                        shape="circle"
                        icon={<ClusterOutlined />}
                        onClick={() => setGraphOpen(true)}
                      />
                    </Tooltip>
                  </Space>
                }
                style={surfaceCardStyle}
                styles={{ body: { padding: 14 } }}
              >
                <div style={{ display: "grid", gap: 12 }}>
                  {Object.entries(document.entities).map(([type, entities], index) => {
                    const meta = entityTypeMeta[type as keyof typeof entityTypeMeta];
                    return (
                      <div
                        key={type}
                        style={{
                          paddingBottom: 12,
                          borderBottom: index === Object.entries(document.entities).length - 1 ? "none" : "1px dashed #edf2f7",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                            color: "#334155",
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: meta.color,
                              flexShrink: 0,
                            }}
                          />
                          <span>{meta.label}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {entities.map((entity) => (
                            <ColorTag
                              key={entity.id}
                              palette={{ bg: meta.bg, border: `${meta.color}22`, text: meta.color }}
                            >
                              {entity.name}
                            </ColorTag>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card
                bordered={false}
                title="标签分类结果"
                extra={<span style={{ color: "#94a3b8" }}>共 {document.tags.length} 个</span>}
                style={surfaceCardStyle}
                styles={{ body: { padding: 14 } }}
              >
                <Space wrap size={[8, 10]}>
                  {document.tags.map((item, index) => (
                    <ColorTag key={item} palette={tagPalettes[index % tagPalettes.length]}>
                      {item}
                    </ColorTag>
                  ))}
                </Space>
              </Card>
            </div>
          </Col>
        </Row>

        <Modal
          title="文档知识图谱"
          open={graphOpen}
          width={1400}
          style={{ top: 40 }}
          footer={null}
          destroyOnClose
          onCancel={() => setGraphOpen(false)}
        >
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#64748b" }}>
              点击任意节点会跳转到“图谱检索”，并自动带入节点名称发起查询。
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, width: 250 }}>
              <span style={{ color: "#334155", fontSize: 14 }}>节点字数</span>
              <Slider
                style={{ flex: 1, margin: 0 }}
                min={2}
                max={20}
                step={1}
                value={labelMaxLength}
                onChange={setLabelMaxLength}
              />
            </div>
          </div>
          <EntityRelationGraph
            data={entityGraphData}
            height={750}
            labelMaxLength={labelMaxLength}
            onNodeClick={(node) => handleGraphNodeClick(node.name)}
          />
          <Divider style={{ margin: "16px 0 0" }} />
        </Modal>
      </div>
    </>
  );
}

const surfaceCardStyle = {
  borderRadius: 18,
  boxShadow: "0 8px 28px rgba(15, 23, 42, 0.05)",
};

const actionButtonStyle = {
  height: 34,
  borderRadius: 10,
  borderColor: "#d9e3ef",
  paddingInline: 12,
};

const toolbarIconButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  borderColor: "#dbe3ef",
  color: "#64748b",
};

const keywordPalettes = [
  { bg: "#eef4ff", border: "#dbe7ff", text: "#2563eb" },
  { bg: "#f3ecff", border: "#eadcff", text: "#7c3aed" },
  { bg: "#ecfdf5", border: "#d1fae5", text: "#059669" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" },
  { bg: "#fff1f2", border: "#fecdd3", text: "#ef4444" },
  { bg: "#f8fafc", border: "#e2e8f0", text: "#475569" },
];

const tagPalettes = [
  { bg: "#eef4ff", border: "#dbe7ff", text: "#2563eb" },
  { bg: "#f5f3ff", border: "#e9d5ff", text: "#7c3aed" },
  { bg: "#ecfdf5", border: "#d1fae5", text: "#059669" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" },
  { bg: "#fff1f2", border: "#fecdd3", text: "#ef4444" },
  { bg: "#ecfeff", border: "#bae6fd", text: "#0284c7" },
];

function InlineMeta({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {icon}
      <span>{text}</span>
    </span>
  );
}

function StatPanel({
  icon,
  color,
  label,
  value,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #edf2f7",
        borderRadius: 12,
        padding: 10,
        minHeight: 68,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color, fontWeight: 600 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 13 }}>{label}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: "#1f2937", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function InfoList({ items }: { items: Array<[string, string]> }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "flex-start",
          }}
        >
          <span style={{ color: "#64748b" }}>{label}</span>
          <span style={{ color: "#1f2937", fontWeight: 600, textAlign: "right" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function ColorTag({
  children,
  palette,
}: {
  children: ReactNode;
  palette: { bg: string; border: string; text: string };
}) {
  return (
    <Tag
      style={{
        margin: 0,
        borderRadius: 999,
        padding: "4px 10px",
        background: palette.bg,
        borderColor: palette.border,
        color: palette.text,
      }}
    >
      {children}
    </Tag>
  );
}

function PreviewBlock({
  type,
  children,
}: {
  type: PreviewBlockType;
  children: ReactNode;
}) {
  if (type === "heading") {
    return (
      <h3 style={{ margin: "20px 0 12px", fontSize: 18, color: "#1f2937", fontWeight: 700 }}>
        {children}
      </h3>
    );
  }

  if (type === "meta") {
    return <div style={{ color: "#64748b", marginBottom: 4, fontSize: 13 }}>{children}</div>;
  }

  if (type === "bullet") {
    return (
      <div style={{ color: "#334155", lineHeight: 1.9, marginBottom: 8 }}>
        - {children}
      </div>
    );
  }

  return (
    <p style={{ color: "#334155", lineHeight: 1.9, margin: "0 0 14px", fontSize: 15 }}>
      {children}
    </p>
  );
}

