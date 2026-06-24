'use client';

import { useEffect, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleFilled,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FolderOutlined,
  Html5Outlined,
  InboxOutlined,
  LoadingOutlined,
  MailOutlined,
  ReloadOutlined,
  SearchOutlined,
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
import { getChannelConfigPage } from '@/services/biz/channel-config';

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
  channelSource: string;
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
    channelSource: '默认渠道',
  },
  {
    id: '2',
    name: '人工智能行业研究报告2024.pdf',
    type: 'PDF',
    size: '15.8MB',
    knowledgeBase: '行业研究库',
    status: 'completed',
    progress: 100,
    tags: ['市场分析', '技术文档'],
    uploadTime: '2024-01-15 10:20:00',
    entityCount: 320,
    relationCount: 145,
    catalog: '电子图书分类编目',
    channelSource: '默认渠道',
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
    catalog: '文档资源分类编目',
    channelSource: '默认渠道',
  },
];

const knowledgeBaseOptions = [
  { label: '产品研发库', value: '产品研发库' },
  { label: '行业研究库', value: '行业研究库' },
  { label: '财务库', value: '财务库' },
  { label: '市场分析库', value: '市场分析库' },
  { label: '项目管理库', value: '项目管理库' },
];

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
};

const typeIconMap: Record<string, React.ReactNode> = {
  DOCX: <FileTextOutlined style={{ fontSize: 24, color: fileTypeConfig.DOCX.color }} />,
  PDF: <FilePdfOutlined style={{ fontSize: 24, color: fileTypeConfig.PDF.color }} />,
  XLSX: <FileExcelOutlined style={{ fontSize: 24, color: fileTypeConfig.XLSX.color }} />,
  PPTX: <FilePptOutlined style={{ fontSize: 24, color: fileTypeConfig.PPTX.color }} />,
  MD: <FileMarkdownOutlined style={{ fontSize: 24, color: fileTypeConfig.Markdown.color }} />,
  HTML: <Html5Outlined style={{ fontSize: 24, color: fileTypeConfig.HTML.color }} />,
  EML: <MailOutlined style={{ fontSize: 24, color: fileTypeConfig.EML.color }} />,
  TXT: <FileTextOutlined style={{ fontSize: 24, color: fileTypeConfig.TXT.color }} />,
};

const typeOptions = ['DOCX', 'PDF', 'XLSX', 'PPTX', 'MD', 'TXT', 'HTML', 'EML'].map((item) => ({
  label: item,
  value: item,
}));

const statusOptions = Object.entries(statusConfig).map(([value, config]) => ({
  label: config.text,
  value,
}));

const extractPageList = (payload: any): any[] =>
  payload?.data?.list || payload?.data?.records || payload?.list || payload?.rows || [];

type StatusType = keyof typeof statusConfig;

export default function DocumentImportPage() {
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
  const [uploadChannelSource, setUploadChannelSource] = useState<string>('');
  const [channelOptions, setChannelOptions] = useState<Array<{ label: string; value: string }>>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState<UploadFileItem[]>([]);

  useEffect(() => {
    if (searchParams.get('action') === 'upload') {
      setUploadVisible(true);
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('action');
      history.replace({
        pathname: location.pathname,
        search: nextSearchParams.toString(),
      });
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    const fetchChannelOptions = async () => {
      try {
        const res: any = await getChannelConfigPage({ pageNo: 1, pageSize: 1000 });
        const options = extractPageList(res).map((item: any) => ({
          label: item.name,
          value: item.name,
        }));
        setChannelOptions(options);
      } catch (error) {
        console.error(error);
        message.error('获取渠道来源失败');
      }
    };

    fetchChannelOptions();
  }, []);

  const resetUploadState = () => {
    setUploadVisible(false);
    setUploadCatalog('');
    setUploadChannelSource('');
    setUploadKnowledgeBase('');
    setUploadTags('');
    setUploadProgress(0);
    setFileList([]);
  };

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
    message.success(`开始下载 ${record.name}`);
  };

  const handleRetry = (record: DocumentRecord) => {
    setRetryingId(record.id);
    setData((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, status: 'running', progress: 0 } : item)),
    );
    message.loading('正在重试处理...', 2);
    setTimeout(() => {
      setData((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, status: 'completed', progress: 100 } : item,
        ),
      );
      setRetryingId(null);
      message.success('处理成功');
    }, 2000);
  };

  const handleUpload = () => {
    if (!uploadChannelSource) {
      message.warning('请选择渠道来源');
      return;
    }
    if (!uploadCatalog) {
      message.warning('请选择编目分类');
      return;
    }
    if (fileList.length === 0) {
      message.warning('请先选择上传文件');
      return;
    }

    message.info('上传流程待后端接口接入，当前已完成表单校验');
  };

  const handleBeforeUpload = (file: any) => {
    const newFileItem: UploadFileItem = {
      uid: file.uid,
      name: file.name,
      size: file.size || 0,
      file,
      uploadStatus: '准备上传' as UploadStatus,
      percentage: 0,
    };

    setFileList((prev) => [...prev, newFileItem]);

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
      const nextPercent = Math.round(
        prevAverage(
          fileList.map((item) => (item.uid === uid ? percentage : item.percentage || 0)),
        ),
      );
      setUploadProgress(nextPercent);
    };

    chunkUpload(file, onStatusChange, file.uid).catch(() => undefined);
    return false;
  };

  const handleDelete = (id: string) => {
    setData((prev) => prev.filter((item) => item.id !== id));
    message.success('删除成功');
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的文档');
      return;
    }
    setData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)));
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
    setData((prev) =>
      prev.map((item) =>
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

  const columns: ColumnsType<DocumentRecord> = [
    {
      title: '文档名称',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                (fileTypeConfig as Record<string, { bgColor: string }>)[record.type]?.bgColor ||
                fileTypeConfig.default.bgColor,
              borderRadius: 8,
            }}
          >
            {typeIconMap[record.type] || (
              <FileTextOutlined style={{ fontSize: 24, color: fileTypeConfig.default.color }} />
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
    },
    {
      title: '渠道来源',
      dataIndex: 'channelSource',
      key: 'channelSource',
      render: (value) => value || '-',
    },
    {
      title: '解析状态',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        const config = statusConfig[record.status as StatusType];
        return (
          <div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
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
            const color = tagColorMap[tag] || '#1890ff';
            return (
              <Tag
                key={tag}
                style={{
                  color,
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
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
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>
            预览
          </Button>
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
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
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
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setUploadVisible(true)}>
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
        description="已支持：docx、xlsx、pptx、md、txt、pdf、html、eml 等格式，单文件大小不超过 100MB"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
        <Table
          columns={columns}
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
                <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{previewRecord.name}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>类型</div>
                <div style={{ fontSize: 15, marginTop: 4 }}>{previewRecord.type}</div>
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
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>渠道来源</div>
                <div style={{ fontSize: 15, marginTop: 4 }}>{previewRecord.channelSource}</div>
              </Col>
              <Col span={24}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>分类标签</div>
                <div style={{ marginTop: 4 }}>
                  {previewRecord.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
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
            resetUploadState();
          }
        }}
        footer={[
          <Button key="cancel" onClick={resetUploadState} disabled={uploading}>
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
            multiple
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
              支持 docx、xlsx、pptx、md、txt、pdf、html、eml 等格式，单文件大小不超过 100MB
            </p>
          </Dragger>
        </div>

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
                    <div style={{ fontSize: 12, color: '#6c757d' }}>{formatFileSize(item.size)}</div>
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
                        setFileList((prev) => prev.filter((current) => current.uid !== item.uid));
                      }}
                      style={{ color: '#ff4d4f' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
            渠道来源 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择渠道来源"
            value={uploadChannelSource}
            onChange={setUploadChannelSource}
            options={channelOptions}
            showSearch
            optionFilterProp="label"
          />
        </div>

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
          <div style={{ marginBottom: 8, fontSize: 13, color: '#bfbfbf' }}>归类到知识库（选填）</div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择知识库"
            value={uploadKnowledgeBase}
            onChange={setUploadKnowledgeBase}
            options={knowledgeBaseOptions}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>分类标签（用逗号分隔）</div>
          <Input
            placeholder="例如：产品规划,2024"
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
          />
        </div>

        {uploading && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
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
            已选择 <span style={{ color: '#1890ff', fontWeight: 600 }}>{selectedRowKeys.length}</span> 个文档
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

function prevAverage(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, current) => sum + current, 0) / values.length;
}
