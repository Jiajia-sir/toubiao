"use client";

import { useState, useEffect } from "react";
import { history, useParams } from "@umijs/max";
import {
  Card,
  Button,
  Space,
  Input,
  Table,
  Tag,
  Row,
  Col,
  Tabs,
  Statistic,
  Modal,
  Form,
  message,
  Progress,
  Divider,
  Pagination,
  DatePicker,
  Select,
  Popconfirm,
  Alert,
} from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileMarkdownOutlined,
  FileImageOutlined,
  LoadingOutlined,
  FolderOutlined,
  InboxOutlined,
  CloudUploadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { fileTypeConfig } from "@/config/fileTypes";
import { statusConfig } from "@/config/status";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  entityCount: number;
  status: "active" | "disabled";
  createTime: string;
  color?: string;
}

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  size: string;
  uploadTime: string;
  status: "completed" | "running" | "pending" | "failed";
  progress?: number;
  tags?: string[];
  uploader?: string;
}

const initialData: KnowledgeBase[] = [
  {
    id: "1",
    name: "产品研发库",
    description: "公司2024年所有项目相关文档",
    documentCount: 1256,
    entityCount: 8945,
    status: "active",
    createTime: "2024-01-10 10:00:00",
    color: "#1890ff",
  },
  {
    id: "2",
    name: "行业研发库",
    description: "行业研发相关文档",
    documentCount: 856,
    entityCount: 5623,
    status: "active",
    createTime: "2024-01-12 14:30:00",
    color: "#52c41a",
  },
  {
    id: "3",
    name: "财务库",
    description: "各行业研究报告和数据分析财务相关文档",
    documentCount: 423,
    entityCount: 3215,
    status: "active",
    createTime: "2024-01-15 09:20:00",
    color: "#faad14",
  },

  {
    id: "4",
    name: "市场分析库",
    description: "市场分析文档",
    documentCount: 567,
    entityCount: 3420,
    status: "active",
    createTime: "2024-01-20 11:15:00",
    color: "#eb2f96",
  },
  {
    id: "5",
    name: "项目管理库",
    description: "员工手册和HR项目管理相关文档",
    documentCount: 189,
    entityCount: 1230,
    status: "active",
    createTime: "2024-01-22 15:30:00",
    color: "#13c2c2",
  },
];

const initialDocuments: DocumentItem[] = [
  {
    id: "1",
    title: "产品需求文档 PRD v2.0",
    type: "PDF",
    size: "2.4 MB",
    uploadTime: "2024-01-15 10:30:00",
    status: "completed",
    tags: ["需求", "产品"],
    uploader: "张三",
  },
  {
    id: "2",
    title: "用户界面设计稿",
    type: "Figma",
    size: "15.8 MB",
    uploadTime: "2024-01-14 14:20:00",
    status: "completed",
    tags: ["设计", "UI"],
    uploader: "李四",
  },
  {
    id: "3",
    title: "API接口文档",
    type: "Markdown",
    size: "128 KB",
    uploadTime: "2024-01-13 09:15:00",
    status: "running",
    progress: 65,
    tags: ["技术", "API"],
    uploader: "王五",
  },
  {
    id: "4",
    title: "测试用例文档",
    type: "Excel",
    size: "456 KB",
    uploadTime: "2024-01-12 16:45:00",
    status: "pending",
    tags: ["测试"],
    uploader: "赵六",
  },
  {
    id: "5",
    title: "系统架构设计",
    type: "PDF",
    size: "3.2 MB",
    uploadTime: "2024-01-11 11:00:00",
    status: "completed",
    tags: ["架构", "技术"],
    uploader: "钱七",
  },
];

export default function KnowledgeDetailPage({
}: {}) {
  const params = useParams<{ id: string }>();
  const knowledgeId = params.id || "";
  const [knowledge, setKnowledge] = useState<KnowledgeBase | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("documents");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("全部");
  const [statusFilter, setStatusFilter] = useState<string>("全部");
  const [dateFilter, setDateFilter] = useState<string>("全部");
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadTags, setUploadTags] = useState("");
  const [uploadCatalog, setUploadCatalog] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [gridPage, setGridPage] = useState(1);
  const gridPageSize = 6;
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<React.Key[]>(
    [],
  );
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [targetKnowledgeBase, setTargetKnowledgeBase] = useState<string>("");
  const [moveConfirmVisible, setMoveConfirmVisible] = useState(false);

  const fileTypeOptions = [
    "全部",
    "文档",
    "表格",
    "演示文档",
    "图片",
    "PDF",
    "其他",
  ];
  const statusOptions = ["全部", "已完成", "进行中", "待处理", "失败"];
  const dateOptions = ["全部", "近7天", "近30天"];

  const catalogOptions = [
    { label: "产品文档", value: "产品文档" },
    { label: "技术文档", value: "技术文档" },
    { label: "规范文档", value: "规范文档" },
    { label: "制度文档", value: "制度文档" },
    { label: "合同协议", value: "合同协议" },
    { label: "项目文档", value: "项目文档" },
    { label: "人事文档", value: "人事文档" },
    { label: "财务文档", value: "财务文档" },
    { label: "其他", value: "其他" },
  ];

  useEffect(() => {
    const found = initialData.find((item) => item.id === knowledgeId);
    if (found) {
      setKnowledge(found);
    }
  }, [knowledgeId]);

  const handleUpload = () => {
    if (!knowledge) return;
    if (!uploadCatalog) {
      message.warning("请选择编目分类");
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      const newDoc = {
        id: Date.now().toString(),
        title: `上传文档_${Date.now()}.docx`,
        type: "DOCX",
        size: "1.5MB",
        uploadTime: new Date().toLocaleString(),
        status: "pending" as const,
        tags: uploadTags ? uploadTags.split(",").map((t) => t.trim()) : [],
      };
      setDocuments((prev) => [newDoc, ...prev]);
      setUploading(false);
      setUploadProgress(100);
      message.success("上传成功");
      setUploadVisible(false);
      setUploadTags("");
      setUploadProgress(0);
    }, 2500);
  };

  const handleBatchMove = () => {
    if (selectedDocumentIds.length === 0) {
      message.warning("请先选择要移动的文档");
      return;
    }
    setMoveModalVisible(true);
    setTargetKnowledgeBase("");
  };

  const handleConfirmMove = () => {
    if (!targetKnowledgeBase) {
      message.warning("请选择目标知识库");
      return;
    }
    const targetKB = initialData.find((kb) => kb.id === targetKnowledgeBase);
    if (!targetKB) {
      message.error("目标知识库不存在");
      return;
    }
    setMoveConfirmVisible(true);
  };

  const handleExecuteMove = () => {
    if (!targetKnowledgeBase) return;
    const targetKB = initialData.find((kb) => kb.id === targetKnowledgeBase);
    if (!targetKB) {
      message.error("目标知识库不存在");
      return;
    }

    setDocuments((prev) =>
      prev.filter((doc) => !selectedDocumentIds.includes(doc.id)),
    );
    setSelectedDocumentIds([]);
    setMoveModalVisible(false);
    setMoveConfirmVisible(false);
    setTargetKnowledgeBase("");
    message.success(
      `已成功移动 ${selectedDocumentIds.length} 个文档到 ${targetKB.name}`,
    );
  };

  const typeIconMap: Record<string, React.ReactNode> = {
    PDF: (
      <FilePdfOutlined
        style={{ fontSize: 24, color: fileTypeConfig.PDF.color }}
      />
    ),
    Excel: (
      <FileExcelOutlined
        style={{ fontSize: 24, color: fileTypeConfig.Excel.color }}
      />
    ),
    Markdown: (
      <FileMarkdownOutlined
        style={{ fontSize: 24, color: fileTypeConfig.Markdown.color }}
      />
    ),
    Figma: (
      <FileImageOutlined
        style={{ fontSize: 24, color: fileTypeConfig.Figma.color }}
      />
    ),
  };

  const getTypeColor = (type: string) => {
    return (
      (fileTypeConfig as Record<string, { bgColor: string }>)[type]?.bgColor ||
      fileTypeConfig.default.bgColor
    );
  };

  const columns = [
    {
      title: "文档名称",
      dataIndex: "title",
      key: "title",
      width: 400,
      render: (_: string, record: DocumentItem) => (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: getTypeColor(record.type),
              borderRadius: 8,
            }}
          >
            {typeIconMap[record.type] || (
              <FileTextOutlined style={{ fontSize: 24, color: "#8c8c8c" }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "#262626" }}>
              {record.title}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {record.type} · {record.size}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "解析状态",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (_: string, record: DocumentItem) => {
        const config = statusConfig[record.status as keyof typeof statusConfig];
        return (
          <div>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              {record.status === "running" ? (
                <LoadingOutlined spin style={{ color: config.color }} />
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: config.color,
                  }}
                />
              )}
              <span style={{ color: config.color }}>{config.text}</span>
            </span>
            {record.status === "running" && record.progress !== undefined && (
              <Progress
                percent={record.progress}
                size="small"
                strokeColor={config.color}
                style={{ width: 100 }}
              />
            )}
          </div>
        );
      },
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 80,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 100,
    },
    {
      title: "分类标签",
      dataIndex: "tags",
      key: "tags",
      width: 150,
      render: (tags: string[] | undefined) =>
        tags?.map((tag) => (
          <Tag key={tag} color="blue" style={{ marginRight: 4 }}>
            {tag}
          </Tag>
        )),
    },
    {
      title: "上传者",
      dataIndex: "uploader",
      key: "uploader",
      width: 100,
    },
    {
      title: "上传时间",
      dataIndex: "uploadTime",
      key: "uploadTime",
      width: 200,
    },
    {
      title: "操作",
      key: "action",
      width: 240,
      render: (_: any, record: DocumentItem) => {
        const handleDelete = () => {
          setDocuments((prev) => prev.filter((d) => d.id !== record.id));
          message.success("删除成功");
        };
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
            onClick={() => history.push(`/data/document/${record.id}`)}
            >
              详情
            </Button>
            <Button type="link" size="small" icon={<DownloadOutlined />}>
              下载
            </Button>
            <Popconfirm
              title="确认删除?"
              onConfirm={handleDelete}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  if (!knowledge) {
    return (
      <>
        <div style={{ padding: 24, textAlign: "center", color: "#8c8c8c" }}>
          知识库不存在
        </div>
      </>
    );
  }

  const typeMapping: Record<string, string[]> = {
    文档: ["DOCX", "MD", "TXT"],
    表格: ["XLSX", "Excel"],
    演示文稿: ["PPTX", "PowerPoint"],
    图片: ["Figma", "PNG", "JPG", "JPEG"],
    PDF: ["PDF"],
  };

  const statusMapping: Record<string, string> = {
    已完成: "completed",
    进行中: "running",
    待处理: "pending",
    失败: "failed",
  };

  const filteredDocs = documents.filter((doc) => {
    if (
      searchText &&
      !doc.title.toLowerCase().includes(searchText.toLowerCase())
    ) {
      return false;
    }

    if (fileTypeFilter !== "全部") {
      const types = typeMapping[fileTypeFilter] || [fileTypeFilter];
      if (!types.includes(doc.type)) {
        return false;
      }
    }

    if (statusFilter !== "全部") {
      const targetStatus = statusMapping[statusFilter];
      if (doc.status !== targetStatus) {
        return false;
      }
    }

    if (dateFilter !== "全部") {
      const docDate = new Date(doc.uploadTime);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dateFilter === "近7天" && diffDays > 7) {
        return false;
      }
      if (dateFilter === "近30天" && diffDays > 30) {
        return false;
      }
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const docDate = new Date(doc.uploadTime);
      const startDate = new Date(dateRange[0]);
      const endDate = new Date(dateRange[1]);
      if (docDate < startDate || docDate > endDate) {
        return false;
      }
    }

    return true;
  });

  return (
    <>
      <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px" }}>
        <Card
          style={{
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
          }}
          styles={{ body: { flex: 1, minHeight: "86vh" } }}
        >
          <div style={{ padding: 24, borderBottom: "1px solid #f0f0f0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => history.go(-1)}
                >
                  返回
                </Button>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `linear-gradient(135deg, ${knowledge.color}15 0%, ${knowledge.color}30 100%)`,
                    borderRadius: 12,
                    border: `1px solid ${knowledge.color}20`,
                  }}
                >
                  <FolderOutlined
                    style={{ fontSize: 24, color: knowledge.color }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      color: "#262626",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {knowledge.name}
                    <Tag
                      color={
                        knowledge.status === "active" ? "success" : "default"
                      }
                    >
                      {knowledge.status === "active" ? "启用" : "禁用"}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 14, color: "#8c8c8c", marginTop: 2 }}>
                    {knowledge.description}
                  </div>
                </div>
              </div>
              <Space size={24}>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div
                    style={{ fontSize: 20, color: "#1890ff", fontWeight: 600 }}
                  >
                    {knowledge.documentCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>文档数量</div>
                </div>
                <Divider
                  type="vertical"
                  style={{ height: 40, margin: "0 8px" }}
                />
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div
                    style={{ fontSize: 20, color: "#52c41a", fontWeight: 600 }}
                  >
                    {knowledge.entityCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>实体数量</div>
                </div>
                <Divider
                  type="vertical"
                  style={{ height: 40, margin: "0 8px" }}
                />
                <div style={{ textAlign: "center", minWidth: 100 }}>
                  <div style={{ fontSize: 14, color: "#8c8c8c" }}>
                    {knowledge.createTime}
                  </div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>创建时间</div>
                </div>
              </Space>
            </div>
          </div>

          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #f0f0f0",
              background: "linear-gradient(180deg, #f7f9fc 0%, #fff 100%)",
            }}
          >
            <Row
              gutter={[16, 12]}
              align="middle"
              style={{ display: "inline-flex", width: "100%" }}
            >
              <Col flex="auto">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#8c8c8c", width: 42 }}>
                    类型
                  </span>
                  <Space wrap size="small">
                    {fileTypeOptions.map((option) => (
                      <Tag
                        key={option}
                        style={{
                          cursor: "pointer",
                          margin: 0,
                          borderColor:
                            fileTypeFilter === option ? "#1890ff" : "#d9d9d9",
                          background:
                            fileTypeFilter === option ? "#e6f7ff" : "#fff",
                          color:
                            fileTypeFilter === option ? "#1890ff" : "#595959",
                        }}
                        onClick={() => setFileTypeFilter(option)}
                      >
                        {option}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </Col>

              <Col flex="auto">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#8c8c8c", width: 42 }}>
                    状态
                  </span>
                  <Space wrap size="small">
                    {statusOptions.map((option) => {
                      const statusColors: Record<string, string> = {
                        全部: "#595959",
                        已完成: "#52c41a",
                        进行中: "#1890ff",
                        待处理: "#faad14",
                        失败: "#ff4d4f",
                      };
                      return (
                        <Tag
                          key={option}
                          style={{
                            cursor: "pointer",
                            margin: 0,
                            borderColor:
                              statusFilter === option
                                ? statusColors[option]
                                : "#d9d9d9",
                            background:
                              statusFilter === option
                                ? `${statusColors[option]}10`
                                : "#fff",
                            color:
                              statusFilter === option
                                ? statusColors[option]
                                : "#595959",
                          }}
                          onClick={() => setStatusFilter(option)}
                        >
                          {option}
                        </Tag>
                      );
                    })}
                  </Space>
                </div>
              </Col>

              <Col flex="auto">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#8c8c8c", width: 42 }}>
                    时间
                  </span>
                  <Space wrap size="small">
                    {dateOptions.map((option) => (
                      <Tag
                        key={option}
                        style={{
                          cursor: "pointer",
                          margin: 0,
                          borderColor:
                            dateFilter === option ? "#722ed1" : "#d9d9d9",
                          background:
                            dateFilter === option ? "#f9f0ff" : "#fff",
                          color: dateFilter === option ? "#722ed1" : "#595959",
                        }}
                        onClick={() => setDateFilter(option)}
                      >
                        {option}
                      </Tag>
                    ))}
                    <Tag
                      style={{
                        cursor: "pointer",
                        margin: 0,
                        borderColor:
                          dateFilter === "自定义" ? "#ff4d4f" : "#d9d9d9",
                        background:
                          dateFilter === "自定义" ? "#fff1f0" : "#fff",
                        color: dateFilter === "自定义" ? "#ff4d4f" : "#595959",
                      }}
                      onClick={() => setDateFilter("自定义")}
                    >
                      自定义
                    </Tag>
                  </Space>
                  {dateFilter === "自定义" && (
                    <Col>
                      <DatePicker.RangePicker
                        size="small"
                        placeholder={["开始日期", "结束日期"]}
                        onChange={(dates) => {
                          if (dates) {
                            const start = dates[0]?.format("YYYY-MM-DD") || "";
                            const end = dates[1]?.format("YYYY-MM-DD") || "";
                            setDateRange([start, end]);
                          } else {
                            setDateRange(null);
                          }
                        }}
                        style={{ width: 220 }}
                      />
                    </Col>
                  )}
                </div>
              </Col>

              <Col flex={1} style={{ minWidth: 320 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Input
                    placeholder="搜索文档名称..."
                    allowClear
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 220 }}
                    prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setUploadVisible(true)}
                  >
                    上传文档
                  </Button>
                  <Button
                    type={viewMode === "list" ? "primary" : "default"}
                    icon={<UnorderedListOutlined />}
                    onClick={() => setViewMode("list")}
                  />
                  <Button
                    type={viewMode === "grid" ? "primary" : "default"}
                    icon={<AppstoreOutlined />}
                    onClick={() => setViewMode("grid")}
                  />
                </div>
              </Col>
            </Row>
          </div>

          <div style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                {selectedDocumentIds.length > 0 && (
                  <span
                    style={{
                      fontSize: 14,
                      color: "#1890ff",
                      fontWeight: 600,
                    }}
                  >
                    已选择 {selectedDocumentIds.length} 个文档
                  </span>
                )}
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<SwapOutlined />}
                  disabled={selectedDocumentIds.length === 0}
                  onClick={handleBatchMove}
                >
                  批量移动
                </Button>
              </Space>
            </div>
            {viewMode === "list" ? (
              <Table
                dataSource={filteredDocs}
                columns={columns}
                rowKey="id"
                rowSelection={{
                  selectedRowKeys: selectedDocumentIds,
                  onChange: (selectedKeys) =>
                    setSelectedDocumentIds(selectedKeys),
                }}
                pagination={{ pageSize: 5 }}
              />
            ) : (
              <>
                <Row gutter={[24, 24]}>
                  {filteredDocs
                    .slice(
                      (gridPage - 1) * gridPageSize,
                      gridPage * gridPageSize,
                    )
                    .map((doc, index) => (
                      <Col xs={24} sm={12} lg={8} key={doc.id}>
                        <Card
                          hoverable
                          style={{
                            borderRadius: 16,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: "translateY(0)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(-8px)";
                            e.currentTarget.style.boxShadow =
                              "0 12px 40px rgba(0,0,0,0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 8px rgba(0,0,0,0.08)";
                          }}
                          cover={
                            <div
                              style={{
                                height: 80,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: getTypeColor(doc.type),
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 32,
                                  color: "rgba(255,255,255,0.9)",
                                }}
                              >
                                {typeIconMap[doc.type] || <FileTextOutlined />}
                              </div>
                              <div
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  background: "rgba(255,255,255,0.9)",
                                  borderRadius: 12,
                                  padding: "2px 8px",
                                  fontSize: 10,
                                  fontWeight: 500,
                                  color: "#333",
                                }}
                              >
                                {doc.type}
                              </div>
                            </div>
                          }
                        >
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 600,
                              marginBottom: 8,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "#1a1a1a",
                            }}
                          >
                            {doc.title}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 12,
                            }}
                          >
                            {doc.status === "running" ? (
                              <LoadingOutlined
                                spin
                                style={{
                                  fontSize: 12,
                                  color: statusConfig[doc.status]?.color,
                                  marginRight: 4,
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  backgroundColor:
                                    statusConfig[doc.status]?.color,
                                  boxShadow: `0 0 8px ${statusConfig[doc.status]?.color}40`,
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: statusConfig[doc.status]?.color,
                              }}
                            >
                              {statusConfig[doc.status]?.text}
                            </span>
                            {doc.status === "running" &&
                              doc.progress !== undefined && (
                                <Progress
                                  percent={doc.progress}
                                  size="small"
                                  strokeColor={statusConfig[doc.status]?.color}
                                  style={{ flex: 1, marginLeft: 8 }}
                                />
                              )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                              marginBottom: 12,
                            }}
                          >
                            {doc.tags?.map((tag) => (
                              <Tag
                                key={tag}
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  borderRadius: 12,
                                  padding: "2px 10px",
                                  border: "none",
                                  background: "rgba(24, 144, 255, 0.1)",
                                  color: "#1890ff",
                                }}
                              >
                                {tag}
                              </Tag>
                            ))}
                          </div>
                          <Divider style={{ margin: "12px 0" }} />
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "auto",
                                fontSize: 12,
                                color: "#8c8c8c",
                              }}
                            >
                              {doc.uploadTime} · {doc.size} · {doc.uploader}
                            </div>

                            <Space size={4}>
                              <Button
                                type="text"
                                size="small"
                                icon={<EyeOutlined />}
                                style={{
                                  color: "#8c8c8c",
                                  transition: "color 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#1890ff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#8c8c8c";
                                }}
                              />
                              <Button
                                type="text"
                                size="small"
                                icon={<DownloadOutlined />}
                                style={{
                                  color: "#8c8c8c",
                                  transition: "color 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#52c41a";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#8c8c8c";
                                }}
                              />
                              <Popconfirm
                                title="确认删除?"
                                onConfirm={() => {
                                  setDocuments((prev) =>
                                    prev.filter((d) => d.id !== doc.id),
                                  );
                                  message.success("删除成功");
                                }}
                                okText="确认"
                                cancelText="取消"
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  style={{
                                    color: "#8c8c8c",
                                    transition: "color 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#ff4d4f";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#8c8c8c";
                                  }}
                                />
                              </Popconfirm>
                            </Space>
                          </div>
                        </Card>
                      </Col>
                    ))}
                </Row>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 16,
                  }}
                >
                  <Pagination
                    current={gridPage}
                    pageSize={gridPageSize}
                    total={filteredDocs.length}
                    onChange={(page) => setGridPage(page)}
                    showSizeChanger={false}
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Modal
        title="上传文档"
        open={uploadVisible}
        onCancel={() => {
          setUploadVisible(false);
          setUploading(false);
          setUploadProgress(0);
          setUploadTags("");
          setUploadCatalog("");
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setUploadVisible(false);
              setUploading(false);
              setUploadProgress(0);
            }}
          >
            取消
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={uploading}
            onClick={handleUpload}
          >
            {uploading ? "上传中..." : "开始上传"}
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            上传文件
          </div>
          <div
            style={{
              padding: 40,
              border: "2px dashed #d9d9d9",
              borderRadius: 8,
              textAlign: "center",
              cursor: "pointer",
              background: "#fafafa",
            }}
          >
            <InboxOutlined style={{ fontSize: 48, color: "#1890ff" }} />
            <p style={{ fontSize: 14, color: "#595959", marginTop: 8 }}>
              点击或拖拽文件到此处上传
            </p>
            <p style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
              支持 docx、xlsx、pptx、md、txt、pdf 等格式
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            编目分类 <span style={{ color: "#ff4d4f" }}>*</span>
          </div>
          <Select
            style={{ width: "100%" }}
            placeholder="请选择编目"
            value={uploadCatalog}
            onChange={setUploadCatalog}
            options={catalogOptions}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            归类到知识库
          </div>
          <Input value={knowledge?.name} disabled style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            分类标签（用逗号分隔）
          </div>
          <Input
            placeholder="例如：产品,规划,2024"
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
          />
        </div>

        {uploading && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span>上传进度</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress percent={uploadProgress} status="active" />
          </div>
        )}
      </Modal>

      <Modal
        title={
          <span>
            <CloudUploadOutlined style={{ marginRight: 8 }} />
            批量移动文档
          </span>
        }
        open={moveModalVisible}
        onCancel={() => {
          setMoveModalVisible(false);
          setTargetKnowledgeBase("");
          setMoveConfirmVisible(false);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setMoveModalVisible(false);
              setTargetKnowledgeBase("");
              setMoveConfirmVisible(false);
            }}
          >
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={handleConfirmMove}
            disabled={!targetKnowledgeBase}
          >
            下一步
          </Button>,
        ]}
        width={480}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            已选择文档
          </div>
          <div
            style={{
              padding: 12,
              background: "#f5f5f5",
              borderRadius: 6,
              color: "#262626",
              fontSize: 14,
            }}
          >
            {selectedDocumentIds.length > 0 ? (
              <span>
                {documents
                  .filter((doc) => selectedDocumentIds.includes(doc.id))
                  .slice(0, 3)
                  .map((doc, index) => (
                    <span key={doc.id} style={{ fontWeight: 600 }}>
                      {doc.title}
                      {index <
                        Math.min(
                          2,
                          documents.filter((doc) =>
                            selectedDocumentIds.includes(doc.id),
                          ).length - 1,
                        ) && (
                        <span style={{ color: "#8c8c8c", margin: "0 4px" }}>
                          、
                        </span>
                      )}
                    </span>
                  ))}
                {selectedDocumentIds.length > 3 && (
                  <span style={{ color: "#8c8c8c" }}>
                    {" "}
                    等 {selectedDocumentIds.length} 个文档
                  </span>
                )}
                {selectedDocumentIds.length <= 3 && (
                  <span style={{ color: "#8c8c8c" }}>
                    {" "}
                    共 {selectedDocumentIds.length} 个文档
                  </span>
                )}
              </span>
            ) : (
              <span style={{ color: "#8c8c8c" }}>暂无选择文档</span>
            )}
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            选择目标知识库
          </div>
          <Select
            placeholder="请选择目标知识库"
            value={targetKnowledgeBase}
            onChange={setTargetKnowledgeBase}
            style={{ width: "100%" }}
            options={initialData
              .filter((kb) => kb.id !== knowledgeId)
              .map((kb) => ({
                label: kb.name,
                value: kb.id,
              }))}
          />
        </div>
      </Modal>

      <Modal
        title={
          <span>
            <CloudUploadOutlined style={{ marginRight: 8 }} />
            确认移动文档
          </span>
        }
        open={moveConfirmVisible}
        onCancel={() => setMoveConfirmVisible(false)}
        onOk={handleExecuteMove}
        okText="确认移动"
        cancelText="取消"
        width={480}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            移动信息
          </div>
          <div
            style={{
              padding: 16,
              background: "#f5f5f5",
              borderRadius: 6,
            }}
          >
            <div style={{ marginBottom: 8, fontSize: 14, color: "#262626" }}>
              <span style={{ color: "#8c8c8c" }}>源知识库：</span>
              <span style={{ fontWeight: 600 }}>{knowledge?.name}</span>
            </div>
            <div style={{ marginBottom: 8, fontSize: 14, color: "#262626" }}>
              <span style={{ color: "#8c8c8c" }}>目标知识库：</span>
              <span style={{ fontWeight: 600 }}>
                {initialData.find((kb) => kb.id === targetKnowledgeBase)?.name}
              </span>
            </div>
            <div style={{ fontSize: 14, color: "#262626" }}>
              <span style={{ color: "#8c8c8c" }}>移动文档数：</span>
              <span style={{ fontWeight: 600, color: "#ff4d4f" }}>
                {selectedDocumentIds.length} 个
              </span>
            </div>
          </div>
        </div>
        <Alert
          message="确认操作"
          description="移动后文档将从当前知识库中移除，并添加到目标知识库中。此操作不可撤销，是否继续？"
          type="warning"
          showIcon
        />
      </Modal>
    </>
  );
}
