'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { history, useParams, useRequest } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloudUploadOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FolderOutlined,
  Html5Outlined,
  InboxOutlined,
  LoadingOutlined,
  MailOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { fileTypeConfig } from '@/config/fileTypes';
import { getCatalogTypePage } from '@/services/biz/catalogType';
import { getChannelConfigPage } from '@/services/biz/channel-config';
import {
  getKnowledgeBaseList,
  getKnowledgeBasePage,
  type KnowledgeBaseItem,
  type KnowledgeBasePageResult,
} from '@/services/biz/knowledge-base';
import { getTagPage } from '@/services/biz/tag';
import {
  chunkUpload,
  formatFileSize,
  type UploadFileItem,
  type UploadStatus,
  UPLOADING_STATUS_LIST,
} from '@/utils/chunkUpload';
import {
  batchSetDocumentKnowledgeBase,
  createFileBaseData,
  deleteDocumentBatch,
  getDocumentPage,
  reAnalysisDocument,
  updateDocument,
  type DocumentPageItem,
} from '../Data/DocumentImport/api';
import DocumentPreviewModal from '../Data/DocumentImport/DocumentPreviewModal';

const { Dragger } = Upload;

interface DocumentRecord {
  id: string;
  name: string;
  filePath: string;
  fileType: string;
  fileSizeBytes?: number | string;
  knowledgeBaseIds: Array<number | string>;
  knowledgeBaseNames: string[];
  keywords: string[];
  channelName: string;
  fileTagNames: string[];
  catalogName: string;
  status: string;
  intelligentStatus: string;
  entityCount: number | string;
  relationCount: number | string;
  entities: string[];
  createTime: string;
}

interface KnowledgeBaseSummary {
  id: string;
  name: string;
  description: string;
  documentCount: number | string;
  entityCount: number | string;
  status: string;
  createTime: string;
  color: string;
}

const fileTypeIconMap: Record<string, React.ReactNode> = {
  docx: <FileWordOutlined style={{ fontSize: 24, color: fileTypeConfig.DOCX.color }} />,
  doc: <FileWordOutlined style={{ fontSize: 24, color: fileTypeConfig.DOCX.color }} />,
  pdf: <FilePdfOutlined style={{ fontSize: 24, color: fileTypeConfig.PDF.color }} />,
  xlsx: <FileExcelOutlined style={{ fontSize: 24, color: fileTypeConfig.XLSX.color }} />,
  xls: <FileExcelOutlined style={{ fontSize: 24, color: fileTypeConfig.XLSX.color }} />,
  pptx: <FilePptOutlined style={{ fontSize: 24, color: fileTypeConfig.PPTX.color }} />,
  ppt: <FilePptOutlined style={{ fontSize: 24, color: fileTypeConfig.PPTX.color }} />,
  md: <FileMarkdownOutlined style={{ fontSize: 24, color: fileTypeConfig.Markdown.color }} />,
  html: <Html5Outlined style={{ fontSize: 24, color: fileTypeConfig.HTML.color }} />,
  eml: <MailOutlined style={{ fontSize: 24, color: fileTypeConfig.EML.color }} />,
  txt: <FileTextOutlined style={{ fontSize: 24, color: fileTypeConfig.TXT.color }} />,
};

const fileTypeBgColorMap: Record<string, string> = {
  docx: fileTypeConfig.DOCX.bgColor,
  doc: fileTypeConfig.DOCX.bgColor,
  pdf: fileTypeConfig.PDF.bgColor,
  xlsx: fileTypeConfig.XLSX.bgColor,
  xls: fileTypeConfig.XLSX.bgColor,
  pptx: fileTypeConfig.PPTX.bgColor,
  ppt: fileTypeConfig.PPTX.bgColor,
  md: fileTypeConfig.Markdown.bgColor,
  html: fileTypeConfig.HTML.bgColor,
  eml: fileTypeConfig.EML.bgColor,
  txt: fileTypeConfig.TXT.bgColor,
};

const typeOptions = ['docx', 'pdf', 'xlsx', 'pptx', 'md', 'txt', 'html', 'eml'].map((item) => ({
  label: item,
  value: item,
}));

const documentStatusMap: Record<string, { text: string; color: string; bgColor: string }> = {
  '0': { text: '待处理', color: '#faad14', bgColor: '#fffbe6' },
  '1': { text: '处理中', color: '#1890ff', bgColor: '#e6f7ff' },
  '2': { text: '已完成', color: '#52c41a', bgColor: '#f6ffed' },
  '4': { text: '失败', color: '#ff4d4f', bgColor: '#fff1f0' },
  '5': { text: '特殊情况', color: '#722ed1', bgColor: '#f9f0ff' },
};

const documentStatusList = Object.entries(documentStatusMap).map(([value, { text }]) => ({
  label: text,
  value,
}));

const intelligentStatusMap: Record<string, { text: string; color: string; bgColor: string }> = {
  '0': { text: '未处理', color: '#8c8c8c', bgColor: '#f5f5f5' },
  '1': { text: '处理中', color: '#1890ff', bgColor: '#e6f7ff' },
  '2': { text: '已完成', color: '#52c41a', bgColor: '#f6ffed' },
  '3': { text: '失败', color: '#ff4d4f', bgColor: '#fff1f0' },
};

const INTELLIGENT_STEPS = ['关键词提取', '实体抽取', '标签分类'];
const INTELLIGENT_STEP_HEIGHT = 20;

const IntelligentProcessingTag: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % INTELLIGENT_STEPS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <LoadingOutlined spin style={{ fontSize: 12 }} />
      <span
        style={{
          display: 'inline-block',
          overflow: 'hidden',
          height: INTELLIGENT_STEP_HEIGHT,
          lineHeight: `${INTELLIGENT_STEP_HEIGHT}px`,
          verticalAlign: 'middle',
        }}
      >
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            transform: `translateY(-${step * INTELLIGENT_STEP_HEIGHT}px)`,
            transition: 'transform 0.4s ease',
          }}
        >
          {INTELLIGENT_STEPS.map((label) => (
            <span
              key={label}
              style={{
                height: INTELLIGENT_STEP_HEIGHT,
                lineHeight: `${INTELLIGENT_STEP_HEIGHT}px`,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
};

const getFileTypeIcon = (fileType: string): React.ReactNode => {
  const key = fileType.replace(/^\./, '').toLowerCase().trim();
  return fileTypeIconMap[key] || fileTypeIconMap.txt;
};

const getFileTypeBgColor = (fileType: string): string => {
  const key = fileType.replace(/^\./, '').toLowerCase().trim();
  return fileTypeBgColorMap[key] || fileTypeConfig.default.bgColor;
};

const getStatusInfo = (status: string) =>
  documentStatusMap[String(status)] || {
    text: status || '-',
    color: '#8c8c8c',
    bgColor: '#f5f5f5',
  };

const getIntelligentStatusInfo = (status: string) =>
  intelligentStatusMap[String(status)] || intelligentStatusMap['0'];

const isStatusCompleted = (status: string) => String(status) === '2';

const extractPageList = (payload: any): any[] =>
  payload?.data?.list || payload?.data?.records || payload?.list || payload?.rows || [];

const extractPageTotal = (payload: any) =>
  Number(payload?.data?.total ?? payload?.total ?? payload?.data?.count ?? 0);

const extractStringList = (value: any): string[] => {
  if (!Array.isArray(value)) {
    return value === undefined || value === null || value === '' ? [] : [String(value)];
  }

  return value.map((item) => String(item ?? '')).filter(Boolean);
};

const extractIdList = (value: any): Array<number | string> => {
  if (!Array.isArray(value)) {
    return value === undefined || value === null || value === '' ? [] : [value];
  }

  return value.filter((item) => item !== undefined && item !== null && item !== '');
};

const formatDateTime = (value: any) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const date = new Date(Number(value));
    if (!Number.isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const hours = `${date.getHours()}`.padStart(2, '0');
      const minutes = `${date.getMinutes()}`.padStart(2, '0');
      const seconds = `${date.getSeconds()}`.padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }

  return String(value);
};

const formatDocumentFileSize = (value: any) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) {
    return String(value);
  }

  return formatFileSize(size);
};

const normalizeDocumentRecord = (item: DocumentPageItem, index: number): DocumentRecord => {
  const fileType = String(item.fileType ?? item.type ?? '').toUpperCase();
  const objList = Array.isArray(item.knowledgeBaseObj) ? item.knowledgeBaseObj : [];
  const knowledgeBaseIds =
    objList.length > 0
      ? objList.map((obj) => obj.id).filter((id) => id !== undefined && id !== null)
      : extractIdList(item.knowledgeBaseIds ?? item.knowledgeBaseId);
  const knowledgeBaseNames =
    objList.length > 0
      ? objList.map((obj) => String(obj.name ?? '')).filter(Boolean)
      : extractStringList(item.knowledgeBaseNames ?? item.knowledgeBaseName);

  return {
    id: String(item.id ?? item.documentId ?? item.fileId ?? `${index}`),
    name: String(item.name ?? item.fileName ?? item.documentName ?? '-'),
    filePath: String(item.filePath ?? ''),
    fileType: fileType || '-',
    fileSizeBytes: item.fileSizeBytes,
    knowledgeBaseIds,
    knowledgeBaseNames,
    keywords: (() => {
      const raw = item.keywords;
      if (Array.isArray(raw)) {
        return raw.map((keyword) => String(keyword ?? '').trim()).filter(Boolean);
      }
      if (typeof raw === 'string' && raw) {
        return raw
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean);
      }
      return [];
    })(),
    channelName: String(item.channelName ?? '-'),
    fileTagNames: extractStringList(item.fileTagNames ?? item.fileTagName),
    catalogName: String(item.catalogName ?? item.catalog ?? '-'),
    status: String(item.status ?? ''),
    intelligentStatus: String(item.intelligentStatus ?? ''),
    entityCount: item.entityCount ?? 0,
    relationCount: item.relationCount ?? 0,
    entities: (() => {
      const raw = item.entities as unknown;
      if (Array.isArray(raw)) return raw as string[];
      if (typeof raw === 'string' && raw) return raw.split(',');
      return [];
    })(),
    createTime: formatDateTime(item.createTime),
  };
};

const renderTags = (values: string[]) => {
  if (!values.length) {
    return '-';
  }

  const normalizedValues = values
    .map((value) => (typeof value === 'string' ? value : String((value as any)?.label ?? (value as any)?.name ?? value)))
    .filter(Boolean);

  if (!normalizedValues.length) {
    return '-';
  }

  const maxVisible = 3;
  const visibleValues = normalizedValues.slice(0, maxVisible);
  const hiddenValues = normalizedValues.slice(maxVisible);

  const content = (
    <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
      {visibleValues.map((value, index) => {
        const color = '#1890ff';
        return (
          <Tag
            key={`${value}-${index}`}
            style={{
              color,
              background: `${color}15`,
              border: `1px solid ${color}30`,
              marginBottom: 2,
            }}
          >
            {value}
          </Tag>
        );
      })}
      {hiddenValues.length > 0 && <span style={{ color: '#bfbfbf' }}>+{hiddenValues.length}</span>}
    </span>
  );

  if (!hiddenValues.length) {
    return content;
  }

  return (
    <Tooltip
      color="#fff"
      title={
        <div style={tagTooltipOverlayStyle}>
          {normalizedValues.map((value, idx) => (
            <span key={`${value}-${idx}`} style={miniTagStyle}>
              {value}
            </span>
          ))}
        </div>
      }
    >
      {content}
    </Tooltip>
  );
};

const miniTagStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '0 6px',
  lineHeight: '18px',
  borderRadius: 3,
  background: '#f5f5f5',
  color: '#595959',
  whiteSpace: 'nowrap',
};

const tagTooltipOverlayStyle: React.CSSProperties = {
  maxWidth: 280,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
};

const renderDocumentStats = (record: DocumentRecord) => {
  const entities = Array.isArray(record.entities) ? record.entities : [];
  const visibleEntities = entities.slice(0, 3);
  const hasMore = entities.length > 3;

  return (
    <div
      style={{
        fontSize: 12,
        color: '#8c8c8c',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
      }}
    >
      <span>{record.entityCount} 个实体</span>
      {visibleEntities.length > 0 && (
        <>
          <span style={{ margin: '0 2px' }}>-</span>
          {hasMore ? (
            <Tooltip
              color="#fff"
              title={
                <div style={tagTooltipOverlayStyle}>
                  {entities.map((entity, idx) => (
                    <span key={`${entity}-${idx}`} style={miniTagStyle}>
                      {entity}
                    </span>
                  ))}
                </div>
              }
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {visibleEntities.map((entity, idx) => (
                  <span key={idx} style={miniTagStyle}>
                    {entity}
                  </span>
                ))}
                <span style={{ color: '#bfbfbf' }}>+{entities.length - 3}</span>
              </span>
            </Tooltip>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {visibleEntities.map((entity, idx) => (
                <span key={idx} style={miniTagStyle}>
                  {entity}
                </span>
              ))}
            </span>
          )}
        </>
      )}
      <span style={{ margin: '0 2px' }}>·</span>
      <span>{record.relationCount} 条关系</span>
    </div>
  );
};

function prevAverage(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

function normalizeKnowledgeBase(item: KnowledgeBaseItem): KnowledgeBaseSummary {
  return {
    id: String(item.id),
    name: item.name,
    description: item.description || '',
    documentCount: item.documentCount ?? 0,
    entityCount: item.entityCount ?? 0,
    status: String(item.enabled) === '0' ? 'disabled' : 'active',
    createTime: item.createTime || '',
    color: item.color || '#1890ff',
  };
}

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function splitFileName(name: string) {
  const trimmedName = String(name || '').trim();
  const lastDotIndex = trimmedName.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === trimmedName.length - 1) {
    return {
      baseName: trimmedName,
      extension: '',
    };
  }

  return {
    baseName: trimmedName.slice(0, lastDotIndex),
    extension: trimmedName.slice(lastDotIndex),
  };
}

export default function KnowledgeDetailPage() {
  const params = useParams<{ id: string }>();
  const knowledgeId = String(params.id || '');

  const [data, setData] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<number | string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [accessMode, setAccessMode] = useState<string>('2');

  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [uploadVisible, setUploadVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [targetKnowledgeBases, setTargetKnowledgeBases] = useState<Array<number | string>>([]);
  const [moveOperateType, setMoveOperateType] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<DocumentRecord | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DocumentRecord | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCatalog, setEditingCatalog] = useState<number | string | undefined>();
  const [editingKnowledgeBases, setEditingKnowledgeBases] = useState<Array<number | string>>([]);
  const [editingTags, setEditingTags] = useState<Array<number | string>>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [uploadKnowledgeBase, setUploadKnowledgeBase] = useState<Array<number | string>>(
    knowledgeId ? [knowledgeId] : [],
  );
  const [uploadTags, setUploadTags] = useState<Array<number | string>>([]);
  const [uploadCatalog, setUploadCatalog] = useState<number | string | undefined>();
  const [uploadChannelSource, setUploadChannelSource] = useState<number | string | undefined>();
  const [catalogOptions, setCatalogOptions] = useState<
    Array<{ label: string; value: number | string }>
  >([]);
  const [channelOptions, setChannelOptions] = useState<
    Array<{ label: string; value: number | string }>
  >([]);
  const [knowledgeBaseOptions, setKnowledgeBaseOptions] = useState<
    Array<{ label: string; value: number | string; disabled?: boolean }>
  >([]);
  const [tagOptions, setTagOptions] = useState<Array<{ label: string; value: number | string }>>(
    [],
  );
  const [knowledgeBaseNameMap, setKnowledgeBaseNameMap] = useState<Record<string, string>>({});

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState<UploadFileItem[]>([]);
  const lastDocumentRequestKeyRef = useRef('');
  const [modeSummary, setModeSummary] = useState({
    total: 0,
    autoCount: 0,
    uploadCount: 0,
  });

  const handlePreview = (record: DocumentRecord) => {
    const filePath = record.filePath?.trim();
    if (!filePath) {
      message.warning('文件路径不存在，无法预览');
      return;
    }
    setPreviewRecord(record);
    setPreviewVisible(true);
  };

  const handlePreviewClose = () => {
    setPreviewVisible(false);
    setPreviewRecord(null);
  };

  const handleEditOpen = (record: DocumentRecord) => {
    const { baseName } = splitFileName(record.name === '-' ? '' : record.name);
    setEditingRecord(record);
    setEditingName(baseName);
    const matchedCatalog = catalogOptions.find((option) => option.label === record.catalogName);
    setEditingCatalog(matchedCatalog?.value);
    setEditingKnowledgeBases(record.knowledgeBaseIds.map((item) => String(item)));
    setEditingTags(
      (record.fileTagNames || [])
        .map((tagName) => tagOptions.find((option) => option.label === tagName)?.value)
        .filter((value): value is number | string => value !== undefined && value !== null && value !== ''),
    );
    setEditVisible(true);
  };

  const resetEditState = () => {
    setEditVisible(false);
    setEditingRecord(null);
    setEditingName('');
    setEditingCatalog(undefined);
    setEditingKnowledgeBases([]);
    setEditingTags([]);
    setEditSubmitting(false);
  };

  useEffect(() => {
    setUploadKnowledgeBase(knowledgeId ? [knowledgeId] : []);
  }, [knowledgeId]);

  const { data: knowledgeBasePage, loading: knowledgeLoading } =
    useRequest<KnowledgeBasePageResult>(() => getKnowledgeBaseList({ pageNo: 1, pageSize: 1000 }), {
      ready: true,
    });

  const knowledgeBaseList = useMemo(() => {
    const pageData = knowledgeBasePage as KnowledgeBasePageResult | undefined;
    return (pageData?.list || []).map((item: KnowledgeBaseItem) => normalizeKnowledgeBase(item));
  }, [knowledgeBasePage]);

  const knowledge = useMemo(
    () => knowledgeBaseList.find((item) => item.id === knowledgeId) || knowledgeBaseList[0] || null,
    [knowledgeBaseList, knowledgeId],
  );

  const detailSummary = useMemo(() => {
    const allTags = getUniqueValues(data.flatMap((item) => item.fileTagNames || []));
    const allCatalogs = getUniqueValues(data.map((item) => item.catalogName).filter((item) => item && item !== '-'));
    const allChannels = getUniqueValues(data.map((item) => item.channelName).filter((item) => item && item !== '-'));
    const allTypes = getUniqueValues(data.map((item) => item.fileType).filter((item) => item && item !== '-'));

    return {
      tagCount: allTags.length,
      catalogCount: allCatalogs.length,
      channelCount: allChannels.length,
      typeCount: allTypes.length,
      tags: allTags.slice(0, 5),
      catalogs: allCatalogs.slice(0, 4),
    };
  }, [data]);

  const fetchModeSummary = useCallback(async () => {
    if (!knowledgeId) {
      setModeSummary({ total: 0, autoCount: 0, uploadCount: 0 });
      return;
    }

    try {
      const [autoRes, uploadRes] = await Promise.all([
        getDocumentPage({
          pageNo: 1,
          pageSize: 1,
          knowledgeBaseId: knowledgeId,
          accessMode: '1',
        }),
        getDocumentPage({
          pageNo: 1,
          pageSize: 1,
          knowledgeBaseId: knowledgeId,
          accessMode: '2',
        }),
      ]);

      const autoCount = extractPageTotal(autoRes);
      const uploadCount = extractPageTotal(uploadRes);
      setModeSummary({
        total: autoCount + uploadCount,
        autoCount,
        uploadCount,
      });
    } catch (error) {
      console.error(error);
    }
  }, [knowledgeId]);

  useEffect(() => {
    fetchModeSummary();
  }, [fetchModeSummary]);

  const documentRequestParams = useMemo(
    () => ({
      pageNo,
      pageSize,
      name: searchText.trim() || undefined,
      fileType: typeFilter || undefined,
      channelId: channelFilter,
      status: statusFilter || undefined,
      accessMode: accessMode || undefined,
      knowledgeBaseId: knowledgeId || undefined,
    }),
    [
      accessMode,
      channelFilter,
      knowledgeId,
      pageNo,
      pageSize,
      searchText,
      statusFilter,
      typeFilter,
    ],
  );

  const documentRequestKey = useMemo(
    () => JSON.stringify(documentRequestParams),
    [documentRequestParams],
  );

  useEffect(() => {
    const fetchChannelOptions = async () => {
      try {
        const res: any = await getChannelConfigPage({ pageNo: 1, pageSize: 1000 });
        const options = extractPageList(res).map((item: any) => ({
          label: item.name,
          value: item.id ?? item.name,
        }));
        setChannelOptions(options);
      } catch (error) {
        console.error(error);
        message.error('获取渠道来源失败');
      }
    };

    fetchChannelOptions();
  }, []);

  useEffect(() => {
    const fetchCatalogOptions = async () => {
      try {
        const res: any = await getCatalogTypePage({ pageNo: 1, pageSize: 1000 });
        const options = extractPageList(res).map((item: any) => ({
          label: item.name,
          value: item.id,
        }));
        setCatalogOptions(options);
      } catch (error) {
        console.error(error);
        message.error('获取编目分类失败');
      }
    };

    fetchCatalogOptions();
  }, []);

  useEffect(() => {
    const fetchTagOptions = async () => {
      try {
        const res: any = await getTagPage({ pageNo: 1, pageSize: 1000 });
        const options = extractPageList(res).map((item: any) => ({
          label: item.tag ?? item.name,
          value: item.id,
        }));
        setTagOptions(options);
      } catch (error) {
        console.error(error);
        message.error('获取分类标签失败');
      }
    };

    fetchTagOptions();
  }, []);

  useEffect(() => {
    const fetchKnowledgeBaseOptions = async () => {
      try {
        const size = 1000;
        let currentPage = 1;
        let items: any[] = [];
        let totalCount = 0;

        do {
          const res: any = await getKnowledgeBasePage({
            pageNo: currentPage,
            pageSize: size,
          });
          const pageItems = extractPageList(res);
          items = items.concat(pageItems);
          totalCount = extractPageTotal(res);
          currentPage += 1;
        } while (totalCount > items.length && currentPage < 100);

        const options = items.map((item: any) => ({
          label: item.name,
          value: String(item.id),
          disabled: String(item.enabled) === '0',
        }));
        const nameMap = items.reduce<Record<string, string>>((map, item) => {
          if (item?.id !== undefined && item?.id !== null) {
            map[String(item.id)] = String(item.name ?? '');
          }
          return map;
        }, {});

        setKnowledgeBaseOptions(options);
        setKnowledgeBaseNameMap(nameMap);
      } catch (error) {
        console.error(error);
        message.error('获取知识库列表失败');
      }
    };

    fetchKnowledgeBaseOptions();
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getDocumentPage(documentRequestParams);

      if (res?.code !== undefined && res.code !== 200) {
        message.error(res?.msg || '获取文档列表失败');
        setData([]);
        setTotal(0);
        return;
      }

      const offset = (pageNo - 1) * pageSize;
      const rawList = extractPageList(res);
      setData(rawList.map((item, index) => normalizeDocumentRecord(item, offset + index)));
      setTotal(extractPageTotal(res));
      setSelectedRowKeys([]);
      fetchModeSummary();
    } catch (error) {
      console.error(error);
      message.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  }, [documentRequestParams, fetchModeSummary, pageNo, pageSize]);

  useEffect(() => {
    if (lastDocumentRequestKeyRef.current === documentRequestKey) {
      return;
    }
    lastDocumentRequestKeyRef.current = documentRequestKey;
    fetchDocuments();
  }, [documentRequestKey, fetchDocuments]);

  const resetUploadState = () => {
    setUploadVisible(false);
    setUploadCatalog(undefined);
    setUploadChannelSource(undefined);
    setUploadKnowledgeBase(knowledgeId ? [knowledgeId] : []);
    setUploadTags([]);
    setUploadProgress(0);
    setFileList([]);
  };

  const resetToFirstPage = () => {
    setPageNo(1);
  };

  const handleStatusFilterChange = (value?: string) => {
    resetToFirstPage();
    setStatusFilter(value ?? null);
  };

  const handleTypeFilterChange = (value?: string) => {
    resetToFirstPage();
    setTypeFilter(value ?? null);
  };

  const handleAccessModeChange = (value: string) => {
    resetToFirstPage();
    setAccessMode(value);
  };

  const handleChannelFilterChange = (value?: number | string) => {
    resetToFirstPage();
    setChannelFilter(value);
  };

  const handleSearchTextChange = (value: string) => {
    resetToFirstPage();
    setSearchText(value);
  };

  const handleResetSearch = () => {
    setPageNo(1);
    setStatusFilter(null);
    setTypeFilter(null);
    setChannelFilter(undefined);
    setSearchText('');
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPageNo(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  const handleDownload = (record: DocumentRecord) => {
    const filePath = record.filePath?.trim();
    if (!filePath) {
      message.warning('文件路径不存在，无法下载');
      return;
    }

    const link = document.createElement('a');
    const isFullUrl = /^(https?:)?\/\//i.test(filePath) || /^(blob|data):/i.test(filePath);
    link.href = isFullUrl || filePath.startsWith('/') ? filePath : `/${filePath}`;
    link.download = record.name && record.name !== '-' ? record.name : '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRetry = async (record: DocumentRecord) => {
    setRetryingId(record.id);
    try {
      const res: any = await reAnalysisDocument([record.id]);
      if (res?.code !== undefined && res.code !== 200) {
        message.error(res?.msg || '重试失败');
        return;
      }
      message.success('已提交重新解析');
      await fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('重试失败');
    } finally {
      setRetryingId(null);
    }
  };

  const handleUpload = async () => {
    if (
      uploadChannelSource === undefined ||
      uploadChannelSource === null ||
      uploadChannelSource === ''
    ) {
      message.warning('请选择渠道来源');
      return;
    }
    if (uploadCatalog === undefined || uploadCatalog === null || uploadCatalog === '') {
      message.warning('请选择编目分类');
      return;
    }
    if (!uploadKnowledgeBase.length) {
      message.warning('当前知识库不存在，无法上传');
      return;
    }
    if (fileList.length === 0) {
      message.warning('请先选择上传文件');
      return;
    }
    const failedFile = fileList.find((item) => item.uploadStatus === '失败');
    if (failedFile) {
      message.warning(`文件 ${failedFile.name} 上传失败，请移除后重试`);
      return;
    }
    const unfinishedFile = fileList.find((item) => item.uploadStatus !== '上传成功');
    if (unfinishedFile) {
      message.warning(`文件 ${unfinishedFile.name} 仍在上传中，请稍后再提交`);
      return;
    }
    const uploadedFiles = fileList.flatMap((item) => item.responseData || []);
    if (!uploadedFiles.length) {
      message.warning('未获取到文件上传结果，请重新上传');
      return;
    }

    const files = uploadedFiles.map(({ fileName, fileSize, fileExtension, ...file }) => ({
      ...file,
      name: fileName,
      fileSizeBytes: fileSize,
      fileType: fileExtension,
    }));

    setUploading(true);
    try {
      const payload = {
        catalogId: uploadCatalog as number | string,
        channelId: uploadChannelSource as number | string,
        knowledgeBaseIds: uploadKnowledgeBase,
        fileTagIds: uploadTags,
        enableOcr: 0,
        enableTrans: 0,
        enableExtract: 0,
        files,
      };
      const res: any = await createFileBaseData(payload);
      if (res?.code !== undefined && res.code !== 200) {
        message.error(res?.msg || '上传文档失败');
        return;
      }
      message.success('上传文档成功');
      resetUploadState();
      await fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('上传文档失败');
    } finally {
      setUploading(false);
    }
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
      responseData?: any[],
    ) => {
      setFileList((prev) => {
        const nextList = prev.map((item) =>
          item.uid === uid
            ? { ...item, uploadStatus: status, percentage, errorMsg, responseData }
            : item,
        );
        const nextPercent = Math.round(prevAverage(nextList.map((item) => item.percentage || 0)));
        setUploadProgress(nextPercent);
        return nextList;
      });
    };

    chunkUpload(file, onStatusChange, file.uid).catch(() => undefined);
    return false;
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res: any = await deleteDocumentBatch([id]);
      if (res?.code !== undefined && res.code !== 200) {
        message.error(res?.msg || '删除失败');
        return;
      }
      message.success('删除成功');
      await fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的文档');
      return;
    }

    setBatchDeleting(true);
    try {
      const ids = selectedRowKeys.map((id) => id as number | string);
      const res: any = await deleteDocumentBatch(ids);
      if (res?.code !== undefined && res.code !== 200) {
        message.error(res?.msg || '批量删除失败');
        return;
      }
      setSelectedRowKeys([]);
      message.success('批量删除成功');
      await fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleBatchMove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要移动的文档');
      return;
    }
    setTargetKnowledgeBases([]);
    setMoveOperateType('APPEND');
    setMoveModalVisible(true);
  };

  const handleConfirmMove = async () => {
    if (!targetKnowledgeBases.length) {
      message.warning('请选择目标知识库');
      return;
    }

    setMoveSubmitting(true);
    try {
      const res: any = await batchSetDocumentKnowledgeBase({
        documentIds: selectedRowKeys.map((id) => id as number | string),
        knowledgeBaseIds: targetKnowledgeBases,
        operateType: moveOperateType,
      });
      if (res?.code !== undefined && res.code !== 200) {
        message.error(res?.msg || '批量移动失败');
        return;
      }

      const knowledgeBaseNames = targetKnowledgeBases.map(
        (id) => knowledgeBaseNameMap[String(id)] || String(id),
      );
      const knowledgeBaseText = knowledgeBaseNames.join('、');
      message.success(
        moveOperateType === 'REPLACE'
          ? `已将所选文档覆盖到知识库 ${knowledgeBaseText}`
          : `已为所选文档追加知识库 ${knowledgeBaseText}`,
      );
      setMoveModalVisible(false);
      setTargetKnowledgeBases([]);
      setMoveOperateType('APPEND');
      setSelectedRowKeys([]);
      await fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('批量移动失败');
    } finally {
      setMoveSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) {
      return;
    }
    if (!editingName.trim()) {
      message.warning('请输入文件名称');
      return;
    }
    if (editingCatalog === undefined || editingCatalog === null || editingCatalog === '') {
      message.warning('请选择所属分类');
      return;
    }
    if (!editingKnowledgeBases.length) {
      message.warning('请选择知识库');
      return;
    }

    setEditSubmitting(true);
    try {
      const { extension } = splitFileName(editingRecord.name === '-' ? '' : editingRecord.name);
      const res: any = await updateDocument({
        id: editingRecord.id,
        name: `${editingName.trim()}${extension}`,
        catalogId: editingCatalog,
        knowledgeBaseIds: editingKnowledgeBases,
        fileTagIds: editingTags,
      });
      if (res?.code !== undefined && res.code !== 200) {
        message.error(res?.msg || '编辑文档失败');
        return;
      }
      message.success('编辑文档成功');
      resetEditState();
      await fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('编辑文档失败');
    } finally {
      setEditSubmitting(false);
    }
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
              backgroundColor: getFileTypeBgColor(record.fileType),
              borderRadius: 8,
            }}
          >
            {getFileTypeIcon(record.fileType)}
          </div>
          <div style={{ flex: 1 }}>
            <Typography.Text
              style={{
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#4e7cc4',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#4e7cc4')}
              onClick={() => handlePreview(record)}
              title="点击预览文档"
            >
              {record.name}
              <EyeOutlined style={{ fontSize: 13 }} />
            </Typography.Text>
            {renderDocumentStats(record)}
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'fileType',
      key: 'fileType',
    },
    {
      title: '大小',
      dataIndex: 'fileSizeBytes',
      key: 'fileSizeBytes',
      render: (value) => formatDocumentFileSize(value),
    },
    {
      title: '所属知识库',
      dataIndex: 'knowledgeBaseNames',
      key: 'knowledgeBaseNames',
      render: (_, record) => {
        if (!record.knowledgeBaseNames.length) {
          return '-';
        }

        return (
          <Space size={4} wrap>
            {record.knowledgeBaseNames.map((name, index) => {
              const id = record.knowledgeBaseIds[index];
              return id !== undefined && id !== null && id !== '' ? (
                <Button
                  key={`${id}-${name}`}
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => history.push(`/knowledge/detail/${id}`)}
                >
                  {name}
                </Button>
              ) : (
                <span key={`${name}-${index}`}>{name}</span>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: '渠道来源',
      dataIndex: 'channelName',
      key: 'channelName',
      render: (value: string) => value || '-',
    },
    {
      title: '解析状态',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        const { text, color, bgColor } = getStatusInfo(record.status);
        const isProcessing = String(record.status) === '1';
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 10px',
              borderRadius: 12,
              background: bgColor,
              color,
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {isProcessing ? (
              <LoadingOutlined spin style={{ fontSize: 12 }} />
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: color,
                }}
              />
            )}
            {text}
          </span>
        );
      },
    },
    {
      title: '智能状态',
      dataIndex: 'intelligentStatus',
      key: 'intelligentStatus',
      render: (value: string) => {
        const info = getIntelligentStatusInfo(value);
        const isProcessing = String(value) === '1';
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 10px',
              borderRadius: 12,
              background: info.bgColor,
              color: info.color,
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {isProcessing ? (
              <IntelligentProcessingTag />
            ) : (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: info.color,
                  }}
                />
                {info.text}
              </>
            )}
          </span>
        );
      },
    },
    {
      title: '分类标签',
      dataIndex: 'fileTagNames',
      key: 'fileTagNames',
      render: renderTags,
    },
    {
      title: '关键词列表',
      dataIndex: 'keywords',
      key: 'keywords',
      render: (values: string[]) => {
        if (!Array.isArray(values) || !values.length) {
          return '-';
        }

        const MAX_VISIBLE = 2;
        const visible = values.slice(0, MAX_VISIBLE);
        const rest = values.slice(MAX_VISIBLE);

        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {rest.length > 0 ? (
              <Tooltip
                color="#fff"
                title={
                  <div style={tagTooltipOverlayStyle}>
                    {values.map((value, idx) => (
                      <span key={`${value}-${idx}`} style={miniTagStyle}>
                        {value}
                      </span>
                    ))}
                  </div>
                }
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {visible.map((value, idx) => (
                    <span key={idx} style={miniTagStyle}>
                      {value}
                    </span>
                  ))}
                  <span style={{ color: '#bfbfbf' }}>+{rest.length}</span>
                </span>
              </Tooltip>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {visible.map((value, idx) => (
                  <span key={idx} style={miniTagStyle}>
                    {value}
                  </span>
                ))}
              </span>
            )}
          </span>
        );
      },
    },
    {
      title: '编目分类',
      dataIndex: 'catalogName',
      key: 'catalogName',
      width: 160,
      render: (value) =>
        value && value !== '-' ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#595959',
              whiteSpace: 'nowrap',
            }}
          >
            <FolderOutlined style={{ fontSize: 14, color: '#8c8c8c' }} />
            {value}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => {
        const completed = isStatusCompleted(record.status);
        return (
          <Space size="small">
            <Tooltip title={completed ? '查看详情' : '解析完成后可查看详情'}>
              <span style={{ display: 'inline-flex' }}>
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  disabled={!completed}
                  onClick={() => {
                    const detailQuery = new URLSearchParams();
                    if (record.name && record.name !== '-') {
                      detailQuery.set('title', record.name);
                    }
                    if (record.fileType && record.fileType !== '-') {
                      detailQuery.set('type', record.fileType);
                    }
                    if (record.filePath) {
                      detailQuery.set('filePath', record.filePath);
                    }
                    history.push(
                      `/data/document/${record.id}${
                        detailQuery.toString() ? `?${detailQuery.toString()}` : ''
                      }`,
                    );
                  }}
                >
                  详情
                </Button>
              </span>
            </Tooltip>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditOpen(record)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              下载
            </Button>
            {String(record.status) === '4' && (
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
              title="确认删除？"
              onConfirm={() => handleDelete(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === record.id}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  if (knowledgeLoading && !knowledge) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!knowledge) {
    return <Empty description="知识库不存在" style={{ marginTop: 80 }} />;
  }

  return (
    <>
      <div style={{ background: '#f5f7fa', minHeight: 'calc(100vh - 300px)' }}>
        <Card styles={{ body: { minHeight: '86vh', padding: 0 } }}>
          <div style={{ padding: 24, borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => history.go(-1)}>
                  返回
                </Button>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${knowledge.color}15 0%, ${knowledge.color}30 100%)`,
                    borderRadius: 12,
                  }}
                >
                  <FolderOutlined style={{ fontSize: 24, color: knowledge.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#262626' }}>
                    {knowledge.name}
                  </div>
                  <div style={{ fontSize: 14, color: '#8c8c8c', marginTop: 2 }}>
                    {knowledge.description || '暂无描述'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  minWidth: 520,
                  padding: '14px 18px',
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${knowledge.color}10 0%, ${knowledge.color}05 100%)`,
                  border: `1px solid ${knowledge.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 24,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#8c8c8c' }}>文档总数</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 28,
                        lineHeight: 1.2,
                        fontWeight: 700,
                        color: knowledge.color,
                      }}
                    >
                      {modeSummary.total || Number(knowledge.documentCount) || 0}
                    </span>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>篇</span>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0,
                    justifyContent: 'flex-end',
                    flex: 1,
                  }}
                >
                  {[
                    {
                      key: 'auto-read',
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <SyncOutlined style={{ color: knowledge.color }} />
                          自动读取
                        </span>
                      ),
                      value: modeSummary.autoCount,
                      content: `${modeSummary.autoCount} 篇`,
                    },
                    {
                      key: 'page-upload',
                      label: (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CloudUploadOutlined style={{ color: knowledge.color }} />
                          页面上传
                        </span>
                      ),
                      value: modeSummary.uploadCount,
                      content: `${modeSummary.uploadCount} 篇`,
                    },
                    {
                      key: 'tag-summary',
                      label: '分类标签 Top 5',
                      value: detailSummary.tagCount,
                      content: detailSummary.tags.length ? detailSummary.tags.join('、') : '暂无',
                    },
                  ].map((item, index, list) => (
                    <div
                      key={item.key}
                      style={{
                        padding: '0 18px',
                        borderLeft: `1px solid ${knowledge.color}18`,
                        borderRight:
                          index === list.length - 1 ? `1px solid ${knowledge.color}18` : 'none',
                        minWidth: index === list.length - 1 ? 220 : 110,
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: index === list.length - 1 ? 13 : 16,
                          lineHeight: 1.5,
                          color: '#4b5565',
                          fontWeight: index === list.length - 1 ? 400 : 600,
                          whiteSpace: index === list.length - 1 ? 'normal' : 'nowrap',
                        }}
                      >
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #f0f7ff 0%, #fafcff 100%)',
                borderRadius: 8,
                border: '1px solid #d6e4ff',
                boxShadow: '0 1px 2px rgba(24,144,255,0.06)',
              }}
            >
              <Space size={12} wrap>
                <Select
                  placeholder="状态筛选"
                  allowClear
                  style={{ width: 120 }}
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  options={documentStatusList}
                />
                <Select
                  placeholder="类型筛选"
                  allowClear
                  style={{ width: 120 }}
                  value={typeFilter}
                  onChange={handleTypeFilterChange}
                  options={typeOptions}
                />
                <Select
                  placeholder="渠道筛选"
                  allowClear
                  style={{ width: 220 }}
                  value={channelFilter}
                  onChange={handleChannelFilterChange}
                  options={channelOptions}
                  showSearch
                  optionFilterProp="label"
                />
                <Input
                  placeholder="搜索文档名称"
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  style={{ width: 320 }}
                  value={searchText}
                  onChange={(e) => handleSearchTextChange(e.target.value)}
                  allowClear
                />
                <Button onClick={handleResetSearch}>重置</Button>
              </Space>
              <Space size={12}>
                <Button icon={<ReloadOutlined />} onClick={fetchDocuments} loading={loading}>
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  onClick={() => setUploadVisible(true)}
                >
                  上传文档
                </Button>
                <Button icon={<FolderOutlined />} onClick={handleBatchMove}>
                  批量移动
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                  loading={batchDeleting}
                >
                  批量删除
                </Button>
              </Space>
            </div>

            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #e8e8e8',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Tabs
                activeKey={accessMode}
                onChange={handleAccessModeChange}
                style={{ marginBottom: 16 }}
                items={[
                  {
                    key: '1',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <SyncOutlined />
                        自动读取
                      </span>
                    ),
                  },
                  {
                    key: '2',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CloudUploadOutlined />
                        页面上传
                      </span>
                    ),
                  },
                ]}
              />
              <Table
                columns={columns}
                dataSource={data}
                loading={loading}
                rowKey="id"
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
                onChange={handleTableChange}
                scroll={{ x: 1400 }}
                pagination={{
                  current: pageNo,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (count) => `共 ${count} 条记录`,
                  pageSizeOptions: ['10', '20', '50'],
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      <Modal
        title="编辑文档"
        open={editVisible}
        onCancel={() => {
          if (!editSubmitting) {
            resetEditState();
          }
        }}
        onOk={handleEditSubmit}
        okText="保存"
        cancelText="取消"
        confirmLoading={editSubmitting}
        width={560}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
            文件名称 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            placeholder="请输入文件名称（不含后缀）"
            maxLength={100}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
            编辑编目 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择编目分类"
            value={editingCatalog}
            onChange={setEditingCatalog}
            options={catalogOptions}
            showSearch
            optionFilterProp="label"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
            编辑知识库 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="请选择知识库"
            value={editingKnowledgeBases}
            onChange={setEditingKnowledgeBases}
            options={knowledgeBaseOptions}
            showSearch
            optionFilterProp="label"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>编辑分类标签</div>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="请选择分类标签"
            value={editingTags}
            onChange={setEditingTags}
            options={tagOptions}
            showSearch
            optionFilterProp="label"
          />
        </div>
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
            placeholder="请选择编目分类"
            value={uploadCatalog}
            onChange={setUploadCatalog}
            options={catalogOptions}
            showSearch
            optionFilterProp="label"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#bfbfbf' }}>归类到知识库</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            value={uploadKnowledgeBase}
            onChange={setUploadKnowledgeBase}
            options={knowledgeBaseOptions}
            disabled
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>分类标签</div>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="请选择分类标签"
            value={uploadTags}
            onChange={setUploadTags}
            options={tagOptions}
            showSearch
            optionFilterProp="label"
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
        title="批量移动文档"
        open={moveModalVisible}
        onCancel={() => {
          setMoveModalVisible(false);
          setTargetKnowledgeBases([]);
          setMoveOperateType('APPEND');
        }}
        onOk={handleConfirmMove}
        okText="确认移动"
        cancelText="取消"
        confirmLoading={moveSubmitting}
        width={520}
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
            选择目标知识库<span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="请选择一个或多个知识库"
            value={targetKnowledgeBases}
            onChange={setTargetKnowledgeBases}
            options={knowledgeBaseOptions}
            showSearch
            optionFilterProp="label"
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
            入知识库方式 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Radio.Group
            value={moveOperateType}
            onChange={(e) => setMoveOperateType(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div
                style={{
                  padding: '10px 12px',
                  border:
                    moveOperateType === 'APPEND' ? '1px solid #91caff' : '1px solid #f0f0f0',
                  borderRadius: 8,
                  background: moveOperateType === 'APPEND' ? '#f0f7ff' : '#fff',
                }}
              >
                <Radio value="APPEND">追加关联</Radio>
                <div style={{ marginTop: 6, paddingLeft: 24, fontSize: 12, color: '#8c8c8c' }}>
                  保留文档当前已有知识库，并额外添加本次选择的知识库，适合补充关联。
                </div>
              </div>
              <div
                style={{
                  padding: '10px 12px',
                  border:
                    moveOperateType === 'REPLACE' ? '1px solid #ffccc7' : '1px solid #f0f0f0',
                  borderRadius: 8,
                  background: moveOperateType === 'REPLACE' ? '#fff2f0' : '#fff',
                }}
              >
                <Radio value="REPLACE">覆盖替换</Radio>
                <div style={{ marginTop: 6, paddingLeft: 24, fontSize: 12, color: '#8c8c8c' }}>
                  清空文档原有关联，仅保留本次选中的知识库，适合统一重置。
                </div>
              </div>
            </Space>
          </Radio.Group>
        </div>
      </Modal>

      <DocumentPreviewModal
        visible={previewVisible}
        record={previewRecord}
        onClose={handlePreviewClose}
      />
    </>
  );
}
