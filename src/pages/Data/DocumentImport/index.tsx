'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import {
  Button,
  Card,
  Dropdown,
  Input,
  message,
  Modal,
  Progress,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CloudUploadOutlined,
  DownOutlined,
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
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { fileTypeConfig } from '@/config/fileTypes';
import {
  chunkUpload,
  formatFileSize,
  type UploadFileItem,
  type UploadStatus,
  UPLOADING_STATUS_LIST,
} from '@/utils/chunkUpload';
import { getChannelConfigPage } from '@/services/biz/channel-config';
import { getKnowledgeBasePage } from '@/services/biz/knowledge-base';
import { getCatalogTypePage } from '@/services/biz/catalogType';
import { getTagPage } from '@/services/biz/tag';
import {
  batchSetDocumentKnowledgeBase,
  createFileBaseData,
  deleteDocumentBatch,
  getDocumentPage,
  reAnalysisDocument,
  updateDocument,
  type DocumentPageItem,
} from './api';
import DocumentPreviewModal from './DocumentPreviewModal';
import KnowledgeExtractSnapshotView from '@/components/KnowledgeExtractSnapshotView';

const { Dragger } = Upload;

export interface DocumentRecord {
  id: string;
  name: string;
  embedName: string;
  extractSnapshot?: string | Record<string, any> | null;
  filePath: string;
  fileType: string;
  fileSizeBytes?: number | string;
  knowledgeBaseIds: Array<number | string>;
  knowledgeBaseNames: string[];
  keywords: string[];
  vectorStrategy?: {
    type: 'sentence' | 'summary' | 'custom';
    sentences_per_chunk?: number;
    sentence_overlap?: number;
    separators?: string[];
    source_chars_per_summary?: number;
    summary_max_tokens?: number;
    llm?: {
      base_url?: string;
      model?: string;
    };
    chunk_size?: number;
    chunk_overlap?: number;
  } | null;
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

type VectorStrategyValue = DocumentRecord['vectorStrategy'];

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

const getFileTypeIcon = (fileType: string): React.ReactNode => {
  const key = fileType.replace(/^\./, '').toLowerCase().trim();
  return fileTypeIconMap[key] || fileTypeIconMap.txt;
};

const getFileTypeBgColor = (fileType: string): string => {
  const key = fileType.replace(/^\./, '').toLowerCase().trim();
  return fileTypeBgColorMap[key] || fileTypeConfig.default.bgColor;
};

const typeOptions = ['docx', 'pdf', 'xlsx', 'pptx', 'md', 'txt', 'html', 'eml'].map((item) => ({
  label: item,
  value: item,
}));

/** 解析状态枚举：0=待处理 1=处理中 2=已完成 4=失败 5=特殊情况 */
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

const getStatusInfo = (status: string) =>
  documentStatusMap[String(status)] || {
    text: status || '-',
    color: '#8c8c8c',
    bgColor: '#f5f5f5',
  };

const isStatusCompleted = (status: string) => String(status) === '2';

/** 智能化状态枚举：0=未处理 1=处理中 2=已完成 3=失败 */
const intelligentStatusMap: Record<string, { text: string; color: string; bgColor: string }> = {
  '0': { text: '未处理', color: '#8c8c8c', bgColor: '#f5f5f5' },
  '1': { text: '处理中', color: '#1890ff', bgColor: '#e6f7ff' },
  '2': { text: '已完成', color: '#52c41a', bgColor: '#f6ffed' },
  '3': { text: '失败', color: '#ff4d4f', bgColor: '#fff1f0' },
};

const getIntelligentStatusInfo = (status: string) =>
  intelligentStatusMap[String(status)] || intelligentStatusMap['0'];

const INTELLIGENT_STEPS = ['关键词提取', '实体抽取', '标签分类'];

const INTELLIGENT_STEP_HEIGHT = 20;

const CONFIG_SHORTCUTS = [
  { key: 'tag', label: '标签管理', path: '/config-center/tag' },
  { key: 'channel', label: '来源渠道', path: '/data/channel-config' },
  { key: 'catalog', label: '编目管理', path: '/config-center/catalog' },
  { key: 'knowledge-extract', label: '知识抽取配置', path: '/config-center/knowledge-extract' },
];

const CONFIG_SHORTCUT_TOOLTIPS: Record<string, string> = {
  tag: '跳转到标签管理页面',
  channel: '跳转到来源渠道配置页面',
  catalog: '跳转到编目管理页面',
  'knowledge-extract': '跳转到知识抽取配置页面',
};

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
          {INTELLIGENT_STEPS.map((s) => (
            <span
              key={s}
              style={{
                height: INTELLIGENT_STEP_HEIGHT,
                lineHeight: `${INTELLIGENT_STEP_HEIGHT}px`,
                whiteSpace: 'nowrap',
              }}
            >
              {s}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
};

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

const renderUnconfiguredTag = () => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      background: '#fafafa',
      border: '1px solid #f0f0f0',
      color: '#bfbfbf',
      fontSize: 12,
    }}
  >
    未配置
  </div>
);

const formatStrategySeparator = (value: string) => value.replace(/\n/g, '\\n');

const parseVectorStrategy = (value: any): VectorStrategyValue => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value as VectorStrategyValue;
  }

  return null;
};

function renderStrategyBlock(title: string, dotColor: string, value?: string | number | null) {
  const isEmpty = value === undefined || value === null || value === '';

  return (
    <div
      key={title}
      style={{
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#8c8c8c',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <span>{title}:</span>
      </div>
      <div
        style={{
          color: isEmpty ? '#bfbfbf' : '#262626',
          fontSize: 12,
          lineHeight: 1.5,
          wordBreak: 'break-all',
        }}
      >
        {isEmpty ? '未设置' : String(value)}
      </div>
    </div>
  );
}

function renderSeparatorTags(dotColor: string, separators?: string[] | null) {
  if (!separators?.length) {
    return renderStrategyBlock('分隔符', dotColor, null);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '2px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#8c8c8c',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <span>分隔符</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {separators.map((item, index) => (
          <Tag
            key={`${item}-${index}`}
            style={{
              marginInlineEnd: 0,
              marginBottom: 0,
              borderRadius: 999,
              paddingInline: 6,
              lineHeight: '18px',
              fontSize: 12,
            }}
          >
            {formatStrategySeparator(item)}
          </Tag>
        ))}
      </div>
    </div>
  );
}

function renderVectorStrategyDetail(
  normalizedStrategy: NonNullable<VectorStrategyValue>,
  dotColor: string,
) {
  if (normalizedStrategy.type === 'sentence') {
    return (
      <div style={{ display: 'grid', gap: 2 }}>
        {renderStrategyBlock('每块句子数', dotColor, normalizedStrategy.sentences_per_chunk)}
        {renderStrategyBlock('重复句子数', dotColor, normalizedStrategy.sentence_overlap)}
        {renderSeparatorTags(dotColor, normalizedStrategy.separators)}
      </div>
    );
  }

  if (normalizedStrategy.type === 'summary') {
    return (
      <div style={{ display: 'grid', gap: 2 }}>
        {renderStrategyBlock('摘要原文字数', dotColor, normalizedStrategy.source_chars_per_summary)}
        {renderStrategyBlock('摘要最大 Tokens', dotColor, normalizedStrategy.summary_max_tokens)}
        {renderStrategyBlock('摘要模型地址', dotColor, normalizedStrategy.llm?.base_url)}
        {renderStrategyBlock('摘要模型名称', dotColor, normalizedStrategy.llm?.model)}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 2 }}>
      {renderStrategyBlock('切分粒度', dotColor, normalizedStrategy.chunk_size)}
      {renderStrategyBlock('重复字符数', dotColor, normalizedStrategy.chunk_overlap)}
      {renderSeparatorTags(dotColor, normalizedStrategy.separators)}
    </div>
  );
}

function renderVectorStrategy(
  strategy?: DocumentRecord['vectorStrategy'] | string | null,
  embedName?: string,
) {
  const normalizedStrategy = parseVectorStrategy(strategy);

  if (!normalizedStrategy) {
    return renderUnconfiguredTag();
  }

  const typeLabelMap = {
    sentence: '按句切分',
    summary: '摘要切分',
    custom: '自定义切分',
  } as const;
  const typeColorMap = {
    sentence: '#1677ff',
    summary: '#13c2c2',
    custom: '#faad14',
  } as const;
  const dotColor = typeColorMap[normalizedStrategy.type];

  const tagColorMap = {
    sentence: 'processing',
    summary: 'cyan',
    custom: 'gold',
  } as const;
  const detailContent = (
    <div style={{ maxWidth: 360, display: 'grid', gap: 6 }}>
      {/* <Tag
        color={tagColorMap[normalizedStrategy.type]}
        style={{ width: 'fit-content', marginInlineEnd: 0, marginBottom: 0 }}
      >
        {typeLabelMap[normalizedStrategy.type]}
      </Tag> */}
      {renderVectorStrategyDetail(normalizedStrategy, dotColor)}
    </div>
  );

  return (
    <div
      style={{
        display: 'grid',
        gap: 4,
        justifyItems: 'center',
        textAlign: 'center',
      }}
    >
      <Tag
        color={tagColorMap[normalizedStrategy.type]}
        style={{ width: 'fit-content', marginInlineEnd: 0, marginBottom: 0 }}
      >
        {typeLabelMap[normalizedStrategy.type]}
      </Tag>
      <Tooltip color="#fff" title={detailContent}>
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: 'auto', width: 'fit-content', fontWeight: 400 }}
          onClick={() =>
            history.push({
              pathname: '/config-center/model-manage',
              search: '?tab=embed',
            })
          }
        >
          <span style={{ fontWeight: 400 }}>{embedName || '未命名'}</span>
        </Button>
      </Tooltip>
    </div>
  );
}

const normalizeDocumentRecord = (item: DocumentPageItem, index: number): DocumentRecord => {
  const fileType = String(item.fileType ?? item.type ?? '').toUpperCase();

  // 优先从 knowledgeBaseObj [{id,name}] 解析，兼容旧字段 knowledgeBaseIds/knowledgeBaseNames
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
    embedName: String(item.embedName ?? ''),
    extractSnapshot: item.extractSnapshot ?? null,
    filePath: String(item.filePath ?? ''),
    fileType: fileType || '-',
    fileSizeBytes: item.fileSizeBytes,
    knowledgeBaseIds,
    knowledgeBaseNames,
    keywords: (() => {
      const raw = item.keywords;
      if (Array.isArray(raw)) {
        return raw.map((k) => String(k ?? '').trim()).filter(Boolean);
      }
      if (typeof raw === 'string' && raw) {
        return raw
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);
      }
      return [];
    })(),
    vectorStrategy: item.vectorStrategy ?? item.embeddingStrategy ?? item.chunkStrategy ?? null,
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
    .map((value) =>
      typeof value === 'string'
        ? value
        : String((value as any)?.label ?? (value as any)?.name ?? value),
    )
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

export default function DocumentImportPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

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
  // accessMode：1=自动读取 2=页面上传
  const [accessMode, setAccessMode] = useState<string>('2');

  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [uploadVisible, setUploadVisible] = useState(false);
  const [batchImportVisible, setBatchImportVisible] = useState(false);
  const [batchImportKnowledgeBases, setBatchImportKnowledgeBases] = useState<
    Array<number | string>
  >([]);
  const [batchImportOperateType, setBatchImportOperateType] = useState<'APPEND' | 'REPLACE'>(
    'APPEND',
  );
  const [batchImportSubmitting, setBatchImportSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<DocumentRecord | null>(null);
  const [extractConfigVisible, setExtractConfigVisible] = useState(false);
  const [extractConfigRecord, setExtractConfigRecord] = useState<DocumentRecord | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DocumentRecord | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCatalog, setEditingCatalog] = useState<number | string | undefined>();
  const [editingKnowledgeBases, setEditingKnowledgeBases] = useState<Array<number | string>>([]);
  const [editingTags, setEditingTags] = useState<Array<number | string>>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

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

  const handleOpenExtractConfig = (record: DocumentRecord) => {
    setExtractConfigRecord(record);
    setExtractConfigVisible(true);
  };

  const handleCloseExtractConfig = () => {
    setExtractConfigVisible(false);
    setExtractConfigRecord(null);
  };

  const splitFileName = (name: string) => {
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
        .filter(
          (value): value is number | string =>
            value !== undefined && value !== null && value !== '',
        ),
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

  const [uploadKnowledgeBase, setUploadKnowledgeBase] = useState<Array<number | string>>([]);
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

  const documentRequestParams = useMemo(
    () => ({
      pageNo,
      pageSize,
      name: searchText.trim() || undefined,
      fileType: typeFilter || undefined,
      channelId: channelFilter,
      status: statusFilter || undefined,
      accessMode: accessMode || undefined,
    }),
    [accessMode, channelFilter, pageNo, pageSize, searchText, statusFilter, typeFilter],
  );

  const documentRequestKey = useMemo(
    () => JSON.stringify(documentRequestParams),
    [documentRequestParams],
  );

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
    } catch (error) {
      console.error(error);
      message.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  }, [documentRequestParams, pageNo, pageSize]);

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
    setUploadKnowledgeBase([]);
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
    console.log(filePath);
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

  const ALLOWED_UPLOAD_EXTENSIONS = [
    'docx',
    'doc',
    'xls',
    'xlsx',
    'pptx',
    'ppt',
    'md',
    'txt',
    'pdf',
    'html',
    'eml',
  ];
  const MAX_UPLOAD_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  const handleBeforeUpload = (file: any) => {
    const fileName = String(file?.name ?? '');
    const ext = fileName.slice(((fileName.lastIndexOf('.') || 0) + 1)).toLowerCase();
    if (!ext || !ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) {
      message.error(`不支持的文件格式：.${ext || '未知'}，仅支持 docx、doc、xls、xlsx、pptx、ppt、md、txt、pdf、html、eml`);
      return Upload.LIST_IGNORE;
    }
    const fileSize = Number(file?.size ?? 0);
    if (fileSize > MAX_UPLOAD_FILE_SIZE) {
      message.error(`文件 ${fileName} 大小超过 100MB，无法上传`);
      return Upload.LIST_IGNORE;
    }

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
      setFileList((prev) =>
        prev.map((item) =>
          item.uid === uid
            ? { ...item, uploadStatus: status, percentage, errorMsg, responseData }
            : item,
        ),
      );
      const nextPercent = Math.round(
        prevAverage(fileList.map((item) => (item.uid === uid ? percentage : item.percentage || 0))),
      );
      setUploadProgress(nextPercent);
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

  const handleEditSubmit = async () => {
    if (!editingRecord) {
      return;
    }
    if (!editingName.trim()) {
      message.warning('请输入文件名称');
      return;
    }
    if (editingCatalog === undefined || editingCatalog === null || editingCatalog === '') {
      message.warning('请选择编目分类');
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

  const handleBatchKnowledgeBaseOpen = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要导入的文档');
      return;
    }
    setBatchImportKnowledgeBases([]);
    setBatchImportOperateType('APPEND');
    setBatchImportVisible(true);
  };

  const handleBatchKnowledgeBaseSubmit = async () => {
    if (!batchImportKnowledgeBases.length) {
      message.warning('请选择知识库');
      return;
    }

    setBatchImportSubmitting(true);
    try {
      const res: any = await batchSetDocumentKnowledgeBase({
        documentIds: selectedRowKeys.map((id) => id as number | string),
        knowledgeBaseIds: batchImportKnowledgeBases,
        operateType: batchImportOperateType,
      });
      if (res?.code !== undefined && res.code !== 200) {
        message.error(res?.msg || '批量入知识库失败');
        return;
      }
      const knowledgeBaseNames = batchImportKnowledgeBases.map(
        (id) => knowledgeBaseNameMap[String(id)] || String(id),
      );
      const knowledgeBaseText = knowledgeBaseNames.join('、');
      message.success(
        batchImportOperateType === 'REPLACE'
          ? `已将所选文档覆盖到知识库 ${knowledgeBaseText}`
          : `已为所选文档追加知识库 ${knowledgeBaseText}`,
      );
      setBatchImportVisible(false);
      setBatchImportKnowledgeBases([]);
      setBatchImportOperateType('APPEND');
      setSelectedRowKeys([]);
      await fetchDocuments();
    } catch (error) {
      console.error(error);
      message.error('批量入知识库失败');
    } finally {
      setBatchImportSubmitting(false);
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

        const MAX_VISIBLE = 2;
        const visibleNames = record.knowledgeBaseNames.slice(0, MAX_VISIBLE);
        const hiddenNames = record.knowledgeBaseNames.slice(MAX_VISIBLE);

        const renderKnowledgeBaseLink = (name: string, index: number) => {
          const id = record.knowledgeBaseIds[index];
          return id !== undefined && id !== null && id !== '' ? (
            <Button
              key={`${id}-${name}-${index}`}
              type="link"
              size="small"
              style={{
                padding: 0,
                height: 'auto',
                whiteSpace: 'normal',
                textAlign: 'left',
              }}
              onClick={() => history.push(`/knowledge/detail/${id}`)}
            >
              {name}
            </Button>
          ) : (
            <span key={`${name}-${index}`}>{name}</span>
          );
        };

        if (hiddenNames.length > 0) {
          return (
            <Tooltip
              color="#fff"
              title={
                <div style={tagTooltipOverlayStyle}>
                  {record.knowledgeBaseNames.map((name, index) => (
                    <span key={`${name}-${index}`} style={miniTagStyle}>
                      {name}
                    </span>
                  ))}
                </div>
              }
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 4,
                }}
              >
                {visibleNames.map((name, index) => renderKnowledgeBaseLink(name, index))}
                <span style={{ color: '#bfbfbf' }}>+{hiddenNames.length}</span>
              </span>
            </Tooltip>
          );
        }

        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {visibleNames.map((name, index) => renderKnowledgeBaseLink(name, index))}
          </span>
        );
      },
    },
    {
      title: '分句向量方式',
      dataIndex: 'vectorStrategy',
      key: 'vectorStrategy',
      align: 'center' as const,
      width: 120,
      render: (value, record) => renderVectorStrategy(value, record.embedName),
    },
    {
      title: '渠道来源',
      dataIndex: 'channelName',
      key: 'channelName',
      render: (value) => value || '-',
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
      title: '智能化状态',
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
      width: 170,
      render: (_, record) => {
        const completed = isStatusCompleted(record.status);
        const moreItems = [
          {
            key: 'extract-config',
            icon: <AppstoreOutlined />,
            label: completed ? '抽取配置详情' : '抽取配置详情（解析后可用）',
            disabled: !completed || !record.extractSnapshot,
            onClick: () => handleOpenExtractConfig(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑',
            onClick: () => handleEditOpen(record),
          },
          {
            key: 'download',
            icon: <DownloadOutlined />,
            label: '下载',
            onClick: () => handleDownload(record),
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确认删除？',
                okText: '确认',
                cancelText: '取消',
                okButtonProps: { danger: true, loading: deletingId === record.id },
                onOk: async () => {
                  await handleDelete(record.id);
                },
              });
            },
          },
        ];
        return (
          <Space size="small">
            <Tooltip title={completed ? '查看详情' : '解析完成后可查看详情'}>
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
            </Tooltip>
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
            <Dropdown menu={{ items: moreItems }} trigger={['click']} placement="bottomRight">
              <Button type="link" size="small" icon={<DownOutlined />}>
                更多
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Space direction="vertical" size={6}>
          <Typography.Text strong style={{ fontSize: 18 }}>
            文档导入
          </Typography.Text>
        </Space>
      </Card>
      <Card bordered={false}>
        {/* 筛选区 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #f0f7ff 0%, #fafcff 100%)',
            borderRadius: 8,
            border: '1px solid #d6e4ff',
            boxShadow: '0 1px 2px rgba(24,144,255,0.06)',
            overflowX: 'auto',
          }}
        >
          <Space size={12} wrap={false}>
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
          <Space size={12} wrap={false}>
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
            <Button icon={<FolderOutlined />} onClick={handleBatchKnowledgeBaseOpen}>
              批量入知识库
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
      </Card>

      {/* 表格区 */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 16,
          border: '1px solid #e8e8e8',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <Tabs
            activeKey={accessMode}
            onChange={handleAccessModeChange}
            style={{ marginBottom: 0, flex: 1, minWidth: 280 }}
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
          <Space size={[8, 8]} wrap>
            {CONFIG_SHORTCUTS.map((item) => (
              <Tooltip key={item.key} title={CONFIG_SHORTCUT_TOOLTIPS[item.key] || '页面跳转'}>
                <Button type="link" onClick={() => history.push(item.path)}>
                  {item.label}
                </Button>
              </Tooltip>
            ))}
          </Space>
        </div>
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
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50'],
          }}
        />
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
            accept=".docx,.doc,.xls,.xlsx,.pptx,.ppt,.md,.txt,.pdf,.html,.eml"
            style={{ padding: '20px 0' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p style={{ fontSize: 14, color: '#595959' }}>点击或拖拽文件到此处上传</p>
            <p style={{ fontSize: 12, color: '#8c8c8c' }}>
              支持 docx、doc、xls、xlsx、pptx、ppt、md、txt、pdf、html、eml 等格式，单文件大小不超过 100MB
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
          <div style={{ marginBottom: 8, fontSize: 13, color: '#bfbfbf' }}>
            归类到知识库（选填）
          </div>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="请选择知识库"
            value={uploadKnowledgeBase}
            onChange={setUploadKnowledgeBase}
            options={knowledgeBaseOptions}
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
        title="批量入知识库"
        open={batchImportVisible}
        onCancel={() => {
          setBatchImportVisible(false);
          setBatchImportKnowledgeBases([]);
          setBatchImportOperateType('APPEND');
        }}
        onOk={handleBatchKnowledgeBaseSubmit}
        okText="确认"
        cancelText="取消"
        confirmLoading={batchImportSubmitting}
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
            选择目标知识库 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="请选择一个或多个知识库"
            value={batchImportKnowledgeBases}
            onChange={setBatchImportKnowledgeBases}
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
            value={batchImportOperateType}
            onChange={(e) => setBatchImportOperateType(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div
                style={{
                  padding: '10px 12px',
                  border:
                    batchImportOperateType === 'APPEND' ? '1px solid #91caff' : '1px solid #f0f0f0',
                  borderRadius: 8,
                  background: batchImportOperateType === 'APPEND' ? '#f0f7ff' : '#fff',
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
                    batchImportOperateType === 'REPLACE'
                      ? '1px solid #ffccc7'
                      : '1px solid #f0f0f0',
                  borderRadius: 8,
                  background: batchImportOperateType === 'REPLACE' ? '#fff2f0' : '#fff',
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
      <Modal
        title={extractConfigRecord?.name ? `${extractConfigRecord.name} - 知识抽取配置详情` : '知识抽取配置详情'}
        open={extractConfigVisible}
        onCancel={handleCloseExtractConfig}
        footer={null}
        width={1100}
        destroyOnClose
        style={{ top: 24 }}
        styles={{ body: { maxHeight: '78vh', overflowY: 'auto', padding: 16 } }}
      >
        <KnowledgeExtractSnapshotView
          snapshot={extractConfigRecord?.extractSnapshot ?? null}
          visible={extractConfigVisible}
        />
      </Modal>
    </Space>
  );
}

function prevAverage(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, current) => sum + current, 0) / values.length;
}
