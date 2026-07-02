"use client";

import { useEffect, useMemo, useState } from "react";
import { history } from "@umijs/max";
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
} from "antd";
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
} from "@ant-design/icons";
import {
  getKnowledgeBaseList,
  type KnowledgeBaseItem,
} from "@/services/biz/knowledge-base";
import { getTagPage, type TagItem } from "@/services/biz/tag";
import { getCatalogTypeList } from "@/services/biz/catalogType";
import {
  getDocumentAccessModeCount,
  getDocumentFileTypeCount,
  queryDocuments,
  type DocumentQueryParams,
} from "@/services/biz/document-query";

const { RangePicker } = DatePicker;

type SearchStrategyType = "precise" | "like" | "custom";

type FilterOption = {
  label: string;
  value: string;
  count?: number;
};

type CustomCondition = {
  id: number;
  logic: "AND" | "OR" | "NOT";
  field: string;
  operator: string;
  value: string;
  leftBracket: string;
  rightBracket: string;
};

type SearchResult = {
  id: string;
  name: string;
  type: string;
  source: string;
  uploader: string;
  uploadTime: string;
  size: string;
  viewCount: number;
  summary: string;
  entities: string[];
  tags: string[];
  knowledgeBase: string;
};

const DEFAULT_VISIBLE_FILTER_COUNT = 4;
const customFieldOptions = [
  { label: "标签", value: "标签" },
  { label: "对象名称", value: "对象名称" },
  { label: "对象备注信息", value: "对象备注信息" },
  { label: "正文", value: "正文" },
];
const customOperatorOptions = [
  { label: "等于", value: "等于" },
  { label: "包含", value: "包含" },
  { label: "不包含", value: "不包含" },
];
const entityOptions = {
  公司: ["特斯拉", "英伟达", "比亚迪", "华为"],
  人名: ["马斯克", "任正非", "黄仁勋"],
  地点: ["中国", "美国", "欧洲"],
  技术: ["自动驾驶", "电池技术", "芯片", "大模型"],
};

const relatedSearches = [
  "特斯拉商业模式分析",
  "新能源汽车行业竞争格局",
  "自动驾驶技术路线",
  "行业研究报告",
];

const typeIconMap: Record<string, React.ReactNode> = {
  DOC: <FileWordOutlined style={{ fontSize: 20, color: "#1890ff" }} />,
  DOCX: <FileWordOutlined style={{ fontSize: 20, color: "#1890ff" }} />,
  PDF: <FilePdfOutlined style={{ fontSize: 20, color: "#f5222d" }} />,
  HTML: <FileTextOutlined style={{ fontSize: 20, color: "#fa8c16" }} />,
  TXT: <FileTextOutlined style={{ fontSize: 20, color: "#52c41a" }} />,
  IMAGE: <FileImageOutlined style={{ fontSize: 20, color: "#52c41a" }} />,
  图片: <FileImageOutlined style={{ fontSize: 20, color: "#52c41a" }} />,
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
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }
  return {
    label: String(item?.label ?? item?.name ?? rawValue),
    value: String(rawValue),
    count: Number(item?.count ?? item?.total ?? item?.docCount ?? 0),
  };
};

const formatFileSize = (bytes: any) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) {
    return "-";
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

const mapDocumentResult = (item: any): SearchResult => {
  const fakeTags = ["行业分析", "重点文档", "自动生成"];
  const fakeEntities = ["特斯拉", "自动驾驶", "中国"];

  return {
    id: String(item?.id ?? item?.documentId ?? item?.fileId ?? Math.random()),
    name: item?.name ?? item?.fileName ?? item?.documentName ?? "-",
    type: String(item?.fileType ?? item?.type ?? "DOCX").toUpperCase(),
    source: item?.channelName ?? item?.accessMode ?? item?.source ?? "-",
    uploader: item?.creatorName ?? item?.creator ?? item?.uploader ?? item?.createBy ?? "-",
    uploadTime: item?.createTime ?? item?.uploadTime ?? "-",
    size: formatFileSize(item?.fileSizeBytes ?? item?.fileSize),
    viewCount: Number(item?.viewCount ?? 0),
    summary: item?.summary ?? item?.contentSnippet ?? item?.snippet ?? "-",
    entities: fakeEntities,
    tags: fakeTags,
    knowledgeBase: item?.knowledgeBaseName ?? "未入知识库",
  };
};

export default function DataSearchPage() {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<"_score" | "createTime">("_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [knowledgeBaseFilter, setKnowledgeBaseFilter] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [catalogFilter, setCatalogFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [queryStrategyMode, setQueryStrategyMode] = useState<SearchStrategyType>("like");
  const [fuzzyWeights, setFuzzyWeights] = useState({
    title: 70,
    content: 20,
    tag: 10,
  });
  const [slop, setSlop] = useState(1);
  const [customConditions, setCustomConditions] = useState<CustomCondition[]>([
    {
      id: 1,
      logic: "AND",
      field: "标签",
      operator: "等于",
      value: "",
      leftBracket: "",
      rightBracket: "",
    },
  ]);
  const [activeConditionId, setActiveConditionId] = useState<number>(1);
  const [appliedStrategyLabel, setAppliedStrategyLabel] = useState("模糊匹配");

  const [knowledgeBaseOptions, setKnowledgeBaseOptions] = useState<FilterOption[]>([]);
  const [tagOptions, setTagOptions] = useState<FilterOption[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<FilterOption[]>([]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState<FilterOption[]>([]);
  const [accessModeOptions, setAccessModeOptions] = useState<FilterOption[]>([]);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

  const [knowledgeBaseKeyword, setKnowledgeBaseKeyword] = useState("");
  const [tagKeyword, setTagKeyword] = useState("");
  const [catalogKeyword, setCatalogKeyword] = useState("");
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

  const buildAdvanceSearch = () =>
    customConditions
      .filter((item) => item.field && item.operator && item.value.trim())
      .map((item, index) => {
        const expression = `${item.leftBracket || ""}${item.field} ${item.operator} "${item.value.trim()}"${item.rightBracket || ""}`;
        return index === 0 ? expression : `${item.logic} ${expression}`;
      })
      .join(" ");

  const buildQueryPayload = (pageNo: number, size: number): DocumentQueryParams => ({
    pageNo,
    pageSize: size,
    keyword: searchText.trim(),
    queryStrategy: queryStrategyMode === "precise" ? 0 : queryStrategyMode === "like" ? 1 : 2,
    slop: queryStrategyMode === "like" ? slop : 0,
    fieldWeights:
      queryStrategyMode === "like"
        ? [
            { fieldName: "name", weight: Number(fuzzyWeights.title) },
            { fieldName: "oriContent", weight: Number(fuzzyWeights.content) },
            { fieldName: "transContent", weight: Number(fuzzyWeights.content) },
            { fieldName: "tag", weight: Number(fuzzyWeights.tag) },
          ]
        : [],
    advanceSearch: queryStrategyMode === "custom" ? buildAdvanceSearch() : "",
    sortField,
    sortOrder,
    knowledgeBaseId: knowledgeBaseFilter,
    fileTypes: documentTypes,
    catalogIds: catalogFilter,
    fileTagIdList: selectedTags,
    directoryIds: [],
    accessModes: sourceFilter ? [sourceFilter] : [],
    entityTypes: [],
    entityNames: [],
    createTime: dateRange ?? [],
  });

  const fetchFilterOptions = async () => {
    setFilterOptionsLoading(true);
    try {
      const [knowledgeResponse, tagResponse, catalogResponse, fileTypeResponse, accessModeResponse]:
        any = await Promise.all([
          getKnowledgeBaseList({ pageNo: 1, pageSize: 1000 }),
          getTagPage({ pageNo: 1, pageSize: 1000 }),
          getCatalogTypeList(),
          getDocumentFileTypeCount(),
          getDocumentAccessModeCount(),
        ]);

      const knowledgeItems = extractPageList<KnowledgeBaseItem>(knowledgeResponse);
      const tagItems = extractPageList<TagItem>(tagResponse);

      const knowledgeOptions = knowledgeItems.map((item) => ({
        label: item.name,
        value: String(item.id),
        count: Number(item.documentCount ?? 0),
      }));
      if (!knowledgeOptions.some((item) => item.label === "未入知识库")) {
        knowledgeOptions.push({
          label: "未入知识库",
          value: "未入知识库",
          count: 0,
        });
      }

      setKnowledgeBaseOptions(knowledgeOptions);
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
      message.error("获取筛选项失败");
    } finally {
      setFilterOptionsLoading(false);
    }
  };

  const fetchDocuments = async (pageNo = 1, size = pageSize) => {
    const startedAt = Date.now();
    setLoading(true);
    try {
      const response: any = await queryDocuments(buildQueryPayload(pageNo, size));
      const rows = extractPageList<any>(response).map(mapDocumentResult);
      setSearchResults(rows);
      setTotalResults(extractPageTotal(response));
      setCurrentPage(pageNo);
      setPageSize(size);
      setSearchTime(Number(((Date.now() - startedAt) / 1000).toFixed(2)));
    } catch (error) {
      console.error(error);
      message.error("检索失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments(1, pageSize);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    searchText,
    sortField,
    sortOrder,
    sourceFilter,
    documentTypes,
    knowledgeBaseFilter,
    selectedTags,
    catalogFilter,
    dateRange,
    pageSize,
    queryStrategyMode,
    fuzzyWeights.title,
    fuzzyWeights.content,
    fuzzyWeights.tag,
    slop,
    customConditions,
  ]);

  const handleSearch = () => {
    fetchDocuments(1, pageSize);
  };

  const handleResetFilters = () => {
    setDocumentTypes([]);
    setKnowledgeBaseFilter([]);
    setSelectedTags([]);
    setSelectedEntities([]);
    setCatalogFilter([]);
    setDateRange(null);
    setSourceFilter(null);
    setSearchText("");
    setKnowledgeBaseKeyword("");
    setTagKeyword("");
    setCatalogKeyword("");
    setShowAllKnowledgeBases(false);
    setShowAllTags(false);
    setShowAllCatalogs(false);
    message.success("已重置所有筛选条件");
  };

  const handleWeightChange = (field: "title" | "content" | "tag", value: number) => {
    setFuzzyWeights((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCondition = () => {
    const id = Date.now();
    setCustomConditions((prev) => [
      ...prev,
      {
        id,
        logic: "AND",
        field: "标签",
        operator: "等于",
        value: "",
        leftBracket: "",
        rightBracket: "",
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

  const handleConditionChange = (
    id: number,
    field: keyof CustomCondition,
    value: string,
  ) => {
    setCustomConditions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddBracket = (
    id: number,
    side: "leftBracket" | "rightBracket",
    bracket: "(" | ")",
  ) => {
    setCustomConditions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [side]: `${item[side] || ""}${bracket}` } : item,
      ),
    );
  };

  const handleAddBracketToActive = (side: "leftBracket" | "rightBracket", bracket: "(" | ")") => {
    handleAddBracket(activeConditionId, side, bracket);
  };

  const handleApplyAdvancedSearch = () => {
    setAppliedStrategyLabel(
      queryStrategyMode === "precise"
        ? "精确匹配"
        : queryStrategyMode === "like"
          ? "模糊匹配"
          : "多条件拼接",
    );
    setShowAdvancedSearch(false);
    fetchDocuments(1, pageSize);
  };

  const handleResetAdvancedSearch = () => {
    setQueryStrategyMode("like");
    setFuzzyWeights({ title: 70, content: 20, tag: 10 });
    setSlop(1);
    setCustomConditions([
      {
        id: 1,
        logic: "AND",
        field: "标签",
        operator: "等于",
        value: "",
        leftBracket: "",
        rightBracket: "",
      },
    ]);
    setActiveConditionId(1);
    setAppliedStrategyLabel("模糊匹配");
    setShowAdvancedSearch(false);
  };

  const collapseItems = [
    {
      key: "knowledgeBase",
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
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {visibleKnowledgeBaseOptions.map((item) => (
                <Checkbox key={item.value} value={item.value}>
                  {item.label}
                  {typeof item.count === "number" ? ` (${item.count})` : ""}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
          {!filterOptionsLoading &&
            filteredKnowledgeBaseOptions.length > DEFAULT_VISIBLE_FILTER_COUNT && (
              <a onClick={() => setShowAllKnowledgeBases((prev) => !prev)}>
                {showAllKnowledgeBases ? "收起" : "查看更多"}
              </a>
            )}
        </div>
      ),
    },
    {
      key: "documentType",
      label: <span style={{ fontWeight: 600 }}>文档格式</span>,
      children: (
        <Checkbox.Group
          value={documentTypes}
          onChange={(values) => setDocumentTypes(values as string[])}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {documentTypeOptions.map((item) => (
              <Checkbox key={item.value} value={item.value}>
                {item.label}
                {typeof item.count === "number" ? ` (${item.count})` : ""}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      ),
    },
    {
      key: "catalog",
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
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
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
                {showAllCatalogs ? "收起" : "查看更多"}
              </a>
            )}
        </div>
      ),
    },
    {
      key: "uploadTime",
      label: <span style={{ fontWeight: 600 }}>创建时间</span>,
      children: (
        <RangePicker
          style={{ width: "100%" }}
          onChange={(_, dateStrings) => {
            const values = dateStrings.filter(Boolean) as string[];
            setDateRange(values.length === 2 ? [values[0], values[1]] : null);
          }}
        />
      ),
    },
    {
      key: "tags",
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
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {visibleTagOptions.map((item) => (
                <Checkbox key={item.value} value={item.value}>
                  {item.label}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
          {!filterOptionsLoading && filteredTagOptions.length > DEFAULT_VISIBLE_FILTER_COUNT && (
            <a onClick={() => setShowAllTags((prev) => !prev)}>
              {showAllTags ? "收起" : "查看更多"}
            </a>
          )}
        </div>
      ),
    },
    {
      key: "entities",
      label: <span style={{ fontWeight: 600 }}>关键实体</span>,
      children: (
        <div>
          {Object.entries(entityOptions).map(([category, entities]) => (
            <div key={category} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 6 }}>
                {category}
              </div>
              <Space wrap size={4}>
                {entities.map((entity) => {
                  const active = selectedEntities.includes(entity);
                  return (
                    <Tag
                      key={entity}
                      color={active ? "blue" : "default"}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setSelectedEntities((prev) =>
                          prev.includes(entity)
                            ? prev.filter((item) => item !== entity)
                            : [...prev, entity],
                        )
                      }
                    >
                      {entity}
                    </Tag>
                  );
                })}
              </Space>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px)" }}>
      <Card style={{ borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }} bodyStyle={{ padding: 0 }}>
        <div
          style={{
            background: "linear-gradient(180deg, #e6f7ff 0%, #f5f9ff 100%)",
            borderRadius: 12,
            padding: "32px 40px",
            marginBottom: 16,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: "#262626", marginBottom: 8 }}>
              智能文档检索
            </h1>
            <p style={{ fontSize: 14, color: "#8c8c8c", marginBottom: 24 }}>
              基于关键字与语义理解的文档检索
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              maxWidth: 860,
              margin: "0 auto",
              position: "relative",
            }}
          >
            <Input
              placeholder="输入关键词，例如：特斯拉商业模式分析"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ flex: 1, height: 48, fontSize: 15, borderRadius: 8 }}
              prefix={<SearchOutlined style={{ color: "#bfbfbf", fontSize: 18 }} />}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
              style={{ height: 48, paddingLeft: 24, paddingRight: 24, fontSize: 16, borderRadius: 8 }}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />

            {showAdvancedSearch && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 4,
                  width: 420,
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  padding: 16,
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "#262626", marginBottom: 12 }}>
                  匹配策略
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {[
                    { label: "精确匹配", value: "precise" },
                    { label: "模糊匹配", value: "like" },
                    { label: "多条件拼接", value: "custom" },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      type={queryStrategyMode === item.value ? "primary" : "default"}
                      size="small"
                      onClick={() => setQueryStrategyMode(item.value as SearchStrategyType)}
                      style={{ flex: 1 }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>

                {queryStrategyMode === "precise" && (
                  <div style={{ background: "#f7f9fc", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                      将传 `queryStrategy = 0`。
                    </div>
                  </div>
                )}

                {queryStrategyMode === "like" && (
                  <div style={{ background: "#f7f9fc", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    {[
                      { key: "title", label: "标题权重" },
                      { key: "content", label: "正文权重" },
                      { key: "tag", label: "标签权重" },
                    ].map(({ key, label }) => (
                      <div
                        key={key}
                        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}
                      >
                        <span style={{ width: 70, fontSize: 12, color: "#8c8c8c" }}>{label}</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={fuzzyWeights[key as keyof typeof fuzzyWeights]}
                          onChange={(e) =>
                            handleWeightChange(
                              key as "title" | "content" | "tag",
                              parseInt(e.target.value, 10),
                            )
                          }
                          style={{ flex: 1, cursor: "pointer" }}
                        />
                        <span style={{ width: 36, fontSize: 12, color: "#1890ff", fontWeight: 500 }}>
                          {fuzzyWeights[key as keyof typeof fuzzyWeights]}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 70, fontSize: 12, color: "#8c8c8c" }}>slop</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={slop}
                        onChange={(e) => setSlop(parseInt(e.target.value, 10))}
                        style={{ flex: 1, cursor: "pointer" }}
                      />
                      <span style={{ width: 36, fontSize: 12, color: "#1890ff", fontWeight: 500 }}>
                        {slop}
                      </span>
                    </div>
                  </div>
                )}

                {queryStrategyMode === "custom" && (
                  <div
                    style={{
                      background: "#f7f9fc",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                        position: "sticky",
                        top: 0,
                        background: "#f7f9fc",
                        zIndex: 1,
                        paddingBottom: 4,
                      }}
                    >
                      <Button type="primary" size="small" onClick={handleAddCondition}>
                        添加条件
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleAddBracketToActive("leftBracket", "(")}
                        disabled={!customConditions.some((item) => item.id === activeConditionId)}
                      >
                        (
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleAddBracketToActive("rightBracket", ")")}
                        disabled={!customConditions.some((item) => item.id === activeConditionId)}
                      >
                        )
                      </Button>
                    </div>
                    {customConditions.map((condition, index) => (
                      <div
                        key={condition.id}
                        onClick={() => setActiveConditionId(condition.id)}
                        style={{
                          marginBottom: 12,
                          padding: 10,
                          background: "#fff",
                          borderRadius: 6,
                          border:
                            activeConditionId === condition.id
                              ? "1px solid #1890ff"
                              : "1px solid #e8e8e8",
                          boxShadow:
                            activeConditionId === condition.id
                              ? "0 0 0 2px rgba(24,144,255,0.08)"
                              : "none",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              index > 0
                                ? "72px 110px 110px minmax(260px, 1fr)"
                                : "110px 110px minmax(260px, 1fr)",
                            gap: 8,
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          {index > 0 && (
                            <Select
                              value={condition.logic}
                              onChange={(value) => handleConditionChange(condition.id, "logic", value)}
                              style={{ width: 72 }}
                              options={[
                                { label: "与", value: "AND" },
                                { label: "或", value: "OR" },
                                { label: "非", value: "NOT" },
                              ]}
                            />
                          )}
                          <Select
                            value={condition.field}
                            onChange={(value) => handleConditionChange(condition.id, "field", value)}
                            options={customFieldOptions}
                            style={{ width: "100%" }}
                          />
                          <Select
                            value={condition.operator}
                            onChange={(value) => handleConditionChange(condition.id, "operator", value)}
                            options={customOperatorOptions}
                            style={{ width: "100%" }}
                          />
                          <Input
                            value={condition.value}
                            placeholder="输入值"
                            onChange={(e) =>
                              handleConditionChange(condition.id, "value", e.target.value)
                            }
                            style={{ width: "100%", minWidth: 260 }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                            {condition.leftBracket || ""}
                          </span>
                          <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                            {condition.rightBracket || ""}
                          </span>
                          <Button
                            danger
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCondition(condition.id);
                            }}
                            disabled={customConditions.length === 1}
                          >
                            删除条件
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 8 }}>
                      预览：{buildAdvanceSearch() || "-"}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #e8e8e8",
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
              margin: "8px auto 0",
              background: "#f0f5ff",
              borderRadius: 8,
              padding: "10px 16px",
              border: "1px solid #d6e4ff",
              fontSize: 12,
              color: "#595959",
              textAlign: "center",
            }}
          >
            当前策略：{appliedStrategyLabel}
            {queryStrategyMode === "like" &&
              ` | 标题 ${fuzzyWeights.title} / 正文 ${fuzzyWeights.content} / 标签 ${fuzzyWeights.tag} / slop ${slop}`}
            {queryStrategyMode === "custom" && ` | ${buildAdvanceSearch() || "-"}`}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: "#595959" }}>
              找到 <span style={{ color: "#1890ff", fontWeight: 600 }}>{totalResults.toLocaleString()}</span> 条结果
              <span style={{ color: "#8c8c8c", marginLeft: 8 }}>用时 {searchTime} 秒</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: "#8c8c8c" }}>数据来源：</span>
                {accessModeOptions.map((source) => {
                  const sourceName = String(source.value);
                  const isActive = sourceFilter === sourceName;
                  return (
                    <Button
                      key={sourceName}
                      size="small"
                      type={isActive ? "primary" : "default"}
                      onClick={() => setSourceFilter((prev) => (prev === sourceName ? null : sourceName))}
                      style={{
                        borderRadius: 16,
                        background: isActive ? "#1890ff" : "#f2f4f8",
                        borderColor: isActive ? "#1890ff" : "#d9d9d9",
                        color: isActive ? "#fff" : "#8c8c8c",
                      }}
                    >
                      {source.label}
                      {typeof source.count === "number" ? `(${source.count})` : ""}
                    </Button>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 16,
                  borderLeft: "1px solid #e8e8e8",
                }}
              >
                <span style={{ fontSize: 14, color: "#8c8c8c" }}>排序方式：</span>
                <Select
                  value={sortField}
                  onChange={setSortField}
                  style={{ width: 100 }}
                  options={[
                    { label: "相关性", value: "_score" },
                    { label: "时间", value: "createTime" },
                  ]}
                />
                <Button
                  size="small"
                  icon={sortOrder === "desc" ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  style={{
                    background: sortOrder === "desc" ? "#1890ff" : "#f2f4f8",
                    color: sortOrder === "desc" ? "#fff" : "#8c8c8c",
                    borderColor: sortOrder === "desc" ? "#1890ff" : "#d9d9d9",
                  }}
                >
                  {sortOrder === "desc" ? "降序" : "升序"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, padding: 16 }}>
          <div
            style={{
              width: 260,
              flexShrink: 0,
              background: "#fff",
              borderRadius: 8,
              padding: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              height: "fit-content",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid #e8e8e8",
              }}
            >
              <FilterOutlined style={{ color: "#1890ff" }} />
              <span style={{ fontWeight: 600, fontSize: 15, color: "#262626" }}>筛选条件</span>
              <a style={{ marginLeft: "auto", fontSize: 12 }} onClick={handleResetFilters}>
                <ReloadOutlined /> 重置
              </a>
            </div>
            <Collapse defaultActiveKey={["knowledgeBase", "documentType", "tags"]} ghost items={collapseItems} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              {loading ? (
                <div style={{ padding: 80, textAlign: "center" }}>加载中...</div>
              ) : searchResults.length === 0 ? (
                <Empty description="当前筛选条件下暂无检索结果" style={{ padding: 60 }} />
              ) : (
                searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    style={{
                      padding: 20,
                      borderBottom: index < searchResults.length - 1 ? "1px solid #f0f0f0" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#f2f4f8",
                          borderRadius: 8,
                          flexShrink: 0,
                        }}
                      >
                        {typeIconMap[result.type] ?? (
                          <FileTextOutlined style={{ fontSize: 20, color: "#1890ff" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <a style={{ fontSize: 16, fontWeight: 600, color: "#262626" }}>{result.name}</a>
                          <Tag color={result.knowledgeBase === "未入知识库" ? "default" : "green"}>
                            {result.knowledgeBase}
                          </Tag>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#8c8c8c",
                            display: "flex",
                            flexWrap: "wrap",
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => history.push(`/data/document/${result.id}`)}
                        >
                          详情
                        </Button>
                        <Button type="link" size="small" icon={<DownloadOutlined />}>
                          下载
                        </Button>
                      </div>
                    </div>

                    <div style={{ fontSize: 14, color: "#8c8c8c", lineHeight: 1.8, marginBottom: 12 }}>
                      {result.summary}
                    </div>

                    {result.entities.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: "#595959", fontWeight: 500, marginRight: 8 }}>
                          实体：
                        </span>
                        <Space wrap size={4}>
                          {result.entities.map((entity) => (
                            <Tag key={entity} color="blue">
                              {entity}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}

                    {result.tags.length > 0 && (
                      <div>
                        <span style={{ fontSize: 12, color: "#595959", fontWeight: 500, marginRight: 8 }}>
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
                  padding: "16px 20px",
                  borderTop: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13, color: "#8c8c8c" }}>
                  每页显示：
                  <Select
                    value={pageSize}
                    onChange={(value) => {
                      setPageSize(value);
                      fetchDocuments(1, value);
                    }}
                    style={{ width: 90, marginLeft: 8 }}
                    options={[
                      { label: "10条", value: 10 },
                      { label: "20条", value: 20 },
                      { label: "50条", value: 50 },
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

            <div
              style={{
                background: "#fff",
                borderRadius: 8,
                padding: 16,
                marginTop: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#262626", marginBottom: 12 }}>
                相关搜索
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {relatedSearches.map((search) => (
                  <a key={search} style={{ color: "#1890ff", fontSize: 13 }} onClick={() => setSearchText(search)}>
                    {search}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
