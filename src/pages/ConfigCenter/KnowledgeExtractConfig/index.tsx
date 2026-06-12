"use client";

import { useState } from "react";
import { history } from "@umijs/max";
import {
  Card,
  Button,
  InputNumber,
  Select,
  Radio,
  Input,
  Space,
  Row,
  Col,
  message,
  Tag,
  Checkbox,
  Popconfirm,
  Tabs,
  Tooltip,
  Slider,
  Switch,
} from "antd";
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  SettingOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  FireOutlined,
  AppstoreOutlined,
  TagOutlined,
  ClusterOutlined,
  BranchesOutlined,
} from "@ant-design/icons";

interface KnowledgeExtractConfig {
  id?: string;
  name?: string;
  tags: string[];
  blockSize: number;
  splitMode: "字数" | "段落";
  granularity: "粗颗粒度" | "细颗粒度";
  model: string;
  categories: string[];
  categoryLimit: number;
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  maxTokens: number;
}

const availableTags = [
  { label: "新闻", value: "新闻" },
  { label: "公告", value: "公告" },
  { label: "政策", value: "政策" },
  { label: "金融", value: "金融" },
  { label: "医疗", value: "医疗" },
  { label: "法律", value: "法律" },
  { label: "科研", value: "科研" },
  { label: "技术", value: "技术" },
];

const modelOptions = [
  {
    label: (
      <Space>
        <RobotOutlined style={{ color: "#1677ff" }} />
        <span>Qwen2.5-7B-Instruct</span>
      </Space>
    ),
    value: "Qwen2.5-7B-Instruct",
  },
  {
    label: (
      <Space>
        <RobotOutlined style={{ color: "#fa8c16" }} />
        <span>Qwen2.5-14B-Instruct</span>
      </Space>
    ),
    value: "Qwen2.5-14B-Instruct",
  },
  {
    label: (
      <Space>
        <ThunderboltOutlined style={{ color: "#eb2f96" }} />
        <span>GLM-4-9B-Chat</span>
      </Space>
    ),
    value: "GLM-4-9B-Chat",
  },
  {
    label: (
      <Space>
        <FireOutlined style={{ color: "#52c41a" }} />
        <span>Llama-3-8B-Instruct</span>
      </Space>
    ),
    value: "Llama-3-8B-Instruct",
  },
];

const modelPrecisionOptions = [
  { label: "精确抽取", value: "精确抽取" },
  { label: "标准抽取", value: "标准抽取" },
  { label: "灵活匹配", value: "灵活匹配" },
];

const categoryLimitOptions = [
  { label: "5个", value: 5 },
  { label: "10个", value: 10 },
  { label: "15个", value: 15 },
  { label: "20个", value: 20 },
];

const defaultCategories = [
  "人物",
  "地点",
  "时间",
  "机构",
  "事件",
  "产品",
  "概念",
];

const fineGrainedProperties = {
  人物属性: [
    "姓名",
    "性别",
    "年龄",
    "学历",
    "专业",
    "国籍",
    "职业",
    "工作单位",
    "联系方式",
    "电子邮箱",
    "研究方向",
  ],
  实体属性: ["实体名称", "实体类型", "实体状态", "实体描述", "关联实体"],
  数值属性: [
    "数量",
    "金额",
    "比例",
    "百分比",
    "时间跨度",
    "距离",
    "面积",
    "体积",
    "重量",
  ],
  其他属性: [
    "颜色",
    "材质",
    "规格",
    "型号",
    "品牌",
    "产地",
    "生产日期",
    "有效期",
  ],
};

const defaultCategoriesFine = ["人物属性", "实体属性", "数值属性", "其他属性"];

const samplePrompt = `你是专业的智能问答知识抽取专家，请从1000字的文本中抽取以下15个类别：
1. 人物属性：性别、年龄、学历、专业、国籍、职业、工作单位、联系方式、电子邮箱、研究方向
2. 实体属性：3.数值属性、4.其他属性
3. 要求：
- 严格基于原文抽取，不添加任何主观信息
- 缺失的类别需用"无"
- 输出结构化JSON格式`;

const sampleText =
  "2023年10月15日，张三代表阿里巴巴集团在杭州举办云栖大会上发布了新AI大模型该模型测试中超过了行业平均水平。";

const sampleTexts = [
  {
    label: "新闻",
    text: "2023年10月15日，张三代表阿里巴巴集团在杭州举办云栖大会上发布了新AI大模型，该模型测试中超过了行业平均水平。",
  },
  {
    label: "公告",
    text: "本公司于2023年11月1日发布公告称，因业务发展需要，现招聘JAVA开发工程师5名，要求本科以上学历，工作地点在北京，月薪20000-35000元。",
  },
  {
    label: "政策",
    text: "为贯彻落实国家关于促进中小企业发展的若干意见，北京市政府于2023年12月1日起实施新的税收优惠政策，符合条件的企业可享受增值税减免。",
  },
  {
    label: "金融",
    text: "中国工商银行宣布，从2024年1月1日起调整贷款利率，首套房贷款利率调整为4.1%，二套房为4.9%。",
  },
  {
    label: "医疗",
    text: "患者李某，男，45岁，因反复咳嗽伴发热3天于2023年12月1日入院，体温38.5℃，经检查诊断为肺炎。",
  },
];

const sampleResult = `人物：张三
机构：阿里巴巴集团
地点：杭州
时间：2023年10月15日
事件：云栖大会`;

export default function KnowledgeExtractConfigPage() {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [config, setConfig] = useState<KnowledgeExtractConfig>({
    tags: ["新闻", "公告", "政策"],
    blockSize: 1000,
    splitMode: "字数",
    granularity: "粗颗粒度",
    model: "Qwen2.5-7B-Instruct",
    categories: defaultCategories,
    categoryLimit: 10,
    temperature: 0.1,
    topP: 0.3,
    presencePenalty: 0.4,
    frequencyPenalty: 0.7,
    maxTokens: 512,
  });
  const [testText, setTestText] = useState("");
  const [extractResult, setExtractResult] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [displayCategories, setDisplayCategories] =
    useState<string[]>(defaultCategories);
  const [showFineInput, setShowFineInput] = useState(false);
  const [fineCategoryInput, setFineCategoryInput] = useState("");
  const [displayFineCategories, setDisplayFineCategories] = useState<string[]>(
    [],
  );
  const [modelPrecision, setModelPrecision] = useState<string>("精确抽取");
  const [tempEnabled, setTempEnabled] = useState(true);
  const [topPEnabled, setTopPEnabled] = useState(true);
  const [presencePenaltyEnabled, setPresencePenaltyEnabled] = useState(true);
  const [frequencyPenaltyEnabled, setFrequencyPenaltyEnabled] = useState(false);
  const [maxTokensEnabled, setMaxTokensEnabled] = useState(false);

  const customCategories = config.categories.filter(
    (cat) => !defaultCategories.includes(cat),
  );

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      message.success("保存成功");
      setLoading(false);
    }, 1000);
  };

  const handleExtract = () => {
    setTestLoading(true);
    setTimeout(() => {
      const text = testText;
      let result = "";

      if (config.granularity === "粗颗粒度") {
        const entities: Record<string, string[]> = {
          人物: [],
          机构: [],
          地点: [],
          时间: [],
          事件: [],
          产品: [],
          概念: [],
        };

        const patterns = {
          人物: /(?:患者|代表|董事|总|经理|师|生|员|用户)/,
          机构: /(?:集团|公司|医院|银行|政府|大学|研究所)/,
          地点: /(?:北京|杭州|上海|广州|深圳|市|省)/,
          时间: /(\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{1,2}-\d{1,2}|今日|昨日)/,
          事件: /(?:发布|成立|召开|实施|宣布|招聘|调整)/,
          产品: /(?:模型|系统|平台|服务|产品|软件)/,
          概念: /(?:AI|智能|数字化|信息化)/,
        };

        Object.entries(patterns).forEach(([category, pattern]) => {
          const matches = text.match(new RegExp(pattern, "g"));
          if (matches) {
            entities[category] = Array.from(new Set(matches));
          }
        });

        result = `【${config.model} - ${modelPrecision}抽取结果】\n`;
        Object.entries(entities).forEach(([category, values]) => {
          if (values.length > 0) {
            result += `${category}：${values.join("、")}\n`;
          }
        });
        if (!result.includes("：")) {
          result = `【抽取结果】
人物：张三
机构：阿里巴巴集团
地点：杭州
时间：2023年10月15日
事件：云栖大会
产品：AI大模型`;
        }
      } else {
        const props: string[] = [];
        Object.entries(fineGrainedProperties).forEach(
          ([category, properties]) => {
            const selected = config.categories.filter((p) =>
              (properties as string[]).includes(p),
            );
            if (selected.length > 0) {
              props.push(...selected.slice(0, 4));
            }
          },
        );

        const extractFineGrained = (text: string) => {
          const extracted: string[] = [];
          if (text.includes("男") || text.includes("女")) {
            extracted.push(`性别：${text.match(/男|女/)?.[0] || "未知"}`);
          }
          if (text.match(/\d+岁/)) {
            extracted.push(`年龄：${text.match(/\d+岁/)?.[0]}`);
          }
          if (text.match(/本科|硕士|博士|大专/)) {
            extracted.push(`学历：${text.match(/本科|硕士|博士|大专/)?.[0]}`);
          }
          if (text.match(/\d+元|\d+万/)) {
            extracted.push(`金额：${text.match(/\d+[元万亿]/)?.[0]}`);
          }
          if (text.match(/\d+%/)) {
            extracted.push(`比例：${text.match(/\d+%/)?.[0]}`);
          }
          if (text.match(/\d{4}年\d{1,2}月\d{1,2}日/)) {
            extracted.push(
              `时间：${text.match(/\d{4}年\d{1,2}月\d{1,2}日/)?.[0]}`,
            );
          }
          return extracted;
        };

        const fineResults = extractFineGrained(text);

        result = `【${config.model} - ${modelPrecision}细颗粒度抽取结果】\n`;
        result += `属性：${props.join("、") || "无"}\n`;
        result += "\n抽取详情：\n";
        result +=
          fineResults.length > 0 ? fineResults.join("\n") : "无详细信息";
      }

      setExtractResult(result);
      setTestLoading(false);
    }, 1500);
  };

  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");

  const handleGeneratePrompt = () => {
    const granularity = config.granularity;
    const blockSize = config.blockSize;
    const splitMode = config.splitMode;
    const precision = modelPrecision;

    let prompt = `你是专业的知识抽取专家，请从文本中抽取知识实体。\n\n`;
    prompt += `【抽取模式】${splitMode === "字数" ? `每${blockSize}字抽取一次` : `每${blockSize}段抽取一次`}\n\n`;
    prompt += `【颗粒度】${granularity}\n\n`;
    prompt += `【精度模式】${precision}\n\n`;

    if (granularity === "粗颗粒度") {
      const categoryText = config.categories.join("、");
      prompt += `【抽取类别】${categoryText}\n\n`;
    } else {
      prompt += `【抽取类别】按以下分类抽取：\n\n`;
      Object.entries(fineGrainedProperties).forEach(
        ([category, properties]) => {
          const selectedProps = config.categories.filter((p) =>
            (properties as string[]).includes(p),
          );
          if (selectedProps.length > 0) {
            prompt += `【${category}】${selectedProps.join("、")}\n`;
          }
        },
      );
    }

    prompt += `\n【要求】\n`;
    prompt += `1. 严格基于原文抽取，不添加任何主观信息\n`;
    prompt += `2. 缺失的类别用"无"表示\n`;
    prompt += `3. 输出JSON格式\n`;
    prompt += `4. 每个类别限制${config.categoryLimit}个`;

    setGeneratedPrompt(prompt);
  };

  return (
    <>
      <div
        style={{
          margin: "-24px -24px 24px -24px",
          padding: "20px 24px",
          background: "linear-gradient(90deg, #1677ff 0%, #4096ff 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Space align="center">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => history.go(-1)}
            style={{ color: "#fff" }}
          />
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            知识抽取配置
          </h2>
        </Space>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.85)",
            fontSize: 14,
          }}
        >
          配置知识抽取规则，支持一级基础配置和二级精细化配置，满足不同场景的抽取需求。
        </p>
      </div>

      <Row gutter={24}>
        <Col span={14}>
          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 500,
                fontSize: 14,
                color: "#333",
                marginBottom: 4,
              }}
            >
              <span style={{ color: "#ff4d4f" }}>*</span> 适用标签范围
            </div>
            <p style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 12 }}>
              配置该抽取规则适用的内容标签，仅匹配标签的内容才会执行抽取
            </p>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "#fafafa",
                border: "1px solid #f0f0f0",
                minHeight: 44,
              }}
            >
              <Space wrap>
                {config.tags.map((tag) => (
                  <Tag
                    key={tag}
                    color="blue"
                    closable
                    onClose={() => {
                      setConfig({
                        ...config,
                        tags: config.tags.filter((t) => t !== tag),
                      });
                    }}
                  >
                    {tag}
                  </Tag>
                ))}
                <Select
                  placeholder="+ 添加标签"
                  style={{ width: 120, height: 22 }}
                  value={undefined}
                  onChange={(value) => {
                    if (value && !config.tags.includes(value)) {
                      setConfig({
                        ...config,
                        tags: [...config.tags, value],
                      });
                    }
                  }}
                  options={availableTags.filter(
                    (tag) => !config.tags.includes(tag.value),
                  )}
                  allowClear
                />
              </Space>
            </div>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                color: "#262626",
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <SettingOutlined style={{ color: "#1677ff" }} />
              一级配置
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#262626",
                marginBottom: 8,
              }}
            >
              每次抽取块大小
              <span
                style={{
                  color: "#8c8c8c",
                  fontSize: 12,
                  marginLeft: 8,
                  marginBottom: 4,
                }}
              >
                设置每次抽取的文本块大小，支持按字数或段落进行分割
              </span>
            </div>

            <div
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: 8,
                background: "#fafafa",
                padding: 16,
              }}
            >
              <Radio.Group
                value={config.splitMode}
                onChange={(e) =>
                  setConfig({ ...config, splitMode: e.target.value })
                }
                style={{ marginBottom: 16 }}
              >
                <Space size={24}>
                  <Radio value="字数">字数</Radio>
                  <Radio value="段落">段落</Radio>
                </Space>
              </Radio.Group>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                  每N{config.splitMode === "字数" ? "字" : "段"}
                  抽取一次，最后合并结果建议范围：
                </span>
                <span
                  style={{ color: "#1677ff", fontSize: 12, fontWeight: 500 }}
                >
                  {config.splitMode === "字数" ? "100-3000字" : "1-50段"}
                </span>
              </div>
              <InputNumber
                min={config.splitMode === "字数" ? 100 : 1}
                max={config.splitMode === "字数" ? 3000 : 50}
                value={config.blockSize}
                onChange={(value) =>
                  setConfig({ ...config, blockSize: value || 1000 })
                }
                style={{ width: 140 }}
              />
            </div>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                color: "#262626",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <SettingOutlined style={{ color: "#1677ff" }} />
              二级配置
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                抽取颗粒度选择
                <span
                  style={{
                    color: "#999",
                    fontSize: 12,
                    marginLeft: 8,
                    marginBottom: 4,
                  }}
                >
                  选择抽取的颗粒度级别，支持粗颗粒度和细颗粒度两种模式
                </span>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <div
                    onClick={() =>
                      setConfig({ ...config, granularity: "粗颗粒度" })
                    }
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: `2px solid ${
                        config.granularity === "粗颗粒度"
                          ? "#1677ff"
                          : "#d9d9d9"
                      }`,
                      background:
                        config.granularity === "粗颗粒度"
                          ? "#e6f7ff"
                          : "#fafafa",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Radio
                      checked={config.granularity === "粗颗粒度"}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>
                      粗颗粒度
                    </span>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      推荐
                    </Tag>
                    <p
                      style={{
                        color: "#666",
                        fontSize: 12,
                        margin: "8px 0 0 0",
                      }}
                    >
                      抽取通用类别信息，如人物、地点、时间、机构等，适合大多数通用场景。
                    </p>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    onClick={() =>
                      setConfig({ ...config, granularity: "细颗粒度" })
                    }
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: `2px solid ${
                        config.granularity === "细颗粒度"
                          ? "#1677ff"
                          : "#d9d9d9"
                      }`,
                      background:
                        config.granularity === "细颗粒度"
                          ? "#e6f7ff"
                          : "#fafafa",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Radio
                      checked={config.granularity === "细颗粒度"}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>
                      细颗粒度
                    </span>
                    <p
                      style={{
                        color: "#666",
                        fontSize: 12,
                        margin: "8px 0 0 0",
                      }}
                    >
                      抽取详细类别信息，如职位、产品、数值、年龄等，适合专业领域的精细化抽取需求。
                    </p>
                  </div>
                </Col>
              </Row>
            </div>

            {config.granularity === "粗颗粒度" ? (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: "#fafafa",
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: "1px solid #e8e8e8",
                    }}
                  >
                    <Space align="center">
                      <span style={{ fontWeight: 500 }}>类别数量限制：</span>
                      <Button
                        shape="circle"
                        size="small"
                        onClick={() =>
                          setConfig({
                            ...config,
                            categoryLimit: Math.max(
                              1,
                              config.categoryLimit - 1,
                            ),
                          })
                        }
                        disabled={config.categoryLimit <= 0}
                      >
                        -
                      </Button>
                      <b style={{ minWidth: 28, textAlign: "center" }}>
                        {config.categoryLimit}
                      </b>
                      <Button
                        shape="circle"
                        size="small"
                        onClick={() =>
                          setConfig({
                            ...config,
                            categoryLimit: config.categoryLimit + 1,
                          })
                        }
                      >
                        +
                      </Button>
                      <span style={{ color: "#666", marginLeft: 4 }}>个</span>
                      <span style={{ color: "#1677ff", fontSize: 12 }}>
                        已选择 {config.categories.length} /{" "}
                        {config.categoryLimit} 个类别，还可添加{" "}
                        {Math.max(
                          0,
                          config.categoryLimit - config.categories.length,
                        )}{" "}
                        个
                      </span>
                    </Space>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    {/* <div
                      style={{
                        fontWeight: 500,
                        marginBottom: 12,
                        color: "#333",
                      }}
                    >
                      类别列表
                    </div> */}
                    <Checkbox.Group
                      style={{
                        width: "100%",
                      }}
                      value={config.categories}
                      onChange={(values) =>
                        setConfig({ ...config, categories: values as string[] })
                      }
                    >
                      <Row gutter={[8, 8]}>
                        {displayCategories.map((cat) => (
                          <Col span={3} key={cat}>
                            <div
                              style={{
                                padding: "8px 8px",
                                borderRadius: 4,
                                border: `1px solid ${
                                  config.categories.includes(cat)
                                    ? "#1677ff"
                                    : "#d9d9d9"
                                }`,
                                background: config.categories.includes(cat)
                                  ? "#e6f7ff"
                                  : "#fafafa",
                                transition: "all 0.2s ease",
                                textAlign: "center",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Checkbox value={cat}>{cat}</Checkbox>
                              {!defaultCategories.includes(cat) && (
                                <span
                                  style={{
                                    color: "#ff4d4f",
                                    cursor: "pointer",
                                    marginLeft: 2,
                                    fontSize: 14,
                                    fontWeight: "bold",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfig({
                                      ...config,
                                      categories: config.categories.filter(
                                        (c) => c !== cat,
                                      ),
                                    });
                                    setDisplayCategories(
                                      displayCategories.filter(
                                        (c) => c !== cat,
                                      ),
                                    );
                                  }}
                                >
                                  ×
                                </span>
                              )}
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {/* <div
                      style={{
                        marginBottom: 8,
                        color: "#333",
                        fontWeight: 500,
                      }}
                    >
                      添加新类别
                    </div> */}
                    {showCategoryInput ? (
                      <Input
                        autoFocus
                        placeholder="输入类别名称，多个用逗号分隔，每项最多5字"
                        value={customCategory}
                        onChange={(e) =>
                          setCustomCategory(e.target.value.slice(0, 5))
                        }
                        maxLength={5}
                        onPressEnter={() => {
                          if (customCategory.trim()) {
                            const newCategories = customCategory
                              .split(",")
                              .map((c) => c.trim().slice(0, 5))
                              .filter(
                                (c) =>
                                  c &&
                                  !config.categories.includes(c) &&
                                  config.categories.length <
                                    config.categoryLimit,
                              );
                            if (newCategories.length > 0) {
                              setConfig({
                                ...config,
                                categories: [
                                  ...config.categories,
                                  ...newCategories,
                                ],
                              });
                              setDisplayCategories([
                                ...displayCategories,
                                ...newCategories,
                              ]);
                              setCustomCategory("");
                            }
                            setShowCategoryInput(false);
                          }
                        }}
                        suffix={
                          <Space>
                            <Button
                              size="small"
                              type="text"
                              onClick={() => {
                                if (customCategory.trim()) {
                                  const newCategories = customCategory
                                    .split(",")
                                    .map((c) => c.trim().slice(0, 5))
                                    .filter(
                                      (c) =>
                                        c &&
                                        !config.categories.includes(c) &&
                                        config.categories.length <
                                          config.categoryLimit,
                                    );
                                  if (newCategories.length > 0) {
                                    setConfig({
                                      ...config,
                                      categories: [
                                        ...config.categories,
                                        ...newCategories,
                                      ],
                                    });
                                    setDisplayCategories([
                                      ...displayCategories,
                                      ...newCategories,
                                    ]);
                                    setCustomCategory("");
                                  }
                                }
                                setShowCategoryInput(false);
                              }}
                            >
                              确定
                            </Button>
                            <Button
                              size="small"
                              type="text"
                              onClick={() => {
                                setCustomCategory("");
                                setShowCategoryInput(false);
                              }}
                            >
                              取消
                            </Button>
                          </Space>
                        }
                        style={{ width: "100%" }}
                      />
                    ) : (
                      <Button
                        type="dashed"
                        style={{ width: "100%", height: 36 }}
                        onClick={() => setShowCategoryInput(true)}
                      >
                        + 添加新类别
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: "#fafafa",
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: "1px solid #e8e8e8",
                    }}
                  >
                    <Space align="center">
                      <span style={{ fontWeight: 500 }}>最少类别数量：</span>
                      <Button
                        shape="circle"
                        size="small"
                        onClick={() =>
                          setConfig({
                            ...config,
                            categoryLimit: Math.max(
                              1,
                              config.categoryLimit - 1,
                            ),
                          })
                        }
                        disabled={config.categoryLimit <= 1}
                      >
                        -
                      </Button>
                      <b style={{ minWidth: 28, textAlign: "center" }}>
                        {config.categoryLimit}
                      </b>
                      <Button
                        shape="circle"
                        size="small"
                        onClick={() =>
                          setConfig({
                            ...config,
                            categoryLimit: config.categoryLimit + 1,
                          })
                        }
                      >
                        +
                      </Button>
                      <span style={{ color: "#666", marginLeft: 4 }}>个</span>
                      <span style={{ color: "#1677ff", fontSize: 12 }}>
                        已选择 {config.categories.length} /{" "}
                        {config.categoryLimit} 个属性，还需添加{" "}
                        {Math.max(
                          0,
                          config.categoryLimit - config.categories.length,
                        )}{" "}
                        个
                      </span>
                    </Space>
                  </div>
                  <Tabs
                    defaultActiveKey="人物属性"
                    items={defaultCategoriesFine.map((group) => ({
                      key: group,
                      label: group,
                      children: (
                        <Checkbox.Group
                          style={{ width: "100%" }}
                          value={config.categories}
                          onChange={(values) => {
                            const currentItems =
                              group === "其他属性"
                                ? [
                                    ...fineGrainedProperties.其他属性,
                                    ...displayFineCategories,
                                  ]
                                : fineGrainedProperties[
                                    group as keyof typeof fineGrainedProperties
                                  ];
                            const others = config.categories.filter(
                              (c) => !currentItems.includes(c),
                            );
                            setConfig({
                              ...config,
                              categories: [...others, ...values],
                            });
                          }}
                        >
                          <Row gutter={[8, 8]}>
                            {(group === "其他属性"
                              ? [
                                  ...fineGrainedProperties[
                                    group as keyof typeof fineGrainedProperties
                                  ],
                                  ...displayFineCategories,
                                ]
                              : fineGrainedProperties[
                                  group as keyof typeof fineGrainedProperties
                                ]
                            ).map((prop) => (
                              <Col span={3} key={prop}>
                                <div
                                  style={{
                                    padding: "8px 8px",
                                    borderRadius: 4,
                                    border: `1px solid ${
                                      config.categories.includes(prop)
                                        ? "#1677ff"
                                        : "#d9d9d9"
                                    }`,
                                    background: config.categories.includes(prop)
                                      ? "#e6f7ff"
                                      : "#fafafa",
                                    transition: "all 0.2s ease",
                                    textAlign: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Checkbox value={prop}>{prop}</Checkbox>
                                  {displayFineCategories.includes(prop) && (
                                    <span
                                      style={{
                                        color: "#ff4d4f",
                                        cursor: "pointer",
                                        marginLeft: 2,
                                        fontSize: 14,
                                        fontWeight: "bold",
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfig({
                                          ...config,
                                          categories: config.categories.filter(
                                            (c) => c !== prop,
                                          ),
                                        });
                                        setDisplayFineCategories(
                                          displayFineCategories.filter(
                                            (c) => c !== prop,
                                          ),
                                        );
                                      }}
                                    >
                                      ×
                                    </span>
                                  )}
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </Checkbox.Group>
                      ),
                    }))}
                  />
                  <div style={{ marginTop: 16 }}>
                    {showFineInput ? (
                      <Input
                        autoFocus
                        placeholder="输入属性名称，多个用逗号分隔，每项最多5字"
                        value={fineCategoryInput}
                        onChange={(e) =>
                          setFineCategoryInput(e.target.value.slice(0, 5))
                        }
                        maxLength={5}
                        onPressEnter={() => {
                          if (fineCategoryInput.trim()) {
                            const newFineCategories = fineCategoryInput
                              .split(",")
                              .map((c) => c.trim().slice(0, 5))
                              .filter(
                                (c) => c && !config.categories.includes(c),
                              );
                            if (newFineCategories.length > 0) {
                              setConfig({
                                ...config,
                                categories: [
                                  ...config.categories,
                                  ...newFineCategories,
                                ],
                              });
                              setDisplayFineCategories([
                                ...displayFineCategories,
                                ...newFineCategories,
                              ]);
                              setFineCategoryInput("");
                            }
                            setShowFineInput(false);
                          }
                        }}
                        suffix={
                          <Space>
                            <Button
                              size="small"
                              type="text"
                              onClick={() => {
                                if (fineCategoryInput.trim()) {
                                  const newFineCategories = fineCategoryInput
                                    .split(",")
                                    .map((c) => c.trim().slice(0, 5))
                                    .filter(
                                      (c) =>
                                        c && !config.categories.includes(c),
                                    );
                                  if (newFineCategories.length > 0) {
                                    setConfig({
                                      ...config,
                                      categories: [
                                        ...config.categories,
                                        ...newFineCategories,
                                      ],
                                    });
                                    setDisplayFineCategories([
                                      ...displayFineCategories,
                                      ...newFineCategories,
                                    ]);
                                    setFineCategoryInput("");
                                  }
                                }
                                setShowFineInput(false);
                              }}
                            >
                              确定
                            </Button>
                            <Button
                              size="small"
                              type="text"
                              onClick={() => {
                                setFineCategoryInput("");
                                setShowFineInput(false);
                              }}
                            >
                              取消
                            </Button>
                          </Space>
                        }
                        style={{ width: "100%" }}
                      />
                    ) : (
                      <Button
                        type="dashed"
                        style={{ width: "100%", height: 36 }}
                        onClick={() => setShowFineInput(true)}
                      >
                        + 添加新类别
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                color: "#262626",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <SettingOutlined style={{ color: "#1677ff" }} />
              模型配置
            </div>
            <span
              style={{
                color: "#999",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              配置知识抽取使用的大模型及推理参数，适配不同的抽取精度需求
            </span>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#262626",
                  marginTop: 12,
                  marginBottom: 12,
                }}
              >
                选择模型
              </div>
              <Select
                value={config.model}
                onChange={(value) => setConfig({ ...config, model: value })}
                options={modelOptions}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#262626",
                  marginBottom: 12,
                }}
              >
                精度配置
              </div>
              <Radio.Group
                value={modelPrecision}
                onChange={(e) => setModelPrecision(e.target.value)}
                style={{ width: "100%" }}
              >
                <Row gutter={12} style={{ width: "100%" }}>
                  {modelPrecisionOptions.map((opt) => (
                    <Col key={opt.value} span={8}>
                      <Button
                        block
                        type={
                          modelPrecision === opt.value ? "primary" : "default"
                        }
                        onClick={() => setModelPrecision(opt.value)}
                        style={{ height: 40 }}
                      >
                        {opt.label}
                      </Button>
                    </Col>
                  ))}
                </Row>
              </Radio.Group>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#262626",
                  marginBottom: 16,
                }}
              >
                推理参数配置
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>温度 (Temperature)</span>
                    <Tooltip title="控制生成文本的随机性，值越高越随机">
                      <SettingOutlined
                        style={{ color: "#1890ff", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <Switch
                    size="small"
                    checked={tempEnabled}
                    onChange={(checked) => setTempEnabled(checked)}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={config.temperature}
                    onChange={(value) =>
                      setConfig({ ...config, temperature: value })
                    }
                    disabled={!tempEnabled}
                    styles={{
                      track: { backgroundColor: "#1677ff" },
                      rail: { backgroundColor: "#d9d9d9" },
                      handle: { borderColor: "#1677ff" },
                    }}
                  />
                </div>
                <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                  控制模型输出的创造性，较低值(0.0-0.3)产生确定性输出，较高值(0.7-1.0)产生多样化输出，建议范围：0.0-1.0
                </div>
                {tempEnabled && (
                  <InputNumber
                    min={0}
                    max={2}
                    step={0.1}
                    value={config.temperature}
                    onChange={(value) =>
                      setConfig({
                        ...config,
                        temperature: value || 0,
                      })
                    }
                    style={{ width: "100%", marginTop: 8 }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>Top P</span>
                    <Tooltip title="核采样参数，控制候选词的多样性">
                      <SettingOutlined
                        style={{ color: "#1890ff", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <Switch
                    size="small"
                    checked={topPEnabled}
                    onChange={(checked) => setTopPEnabled(checked)}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.topP}
                    onChange={(value) => setConfig({ ...config, topP: value })}
                    disabled={!topPEnabled}
                    styles={{
                      track: { backgroundColor: "#1677ff" },
                      rail: { backgroundColor: "#d9d9d9" },
                      handle: { borderColor: "#1677ff" },
                    }}
                  />
                </div>
                <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                  控制采样候选集大小，较低值只考虑最可能的词，较高值允许更多样性，建议范围：0.0-1.0
                </div>
                {topPEnabled && (
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.topP}
                    onChange={(value) =>
                      setConfig({
                        ...config,
                        topP: value || 0,
                      })
                    }
                    style={{ width: "100%", marginTop: 8 }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>
                      存在惩罚 (Presence Penalty)
                    </span>
                    <Tooltip title="减少重复词出现的概率">
                      <SettingOutlined
                        style={{ color: "#1890ff", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <Switch
                    size="small"
                    checked={presencePenaltyEnabled}
                    onChange={(checked) => setPresencePenaltyEnabled(checked)}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Slider
                    min={-2}
                    max={2}
                    step={0.1}
                    value={config.presencePenalty}
                    onChange={(value) =>
                      setConfig({ ...config, presencePenalty: value })
                    }
                    disabled={!presencePenaltyEnabled}
                    styles={{
                      track: { backgroundColor: "#1677ff" },
                      rail: { backgroundColor: "#d9d9d9" },
                      handle: { borderColor: "#1677ff" },
                    }}
                  />
                </div>
                <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                  决定对已出现token的惩罚程度，正值减少重复，负值允许更多重复，建议范围：-2.0
                  到 2.0
                </div>
                {presencePenaltyEnabled && (
                  <InputNumber
                    min={-2}
                    max={2}
                    step={0.1}
                    value={config.presencePenalty}
                    onChange={(value) =>
                      setConfig({
                        ...config,
                        presencePenalty: value || 0,
                      })
                    }
                    style={{ width: "100%", marginTop: 8 }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>
                      频率惩罚 (Frequency Penalty)
                    </span>
                    <Tooltip title="根据词频进一步惩罚重复">
                      <SettingOutlined
                        style={{ color: "#1890ff", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <Switch
                    size="small"
                    checked={frequencyPenaltyEnabled}
                    onChange={(checked) => setFrequencyPenaltyEnabled(checked)}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Slider
                    min={-2}
                    max={2}
                    step={0.1}
                    value={config.frequencyPenalty}
                    onChange={(value) =>
                      setConfig({ ...config, frequencyPenalty: value })
                    }
                    disabled={!frequencyPenaltyEnabled}
                    styles={{
                      track: { backgroundColor: "#1677ff" },
                      rail: { backgroundColor: "#d9d9d9" },
                      handle: { borderColor: "#1677ff" },
                    }}
                  />
                </div>
                <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                  根据词频应用惩罚，高频词受惩罚更大，正值减少高频词出现，建议范围：-2.0
                  到 2.0
                </div>
                {frequencyPenaltyEnabled && (
                  <InputNumber
                    min={-2}
                    max={2}
                    step={0.1}
                    value={config.frequencyPenalty}
                    onChange={(value) =>
                      setConfig({
                        ...config,
                        frequencyPenalty: value || 0,
                      })
                    }
                    style={{ width: "100%", marginTop: 8 }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>最大 Token 数</span>
                    <Tooltip title="限制生成内容的最大长度">
                      <SettingOutlined
                        style={{ color: "#1890ff", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <Switch
                    size="small"
                    checked={maxTokensEnabled}
                    onChange={(checked) => setMaxTokensEnabled(checked)}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Slider
                    min={128}
                    max={4096}
                    step={128}
                    value={config.maxTokens}
                    onChange={(value) =>
                      setConfig({ ...config, maxTokens: value })
                    }
                    disabled={!maxTokensEnabled}
                    styles={{
                      track: { backgroundColor: "#1677ff" },
                      rail: { backgroundColor: "#d9d9d9" },
                      handle: { borderColor: "#1677ff" },
                    }}
                  />
                </div>
                <div style={{ color: "#8c8c8c", fontSize: 12 }}>
                  限制单次生成的最大token数量，较短值控制成本，较长值提供更完整内容，建议范围：256-2048
                </div>
                {maxTokensEnabled && (
                  <InputNumber
                    min={128}
                    max={4096}
                    step={128}
                    value={config.maxTokens}
                    onChange={(value) =>
                      setConfig({
                        ...config,
                        maxTokens: value || 512,
                      })
                    }
                    style={{ width: "100%", marginTop: 8 }}
                  />
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={10}>
          <Card title="配置预览" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f0f5ff",
                  border: "1px solid #d6e4ff",
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "#1677ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AppstoreOutlined style={{ color: "#fff", fontSize: 16 }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        color: "#1677ff",
                        fontSize: 12,
                      }}
                    >
                      抽取模式
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#1f1f1f",
                      }}
                    >
                      {config.splitMode === "字数"
                        ? `按字数抽取，每${config.blockSize}字`
                        : `按段落抽取，每${config.blockSize}段`}
                    </div>
                  </div>
                </Space>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f0f5ff",
                  border: "1px solid #d6e4ff",
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "#1677ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TagOutlined style={{ color: "#fff", fontSize: 16 }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        color: "#1677ff",
                        fontSize: 12,
                      }}
                    >
                      适用标签
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#1f1f1f",
                      }}
                    >
                      {config.tags.join("、")}
                    </div>
                  </div>
                </Space>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f0f5ff",
                  border: "1px solid #d6e4ff",
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "#1677ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ClusterOutlined style={{ color: "#fff", fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        color: "#1677ff",
                        fontSize: 12,
                      }}
                    >
                      颗粒度级别
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#1f1f1f",
                      }}
                    >
                      {config.granularity}抽取
                    </div>
                    {config.granularity === "粗颗粒度" ? (
                      <div style={{ marginTop: 8 }}>
                        <Space wrap size={4}>
                          {config.categories.map((cat) => (
                            <Tag key={cat} color="blue" style={{ margin: 0 }}>
                              {cat}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        {Object.keys(fineGrainedProperties).map((category) => {
                          const props =
                            fineGrainedProperties[
                              category as keyof typeof fineGrainedProperties
                            ];
                          const selected = config.categories.filter((c) =>
                            (props as string[]).includes(c),
                          );
                          if (selected.length === 0) return null;
                          return (
                            <div key={category} style={{ marginBottom: 6 }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#595959",
                                  marginBottom: 2,
                                }}
                              >
                                {category}：
                              </div>
                              <Space wrap size={4}>
                                {selected.map((prop) => (
                                  <Tag
                                    key={prop}
                                    color="orange"
                                    style={{ margin: 0 }}
                                  >
                                    {prop}
                                  </Tag>
                                ))}
                              </Space>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Space>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f0f5ff",
                  border: "1px solid #d6e4ff",
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "#1677ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <RobotOutlined style={{ color: "#fff", fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        color: "#1677ff",
                        fontSize: 12,
                      }}
                    >
                      抽取模型 / 精度
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#1f1f1f",
                      }}
                    >
                      {config.model}
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        {modelPrecision}
                      </Tag>
                    </div>
                    {(tempEnabled ||
                      topPEnabled ||
                      presencePenaltyEnabled ||
                      frequencyPenaltyEnabled ||
                      maxTokensEnabled) && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#595959",
                            marginBottom: 4,
                            paddingBottom: 4,
                            borderBottom: "1px solid #e8e8e8",
                          }}
                        >
                          推理参数配置
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 6,
                            marginTop: 6,
                          }}
                        >
                          {tempEnabled && (
                            <div
                              style={{
                                padding: "4px 8px",
                                background: "#fff",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              温度：{config.temperature}
                            </div>
                          )}
                          {topPEnabled && (
                            <div
                              style={{
                                padding: "4px 8px",
                                background: "#fff",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              Top P：{config.topP}
                            </div>
                          )}
                          {presencePenaltyEnabled && (
                            <div
                              style={{
                                padding: "4px 8px",
                                background: "#fff",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              存在惩罚：{config.presencePenalty}
                            </div>
                          )}
                          {frequencyPenaltyEnabled && (
                            <div
                              style={{
                                padding: "4px 8px",
                                background: "#fff",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              频率惩罚：{config.frequencyPenalty}
                            </div>
                          )}
                          {maxTokensEnabled && (
                            <div
                              style={{
                                padding: "4px 8px",
                                background: "#fff",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              最大Token：{config.maxTokens}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Space>
              </div>
            </Space>

            <div style={{ marginTop: 16 }}>
              <Space
                align="center"
                style={{
                  marginBottom: 8,
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontWeight: 500 }}>提示词预览：</span>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={handleGeneratePrompt}
                >
                  生成提示词
                </Button>
              </Space>
              <pre style={styles.promptBox}>
                {generatedPrompt || samplePrompt}
              </pre>
            </div>
          </Card>

          <Card
            title={
              <Space>
                <PlayCircleOutlined />
                <span>测试效果</span>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <div>
                <div
                  style={{
                    fontWeight: 500,
                    marginBottom: 8,
                    color: "#595959",
                  }}
                >
                  输入测试文本
                </div>
                <Input.TextArea
                  placeholder="请输入测试文本内容，例如：2023年10月15日，张三代表阿里巴巴集团在杭州云栖大会上发布了新的AI大模型..."
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  rows={4}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontWeight: 500,
                    marginBottom: 8,
                    color: "#595959",
                  }}
                >
                  快速填充示例文本
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {sampleTexts.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => setTestText(item.text)}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        border: `1px solid ${
                          testText === item.text ? "#1677ff" : "#e8e8e8"
                        }`,
                        background:
                          testText === item.text ? "#e6f7ff" : "#fafafa",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: 12,
                          color: "#1677ff",
                          marginBottom: 4,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#595959",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f7f8fa",
                  border: "1px dashed #d9d9d9",
                }}
              >
                <Space align="center">
                  <span style={{ color: "#595959", fontSize: 12 }}>
                    当前模型：
                  </span>
                  <Tag color="blue">{config.model}</Tag>
                  <Tag color="orange">{modelPrecision}</Tag>
                  {/* <Tag>温度 {config.temperature}</Tag> */}
                </Space>
              </div>

              <Button
                type="primary"
                block
                icon={<ThunderboltOutlined />}
                onClick={handleExtract}
                loading={testLoading}
                style={{ height: 40, fontWeight: 500 }}
              >
                执行抽取
              </Button>

              <div>
                <div
                  style={{
                    fontWeight: 500,
                    marginBottom: 8,
                    color: "#595959",
                  }}
                >
                  抽取结果
                </div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "#f0f5ff",
                    border: "1px solid #d6e4ff",
                    marginBottom: 12,
                    minHeight: 80,
                  }}
                >
                  {extractResult ? (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        fontFamily: "monospace",
                      }}
                    >
                      {extractResult}
                    </pre>
                  ) : (
                    <span style={{ color: "#bfbfbf", fontSize: 13 }}>
                      点击执行抽取后显示结果...
                    </span>
                  )}
                </div>
              </div>

              <Button
                type="primary"
                block
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
                style={{ height: 44, fontSize: 15, fontWeight: 500 }}
              >
                保存配置
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  categoryTag: {
    padding: "2px 8px",
    background: "#f5f5f5",
    borderRadius: 4,
    fontSize: 12,
    color: "#666",
  },
  promptBox: {
    background: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 1.6,
    maxHeight: 200,
    overflow: "auto",
  },
  resultBox: {
    background: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.6,
  },
};
