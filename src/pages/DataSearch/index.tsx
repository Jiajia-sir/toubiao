"use client";

import { useState, useEffect } from "react";
import { history } from "@umijs/max";
import {
  Button,
  Input,
  Select,
  Checkbox,
  DatePicker,
  Tag,
  Space,
  Pagination,
  Collapse,
  Card,
  Row,
  Col,
  message,
} from "antd";
import {
  SearchOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  SettingOutlined,
} from "@ant-design/icons";

interface SearchResult {
  id: string;
  name: string;
  type: "DOCX" | "PDF" | "HTML" | "图片";
  source: "页面上传" | "API调用" | "数据源接入";
  uploader: string;
  uploadTime: string;
  size: string;
  viewCount: number;
  summary: string;
  highlightedKeywords: string[];
  matchLevel: {
    content: "高" | "中" | "低";
    tag: "高" | "中" | "低";
  };
  entities: string[];
  tags: string[];
  isInKnowledgeBase: boolean;
  knowledgeBase: "行业分析知识库" | "产品研发知识库" | "未入知识库";
}

const initialResults: SearchResult[] = [
  {
    id: "1",
    name: "特斯拉与英伟达合作深度分析报告.docx",
    type: "DOCX",
    source: "页面上传",
    uploader: "hmhtest2",
    uploadTime: "2026-03-02 15:16:00",
    size: "110.5KB",
    viewCount: 220,
    summary:
      "与英伟达系列文章扩展至50篇深度文章，全面覆盖两家公司的创始人故事...部分聚焦特斯拉与英伟达在自动驾驶领域的合作进展，分析双方在芯片技术、算法优化等方面的协同效应，以及未来可能的战略布局。",
    highlightedKeywords: ["特斯拉", "英伟达", "商业模式"],
    matchLevel: { content: "高", tag: "中" },
    entities: [
      "特斯拉",
      "商业模式",
      "新能源",
      "技术分析",
      "艾伯哈德",
      "马斯克",
      "英伟达",
    ],
    tags: ["特斯拉", "商业模式", "新能源", "技术分析", "艾伯哈德", "马斯克"],
    isInKnowledgeBase: true,
    knowledgeBase: "行业分析知识库",
  },
  {
    id: "2",
    name: "全球新能源汽车行业竞争格局分析.docx",
    type: "DOCX",
    source: "页面上传",
    uploader: "hmhtest1",
    uploadTime: "2026-03-01 10:30:00",
    size: "256.8KB",
    viewCount: 156,
    summary:
      "全面分析全球新能源汽车市场的竞争态势，重点对比特斯拉、比亚迪、大众、丰田等主流车企的市场表现和技术路线，探讨不同企业在电池技术、自动驾驶、供应链管理等方面的竞争优势与挑战。",
    highlightedKeywords: ["新能源", "特斯拉", "比亚迪"],
    matchLevel: { content: "高", tag: "中" },
    entities: [
      "新能源",
      "行业分析",
      "市场竞争",
      "特斯拉",
      "比亚迪",
      "大众",
      "丰田",
    ],
    tags: ["新能源", "行业分析", "市场竞争", "特斯拉", "比亚迪"],
    isInKnowledgeBase: true,
    knowledgeBase: "行业分析知识库",
  },
  {
    id: "3",
    name: "特斯拉2026年战略发展规划.pdf",
    type: "PDF",
    source: "API调用",
    uploader: "system",
    uploadTime: "2026-02-28 09:00:00",
    size: "1.8MB",
    viewCount: 89,
    summary:
      "特斯拉2026年度战略规划文件，详细阐述公司在电��汽车、自动驾驶、储能等多领域的布局计划，���括新产品研发计划、市场拓展策略、产能扩张方案等。",
    highlightedKeywords: ["特斯拉", "战略规划"],
    matchLevel: { content: "中", tag: "低" },
    entities: ["特斯拉", "战略规划", "自动驾驶", "储能"],
    tags: ["特斯拉", "战略规划", "新能源汽车"],
    isInKnowledgeBase: false,
    knowledgeBase: "未入知识库",
  },
  {
    id: "4",
    name: "新能源汽车电池技术发展趋势研究.docx",
    type: "DOCX",
    source: "数据源接入",
    uploader: "hmhtest3",
    uploadTime: "2026-02-25 14:20:00",
    size: "89.3KB",
    viewCount: 67,
    summary:
      "深入研究新能源汽车电池技术的发展趋势，分析磷酸铁锂、三元锂、固态电池等不同技术路线的优劣势，探讨未来电池技术的创新方向。",
    highlightedKeywords: ["新能源", "电池技术", "固态电池"],
    matchLevel: { content: "高", tag: "高" },
    entities: ["电池技术", "固态电池", "磷酸铁锂", "三元锂"],
    tags: ["电池技术", "新能源汽车", "技术分析"],
    isInKnowledgeBase: true,
    knowledgeBase: "产品研发知识库",
  },
];

const documentTypeOptions = [
  { label: "DOC (986)", value: "DOC", count: 986 },
  { label: "PDF (754)", value: "PDF", count: 754 },
  { label: "HTML (321)", value: "HTML", count: 321 },
  { label: "图片 (280)", value: "图片", count: 280 },
];

const tagOptions = [
  { label: "特斯拉 (456)", value: "特斯拉" },
  { label: "新能源 (324)", value: "新能源" },
  { label: "商业模式 (287)", value: "商业模式" },
  { label: "技术分析 (198)", value: "技术分析" },
  { label: "市场分析 (156)", value: "市场分析" },
];

const entityOptions = {
  公司: ["特斯拉", "英伟达", "比亚迪", "苹果"],
  人名: ["马斯克", "艾伯哈德", "库克"],
  地点: ["硅谷", "中国", "美国", "欧洲"],

  技术术语: ["自动驾驶", "电池技术", "芯片", "算法"],
};

const relatedSearches = [
  "特斯拉技术专利分析",
  "特斯拉供应链研究报告",
  "特斯拉自动驾驶技术进展",
  "特斯拉市场营销策略",
  "新能源汽车行业发展趋势",
  "特斯拉财务数据分析",
];

const recommendedSearchItems = [
  "特斯拉自动驾驶技术进展",
  "特斯拉供应链管理分析",
  "新能源汽车行业发展趋势",
  "英伟达芯片技术分析",
  "比亚迪市场竞争分析",
  "电池技术发展趋势研究",
];

const typeIconMap: Record<string, React.ReactNode> = {
  DOCX: <FileWordOutlined style={{ fontSize: 20, color: "#1890ff" }} />,
  PDF: <FilePdfOutlined style={{ fontSize: 20, color: "#f5222d" }} />,
  HTML: <FileTextOutlined style={{ fontSize: 20, color: "#fa8c16" }} />,
  图片: <FileImageOutlined style={{ fontSize: 20, color: "#52c41a" }} />,
};

export default function DataSearchPage() {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(1245);
  const [searchTime, setSearchTime] = useState(0.32);
  const [loading, setLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("relevance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [knowledgeBaseFilter, setKnowledgeBaseFilter] = useState<string[]>([]);
  const [showSearchTips, setShowSearchTips] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "特斯拉最新财报分析",
    "新能源行业发展报告",
  ]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [matchStrategy, setMatchStrategy] = useState<string>("模糊匹配");
  const [exactMatchOptions, setExactMatchOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
  });
  const [fuzzyWeights, setFuzzyWeights] = useState({
    title: 70,
    content: 20,
    tag: 10,
  });
  const [phraseMatchOptions, setPhraseMatchOptions] = useState({
    slop: 1,
    boostFirst: true,
  });
  const [multiConditionConfig, setMultiConditionConfig] = useState([
    { id: 1, logic: "与", keyword: "", enabled: true },
  ]);
  const [appliedSettings, setAppliedSettings] = useState<{
    strategy: string;
    exactMatchOptions: typeof exactMatchOptions;
    fuzzyWeights: typeof fuzzyWeights;
    phraseMatchOptions: typeof phraseMatchOptions;
    multiConditionConfig: typeof multiConditionConfig;
  } | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const recommendationKeywords = ["特斯拉商业模式分析"];

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...initialResults];

      if (searchText) {
        const keyword = searchText.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.name.toLowerCase().includes(keyword) ||
            item.summary.toLowerCase().includes(keyword) ||
            item.entities.some((e) => e.toLowerCase().includes(keyword)) ||
            item.tags.some((t) => t.toLowerCase().includes(keyword)),
        );
      }

      if (knowledgeBaseFilter.length > 0) {
        filtered = filtered.filter((item) =>
          knowledgeBaseFilter.includes(item.knowledgeBase),
        );
      }

      if (documentTypes.length > 0) {
        filtered = filtered.filter((item) =>
          documentTypes.some((dt) => item.type.includes(dt)),
        );
      }

      if (timeRange) {
        const now = new Date();
        let startDate: Date;
        switch (timeRange) {
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "quarter":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        filtered = filtered.filter(
          (item) => new Date(item.uploadTime) >= startDate,
        );
      }

      if (selectedTags.length > 0) {
        filtered = filtered.filter((item) =>
          selectedTags.some((tag) => item.tags.includes(tag)),
        );
      }

      setSearchResults(filtered);
      setTotalResults(filtered.length);
      setSearchTime(Number((Math.random() * 0.5 + 0.1).toFixed(2)));
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    setSearchResults(initialResults);
    setTotalResults(initialResults.length);
  }, []);

  useEffect(() => {
    if (
      searchText === "" &&
      knowledgeBaseFilter.length === 0 &&
      documentTypes.length === 0 &&
      timeRange === null &&
      selectedTags.length === 0
    ) {
      return;
    }
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, knowledgeBaseFilter, documentTypes, timeRange, selectedTags]);

  const handleSourceChange = (source: string) => {
    setSourceFilter(source);
  };

  const handleRecommendationClick = (keyword: string) => {
    setSearchText(keyword);
    handleSearch();
  };

  const handleTagClick = (tag: string) => {
    setSearchText((prev) => (prev ? `${prev} ${tag}` : tag));
    handleSearch();
  };

  const handleEntityClick = (entity: string) => {
    setSearchText((prev) => (prev ? `${prev} ${entity}` : entity));
    handleSearch();
  };

  const handleSearchTipsClick = (keyword: string) => {
    setSearchText(keyword);
    setShowSearchTips(false);
    if (!recentSearches.includes(keyword)) {
      setRecentSearches([keyword, ...recentSearches].slice(0, 5));
    }
    handleSearch();
  };

  const handleRemoveRecentSearch = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(recentSearches.filter((item) => item !== keyword));
  };

  const handleRecentSearchClick = (keyword: string) => {
    setSearchText(keyword);
    setShowSearchTips(false);
    handleSearch();
  };

  const handleWeightChange = (field: string, value: number) => {
    setFuzzyWeights((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCondition = () => {
    setMultiConditionConfig([
      ...multiConditionConfig,
      { id: Date.now(), logic: "与", keyword: "", enabled: true },
    ]);
  };

  const handleRemoveCondition = (id: number) => {
    setMultiConditionConfig(
      multiConditionConfig.filter((item) => item.id !== id),
    );
  };

  const handleConditionChange = (
    id: number,
    field: string,
    value: string | boolean,
  ) => {
    setMultiConditionConfig(
      multiConditionConfig.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleResetAdvancedSettings = () => {
    setMatchStrategy("模糊匹配");
    setExactMatchOptions({ caseSensitive: false, wholeWord: false });
    setFuzzyWeights({ title: 70, content: 20, tag: 10 });
    setPhraseMatchOptions({ slop: 1, boostFirst: true });
    setMultiConditionConfig([
      { id: 1, logic: "与", keyword: "", enabled: true },
    ]);
    setAppliedSettings(null);
    setShowAdvancedSearch(false);
  };

  const handleApplyAdvancedSettings = () => {
    setAppliedSettings({
      strategy: matchStrategy,
      exactMatchOptions: { ...exactMatchOptions },
      fuzzyWeights: { ...fuzzyWeights },
      phraseMatchOptions: { ...phraseMatchOptions },
      multiConditionConfig: [...multiConditionConfig],
    });
    setShowAdvancedSearch(false);
    handleSearch();
  };

  const renderHighlightedText = (text: string, keywords: string[]) => {
    if (!keywords.length) return text;
    const parts = text.split(new RegExp(`(${keywords.join("|")})`, "g"));
    return parts.map((part, index) =>
      keywords.includes(part) ? (
        <span
          key={index}
          style={{
            backgroundColor: "#fff2cc",
            padding: "0 2px",
            borderRadius: 2,
          }}
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const collapseItems = [
    {
      key: "knowledgeBase",
      label: (
        <span style={{ fontWeight: 600, fontSize: 14, color: "#262626" }}>
          知识库
        </span>
      ),
      children: (
        <Checkbox.Group
          value={knowledgeBaseFilter}
          onChange={(value) => setKnowledgeBaseFilter(value as string[])}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Checkbox value="行业分析知识库">行业分析知识库</Checkbox>
            <Checkbox value="产品研发知识库">产品研发知识库</Checkbox>
            <Checkbox value="未入知识库">未入知识库</Checkbox>
          </Space>
        </Checkbox.Group>
      ),
    },
    {
      key: "documentType",
      label: (
        <span style={{ fontWeight: 600, fontSize: 14, color: "#262626" }}>
          文档类型
        </span>
      ),
      children: (
        <Checkbox.Group
          value={documentTypes}
          onChange={setDocumentTypes}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {documentTypeOptions.map((opt) => (
              <Checkbox key={opt.value} value={opt.value}>
                {opt.label}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      ),
    },
    {
      key: "uploadTime",
      label: (
        <span style={{ fontWeight: 600, fontSize: 14, color: "#262626" }}>
          上传时间
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Space wrap size={4}>
              {[
                { label: "近一周", value: "week" },
                { label: "近一月", value: "month" },
                { label: "近三月", value: "quarter" },
                { label: "近一年", value: "year" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  type={timeRange === opt.value ? "primary" : "default"}
                  size="small"
                  onClick={() => setTimeRange(opt.value)}
                  style={{ marginRight: 4, marginBottom: 4 }}
                >
                  {opt.label}
                </Button>
              ))}
            </Space>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <DatePicker
              placeholder="开始日期"
              style={{ flex: 1 }}
              onChange={(date) => {
                if (date) {
                  setDateRange([
                    date.format("YYYY-MM-DD"),
                    dateRange ? dateRange[1] : "",
                  ]);
                }
              }}
            />
            <DatePicker
              placeholder="结束日期"
              style={{ flex: 1 }}
              onChange={(date) => {
                if (date) {
                  setDateRange([
                    dateRange ? dateRange[0] : "",
                    date.format("YYYY-MM-DD"),
                  ]);
                }
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "tags",
      label: (
        <span style={{ fontWeight: 600, fontSize: 14, color: "#262626" }}>
          标签分类
        </span>
      ),
      children: (
        <div>
          <Row gutter={[8, 8]}>
            {(showAllTags ? tagOptions : tagOptions.slice(0, 4)).map((tag) => (
              <Col span={12} key={tag.value}>
                <Tag
                  style={{
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "center",
                    background: selectedTags.includes(tag.value)
                      ? "#e6f7ff"
                      : "#f2f4f8",
                    border: selectedTags.includes(tag.value)
                      ? "1px solid #1890ff"
                      : "1px solid #d9d9d9",
                    padding: "4px 10px",
                    borderRadius: 4,
                  }}
                  onClick={() => handleTagClick(tag.value)}
                >
                  {tag.label}
                </Tag>
              </Col>
            ))}
          </Row>
          {!showAllTags && (
            <a
              onClick={() => setShowAllTags(true)}
              style={{
                fontSize: 12,
                color: "#1890ff",
                display: "block",
                marginTop: 8,
              }}
            >
              显示更多
            </a>
          )}
        </div>
      ),
    },
    {
      key: "entities",
      label: (
        <span style={{ fontWeight: 600, fontSize: 14, color: "#262626" }}>
          关键实体
        </span>
      ),
      children: (
        <div>
          {Object.entries(entityOptions).map(([category, entities]) => (
            <div key={category} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 13,
                  color: "#8c8c8c",
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                {category} ({entities.length})
              </div>
              <Space wrap size={4}>
                {entities.map((entity) => (
                  <Tag
                    key={entity}
                    style={{
                      cursor: "pointer",
                      background: "#f2f4f8",
                      border: "1px solid #d9d9d9",
                      padding: "2px 8px",
                      fontSize: 12,
                    }}
                    onClick={() => handleEntityClick(entity)}
                  >
                    {entity}
                  </Tag>
                ))}
              </Space>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px)" }}>
        <Card
          style={{
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
          bodyStyle={{ padding: 0 }}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #e6f7ff 0%, #f5f9ff 100%)",
              borderRadius: 12,
              padding: "32px 40px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            ></div>

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#262626",
                  marginBottom: 8,
                }}
              >
                智能文档检索
              </h1>
              <p style={{ fontSize: 14, color: "#8c8c8c", marginBottom: 24 }}>
                基于关键词和语义理解，快速定位所需文档内容
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                maxWidth: 800,
                margin: "0 auto",
                position: "relative",
              }}
            >
              <Input
                placeholder="输入关键词或问题，例如：'特斯拉商业模式分析'"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                onFocus={() => setShowSearchTips(true)}
                onBlur={() => {
                  setTimeout(() => setShowSearchTips(false), 200);
                }}
                style={{
                  flex: 1,
                  height: 48,
                  fontSize: 15,
                  borderRadius: 8,
                }}
                prefix={
                  <SearchOutlined style={{ color: "#bfbfbf", fontSize: 18 }} />
                }
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
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
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
                    width: 400,
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    padding: 16,
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#262626",
                      marginBottom: 12,
                    }}
                  >
                    匹配策略
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {["精确匹配", "模糊匹配", "短语匹配", "多条件拼接"].map(
                      (strategy) => (
                        <Button
                          key={strategy}
                          type={
                            matchStrategy === strategy ? "primary" : "default"
                          }
                          size="small"
                          onClick={() => setMatchStrategy(strategy)}
                          style={{
                            flex: 1,
                            borderRadius: 4,
                          }}
                        >
                          {strategy}
                        </Button>
                      ),
                    )}
                  </div>

                  {matchStrategy === "精确匹配" && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          background: "#f7f9fc",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <Checkbox
                          checked={exactMatchOptions.caseSensitive}
                          onChange={(e) =>
                            setExactMatchOptions((prev) => ({
                              ...prev,
                              caseSensitive: e.target.checked,
                            }))
                          }
                        >
                          区分大小写
                        </Checkbox>
                        <div style={{ height: 8 }} />
                        <Checkbox
                          checked={exactMatchOptions.wholeWord}
                          onChange={(e) =>
                            setExactMatchOptions((prev) => ({
                              ...prev,
                              wholeWord: e.target.checked,
                            }))
                          }
                        >
                          全词匹配
                        </Checkbox>
                      </div>
                    </div>
                  )}

                  {matchStrategy === "模糊匹配" && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          background: "#f7f9fc",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            color: "#595959",
                            marginBottom: 12,
                          }}
                        >
                          权重配置
                        </div>
                        {[
                          { key: "title", label: "标题权重" },
                          { key: "content", label: "正文权重" },
                          { key: "tag", label: "标签权重" },
                        ].map(({ key, label }) => (
                          <div
                            key={key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              marginBottom: 12,
                            }}
                          >
                            <span
                              style={{
                                width: 70,
                                fontSize: 12,
                                color: "#8c8c8c",
                              }}
                            >
                              {label}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={
                                fuzzyWeights[key as keyof typeof fuzzyWeights]
                              }
                              onChange={(e) =>
                                handleWeightChange(
                                  key,
                                  parseInt(e.target.value),
                                )
                              }
                              style={{ flex: 1, cursor: "pointer" }}
                            />
                            <span
                              style={{
                                width: 36,
                                fontSize: 12,
                                color: "#1890ff",
                                fontWeight: 500,
                              }}
                            >
                              {fuzzyWeights[key as keyof typeof fuzzyWeights]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchStrategy === "短语匹配" && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          background: "#f7f9fc",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 12,
                          }}
                        >
                          <span
                            style={{
                              width: 70,
                              fontSize: 12,
                              color: "#8c8c8c",
                            }}
                          >
                            词距 slop
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={phraseMatchOptions.slop}
                            onChange={(e) =>
                              setPhraseMatchOptions((prev) => ({
                                ...prev,
                                slop: parseInt(e.target.value),
                              }))
                            }
                            style={{ flex: 1, cursor: "pointer" }}
                          />
                          <span
                            style={{
                              width: 36,
                              fontSize: 12,
                              color: "#1890ff",
                              fontWeight: 500,
                            }}
                          >
                            {phraseMatchOptions.slop}
                          </span>
                        </div>
                        <Checkbox
                          checked={phraseMatchOptions.boostFirst}
                          onChange={(e) =>
                            setPhraseMatchOptions((prev) => ({
                              ...prev,
                              boostFirst: e.target.checked,
                            }))
                          }
                        >
                          提升首次出现位置
                        </Checkbox>
                      </div>
                    </div>
                  )}

                  {matchStrategy === "多条件拼接" && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          background: "#f7f9fc",
                          borderRadius: 8,
                          padding: 12,
                          maxHeight: 200,
                          overflowY: "auto",
                        }}
                      >
                        {multiConditionConfig.map((condition, index) => (
                          <div
                            key={condition.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 8,
                            }}
                          >
                            <Select
                              value={condition.logic}
                              onChange={(value) =>
                                handleConditionChange(
                                  condition.id,
                                  "logic",
                                  value,
                                )
                              }
                              style={{ width: 60 }}
                              options={[
                                { label: "与", value: "与" },
                                { label: "或", value: "或" },
                                { label: "非", value: "非" },
                              ]}
                            />
                            <Input
                              placeholder="输入关键词"
                              value={condition.keyword}
                              onChange={(e) =>
                                handleConditionChange(
                                  condition.id,
                                  "keyword",
                                  e.target.value,
                                )
                              }
                              style={{ flex: 1 }}
                            />
                            <Checkbox
                              checked={condition.enabled}
                              onChange={(e) =>
                                handleConditionChange(
                                  condition.id,
                                  "enabled",
                                  e.target.checked,
                                )
                              }
                            />
                            {multiConditionConfig.length > 1 && (
                              <CloseOutlined
                                onClick={() =>
                                  handleRemoveCondition(condition.id)
                                }
                                style={{
                                  color: "#bfbfbf",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              />
                            )}
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          size="small"
                          onClick={handleAddCondition}
                          style={{ width: "100%", marginTop: 8 }}
                        >
                          + 添加条件
                        </Button>
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
                    <Button
                      onClick={handleResetAdvancedSettings}
                      style={{ flex: 1 }}
                    >
                      重置
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleApplyAdvancedSettings}
                      style={{ flex: 1 }}
                    >
                      应用
                    </Button>
                  </div>
                </div>
              )}

              {showSearchTips && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    padding: "12px 16px",
                    zIndex: 100,
                  }}
                >
                  {recentSearches.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8c8c8c",
                          marginBottom: 8,
                        }}
                      >
                        最近搜索
                      </div>
                      {recentSearches.map((keyword) => (
                        <div
                          key={keyword}
                          onClick={() => handleRecentSearchClick(keyword)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 8px",
                            marginBottom: 4,
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 13,
                            color: "#595959",
                            background: "#f7f9fc",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <ClockCircleOutlined
                              style={{ color: "#bfbfbf", fontSize: 12 }}
                            />
                            <span>{keyword}</span>
                          </div>
                          <CloseOutlined
                            onClick={(e) =>
                              handleRemoveRecentSearch(keyword, e)
                            }
                            style={{
                              color: "#bfbfbf",
                              fontSize: 10,
                              padding: 4,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#8c8c8c",
                        marginBottom: 8,
                      }}
                    >
                      推荐搜索
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {recommendedSearchItems.map((keyword) => (
                        <div
                          key={keyword}
                          onClick={() => handleSearchTipsClick(keyword)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 13,
                            color: "#595959",
                            background: "#f7f9fc",
                          }}
                        >
                          {keyword}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {appliedSettings ? (
              <div
                style={{
                  maxWidth: 800,
                  margin: "8px auto 0",
                  background: "#f0f5ff",
                  borderRadius: 8,
                  padding: "10px 16px",
                  border: "1px solid #d6e4ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <SettingOutlined style={{ color: "#1890ff", fontSize: 14 }} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1890ff",
                    }}
                  >
                    当前搜索策略：{appliedSettings.strategy}
                  </span>
                  <a
                    onClick={() => setShowAdvancedSearch(true)}
                    style={{ fontSize: 12, color: "#8c8c8c", marginLeft: 16 }}
                  >
                    修改
                  </a>
                </div>

                {appliedSettings.strategy === "精确匹配" && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#595959",
                      textAlign: "center",
                    }}
                  >
                    {appliedSettings.exactMatchOptions.caseSensitive &&
                      "区分大小写 "}
                    {appliedSettings.exactMatchOptions.wholeWord && "全词匹配 "}
                  </div>
                )}

                {appliedSettings.strategy === "模糊匹配" && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#595959",
                      textAlign: "center",
                    }}
                  >
                    权重配置：标题 {appliedSettings.fuzzyWeights.title} / 正文{" "}
                    {appliedSettings.fuzzyWeights.content} / 标签{" "}
                    {appliedSettings.fuzzyWeights.tag}
                  </div>
                )}

                {appliedSettings.strategy === "短语匹配" && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#595959",
                      textAlign: "center",
                    }}
                  >
                    词距 slop: {appliedSettings.phraseMatchOptions.slop}
                    {appliedSettings.phraseMatchOptions.boostFirst &&
                      " / 提升首次出现位置"}
                  </div>
                )}

                {appliedSettings.strategy === "多条件拼接" && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#595959",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {appliedSettings.multiConditionConfig
                      .filter((c) => c.enabled && c.keyword)
                      .map((condition, index) => (
                        <span key={condition.id}>
                          {index > 0 && (
                            <span
                              style={{
                                color: "#ff4d4f",
                                fontWeight: 600,
                                margin: "0 4px",
                              }}
                            >
                              {condition.logic}
                            </span>
                          )}
                          <span
                            style={{
                              background: "#fff",
                              padding: "2px 8px",
                              borderRadius: 4,
                              border: "1px solid #d9d9d9",
                            }}
                          >
                            {condition.keyword}
                          </span>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  maxWidth: 800,
                  margin: "8px auto 0",
                  background: "#fafafa",
                  borderRadius: 8,
                  padding: "8px 16px",
                  border: "1px dashed #d9d9d9",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                    未配置搜索策略
                  </span>
                  <a
                    onClick={() => setShowAdvancedSearch(true)}
                    style={{ fontSize: 12, color: "#1890ff", marginLeft: 8 }}
                  >
                    立即配置
                  </a>
                </div>
              </div>
            )}
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
              <div
                style={{
                  fontSize: 14,
                  color: "#595959",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>
                  找到{" "}
                  <span style={{ color: "#1890ff", fontWeight: 600 }}>
                    {totalResults.toLocaleString()}
                  </span>{" "}
                  条结果
                  <span style={{ color: "#8c8c8c", marginLeft: 8 }}>
                    用时 {searchTime} 秒
                  </span>
                </span>
                <span
                  style={{
                    marginLeft: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <ExclamationCircleOutlined style={{ color: "#1890ff" }} />
                  你是不是想找：
                  <a
                    style={{
                      color: "#1890ff",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                    onClick={() =>
                      handleRecommendationClick(recommendationKeywords[0])
                    }
                  >
                    {recommendationKeywords[0]}
                  </a>
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "#8c8c8c" }}>
                    数据来源：
                  </span>
                  {["页面上传(1,245)", "API调用(872)", "数据源接入(624)"].map(
                    (source) => {
                      const sourceName = source.split("(")[0];
                      const isActive = sourceFilter === sourceName;
                      return (
                        <Button
                          key={sourceName}
                          size="small"
                          type={isActive ? "primary" : "default"}
                          onClick={() => handleSourceChange(sourceName)}
                          style={{
                            borderRadius: 16,
                            background: isActive ? "#1890ff" : "#f2f4f8",
                            borderColor: isActive ? "#1890ff" : "#d9d9d9",
                            color: isActive ? "#fff" : "#8c8c8c",
                          }}
                        >
                          {source}
                        </Button>
                      );
                    },
                  )}
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
                  <span style={{ fontSize: 14, color: "#8c8c8c" }}>
                    排序方式：
                  </span>
                  <Select
                    value={sortField}
                    onChange={setSortField}
                    style={{ width: 100 }}
                    options={[
                      { label: "相关度", value: "relevance" },
                      { label: "上传时间", value: "uploadTime" },
                      { label: "文件名称", value: "fileSize" },
                    ]}
                  />
                  <Button
                    size="small"
                    icon={
                      sortOrder === "desc" ? (
                        <SortDescendingOutlined />
                      ) : (
                        <SortAscendingOutlined />
                      )
                    }
                    onClick={() =>
                      setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                    }
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
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: "#262626",
                  }}
                >
                  筛选条件
                </span>
                <a
                  style={{ marginLeft: "auto", fontSize: 12 }}
                  onClick={() => {
                    setDocumentTypes([]);
                    setTimeRange(null);
                    setSelectedTags([]);
                    setDateRange(null);
                    setKnowledgeBaseFilter([]);
                    setSourceFilter(null);
                    setSearchText("");
                    setSearchResults(initialResults);
                    setTotalResults(initialResults.length);
                    message.success("已重置所有筛选条件");
                  }}
                >
                  <ReloadOutlined /> 重置
                </a>
              </div>
              <Collapse
                defaultActiveKey={["documentType", "uploadTime", "tags"]}
                ghost
                items={collapseItems}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                {searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    style={{
                      padding: 20,
                      borderBottom:
                        index < searchResults.length - 1
                          ? "1px solid #f0f0f0"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
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
                        {typeIconMap[result.type]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <a
                            style={{
                              fontSize: 16,
                              fontWeight: 600,
                              color: "#262626",
                            }}
                          >
                            {result.name}
                          </a>
                          <Tag
                            color={
                              result.knowledgeBase === "未入知识库"
                                ? "grey"
                                : "green"
                            }
                            style={{ marginLeft: 8 }}
                          >
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
                          <span>
                            来源：
                            <a style={{ color: "#1890ff" }}>{result.source}</a>
                          </span>
                          <span>
                            上传人：
                            <a style={{ color: "#1890ff" }}>
                              {result.uploader}
                            </a>
                          </span>
                          <span>
                            <CalendarOutlined /> {result.uploadTime}
                          </span>
                          <span>大小：{result.size}</span>
                          <span>浏览量：{result.viewCount}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => history.push(`/data/document/${result.id}`)}
                        >
                          详情
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                        >
                          下载
                        </Button>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        color: "#8c8c8c",
                        lineHeight: 1.8,
                        marginBottom: 12,
                      }}
                    >
                      {renderHighlightedText(
                        result.summary,
                        result.highlightedKeywords,
                      )}
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#595959",
                          fontWeight: 500,
                          marginRight: 8,
                        }}
                      >
                        实体抽取：
                      </span>
                      <Space wrap size={4}>
                        {result.entities.map((entity) => (
                          <Tag
                            key={entity}
                            color="blue"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleEntityClick(entity)}
                          >
                            {entity}
                          </Tag>
                        ))}
                      </Space>
                    </div>

                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#595959",
                          fontWeight: 500,
                          marginRight: 8,
                        }}
                      >
                        标签分类：
                      </span>
                      <Space wrap size={4}>
                        {result.tags.map((tag) => (
                          <Tag
                            key={tag}
                            color="purple"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleTagClick(tag)}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                ))}

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
                      onChange={setPageSize}
                      style={{ width: 80, marginLeft: 8 }}
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
                    onChange={setCurrentPage}
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
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#262626",
                    marginBottom: 12,
                  }}
                >
                  相关搜索
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {relatedSearches.map((search) => (
                    <a
                      key={search}
                      style={{
                        color: "#1890ff",
                        fontSize: 13,
                      }}
                      onClick={() => handleRecommendationClick(search)}
                    >
                      {search}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
