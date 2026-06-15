import React from "react";
import {
  ApartmentOutlined,
  BranchesOutlined,
  DatabaseOutlined,
  RadarChartOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  SlidersOutlined,
} from "@ant-design/icons";

export type AblationPageKey = "entity" | "relation" | "attribute";

export interface FlowStep {
  title: string;
  summary: string;
  actions: string[];
}

export interface MetricCard {
  title: string;
  value: string;
  tone: string;
}

export interface StrategyTag {
  label: string;
  color: string;
}

export interface AblationPageConfig {
  key: AblationPageKey;
  title: string;
  icon: React.ReactNode;
  heroColor: string;
  heroBackground: string;
  intro: string;
  target: string;
  route: string;
  metrics: MetricCard[];
  strategyTags: StrategyTag[];
  flowSteps: FlowStep[];
  checks: string[];
}

export const ablationPageConfigs: AblationPageConfig[] = [
  {
    key: "entity",
    title: "实体消融",
    icon: <DatabaseOutlined />,
    heroColor: "#1677ff",
    heroBackground: "linear-gradient(135deg, #e6f4ff 0%, #f0f8ff 100%)",
    intro: "围绕实体识别、实体筛减、实体验证和结果回收构建完整消融流程。",
    target: "验证实体节点减少后对抽取覆盖率、知识库召回率和图谱节点规模的影响。",
    route: "/config-center/ablation/entity",
    metrics: [
      { title: "建议消融比例", value: "10% - 25%", tone: "#1677ff" },
      { title: "重点观测指标", value: "实体召回率", tone: "#52c41a" },
      { title: "推荐执行轮次", value: "3 轮", tone: "#fa8c16" },
    ],
    strategyTags: [
      { label: "随机抽样", color: "blue" },
      { label: "低置信度优先", color: "cyan" },
      { label: "类型分层", color: "geekblue" },
    ],
    flowSteps: [
      {
        title: "步骤 1：确定实体范围",
        summary: "先圈定本次参与消融的实体类型、数据批次和任务范围。",
        actions: [
          "选择实体类型，如人物、机构、疾病、设备等。",
          "限定数据范围，例如指定知识库、编目或近 7 天入库文档。",
          "确认是否排除核心实体，避免影响主链路验证。",
        ],
      },
      {
        title: "步骤 2：配置消融策略",
        summary: "根据实验目标选择随机、规则或优先级消融方式。",
        actions: [
          "随机消融适合做整体鲁棒性基线测试。",
          "规则消融适合验证某类实体缺失后的影响。",
          "优先级消融适合先清除低置信度实体，观察结果波动。",
        ],
      },
      {
        title: "步骤 3：执行实体筛减",
        summary: "对抽取结果执行实体过滤，并保留操作快照用于回滚。",
        actions: [
          "生成实体消融快照，记录原始实体总量和命中范围。",
          "按比例移除实体或将其标记为不参与构图。",
          "同步更新实体索引和候选检索池。",
        ],
      },
      {
        title: "步骤 4：观测效果并回收",
        summary: "观察召回、问答、构图变化，并决定是否回收配置。",
        actions: [
          "对比实体召回率、图谱节点数、检索命中数。",
          "记录关键问题样本是否出现答案缺失。",
          "实验完成后决定保留、扩大或撤销本轮消融策略。",
        ],
      },
    ],
    checks: [
      "是否已排除关键主实体，避免直接破坏主业务链路。",
      "是否保留了消融前快照，可随时回滚。",
      "是否同步观察问答、检索、构图三类结果，而不只看抽取数量。",
    ],
  },
  {
    key: "relation",
    title: "关系消融",
    icon: <BranchesOutlined />,
    heroColor: "#52c41a",
    heroBackground: "linear-gradient(135deg, #f6ffed 0%, #fcfff5 100%)",
    intro: "围绕关系边筛减、关系强度调整和图谱连通性验证设计完整流程。",
    target: "验证关系边减少后对图谱路径发现、推理结果和知识关联密度的影响。",
    route: "/config-center/ablation/relation",
    metrics: [
      { title: "建议消融比例", value: "15% - 30%", tone: "#52c41a" },
      { title: "重点观测指标", value: "路径可达率", tone: "#1677ff" },
      { title: "推荐执行轮次", value: "2 - 4 轮", tone: "#fa8c16" },
    ],
    strategyTags: [
      { label: "低权重关系优先", color: "green" },
      { label: "关系类型分层", color: "lime" },
      { label: "路径关键边保护", color: "cyan" },
    ],
    flowSteps: [
      {
        title: "步骤 1：识别关系集合",
        summary: "先识别参与消融的关系类型、方向和置信度分布。",
        actions: [
          "选定关系类型，如属于、合作、上下位、引用等。",
          "识别双向关系与单向关系，避免误删关键方向边。",
          "统计高频关系和低置信度关系的分布情况。",
        ],
      },
      {
        title: "步骤 2：设置关系消融规则",
        summary: "明确边删减方式和关键路径保护规则。",
        actions: [
          "按关系权重从低到高进行优先消融。",
          "对关键业务路径上的关系开启保护名单。",
          "对关系类型做比例分层，避免单类关系被完全清空。",
        ],
      },
      {
        title: "步骤 3：执行图谱边消融",
        summary: "正式对边集合执行消融，并记录图谱结构变化。",
        actions: [
          "生成关系快照，记录边总数和关系类型结构。",
          "执行删边或禁用边参与推理的策略。",
          "同步更新邻接信息、路径缓存和关联检索索引。",
        ],
      },
      {
        title: "步骤 4：验证连通性影响",
        summary: "验证图谱是否出现断链、推理缺边或关系稀疏化问题。",
        actions: [
          "对比关键节点之间的最短路径变化。",
          "检查问答场景中跨实体关联是否下降。",
          "评估是否需要恢复部分关键关系边。",
        ],
      },
    ],
    checks: [
      "是否为关键关系链配置了保护名单。",
      "是否同步刷新了图谱路径和检索缓存。",
      "是否重点观测跨实体问答和关联推荐而非只看边数量。",
    ],
  },
  {
    key: "attribute",
    title: "属性消融",
    icon: <ApartmentOutlined />,
    heroColor: "#fa8c16",
    heroBackground: "linear-gradient(135deg, #fff7e6 0%, #fffdf7 100%)",
    intro: "围绕属性字段收缩、索引裁剪和细粒度查询验证设计完整流程。",
    target: "验证属性字段减少后对排序质量、过滤能力和详情展示完整度的影响。",
    route: "/config-center/ablation/attribute",
    metrics: [
      { title: "建议消融比例", value: "5% - 20%", tone: "#fa8c16" },
      { title: "重点观测指标", value: "过滤命中率", tone: "#1677ff" },
      { title: "推荐执行轮次", value: "2 - 3 轮", tone: "#52c41a" },
    ],
    strategyTags: [
      { label: "低使用属性优先", color: "orange" },
      { label: "索引字段分层", color: "gold" },
      { label: "展示字段保护", color: "volcano" },
    ],
    flowSteps: [
      {
        title: "步骤 1：梳理属性清单",
        summary: "明确哪些属性参与索引、过滤、排序和展示。",
        actions: [
          "区分主属性、筛选属性、展示属性和推理属性。",
          "标记高频查询字段和关键详情字段。",
          "筛出低使用率、低价值属性作为优先消融对象。",
        ],
      },
      {
        title: "步骤 2：制定属性消融方案",
        summary: "按字段用途分层控制消融，避免页面直接失效。",
        actions: [
          "先从低频过滤字段和非核心展示字段开始消融。",
          "保留主标题、主标识、主时间等关键展示字段。",
          "按索引、排序、展示三类用途分别设置消融范围。",
        ],
      },
      {
        title: "步骤 3：执行属性裁剪",
        summary: "对属性索引、详情视图和查询条件同步裁剪。",
        actions: [
          "生成属性快照并记录字段使用频次。",
          "关闭属性参与索引、排序或前端展示。",
          "同步更新查询表单、详情页和聚合统计逻辑。",
        ],
      },
      {
        title: "步骤 4：验证查询质量",
        summary: "重点验证筛选能力、排序稳定性和详情页完整性。",
        actions: [
          "检查条件过滤命中率是否明显下降。",
          "对比排序结果是否出现异常抖动。",
          "确认详情页是否仍保留最低可用字段集。",
        ],
      },
    ],
    checks: [
      "是否保留了最小可用属性集合，保证详情页可读。",
      "是否同步更新前端筛选项和后端索引字段。",
      "是否重点验证过滤、排序、详情展示三个环节。",
    ],
  },
];

export const overviewCards = [
  {
    title: "入口编排",
    icon: <SettingOutlined />,
    description: "统一进入消融配置入口，再按实体、关系、属性拆分独立流程页执行。",
  },
  {
    title: "实验校验",
    icon: <SafetyCertificateOutlined />,
    description: "每个流程页都包含执行步骤、观测指标和检查项，便于按流程推进。",
  },
  {
    title: "效果观测",
    icon: <RadarChartOutlined />,
    description: "重点观察抽取覆盖率、图谱连通性和检索排序质量等核心结果。",
  },
  {
    title: "执行调度",
    icon: <SlidersOutlined />,
    description: "按页面拆分后可以分别挂载不同接口和不同权限，不再混在一个页面里。",
  },
  {
    title: "对比分析",
    icon: <SearchOutlined />,
    description: "便于单独记录每类消融的实验批次和前后效果对比。",
  },
];
