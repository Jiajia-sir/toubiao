'use client';

import { useEffect, useMemo, useState } from 'react';
import { history } from '@umijs/max';
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  DatePicker,
  Empty,
  Input,
  Pagination,
  Select,
  Space,
  Tag,
  message,
} from 'antd';
import {
  CalendarOutlined,
  CloseOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons';
import { getKnowledgeBaseList, type KnowledgeBaseItem } from '@/services/biz/knowledge-base';
import { getTagPage, type TagItem } from '@/services/biz/tag';
import { getCatalogTypeList } from '@/services/biz/catalogType';
import {
  getDocumentAccessModeCount,
  getDocumentFacet,
  getDocumentFileTypeCount,
  queryDocuments,
  type DocumentQueryParams,
} from '@/services/biz/document-query';
import { formatDateTime as formatDateTimeUtil } from '@/utils/date';

const { RangePicker } = DatePicker;

type SearchStrategyType = 'precise' | 'like' | 'custom';

type FilterOption = {
  label: string;
  value: string;
  count?: number;
};

type CustomCondition = {
  id: number;
  logic: 'AND' | 'OR' | 'NOT';
  field: string;
  operator: string;
  value: string;
  leftBracket: boolean;
  rightBracket: boolean;
};

type SearchResult = {
  id: string;
  esId: string;
  name: string;
  type: string;
  accessMode: string;
  source: string;
  uploader: string;
  uploadTime: string;
  size: string;
  viewCount: number;
  summary: string;
  keywords: string[];
  entities: string[];
  tags: string[];
  knowledgeBase: string;
  knowledgeBases: Array<{ id: string; name: string }>;
};

const DEFAULT_VISIBLE_FILTER_COUNT = 4;
const customFieldOptions = [
  { label: '标签', value: '标签' },
  { label: '对象名称', value: '对象名称' },
  { label: '对象备注信息', value: '对象备注信息' },
  { label: '正文', value: '正文' },
];
const customOperatorOptions = [
  { label: '等于', value: '等于' },
  { label: '包含', value: '包含' },
  { label: '不包含', value: '不包含' },
];
const entityOptions = {
  公司: ['特斯拉', '英伟达', '比亚迪', '华为'],
  人名: ['马斯克', '任正非', '黄仁勋'],
  地点: ['中国', '美国', '欧洲'],
  技术: ['自动驾驶', '电池技术', '芯片', '大模型'],
};

const fixedCustomFieldOptions = [
  { label: '文件名', value: 'name' },
  { label: '关键词', value: 'keywordsList' },
  { label: '实体名称', value: 'entities.entityName' },
  { label: '实体类型', value: 'entities.entityType' },
  { label: '正文', value: 'oriContent,transContent' },
  { label: '上传人', value: 'creatorName' },
];

const DEFAULT_CUSTOM_FIELD = 'name';

const relatedSearches = [
  '特斯拉商业模式分析',
  '新能源汽车行业竞争格局',
  '自动驾驶技术路线',
  '行业研究报告',
];

function HighlightHtml({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeHighlightHtml(html) }} />;
}

const typeIconMap: Record<string, React.ReactNode> = {
  DOC: <FileWordOutlined style={{ fontSize: 20, color: '#1890ff' }} />,
  DOCX: <FileWordOutlined style={{ fontSize: 20, color: '#1890ff' }} />,
  PDF: <FilePdfOutlined style={{ fontSize: 20, color: '#f5222d' }} />,
  HTML: <FileTextOutlined style={{ fontSize: 20, color: '#fa8c16' }} />,
  TXT: <FileTextOutlined style={{ fontSize: 20, color: '#52c41a' }} />,
  IMAGE: <FileImageOutlined style={{ fontSize: 20, color: '#52c41a' }} />,
  图片: <FileImageOutlined style={{ fontSize: 20, color: '#52c41a' }} />,
};

const extractPageList = <T,>(response: any): T[] => {
  if (Array.isArray(response?.data?.list)) {
    return response.data.list;
  }
  if (Array.isArray(response?.rows)) {
    return response.rows;
  }
  if (Array.isArray(response?.list)) {
    return response.list;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
};

const extractList = <T,>(response: any): T[] => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  if (Array.isArray(response?.data?.list)) {
    return response.data.list;
  }
  if (Array.isArray(response?.list)) {
    return response.list;
  }
  if (Array.isArray(response)) {
    return response;
  }
  return [];
};

const extractPageTotal = (response: any) =>
  Number(response?.data?.total ?? response?.total ?? response?.data?.count ?? 0);

const normalizeCountOption = (item: any): FilterOption | null => {
  const rawValue =
    item?.value ??
    item?.code ??
    item?.type ??
    item?.fileType ??
    item?.accessMode ??
    item?.name ??
    item?.label;
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }
  return {
    label: String(item?.label ?? item?.name ?? rawValue),
    value: String(rawValue),
    count: Number(item?.count ?? item?.total ?? item?.docCount ?? 0),
    knowledgeBase:
      extractStringList(item?.knowledgeBaseNames).length > 0
        ? extractStringList(item?.knowledgeBaseNames).join('、')
        : Array.isArray(item?.knowledgeBaseId) && item.knowledgeBaseId.length > 0
          ? `已关联 ${item.knowledgeBaseId.length} 个知识库`
          : '未入知识库',
  };
};

const formatFileSize = (bytes: any) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) {
    return '-';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const formatDateTime = (value: any) => formatDateTimeUtil(value, '-');

const sanitizeHighlightHtml = (value: string) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=(["']).*?\1/gi, '')
    .replace(/javascript:/gi, '');

const stripEntityHtml = (value: any) =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

const resolveAccessModeType = (item: any) => {
  const rawAccessMode = String(item?.accessMode ?? item?.sourceType ?? item?.mode ?? '').trim();
  if (rawAccessMode === '1' || rawAccessMode === '2') {
    return rawAccessMode;
  }
  const sourceText = String(
    item?.channelName ?? item?.accessMode ?? item?.source ?? '',
  ).toLowerCase();
  if (sourceText.includes('自动')) {
    return '1';
  }
  if (sourceText.includes('页面') || sourceText.includes('手动') || sourceText.includes('上传')) {
    return '2';
  }
  return '';
};

const extractEntityNames = (value: any): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item: any) => {
    if (Array.isArray(item?.entityName)) {
      return item.entityName.map((name: any) => String(name));
    }
    if (item?.entityName !== undefined) {
      return [String(item.entityName)];
    }
    if (item?.name !== undefined) {
      return [String(item.name)];
    }
    return [];
  });
};

const extractStringList = (value: any): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item ?? '')).filter(Boolean);
};

const extractKnowledgeBaseNames = (item: any): string[] => {
  if (Array.isArray(item?.knowledgeBaseObj)) {
    const names = item.knowledgeBaseObj
      .map((knowledge: any) => String(knowledge?.name ?? '').trim())
      .filter(Boolean);
    if (names.length > 0) {
      return names;
    }
  }
  return extractStringList(item?.knowledgeBaseNames);
};

const extractKnowledgeBases = (item: any): Array<{ id: string; name: string }> => {
  if (Array.isArray(item?.knowledgeBaseObj) && item.knowledgeBaseObj.length > 0) {
    return item.knowledgeBaseObj
      .map((knowledge: any) => ({
        id: String(knowledge?.id ?? knowledge?.knowledgeBaseId ?? ''),
        name: String(knowledge?.name ?? '').trim(),
      }))
      .filter((knowledge: { id: string; name: string }) => knowledge.id && knowledge.name);
  }

  const ids = Array.isArray(item?.knowledgeBaseIds)
    ? item.knowledgeBaseIds
    : Array.isArray(item?.knowledgeBaseId)
      ? item.knowledgeBaseId
      : item?.knowledgeBaseId !== undefined && item?.knowledgeBaseId !== null
        ? [item.knowledgeBaseId]
        : [];
  const names = extractStringList(item?.knowledgeBaseNames ?? item?.knowledgeBaseName);

  return names
    .map((name, index) => ({
      id: String(ids[index] ?? ''),
      name,
    }))
    .filter((knowledge) => knowledge.id && knowledge.name);
};

const mapDocumentResult = (item: any): SearchResult => {
  const fakeTags = ['行业分析', '重点文档', '自动生成'];
  const fakeEntities = ['特斯拉', '自动驾驶', '中国'];
  const knowledgeBaseNames = extractKnowledgeBaseNames(item);
  const knowledgeBases = extractKnowledgeBases(item);

  return {
    id: String(item?.id ?? item?.documentId ?? item?.fileId ?? Math.random()),
    esId: String(item?.esId ?? item?._id ?? item?.docEsId ?? ''),
    name: item?.name ?? item?.fileName ?? item?.documentName ?? '-',
    type: String(item?.fileType ?? item?.type ?? 'DOCX').toUpperCase(),
    accessMode: resolveAccessModeType(item),
    source: item?.channelName ?? item?.accessMode ?? item?.source ?? '-',
    uploader: item?.creatorName ?? item?.creator ?? item?.uploader ?? item?.createBy ?? '-',
    uploadTime: formatDateTime(item?.createTime ?? item?.uploadTime),
    size: formatFileSize(item?.fileSizeBytes ?? item?.fileSize),
    viewCount: Number(item?.viewCount ?? 0),
    summary: String(
      item?.summary ??
        item?.contentSnippet ??
        item?.snippet ??
        item?.oriContent ??
        item?.transContent ??
        '-',
    ),
    keywords: extractStringList(item?.keywordsList),
    entities: extractEntityNames(item?.entities),
    tags: extractStringList(item?.fileTagNames),
    knowledgeBase: knowledgeBaseNames.length > 0 ? knowledgeBaseNames.join('、') : '未入知识库',
    knowledgeBases,
  };
};

const mapDocumentResultFixed = (item: any): SearchResult => {
  const knowledgeBaseNames = extractKnowledgeBaseNames(item);
  const knowledgeBases = extractKnowledgeBases(item);
  const tagNames = extractStringList(item?.fileTagNames);
  const keywordNames = extractStringList(item?.keywordsList);
  const entityNames = extractEntityNames(item?.entities);
  const summary =
    item?.summary ??
    item?.contentSnippet ??
    item?.snippet ??
    item?.oriContent ??
    item?.transContent ??
    '-';

  return {
    id: String(item?.id ?? item?.documentId ?? item?.fileId ?? Math.random()),
    esId: String(item?.esId ?? item?._id ?? item?.docEsId ?? ''),
    name: item?.name ?? item?.fileName ?? item?.documentName ?? '-',
    type: String(item?.fileType ?? item?.type ?? 'DOCX').toUpperCase(),
    accessMode: resolveAccessModeType(item),
    source: item?.channelName ?? item?.accessMode ?? item?.source ?? '-',
    uploader: item?.creatorName ?? item?.creator ?? item?.uploader ?? item?.createBy ?? '-',
    uploadTime: formatDateTime(item?.createTime ?? item?.uploadTime),
    size: formatFileSize(item?.fileSizeBytes ?? item?.fileSize),
    viewCount: Number(item?.viewCount ?? 0),
    summary: String(summary),
    keywords: keywordNames,
    entities: entityNames,
    tags: tagNames,
    knowledgeBase: knowledgeBaseNames.length > 0 ? knowledgeBaseNames.join('、') : '未入知识库',
    knowledgeBases,
  };
};

export default function DataSearchPage() {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'_score' | 'createTime'>('_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [knowledgeBaseFilter, setKnowledgeBaseFilter] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [entitySourceMode, setEntitySourceMode] = useState<'page' | 'auto'>('auto');
  const [entityKeyword, setEntityKeyword] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [queryStrategyMode, setQueryStrategyMode] = useState<SearchStrategyType>('like');
  const [fuzzyWeights, setFuzzyWeights] = useState({
    title: 70,
    content: 20,
    tag: 10,
  });
  const [slop, setSlop] = useState(1);
  const [customConditions, setCustomConditions] = useState<CustomCondition[]>([
    {
      id: 1,
      logic: 'AND',
      field: '标签',
      operator: '等于',
      value: '',
      leftBracket: false,
      rightBracket: false,
    },
  ]);
  const [activeConditionId, setActiveConditionId] = useState<number>(1);
  const [appliedStrategyLabel, setAppliedStrategyLabel] = useState('模糊匹配');

  const [knowledgeBaseOptions, setKnowledgeBaseOptions] = useState<FilterOption[]>([]);
  const [tagOptions, setTagOptions] = useState<FilterOption[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<FilterOption[]>([]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState<FilterOption[]>([]);
  const [accessModeOptions, setAccessModeOptions] = useState<FilterOption[]>([]);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

  const [knowledgeBaseKeyword, setKnowledgeBaseKeyword] = useState('');
  const [tagKeyword, setTagKeyword] = useState('');
  const [catalogKeyword, setCatalogKeyword] = useState('');
  const [showAllKnowledgeBases, setShowAllKnowledgeBases] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllCatalogs, setShowAllCatalogs] = useState(false);

  const filteredKnowledgeBaseOptions = useMemo(
    () =>
      knowledgeBaseOptions.filter((item) =>
        item.label.toLowerCase().includes(knowledgeBaseKeyword.trim().toLowerCase()),
      ),
    [knowledgeBaseKeyword, knowledgeBaseOptions],
  );

  const filteredTagOptions = useMemo(
    () =>
      tagOptions.filter((item) =>
        item.label.toLowerCase().includes(tagKeyword.trim().toLowerCase()),
      ),
    [tagKeyword, tagOptions],
  );

  const filteredCatalogOptions = useMemo(
    () =>
      catalogOptions.filter((item) =>
        item.label.toLowerCase().includes(catalogKeyword.trim().toLowerCase()),
      ),
    [catalogKeyword, catalogOptions],
  );

  const visibleKnowledgeBaseOptions = showAllKnowledgeBases
    ? filteredKnowledgeBaseOptions
    : filteredKnowledgeBaseOptions.slice(0, DEFAULT_VISIBLE_FILTER_COUNT);
  const visibleTagOptions = showAllTags
    ? filteredTagOptions
    : filteredTagOptions.slice(0, DEFAULT_VISIBLE_FILTER_COUNT);
  const visibleCatalogOptions = showAllCatalogs
    ? filteredCatalogOptions
    : filteredCatalogOptions.slice(0, DEFAULT_VISIBLE_FILTER_COUNT);

  const pageUploadEntities = useMemo(
    () =>
      Array.from(
        new Set(
          searchResults
            .filter((item) => item.accessMode === '2')
            .flatMap((item) => item.entities.map((entity) => stripEntityHtml(entity))),
        ),
      ).filter(Boolean),
    [searchResults],
  );

  const autoReadEntities = useMemo(
    () =>
      Array.from(
        new Set(
          searchResults
            .filter((item) => item.accessMode === '1')
            .flatMap((item) => item.entities.map((entity) => stripEntityHtml(entity))),
        ),
      ).filter(Boolean),
    [searchResults],
  );

  const currentEntityOptions = useMemo(
    () => (entitySourceMode === 'page' ? pageUploadEntities : autoReadEntities),
    [autoReadEntities, entitySourceMode, pageUploadEntities],
  );

  const filteredEntityOptions = useMemo(
    () =>
      currentEntityOptions.filter((item) =>
        item.toLowerCase().includes(entityKeyword.trim().toLowerCase()),
      ),
    [currentEntityOptions, entityKeyword],
  );

  const buildAdvanceSearch = () =>
    customConditions
      .filter((item) => item.field && item.operator && item.value.trim())
      .map((item, index) => {
        const logicMap: Record<CustomCondition['logic'], string> = {
          AND: '且',
          OR: '或',
          NOT: '非',
        };
        const resolvedField = fixedCustomFieldOptions.some((option) => option.value === item.field)
          ? item.field
          : DEFAULT_CUSTOM_FIELD;
        const expression = `${item.leftBracket ? '(' : ''}${resolvedField} ${item.operator} "${item.value.trim()}"${item.rightBracket ? ')' : ''}`;
        return index === 0 ? expression : `${logicMap[item.logic]} ${expression}`;
      })
      .join(' ');

  const buildQueryPayload = (
    pageNo: number,
    size: number,
    overrides?: Partial<Pick<DocumentQueryParams, 'entityNames'>>,
  ): DocumentQueryParams => ({
    pageNo,
    pageSize: size,
    keyword: searchText.trim(),
    queryStrategy: queryStrategyMode === 'precise' ? 0 : queryStrategyMode === 'like' ? 1 : 2,
    slop: queryStrategyMode === 'like' ? slop : 0,
    fieldWeights:
      queryStrategyMode === 'like'
        ? [
            { fieldName: 'name', weight: Number(fuzzyWeights.title) },
            { fieldName: 'oriContent', weight: Number(fuzzyWeights.content) },
            { fieldName: 'transContent', weight: Number(fuzzyWeights.content) },
            { fieldName: 'tag', weight: Number(fuzzyWeights.tag) },
          ]
        : [],
    advanceSearch: queryStrategyMode === 'custom' ? buildAdvanceSearch() : '',
    sortField,
    sortOrder,
    knowledgeBaseId: knowledgeBaseFilter,
    fileTypes: documentTypes,
    catalogIds: catalogFilter,
    fileTagIdList: selectedTags,
    directoryIds: [],
    accessModes: sourceFilter ? [sourceFilter] : [],
    entityTypes: [],
    entityNames: overrides?.entityNames ?? selectedEntities,
    createTime: dateRange ?? [],
  });

  const fetchFilterOptions = async () => {
    setFilterOptionsLoading(true);
    try {
      const [tagResponse, catalogResponse, fileTypeResponse, accessModeResponse]: any =
        await Promise.all([
          getTagPage({ pageNo: 1, pageSize: 1000 }),
          getCatalogTypeList(),
          getDocumentFileTypeCount(),
          getDocumentAccessModeCount(),
        ]);

      const tagItems = extractPageList<TagItem>(tagResponse);
      setTagOptions(
        tagItems.map((item) => ({
          label: item.tag,
          value: String(item.id),
        })),
      );
      setCatalogOptions(
        extractList<any>(catalogResponse).map((item) => ({
          label: item.name,
          value: String(item.id),
        })),
      );
      setDocumentTypeOptions(
        extractList<any>(fileTypeResponse)
          .map(normalizeCountOption)
          .filter(Boolean) as FilterOption[],
      );
      setAccessModeOptions(
        extractList<any>(accessModeResponse)
          .map(normalizeCountOption)
          .filter(Boolean) as FilterOption[],
      );
    } catch (error) {
      console.error(error);
      message.error('获取筛选项失败');
    } finally {
      setFilterOptionsLoading(false);
    }
  };

  const fetchFacetOptions = async (pageNo = 1, size = pageSize) => {
    try {
      const response: any = await getDocumentFacet(buildQueryPayload(pageNo, size));
      const facetData = response?.data ?? response ?? {};
      const knowledgeOptions = extractList<any>(facetData?.knowledgeBaseCounts)
        .map((item) => ({
          label: String(item?.name ?? '未知'),
          value: String(item?.id ?? ''),
          count: Number(item?.count ?? 0),
        }))
        .filter((item) => item.value);
      setKnowledgeBaseOptions(knowledgeOptions);
      setDocumentTypeOptions(
        extractList<any>(facetData?.fileTypeCounts)
          .map(normalizeCountOption)
          .filter(Boolean) as FilterOption[],
      );
    } catch (error) {
      console.error(error);
      message.error('获取实时统计失败');
    }
  };

  const fetchDocuments = async (
    pageNo = 1,
    size = pageSize,
    overrides?: Partial<Pick<DocumentQueryParams, 'entityNames'>>,
  ) => {
    const startedAt = Date.now();
    setLoading(true);
    try {
      const payload = buildQueryPayload(pageNo, size, overrides);
      const [response, facetResponse] = await Promise.all([
        queryDocuments(payload),
        getDocumentFacet(payload),
      ]);
      const rows = extractPageList<any>(response).map(mapDocumentResultFixed);
      const facetData = facetResponse?.data ?? facetResponse ?? {};
      setSearchResults(rows);
      setTotalResults(extractPageTotal(response));
      setCurrentPage(pageNo);
      setPageSize(size);
      setSearchTime(Number(((Date.now() - startedAt) / 1000).toFixed(2)));
      setKnowledgeBaseOptions(
        extractList<any>(facetData?.knowledgeBaseCounts)
          .map((item) => ({
            label: String(item?.name ?? '未知'),
            value: String(item?.id ?? ''),
            count: Number(item?.count ?? 0),
          }))
          .filter((item) => item.value),
      );
      setDocumentTypeOptions(
        extractList<any>(facetData?.fileTypeCounts)
          .map(normalizeCountOption)
          .filter(Boolean) as FilterOption[],
      );
    } catch (error) {
      console.error(error);
      message.error('检索失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchDocuments(1, pageSize);
  }, []);

  const handleSearch = () => {
    fetchDocuments(1, pageSize);
  };

  const handleEntityClick = (entity: string) => {
    const nextSelected = selectedEntities.includes(entity)
      ? selectedEntities.filter((item) => item !== entity)
      : [...selectedEntities, entity];
    setSelectedEntities(nextSelected);
    fetchDocuments(1, pageSize, { entityNames: nextSelected });
  };

  const handleOpenDocumentDetail = (result: SearchResult) => {
    const detailQuery = new URLSearchParams();
    if (result.esId) {
      detailQuery.set('esId', result.esId);
    }
    if (searchText.trim()) {
      detailQuery.set('keyword', searchText.trim());
    }
    if (result.name) {
      detailQuery.set('title', result.name);
    }
    if (result.type) {
      detailQuery.set('type', result.type);
    }
    history.push(
      `/data/document/${result.id}${detailQuery.toString() ? `?${detailQuery.toString()}` : ''}`,
    );
  };

  const handleResetFilters = () => {
    setDocumentTypes([]);
    setKnowledgeBaseFilter([]);
    setSelectedTags([]);
    setSelectedEntities([]);
    setEntityKeyword('');
    setCatalogFilter([]);
    setDateRange(null);
    setSourceFilter(null);
    setSearchText('');
    setKnowledgeBaseKeyword('');
    setTagKeyword('');
    setCatalogKeyword('');
    setShowAllKnowledgeBases(false);
    setShowAllTags(false);
    setShowAllCatalogs(false);
    message.success('已重置所有筛选条件');
  };

  const handleWeightChange = (field: 'title' | 'content' | 'tag', value: number) => {
    setFuzzyWeights((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCondition = () => {
    const id = Date.now();
    setCustomConditions((prev) => [
      ...prev,
      {
        id,
        logic: 'AND',
        field: '标签',
        operator: '等于',
        value: '',
        leftBracket: false,
        rightBracket: false,
      },
    ]);
    setActiveConditionId(id);
  };

  const handleRemoveCondition = (id: number) => {
    setCustomConditions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      setActiveConditionId(next[0]?.id ?? 1);
      return next;
    });
  };

  const handleConditionChange = (id: number, field: keyof CustomCondition, value: string) => {
    setCustomConditions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleToggleBracket = (id: number, side: 'leftBracket' | 'rightBracket') => {
    setCustomConditions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [side]: !item[side] } : item)),
    );
  };

  const handleToggleBracketToActive = (side: 'leftBracket' | 'rightBracket') => {
    handleToggleBracket(activeConditionId, side);
  };

  const handleApplyAdvancedSearch = () => {
    setAppliedStrategyLabel(
      queryStrategyMode === 'precise'
        ? '精确匹配'
        : queryStrategyMode === 'like'
          ? '模糊匹配'
          : '多条件拼接',
    );
    setShowAdvancedSearch(false);
    fetchDocuments(1, pageSize);
  };

  const handleResetAdvancedSearch = () => {
    setQueryStrategyMode('like');
    setFuzzyWeights({ title: 70, content: 20, tag: 10 });
    setSlop(1);
    setCustomConditions([
      {
        id: 1,
        logic: 'AND',
        field: '标签',
        operator: '等于',
        value: '',
        leftBracket: false,
        rightBracket: false,
      },
    ]);
    setActiveConditionId(1);
    setAppliedStrategyLabel('模糊匹配');
    setShowAdvancedSearch(false);
  };

  const collapseItems = [
    {
      key: 'knowledgeBase',
      label: <span style={{ fontWeight: 600 }}>知识库</span>,
      children: (
        <div>
          <Input
            allowClear
            size="small"
            placeholder="搜索知识库"
            prefix={<SearchOutlined />}
            value={knowledgeBaseKeyword}
            onChange={(e) => {
              setKnowledgeBaseKeyword(e.target.value);
              setShowAllKnowledgeBases(false);
            }}
            style={{ marginBottom: 12 }}
          />
          <Checkbox.Group
            value={knowledgeBaseFilter}
            onChange={(values) => setKnowledgeBaseFilter(values as string[])}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {visibleKnowledgeBaseOptions.map((item) => (
                <Checkbox key={item.value} value={item.value}>
                  {item.label}
                  {typeof item.count === 'number' ? ` (${item.count})` : ''}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
          {!filterOptionsLoading &&
            filteredKnowledgeBaseOptions.length > DEFAULT_VISIBLE_FILTER_COUNT && (
              <a onClick={() => setShowAllKnowledgeBases((prev) => !prev)}>
                {showAllKnowledgeBases ? '收起' : '查看更多'}
              </a>
            )}
        </div>
      ),
    },
    {
      key: 'documentType',
      label: <span style={{ fontWeight: 600 }}>文档格式</span>,
      children: (
        <Checkbox.Group
          value={documentTypes}
          onChange={(values) => setDocumentTypes(values as string[])}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {documentTypeOptions.map((item) => (
              <Checkbox key={item.value} value={item.value}>
                {item.label}
                {typeof item.count === 'number' ? ` (${item.count})` : ''}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      ),
    },
    {
      key: 'catalog',
      label: <span style={{ fontWeight: 600 }}>编目</span>,
      children: (
        <div>
          <Input
            allowClear
            size="small"
            placeholder="搜索编目"
            prefix={<SearchOutlined />}
            value={catalogKeyword}
            onChange={(e) => {
              setCatalogKeyword(e.target.value);
              setShowAllCatalogs(false);
            }}
            style={{ marginBottom: 12 }}
          />
          <Checkbox.Group
            value={catalogFilter}
            onChange={(values) => setCatalogFilter(values as string[])}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {visibleCatalogOptions.map((item) => (
                <Checkbox key={item.value} value={item.value}>
                  {item.label}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
          {!filterOptionsLoading &&
            filteredCatalogOptions.length > DEFAULT_VISIBLE_FILTER_COUNT && (
              <a onClick={() => setShowAllCatalogs((prev) => !prev)}>
                {showAllCatalogs ? '收起' : '查看更多'}
              </a>
            )}
        </div>
      ),
    },
    {
      key: 'uploadTime',
      label: <span style={{ fontWeight: 600 }}>创建时间</span>,
      children: (
        <RangePicker
          style={{ width: '100%' }}
          onChange={(_, dateStrings) => {
            const values = dateStrings.filter(Boolean) as string[];
            setDateRange(values.length === 2 ? [values[0], values[1]] : null);
          }}
        />
      ),
    },
    {
      key: 'tags',
      label: <span style={{ fontWeight: 600 }}>标签分类</span>,
      children: (
        <div>
          <Input
            allowClear
            size="small"
            placeholder="搜索标签"
            prefix={<SearchOutlined />}
            value={tagKeyword}
            onChange={(e) => {
              setTagKeyword(e.target.value);
              setShowAllTags(false);
            }}
            style={{ marginBottom: 12 }}
          />
          <Checkbox.Group
            value={selectedTags}
            onChange={(values) => setSelectedTags(values as string[])}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {visibleTagOptions.map((item) => (
                <Checkbox key={item.value} value={item.value}>
                  {item.label}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
          {!filterOptionsLoading && filteredTagOptions.length > DEFAULT_VISIBLE_FILTER_COUNT && (
            <a onClick={() => setShowAllTags((prev) => !prev)}>
              {showAllTags ? '收起' : '查看更多'}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'entities',
      label: <span style={{ fontWeight: 600 }}>关键实体</span>,
      children: (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Button
              size="small"
              type={entitySourceMode === 'page' ? 'primary' : 'default'}
              onClick={() => setEntitySourceMode('page')}
              style={{ flex: 1 }}
            >
              页面上传
            </Button>
            <Button
              size="small"
              type={entitySourceMode === 'auto' ? 'primary' : 'default'}
              onClick={() => setEntitySourceMode('auto')}
              style={{ flex: 1 }}
            >
              自动读取
            </Button>
          </div>
          <Input
            allowClear
            size="small"
            placeholder={entitySourceMode === 'page' ? '搜索页面上传实体' : '搜索自动读取实体'}
            prefix={<SearchOutlined />}
            value={entityKeyword}
            onChange={(e) => setEntityKeyword(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              color: '#8c8c8c',
              fontSize: 12,
            }}
          >
            <span>{entitySourceMode === 'page' ? '页面上传实体' : '自动读取实体'}</span>
            <span>{filteredEntityOptions.length} 个</span>
          </div>
          {selectedEntities.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>当前检索实体</div>
              <Space wrap size={4}>
                {selectedEntities.map((entity) => (
                  <Tag
                    key={entity}
                    color="blue"
                    closable
                    onClose={(event) => {
                      event.preventDefault();
                      handleEntityClick(entity);
                    }}
                  >
                    {entity}
                  </Tag>
                ))}
              </Space>
            </div>
          )}
          {filteredEntityOptions.length > 0 ? (
            <Space wrap size={[4, 8]}>
              {filteredEntityOptions.map((entity) => {
                const active = selectedEntities.includes(entity);
                return (
                  <Tag
                    key={entity}
                    color={active ? 'blue' : 'default'}
                    style={{ cursor: 'pointer', marginInlineEnd: 0 }}
                    onClick={() => handleEntityClick(entity)}
                  >
                    {entity}
                  </Tag>
                );
              })}
            </Space>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={entitySourceMode === 'page' ? '暂无页面上传实体' : '暂无自动读取实体'}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ background: '#f5f7fa', minHeight: 'calc(100vh - 300px)' }}>
      <Card
        style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            background: 'linear-gradient(180deg, #c2dcffff 0%, #f5f9ff 100%)',
            borderRadius: 12,
            padding: '32px 40px',
            marginBottom: 16,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#262626', marginBottom: 8 }}>
              智能文档检索
            </h1>
            <p style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 24 }}>
              基于关键字与语义理解的文档检索
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              maxWidth: 860,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <Input
              placeholder="输入关键词，例如：特斯拉商业模式分析"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ flex: 1, height: 48, fontSize: 15, borderRadius: 8 }}
              prefix={<SearchOutlined style={{ color: '#bfbfbf', fontSize: 18 }} />}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
              style={{
                height: 48,
                paddingLeft: 24,
                paddingRight: 24,
                fontSize: 16,
                borderRadius: 8,
              }}
            >
              搜索
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowAdvancedSearch((prev) => !prev)}
              style={{
                height: 48,
                width: 48,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />

            {showAdvancedSearch && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  width: queryStrategyMode === 'custom' ? 640 : 420,
                  maxWidth: 'calc(100vw - 48px)',
                  background: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  padding: 16,
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 12 }}>
                  匹配策略
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: '精确匹配', value: 'precise' },
                    { label: '模糊匹配', value: 'like' },
                    { label: '多条件拼接', value: 'custom' },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      type={queryStrategyMode === item.value ? 'primary' : 'default'}
                      size="small"
                      onClick={() => setQueryStrategyMode(item.value as SearchStrategyType)}
                      style={{ flex: 1 }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>

                {queryStrategyMode === 'precise' && (
                  <div
                    style={{
                      background: '#f7f9fc',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>将传 `queryStrategy = 0`。</div>
                  </div>
                )}

                {queryStrategyMode === 'like' && (
                  <div
                    style={{
                      background: '#f7f9fc',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    {[
                      { key: 'title', label: '标题权重' },
                      { key: 'content', label: '正文权重' },
                      { key: 'tag', label: '标签权重' },
                    ].map(({ key, label }) => (
                      <div
                        key={key}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                      >
                        <span style={{ width: 70, fontSize: 12, color: '#8c8c8c' }}>{label}</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={fuzzyWeights[key as keyof typeof fuzzyWeights]}
                          onChange={(e) =>
                            handleWeightChange(
                              key as 'title' | 'content' | 'tag',
                              parseInt(e.target.value, 10),
                            )
                          }
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <span
                          style={{ width: 36, fontSize: 12, color: '#1890ff', fontWeight: 500 }}
                        >
                          {fuzzyWeights[key as keyof typeof fuzzyWeights]}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 70, fontSize: 12, color: '#8c8c8c' }}>slop</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={slop}
                        onChange={(e) => setSlop(parseInt(e.target.value, 10))}
                        style={{ flex: 1, cursor: 'pointer' }}
                      />
                      <span style={{ width: 36, fontSize: 12, color: '#1890ff', fontWeight: 500 }}>
                        {slop}
                      </span>
                    </div>
                  </div>
                )}

                {queryStrategyMode === 'custom' && (
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%)',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 16,
                      border: '1px solid #e6eef8',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 14,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Button type="primary" size="small" onClick={handleAddCondition}>
                        添加条件
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleToggleBracketToActive('leftBracket')}
                        disabled={!customConditions.some((item) => item.id === activeConditionId)}
                      >
                        (
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleToggleBracketToActive('rightBracket')}
                        disabled={!customConditions.some((item) => item.id === activeConditionId)}
                      >
                        )
                      </Button>
                      <Button size="small" onClick={handleResetAdvancedSearch}>
                        重置
                      </Button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {customConditions.map((condition, index) => (
                        <div
                          key={condition.id}
                          onClick={() => setActiveConditionId(condition.id)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              index < customConditions.length - 1
                                ? '16px 88px 84px minmax(0,1fr) 16px 20px 64px'
                                : '16px 88px 84px minmax(0,1fr) 16px 20px',
                            gap: 10,
                            alignItems: 'center',
                            padding: '14px 12px',
                            background:
                              activeConditionId === condition.id
                                ? 'linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)'
                                : '#ffffff',
                            borderRadius: 10,
                            border:
                              activeConditionId === condition.id
                                ? '1px solid #91caff'
                                : '1px solid #e5eaf3',
                            boxShadow:
                              activeConditionId === condition.id
                                ? '0 8px 20px rgba(24, 144, 255, 0.08)'
                                : '0 2px 6px rgba(15, 23, 42, 0.04)',
                            cursor: 'pointer',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              textAlign: 'center',
                              color: condition.leftBracket ? '#1677ff' : '#c0c6d4',
                              fontSize: 22,
                              fontWeight: 600,
                              lineHeight: 1,
                            }}
                          >
                            {condition.leftBracket ? '(' : ''}
                          </div>
                          <Select
                            value={
                              fixedCustomFieldOptions.some((item) => item.value === condition.field)
                                ? condition.field
                                : DEFAULT_CUSTOM_FIELD
                            }
                            onChange={(value) =>
                              handleConditionChange(condition.id, 'field', value)
                            }
                            options={fixedCustomFieldOptions}
                            style={{ width: '100%', minWidth: 0 }}
                          />
                          <Select
                            value={condition.operator}
                            onChange={(value) =>
                              handleConditionChange(condition.id, 'operator', value)
                            }
                            options={customOperatorOptions}
                            style={{ width: '100%', minWidth: 0 }}
                          />
                          <Input
                            value={condition.value}
                            placeholder="输入值"
                            onChange={(e) =>
                              handleConditionChange(condition.id, 'value', e.target.value)
                            }
                            style={{ width: '100%', minWidth: 0 }}
                          />
                          <div
                            style={{
                              textAlign: 'center',
                              color: condition.rightBracket ? '#1677ff' : '#c0c6d4',
                              fontSize: 22,
                              fontWeight: 600,
                              lineHeight: 1,
                            }}
                          >
                            {condition.rightBracket ? ')' : ''}
                          </div>
                          <Button
                            danger
                            type="text"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCondition(condition.id);
                            }}
                            disabled={customConditions.length === 1}
                            style={{ padding: 0 }}
                          >
                            <CloseOutlined />
                          </Button>
                          {index < customConditions.length - 1 && (
                            <Select
                              value={condition.logic}
                              onChange={(value) =>
                                handleConditionChange(condition.id, 'logic', value)
                              }
                              style={{ width: '100%', minWidth: 0 }}
                              options={[
                                { label: '与', value: 'AND' },
                                { label: '或', value: 'OR' },
                                { label: '非', value: 'NOT' },
                              ]}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#6b7280',
                        marginTop: 12,
                        marginBottom: 8,
                        padding: '10px 12px',
                        background: '#ffffff',
                        border: '1px solid #e5eaf3',
                        borderRadius: 8,
                        lineHeight: 1.7,
                      }}
                    >
                      预览：{buildAdvanceSearch() || '-'}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    paddingTop: 12,
                    borderTop: '1px solid #e8e8e8',
                  }}
                >
                  <Button onClick={handleResetAdvancedSearch} style={{ flex: 1 }}>
                    重置
                  </Button>
                  <Button type="primary" onClick={handleApplyAdvancedSearch} style={{ flex: 1 }}>
                    应用
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              maxWidth: 860,
              margin: '8px auto 0',
              background: '#f0f5ff',
              borderRadius: 8,
              padding: '10px 16px',
              border: '1px solid #d6e4ff',
              fontSize: 12,
              color: '#595959',
              textAlign: 'center',
            }}
          >
            当前策略：{appliedStrategyLabel}
            {queryStrategyMode === 'like' &&
              ` | 标题 ${fuzzyWeights.title} / 正文 ${fuzzyWeights.content} / 标签 ${fuzzyWeights.tag} / slop ${slop}`}
            {queryStrategyMode === 'custom' && ` | ${buildAdvanceSearch() || '-'}`}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: '#595959' }}>
              找到{' '}
              <span style={{ color: '#1890ff', fontWeight: 600 }}>
                {totalResults.toLocaleString()}
              </span>{' '}
              条结果
              <span style={{ color: '#8c8c8c', marginLeft: 8 }}>用时 {searchTime} 秒</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: '#8c8c8c' }}>数据来源：</span>
                {accessModeOptions.map((source) => {
                  const sourceName = String(source.value);
                  const isActive = sourceFilter === sourceName;
                  return (
                    <Button
                      key={sourceName}
                      size="small"
                      type={isActive ? 'primary' : 'default'}
                      onClick={() =>
                        setSourceFilter((prev) => (prev === sourceName ? null : sourceName))
                      }
                      style={{
                        borderRadius: 16,
                        background: isActive ? '#1890ff' : '#f2f4f8',
                        borderColor: isActive ? '#1890ff' : '#d9d9d9',
                        color: isActive ? '#fff' : '#8c8c8c',
                      }}
                    >
                      {source.label}
                      {typeof source.count === 'number' ? `(${source.count})` : ''}
                    </Button>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingLeft: 16,
                  borderLeft: '1px solid #e8e8e8',
                }}
              >
                <span style={{ fontSize: 14, color: '#8c8c8c' }}>排序方式：</span>
                <Select
                  value={sortField}
                  onChange={setSortField}
                  style={{ width: 100 }}
                  options={[
                    { label: '相关性', value: '_score' },
                    { label: '时间', value: 'createTime' },
                  ]}
                />
                <Button
                  size="small"
                  icon={
                    sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />
                  }
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  style={{
                    background: sortOrder === 'desc' ? '#1890ff' : '#f2f4f8',
                    color: sortOrder === 'desc' ? '#fff' : '#8c8c8c',
                    borderColor: sortOrder === 'desc' ? '#1890ff' : '#d9d9d9',
                  }}
                >
                  {sortOrder === 'desc' ? '降序' : '升序'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, padding: 16 }}>
          <div
            style={{
              width: 260,
              flexShrink: 0,
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              height: 'fit-content',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '1px solid #e8e8e8',
              }}
            >
              <FilterOutlined style={{ color: '#1890ff' }} />
              <span style={{ fontWeight: 600, fontSize: 15, color: '#262626' }}>筛选条件</span>
              <a style={{ marginLeft: 'auto', fontSize: 12 }} onClick={handleResetFilters}>
                <ReloadOutlined /> 重置
              </a>
            </div>
            <Collapse
              defaultActiveKey={['knowledgeBase', 'documentType', 'tags']}
              ghost
              items={collapseItems}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {loading ? (
                <div style={{ padding: 80, textAlign: 'center' }}>加载中...</div>
              ) : searchResults.length === 0 ? (
                <Empty description="当前筛选条件下暂无检索结果" style={{ padding: 60 }} />
              ) : (
                searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    style={{
                      padding: 20,
                      borderBottom: index < searchResults.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f2f4f8',
                          borderRadius: 8,
                          flexShrink: 0,
                        }}
                      >
                        {typeIconMap[result.type] ?? (
                          <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                            flexWrap: 'wrap',
                          }}
                        >
                          <a
                            onClick={() => handleOpenDocumentDetail(result)}
                            style={{
                              fontSize: 16,
                              fontWeight: 600,
                              color: '#262626',
                              cursor: 'pointer',
                            }}
                          >
                            <HighlightHtml html={result.name} />
                          </a>
                          {result.knowledgeBases.length > 0 ? (
                            <Space size={[6, 6]} wrap>
                              <span style={{ fontSize: 12, color: '#8c8c8c' }}>关联知识库:</span>
                              {result.knowledgeBases.map((knowledge) => (
                                <Tag
                                  key={knowledge.id}
                                  color="green"
                                  style={{ cursor: 'pointer', marginInlineEnd: 0 }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    history.push(`/knowledge/detail/${knowledge.id}`);
                                  }}
                                >
                                  {knowledge.name}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Tag color="default">未关联知识库</Tag>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#8c8c8c',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 12,
                          }}
                        >
                          <span>来源：{result.source}</span>
                          <span>上传人：{result.uploader}</span>
                          <span>
                            <CalendarOutlined /> {result.uploadTime}
                          </span>
                          <span>大小：{result.size}</span>
                          <span>浏览量：{result.viewCount}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handleOpenDocumentDetail(result)}
                        >
                          详情
                        </Button>
                        <Button type="link" size="small" icon={<DownloadOutlined />}>
                          下载
                        </Button>
                      </div>
                    </div>

                    <div
                      style={{ fontSize: 14, color: '#8c8c8c', lineHeight: 1.8, marginBottom: 12 }}
                    >
                      <HighlightHtml html={result.summary} />
                    </div>

                    {result.entities.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: '#595959',
                            fontWeight: 500,
                            marginRight: 8,
                          }}
                        >
                          实体：
                        </span>
                        <Space wrap size={4}>
                          {result.entities.map((entity) => (
                            <Tag key={entity} color="blue">
                              <HighlightHtml html={entity} />
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}

                    {result.keywords.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: '#595959',
                            fontWeight: 500,
                            marginRight: 8,
                          }}
                        >
                          关键词：
                        </span>
                        <Space wrap size={4}>
                          {result.keywords.map((keyword) => (
                            <Tag key={keyword} color="gold">
                              <HighlightHtml html={keyword} />
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}

                    {result.tags.length > 0 && (
                      <div>
                        <span
                          style={{
                            fontSize: 12,
                            color: '#595959',
                            fontWeight: 500,
                            marginRight: 8,
                          }}
                        >
                          标签：
                        </span>
                        <Space wrap size={4}>
                          {result.tags.map((tag) => (
                            <Tag key={tag} color="purple">
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  </div>
                ))
              )}

              <div
                style={{
                  padding: '16px 20px',
                  borderTop: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>
                  每页显示：
                  <Select
                    value={pageSize}
                    onChange={(value) => {
                      setPageSize(value);
                      fetchDocuments(1, value);
                    }}
                    style={{ width: 90, marginLeft: 8 }}
                    options={[
                      { label: '10条', value: 10 },
                      { label: '20条', value: 20 },
                      { label: '50条', value: 50 },
                    ]}
                  />
                </div>
                <Pagination
                  current={currentPage}
                  total={totalResults}
                  pageSize={pageSize}
                  onChange={(page, size) => fetchDocuments(page, size)}
                  showSizeChanger={false}
                  showQuickJumper
                />
              </div>
            </div>

            {/* <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 16,
                marginTop: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 12 }}>
                相关搜索
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {relatedSearches.map((search) => (
                  <a
                    key={search}
                    style={{ color: '#1890ff', fontSize: 13 }}
                    onClick={() => setSearchText(search)}
                  >
                    {search}
                  </a>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </Card>
    </div>
  );
}
