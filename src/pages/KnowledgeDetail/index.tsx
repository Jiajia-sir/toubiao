"use client";

import { useEffect, useMemo, useState } from "react";
import { history, useParams, useRequest } from "@umijs/max";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderOutlined,
  InboxOutlined,
  LoadingOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { fileTypeConfig } from "@/config/fileTypes";
import { statusConfig } from "@/config/status";
import {
  getKnowledgeBaseList,
  type KnowledgeBaseItem,
  type KnowledgeBasePageResult,
} from "@/services/biz/knowledge-base";
import { getChannelConfigPage } from "@/services/biz/channel-config";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  entityCount: number;
  status: "active" | "disabled";
  createTime: string;
  color: string;
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
  channelSource?: string;
}

const mockKnowledgeBaseList: KnowledgeBase[] = [
  {
    id: "1",
    name: "产品研发库",
    description: "公司产品规划、需求、设计和研发过程文档。",
    documentCount: 1256,
    entityCount: 8945,
    status: "active",
    createTime: "2024-01-10 10:00:00",
    color: "#1890ff",
  },
  {
    id: "2",
    name: "行业研究库",
    description: "行业报告、竞争分析和市场研究文档。",
    documentCount: 856,
    entityCount: 5623,
    status: "active",
    createTime: "2024-01-12 14:30:00",
    color: "#52c41a",
  },
  {
    id: "3",
    name: "财务库",
    description: "财务分析、预算、审计和经营复盘文档。",
    documentCount: 423,
    entityCount: 3215,
    status: "active",
    createTime: "2024-01-15 09:20:00",
    color: "#faad14",
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
    channelSource: "默认渠道",
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
    channelSource: "默认渠道",
  },
  {
    id: "3",
    title: "API 接口文档",
    type: "Markdown",
    size: "128 KB",
    uploadTime: "2024-01-13 09:15:00",
    status: "running",
    progress: 65,
    tags: ["技术", "API"],
    uploader: "王五",
    channelSource: "默认渠道",
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
    channelSource: "默认渠道",
  },
  {
    id: "5",
    title: "系统架构设计",
    type: "PDF",
    size: "3.2 MB",
    uploadTime: "2024-01-11 11:00:00",
    status: "failed",
    tags: ["架构", "技术"],
    uploader: "钱七",
    channelSource: "默认渠道",
  },
];

const catalogOptions = [
  { label: "产品文档", value: "产品文档" },
  { label: "技术文档", value: "技术文档" },
  { label: "规范文档", value: "规范文档" },
  { label: "制度文档", value: "制度文档" },
  { label: "合同协议", value: "合同协议" },
  { label: "项目文档", value: "项目文档" },
  { label: "财务文档", value: "财务文档" },
];

const extractPageList = (payload: any): any[] =>
  payload?.data?.list || payload?.data?.records || payload?.list || payload?.rows || [];

function normalizeKnowledgeBase(item: KnowledgeBaseItem): KnowledgeBase {
  return {
    id: String(item.id),
    name: item.name,
    description: item.description || "",
    documentCount: item.documentCount ?? 0,
    entityCount: item.entityCount ?? 0,
    status: String(item.enabled) === "0" ? "disabled" : "active",
    createTime: item.createTime || "",
    color: item.color || "#1890ff",
  };
}

export default function KnowledgeDetailPage() {
  const params = useParams<{ id: string }>();
  const knowledgeId = params.id || "";

  const [searchText, setSearchText] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<React.Key[]>([]);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadTags, setUploadTags] = useState("");
  const [uploadCatalog, setUploadCatalog] = useState("");
  const [uploadChannelSource, setUploadChannelSource] = useState("");
  const [channelOptions, setChannelOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [targetKnowledgeBase, setTargetKnowledgeBase] = useState<string>("");

  const { data: knowledgeBasePage, loading: knowledgeLoading } = useRequest<KnowledgeBasePageResult>(
    () => getKnowledgeBaseList({ pageNo: 1, pageSize: 1000 }),
    { ready: true },
  );

  const knowledgeBaseList = useMemo(() => {
    const pageData = knowledgeBasePage as KnowledgeBasePageResult | undefined;
    const list = (pageData?.list || []).map((item: KnowledgeBaseItem) => normalizeKnowledgeBase(item));
    return list.length ? list : mockKnowledgeBaseList;
  }, [knowledgeBasePage]);

  const knowledge = useMemo(
    () =>
      knowledgeBaseList.find((item: KnowledgeBase) => item.id === String(knowledgeId)) ||
      knowledgeBaseList[0] ||
      null,
    [knowledgeBaseList, knowledgeId],
  );

  useEffect(() => {
    const fetchChannelOptions = async () => {
      try {
        const res: any = await getChannelConfigPage({ pageNo: 1, pageSize: 1000 });
        setChannelOptions(
          extractPageList(res).map((item: any) => ({
            label: item.name,
            value: item.name,
          })),
        );
      } catch (error) {
        console.error(error);
        message.error("获取渠道来源失败");
      }
    };

    fetchChannelOptions();
  }, []);

  const resetUploadModal = () => {
    setUploadVisible(false);
    setUploading(false);
    setUploadProgress(0);
    setUploadTags("");
    setUploadCatalog("");
    setUploadChannelSource("");
  };

  const filteredDocs = documents.filter((doc) =>
    searchText ? doc.title.toLowerCase().includes(searchText.toLowerCase()) : true,
  );

  const handleUpload = () => {
    if (!knowledge) return;
    if (!uploadChannelSource) {
      message.warning("请选择来源渠道");
      return;
    }
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
        return prev + 20;
      });
    }, 180);

    setTimeout(() => {
      const newDoc: DocumentItem = {
        id: Date.now().toString(),
        title: `上传文档_${Date.now()}.docx`,
        type: "DOCX",
        size: "1.5 MB",
        uploadTime: new Date().toLocaleString(),
        status: "pending",
        tags: uploadTags
          ? uploadTags.split(",").map((item: string) => item.trim()).filter(Boolean)
          : [],
        uploader: "当前用户",
        channelSource: uploadChannelSource,
      };
      setDocuments((prev) => [newDoc, ...prev]);
      message.success("上传成功");
      resetUploadModal();
    }, 1200);
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
    const target = knowledgeBaseList.find((item) => item.id === targetKnowledgeBase);
    if (!target) {
      message.error("目标知识库不存在");
      return;
    }
    setDocuments((prev) => prev.filter((doc) => !selectedDocumentIds.includes(doc.id)));
    message.success(`已将 ${selectedDocumentIds.length} 个文档移动到 ${target.name}`);
    setSelectedDocumentIds([]);
    setMoveModalVisible(false);
    setTargetKnowledgeBase("");
  };

  const columns: ColumnsType<DocumentItem> = [
    {
      title: "文档名称",
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background:
                (fileTypeConfig as Record<string, { bgColor: string }>)[record.type]?.bgColor ||
                fileTypeConfig.default.bgColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getTypeIcon(record.type)}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{record.title}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {record.type} · {record.size}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "来源渠道",
      dataIndex: "channelSource",
      key: "channelSource",
      width: 140,
      render: (value) => value || "-",
    },
    {
      title: "解析状态",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (_, record) => {
        const config = statusConfig[record.status];
        return (
          <div>
            <span style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
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
              <Progress percent={record.progress} size="small" strokeColor={config.color} />
            )}
          </div>
        );
      },
    },
    {
      title: "标签",
      dataIndex: "tags",
      key: "tags",
      width: 200,
      render: (tags) =>
        tags?.length ? (
          <>
            {tags.map((tag: string) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </>
        ) : (
          "-"
        ),
    },
    {
      title: "上传人",
      dataIndex: "uploader",
      key: "uploader",
      width: 100,
    },
    {
      title: "上传时间",
      dataIndex: "uploadTime",
      key: "uploadTime",
      width: 180,
    },
    {
      title: "操作",
      key: "action",
      width: 220,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => history.push(`/data/document/${record.id}`)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<DownloadOutlined />}>
            下载
          </Button>
          <Popconfirm
            title="确认删除？"
            onConfirm={() => {
              setDocuments((prev) => prev.filter((doc) => doc.id !== record.id));
              message.success("删除成功");
            }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (knowledgeLoading && !knowledge) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!knowledge) {
    return <Empty description="知识库不存在" style={{ marginTop: 80 }} />;
  }

  return (
    <>
      <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px)" }}>
        <Card styles={{ body: { minHeight: "86vh" } }}>
          <div style={{ padding: 24, borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => history.go(-1)}>
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
                  }}
                >
                  <FolderOutlined style={{ fontSize: 24, color: knowledge.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: "#262626" }}>{knowledge.name}</div>
                  <div style={{ fontSize: 14, color: "#8c8c8c", marginTop: 2 }}>{knowledge.description}</div>
                </div>
              </div>
              <Space>
                <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setUploadVisible(true)}>
                  上传文档
                </Button>
                <Button icon={<SwapOutlined />} onClick={handleBatchMove}>
                  批量移动
                </Button>
              </Space>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="文档数量" value={knowledge.documentCount} prefix={<FileTextOutlined />} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="实体数量" value={knowledge.entityCount} prefix={<InboxOutlined />} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="创建时间" value={knowledge.createTime} valueStyle={{ fontSize: 16 }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="当前状态" value={knowledge.status === "active" ? "启用" : "禁用"} />
                </Card>
              </Col>
            </Row>

            <Alert
              type="info"
              showIcon
              message="当前知识库上传文档已支持来源渠道"
              description="上传时必须选择来源渠道，方便后续追踪文档接入来源。"
              style={{ marginBottom: 16 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <Input
                placeholder="搜索文档名称"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 280 }}
              />
            </div>

            <Table
              rowKey="id"
              columns={columns}
              dataSource={filteredDocs}
              rowSelection={{
                selectedRowKeys: selectedDocumentIds,
                onChange: setSelectedDocumentIds,
              }}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </div>
        </Card>
      </div>

      <Modal
        title="上传文档"
        open={uploadVisible}
        onCancel={resetUploadModal}
        footer={[
          <Button key="cancel" onClick={resetUploadModal} disabled={uploading}>
            取消
          </Button>,
          <Button key="upload" type="primary" loading={uploading} onClick={handleUpload}>
            {uploading ? "上传中..." : "开始上传"}
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>上传文件</div>
          <div
            style={{
              padding: 40,
              border: "2px dashed #d9d9d9",
              borderRadius: 8,
              textAlign: "center",
              background: "#fafafa",
            }}
          >
            <InboxOutlined style={{ fontSize: 48, color: "#1890ff" }} />
            <p style={{ fontSize: 14, color: "#595959", marginTop: 8 }}>点击或拖拽文件到此处上传</p>
            <p style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
              支持 docx、xlsx、pptx、md、txt、pdf 等格式
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            来源渠道 <span style={{ color: "#ff4d4f" }}>*</span>
          </div>
          <Select
            style={{ width: "100%" }}
            placeholder="请选择来源渠道"
            value={uploadChannelSource}
            onChange={setUploadChannelSource}
            options={channelOptions}
            showSearch
            optionFilterProp="label"
          />
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
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>归类到知识库</div>
          <Input value={knowledge.name} disabled />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>分类标签（用逗号分隔）</div>
          <Input
            placeholder="例如：产品规划,2024"
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
          />
        </div>

        {uploading && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>上传进度</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress percent={uploadProgress} status="active" />
          </div>
        )}
      </Modal>

      <Modal
        title="批量移动文档"
        open={moveModalVisible}
        onCancel={() => {
          setMoveModalVisible(false);
          setTargetKnowledgeBase("");
        }}
        onOk={handleConfirmMove}
        okText="确认移动"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          已选择 <b>{selectedDocumentIds.length}</b> 个文档
        </div>
        <div>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8c8c8c" }}>
            选择目标知识库 <span style={{ color: "#ff4d4f" }}>*</span>
          </div>
          <Select
            style={{ width: "100%" }}
            placeholder="请选择目标知识库"
            value={targetKnowledgeBase}
            onChange={setTargetKnowledgeBase}
            options={knowledgeBaseList
              .filter((item: KnowledgeBase) => item.id !== knowledge.id)
              .map((item: KnowledgeBase) => ({ label: item.name, value: item.id }))}
          />
        </div>
      </Modal>
    </>
  );
}

function getTypeIcon(type: string) {
  if (type === "PDF") {
    return <FilePdfOutlined style={{ fontSize: 22, color: fileTypeConfig.PDF.color }} />;
  }
  if (type === "Excel") {
    return <FileExcelOutlined style={{ fontSize: 22, color: fileTypeConfig.Excel.color }} />;
  }
  if (type === "Markdown") {
    return <FileMarkdownOutlined style={{ fontSize: 22, color: fileTypeConfig.Markdown.color }} />;
  }
  if (type === "Figma") {
    return <FileImageOutlined style={{ fontSize: 22, color: fileTypeConfig.Figma.color }} />;
  }
  return <FileTextOutlined style={{ fontSize: 22, color: fileTypeConfig.default.color }} />;
}
