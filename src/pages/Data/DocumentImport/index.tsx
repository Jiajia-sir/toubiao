'use client';

import { useState, useEffect } from 'react';
import { history, useLocation } from '@umijs/max';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Tabs,
  Modal,
  message,
  Popconfirm,
  Alert,
  Card,
  Row,
  Col,
  Upload,
  Progress,
  Tooltip,
} from 'antd';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  FolderOutlined,
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  DownloadOutlined,
  InboxOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileMarkdownOutlined,
  Html5Outlined,
  MailOutlined,
  LoadingOutlined,
  RightOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { statusConfig } from '@/config/status';
import { fileTypeConfig } from '@/config/fileTypes';
import {
  chunkUpload,
  formatFileSize,
  type UploadFileItem,
  type UploadStatus,
  UPLOADING_STATUS_LIST,
} from '@/utils/chunkUpload';

const { Dragger } = Upload;

interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  size: string;
  knowledgeBase: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  progress?: number;
  tags: string[];
  uploadTime: string;
  entityCount: number;
  relationCount: number;
  catalog: string;
}

const initialData: DocumentRecord[] = [
  {
    id: '1',
    name: '2024年度产品规划方案.docx',
    type: 'DOCX',
    size: '2.4MB',
    knowledgeBase: '产品研发库',
    status: 'running',
    progress: 80,
    tags: ['产品需求', '项目管理'],
    uploadTime: '2024-01-15 14:30:00',
    entityCount: 156,
    relationCount: 89,
    catalog: '电子图书分类编目',
  },
  {
    id: '2',
    name: '人工智能行业研究报告2024.pdf',
    type: 'PDF',
    size: '15.8MB',
    knowledgeBase: '行业研发库',
    status: 'running',
    progress: 68,
    tags: ['市场分析', '技术文档'],
    uploadTime: '2024-01-15 10:20:00',
    entityCount: 320,
    relationCount: 145,
    catalog: '电子图书分类编目',
  },
  {
    id: '3',
    name: 'Q4财务分析报告.pptx',
    type: 'PPTX',
    size: '8.2MB',
    knowledgeBase: '财务库',
    status: 'failed',
    progress: 45,
    tags: ['财务报告'],
    uploadTime: '2024-01-14 16:45:00',
    entityCount: 78,
    relationCount: 34,
    catalog: '视频资源元数据编目',
  },
  {
    id: '4',
    name: '技术架构设计文档.docx',
    type: 'DOCX',
    size: '1.2MB',
    knowledgeBase: '市场分析库',
    status: 'completed',
    progress: 100,
    tags: ['技术文档', '项目管理'],
    uploadTime: '2024-01-14 11:30:00',
    entityCount: 245,
    relationCount: 167,
    catalog: '视频资源元数据编目',
  },
  {
    id: '5',
    name: '市场调研数据.xlsx',
    type: 'XLSX',
    size: '3.5MB',
    knowledgeBase: '市场分析库',
    status: 'completed',
    progress: 100,
    tags: ['市场分析', '用户研究'],
    uploadTime: '2024-01-13 15:20:00',
    entityCount: 189,
    relationCount: 92,
    catalog: '音频资源分类编目',
  },
  {
    id: '6',
    name: '项目进度跟踪.md',
    type: 'MD',
    size: '0.5MB',
    knowledgeBase: '市场分析库',
    status: 'pending',
    progress: 0,
    tags: ['项目管理'],
    uploadTime: '2024-01-13 09:15:00',
    entityCount: 42,
    relationCount: 18,
    catalog: '音频资源分类编目',
  },
  {
    id: '7',
    name: '客户需求汇总.html',
    type: 'HTML',
    size: '0.8MB',
    knowledgeBase: '项目管理库',
    status: 'completed',
    progress: 100,
    tags: ['用户研究', '合同协议'],
    uploadTime: '2024-01-12 14:00:00',
    entityCount: 134,
    relationCount: 67,
    catalog: '图片资源元数据编目',
  },
  {
    id: '8',
    name: '会议纪要.eml',
    type: 'EML',
    size: '0.2MB',
    knowledgeBase: '项目管理库',
    status: 'failed',
    progress: 30,
    tags: ['HR文档', '项目管理'],
    uploadTime: '2024-01-12 10:30:00',
    entityCount: 28,
    relationCount: 12,
    catalog: '图片资源元数据编目',
  },
];

const knowledgeBaseData = [
  {
    id: '1',
    name: '产品研发库',
    description: '公司2024年所有项目相关文档',
    color: '#1890ff',
  },
  {
    id: '2',
    name: '行业研发库',
    description: '行业研发相关文档',
    color: '#52c41a',
  },
  {
    id: '3',
    name: '财务库',
    description: '各行业研究报告和数据分析',
    color: '#faad14',
  },
  {
    id: '4',
    name: '市场分析库',
    description: '市场分析文档',
    color: '#eb2f96',
  },
  {
    id: '5',
    name: '项目管理库',
    description: '员工手册和HR项目管理文档',
    color: '#13c2c2',
  },
];

const knowledgeBaseOptions = knowledgeBaseData.map((kb) => ({
  label: kb.name,
  value: kb.name,
}));

const catalogOptions = [
  { label: '电子图书分类编目', value: '电子图书分类编目' },
  { label: '音频资源分类编目', value: '音频资源分类编目' },
  { label: '文档资源分类编目', value: '文档资源分类编目' },
];

const tagColorMap: Record<string, string> = {
  产品需求: '#1890ff',
  技术文档: '#52c41a',
  财务报告: '#faad14',
  市场分析: '#eb2f96',
  项目管理: '#13c2c2',
  用户研究: '#722ed1',
  合同协议: '#fa541c',
  HR文档: '#2f54eb',
};

const typeIconMap: Record<string, React.ReactNode> = {
  DOCX: <FileTextOutlined style={{ fontSize: '24px', color: fileTypeConfig.DOCX.color }} />,
  PDF: <FilePdfOutlined style={{ fontSize: '24px', color: fileTypeConfig.PDF.color }} />,
  XLSX: <FileExcelOutlined style={{ fontSize: '24px', color: fileTypeConfig.XLSX.color }} />,
  PPTX: <FilePptOutlined style={{ fontSize: '24px', color: fileTypeConfig.PPTX.color }} />,
  MD: <FileMarkdownOutlined style={{ fontSize: '24px', color: fileTypeConfig.Markdown.color }} />,
  HTML: <Html5Outlined style={{ fontSize: '24px', color: fileTypeConfig.HTML.color }} />,
  EML: <MailOutlined style={{ fontSize: '24px', color: fileTypeConfig.EML.color }} />,
  TXT: <FileTextOutlined style={{ fontSize: '24px', color: fileTypeConfig.TXT.color }} />,
};

const typeOptions = ['DOCX', 'PDF', 'XLSX', 'PPTX', 'MD', 'TXT', 'HTML', 'EML'].map((t) => ({
  label: t,
  value: t,
}));
const statusOptions = Object.entries(statusConfig).map(([value, config]) => ({
  label: config.text,
  value,
}));
type StatusType = keyof typeof statusConfig;

export default function DataPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [data, setData] = useState<DocumentRecord[]>(initialData);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<DocumentRecord | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [batchImportVisible, setBatchImportVisible] = useState(false);
  const [batchImportKnowledgeBase, setBatchImportKnowledgeBase] = useState<string>('');
  const [uploadKnowledgeBase, setUploadKnowledgeBase] = useState<string>('');
  const [uploadTags, setUploadTags] = useState<string>('');
  const [uploadCatalog, setUploadCatalog] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState<UploadFileItem[]>([]);

  useEffect(() => {
    if (searchParams.get('action') === 'upload') {
      setUploadVisible(true);
      // 清除 URL 参数，避免关闭弹窗后再次打开
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('action');
      history.replace({
        pathname: location.pathname,
        search: newSearchParams.toString(),
      });
    }
  }, [searchParams]);

  const filteredData = data.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (typeFilter && item.type !== typeFilter) return false;
    if (searchText && !item.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const handlePreview = (record: DocumentRecord) => {
    setPreviewRecord(record);
    setPreviewVisible(true);
  };

  const handleDownload = (record: DocumentRecord) => {
    message.success(`开始下载: ${record.name}`);
  };

  const handleRetry = (record: DocumentRecord) => {
    setRetryingId(record.id);
    setData(
      data.map((item) => (item.id === record.id ? { ...item, status: 'running' as const } : item)),
    );
    message.loading('正在重试处理...', 2);
    setTimeout(() => {
      setData(
        data.map((item) =>
          item.id === record.id ? { ...item, status: 'completed' as const } : item,
        ),
      );
      setRetryingId(null);
      message.success('处理成功');
    }, 2000);
  };

  const handleUpload = () => {
    // 暂时不做，等待后续接口
    message.info('功能开发中...');
  };

  // beforeUpload 处理新增文件
  const handleBeforeUpload = (file: any) => {
    // 创建文件项
    const newFileItem: UploadFileItem = {
      uid: file.uid,
      name: file.name,
      size: file.size || 0,
      file: file,
      uploadStatus: '准备上传' as UploadStatus,
      percentage: 0,
    };

    // 添加到文件列表
    setFileList((prev) => [...prev, newFileItem]);

    // 状态更新回调
    const onStatusChange = (
      uid: string,
      status: UploadStatus,
      percentage: number,
      errorMsg?: string,
    ) => {
      setFileList((prev) =>
        prev.map((item) =>
          item.uid === uid ? { ...item, uploadStatus: status, percentage, errorMsg } : item,
        ),
      );
    };

    // 立即触发分片上传
    chunkUpload(file, onStatusChange, file.uid).catch(() => {
      // 错误已在 onStatusChange 中处理
    });

    return false; // 阻止自动上传
  };

  const columns = [
    {
      title: '文档名称',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: DocumentRecord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                (fileTypeConfig as Record<string, { color: string; bgColor: string }>)[record.type]
                  ?.bgColor || fileTypeConfig.default.bgColor,
              borderRadius: 8,
            }}
          >
            {typeIconMap[record.type] || (
              <FileTextOutlined
                style={{
                  fontSize: '24px',
                  color: fileTypeConfig.default.color,
                }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {record.entityCount} 个实体 · {record.relationCount} 条关系
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      // render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: '所属知识库',
      dataIndex: 'knowledgeBase',
      key: 'knowledgeBase',
      render: (knowledgeBase: string) => {
        const kb = knowledgeBaseData.find((k) => k.name === knowledgeBase);
        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid #d9d9d9',
              background: '#fafafa',
              transition: 'all 0.2s',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (kb) {
                message.info(`当前项目暂未接入知识库详情页：${kb.name}`);
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1890ff';
              e.currentTarget.style.background = '#e6f7ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d9d9d9';
              e.currentTarget.style.background = '#fafafa';
            }}
          >
            <span style={{ fontWeight: 500, color: '#262626' }}>{knowledgeBase}</span>
            <RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
          </div>
        );
      },
    },
    {
      title: '解析状态',
      dataIndex: 'status',
      key: 'status',
      render: (_: string, record: DocumentRecord) => {
        const config = statusConfig[record.status as StatusType];
        return (
          <div>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
              }}
            >
              {record.status === 'running' ? (
                <LoadingOutlined spin style={{ color: config.color }} />
              ) : (
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: config.color,
                  }}
                />
              )}
              <span style={{ color: config.color }}>{config.text}</span>
            </span>
            {record.status === 'running' && record.progress !== undefined && (
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
      title: '分类标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags.map((tag) => {
            const tagColor = tagColorMap[tag] || '#1890ff';
            return (
              <Tag
                key={tag}
                style={{
                  color: tagColor,
                  background: `${tagColor}15`,
                  border: `1px solid ${tagColor}30`,
                  marginBottom: 2,
                }}
              >
                {tag}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: '编目分类',
      dataIndex: 'catalog',
      key: 'catalog',
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: DocumentRecord) => (
        <Space size="small">
          {/* <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button> */}
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/data/document/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          {record.status === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              loading={retryingId === record.id}
              onClick={() => handleRetry(record)}
            >
              重试
            </Button>
          )}
          <Popconfirm
            title="确认删除?"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDelete = (id: string) => {
    setData(data.filter((item) => item.id !== id));
    message.success('删除成功');
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的文档');
      return;
    }
    setData(data.filter((item) => !selectedRowKeys.includes(item.id)));
    setSelectedRowKeys([]);
    message.success('批量删除成功');
  };

  const handleBatchImport = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要导入的文档');
      return;
    }
    setBatchImportVisible(true);
  };

  const handleBatchImportConfirm = () => {
    if (!batchImportKnowledgeBase) {
      message.warning('请选择知识库');
      return;
    }
    setData(
      data.map((item) =>
        selectedRowKeys.includes(item.id)
          ? { ...item, knowledgeBase: batchImportKnowledgeBase }
          : item,
      ),
    );
    message.success(`已选择 ${selectedRowKeys.length} 个文档添加到 ${batchImportKnowledgeBase}`);
    setBatchImportVisible(false);
    setBatchImportKnowledgeBase('');
    setSelectedRowKeys([]);
  };

  const tabItems = [
    {
      key: 'document',
      label: '文档导入',
      children: null,
    },
    {
      key: 'database',
      label: '数据库同步',
      children: (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
          数据库同步功能开发中...
        </div>
      ),
    },
    {
      key: 'api',
      label: 'API接入',
      children: (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>API接入功能开发中...</div>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '12px 16px',
          background: '#fff',
          borderRadius: 8,
        }}
      >
        <Space size={12}>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
          />
          <Select
            placeholder="类型筛选"
            allowClear
            style={{ width: 120 }}
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
          />
          <Input
            placeholder="文档名称搜索"
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Space>
        <Space size={12}>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={() => setUploadVisible(true)}
          >
            上传文档
          </Button>

          <Button icon={<FolderOutlined />} onClick={handleBatchImport}>
            批量入知识库
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
            批量删除
          </Button>
        </Space>
      </div>

      <Alert
        message={<span style={{ fontWeight: 600, color: '#1890ff' }}>支持多种文档格式</span>}
        description="已支持：docx、xlsx、pptx、md、txt、pdf、html、eml 等格式，单文件大小不超过100MB"
        type="info"
        showIcon
      />

      <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
        {/* <Tabs defaultActiveKey="document" items={tabItems} /> */}
        <Table
          columns={columns as any}
          dataSource={filteredData}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10,
            pageSizeOptions: ['10', '20', '50'],
          }}
        />
      </div>

      <Modal
        title="文档预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => previewRecord && handleDownload(previewRecord)}
          >
            下载
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {previewRecord && (
          <Card style={{ borderRadius: 8 }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>文档名称</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>
                  {previewRecord.name}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>类型</div>
                {/* <Tag color="blue" style={{ marginTop: 4 }}>
                  {previewRecord.type}
                </Tag> */}
                {previewRecord.type}
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>大小</div>
                <div style={{ fontSize: 15, marginTop: 4 }}>{previewRecord.size}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>所属知识库</div>
                <div style={{ fontSize: 15, marginTop: 4 }}>{previewRecord.knowledgeBase}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>解析状态</div>
                <div
                  style={{
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: statusConfig[previewRecord.status].color,
                    }}
                  />
                  <span style={{ color: statusConfig[previewRecord.status].color }}>
                    {statusConfig[previewRecord.status].text}
                  </span>
                </div>
              </Col>
              <Col span={24}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>分类标签</div>
                <div style={{ marginTop: 4 }}>
                  {previewRecord.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </Col>
              <Col span={24}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>上传时间</div>
                <div style={{ fontSize: 15, marginTop: 4 }}>{previewRecord.uploadTime}</div>
              </Col>
            </Row>
            <div
              style={{
                marginTop: 24,
                padding: 24,
                background: '#f5f7fa',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ color: '#8c8c8c', marginTop: 8 }}>文档预览内容区域</div>
            </div>
          </Card>
        )}
      </Modal>

      <Modal
        title="上传文档"
        open={uploadVisible}
        onCancel={() => {
          if (!uploading) {
            setUploadVisible(false);
            setUploadCatalog('');
            setUploadKnowledgeBase('');
            setUploadTags('');
            setFileList([]);
          }
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              if (!uploading) {
                setUploadVisible(false);
                setFileList([]);
              }
            }}
            disabled={uploading}
          >
            取消
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={uploading}
            onClick={handleUpload}
            disabled={uploading || fileList.length === 0}
          >
            {uploading ? '上传中...' : '开始上传'}
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>上传文件</div>
          <Dragger
            name="file"
            multiple={true}
            showUploadList={false}
            beforeUpload={handleBeforeUpload}
            disabled={uploading}
            style={{ padding: '20px 0' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p style={{ fontSize: 14, color: '#595959' }}>点击或拖拽文件到此处上传</p>
            <p style={{ fontSize: 12, color: '#8c8c8c' }}>
              支持 docx、xlsx、pptx、md、txt、pdf、html、eml 等格式，单文件大小不超过100MB
            </p>
          </Dragger>
        </div>

        {/* 文件列表 */}
        {fileList.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              border: '1px solid #e9ecef',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: '#f8f9fa',
                borderBottom: '1px solid #e9ecef',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13, color: '#495057' }}>已选择文件</span>
              <span style={{ fontSize: 12, color: '#6c757d' }}>共 {fileList.length} 个文件</span>
            </div>
            <div style={{ padding: 8, maxHeight: 240, overflowY: 'auto' }}>
              {fileList.map((item) => (
                <div
                  key={item.uid}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    marginBottom: 4,
                    background: '#fff',
                    border: '1px solid #f0f2f5',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#495057',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6c757d' }}>
                      {formatFileSize(item.size)}
                    </div>
                    {item.uploadStatus === '失败' && item.errorMsg && (
                      <Tooltip title={item.errorMsg}>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#ff4d4f',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.errorMsg}
                        </div>
                      </Tooltip>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 140,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 14,
                        fontWeight: 500,
                        color:
                          item.uploadStatus === '上传成功'
                            ? '#52c41a'
                            : item.uploadStatus === '失败'
                              ? '#ff4d4f'
                              : UPLOADING_STATUS_LIST.includes(item.uploadStatus)
                                ? '#1890ff'
                                : '#8c8c8c',
                      }}
                    >
                      {UPLOADING_STATUS_LIST.includes(item.uploadStatus) && (
                        <LoadingOutlined spin style={{ fontSize: 12 }} />
                      )}
                      {item.uploadStatus === '上传成功' && (
                        <CheckCircleFilled style={{ color: '#52c41a' }} />
                      )}
                      {item.uploadStatus === '失败' && (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                      {item.uploadStatus}
                    </span>
                    {UPLOADING_STATUS_LIST.includes(item.uploadStatus) && (
                      <Progress
                        percent={item.percentage}
                        size="small"
                        style={{ width: 60, margin: 0 }}
                        showInfo={false}
                      />
                    )}
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setFileList((prev) => prev.filter((f) => f.uid !== item.uid));
                      }}
                      style={{ color: '#ff4d4f' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fff1f0';
                        e.currentTarget.style.borderColor = '#ffa39e';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
            编目分类 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择编目"
            value={uploadCatalog}
            onChange={setUploadCatalog}
            options={catalogOptions}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#bfbfbf' }}>
            归类到知识库（选填）
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择知识库"
            value={uploadKnowledgeBase}
            onChange={setUploadKnowledgeBase}
            options={knowledgeBaseOptions}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
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
                display: 'flex',
                justifyContent: 'space-between',
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
        title="批量入知识库"
        open={batchImportVisible}
        onCancel={() => {
          setBatchImportVisible(false);
          setBatchImportKnowledgeBase('');
        }}
        onOk={handleBatchImportConfirm}
        okText="确认"
        cancelText="取消"
        width={400}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
            已选择{' '}
            <span style={{ color: '#1890ff', fontWeight: 600 }}>{selectedRowKeys.length}</span>{' '}
            个文档
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
            选择目标知识库 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择知识库"
            value={batchImportKnowledgeBase}
            onChange={setBatchImportKnowledgeBase}
            options={knowledgeBaseOptions}
          />
        </div>
      </Modal>
    </>
  );
}
