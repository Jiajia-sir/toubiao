'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { history, useSearchParams } from '@umijs/max';
import { createKnowledgeExtractConfig, getKnowledgeExtractConfigDetail, updateKnowledgeExtractConfig } from '@/services/biz/knowledge-extract-config';
import { getTagList, type TagItem } from '@/services/biz/tag';
import {
  getEntityTypeAttributeList,
  getEntityTypeList,
  type EntityTypeAttributeItem,
  type EntityTypeItem,
} from '@/services/biz/entity-type';
import { getLlmModelConfigList, type LlmModelConfigItem } from '@/services/biz/llm-model-config';
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
} from 'antd';
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
} from '@ant-design/icons';

interface KnowledgeExtractConfig {
  id?: string;
  name?: string;
  description?: string;
  enabled: '启用' | '停用';
  isBuiltin?: boolean;
  sortNo?: number;
  tags: string[];
  blockSize: number;
  splitMode: '字数' | '段落';
  granularity: '粗颗粒度' | '细颗粒度';
  model: string;
  modelId?: number;
  categories: string[];
  coarseEntityTypeIds: string[];
  fineAttributeIdsByType: Record<string, string[]>;
  categoryLimit: number;
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  maxTokens: number;
}

const defaultTagOptions = [
  { label: '新闻', value: '新闻' },
  { label: '公告', value: '公告' },
  { label: '政策', value: '政策' },
  { label: '金融', value: '金融' },
  { label: '医疗', value: '医疗' },
  { label: '法律', value: '法律' },
  { label: '科研', value: '科研' },
  { label: '技术', value: '技术' },
];

const defaultModelOptions: ModelOption[] = [];


const modelPrecisionOptions = [
  { label: '精确抽取', value: '精确抽取' },
  { label: '标准抽取', value: '标准抽取' },
  { label: '灵活匹配', value: '灵活匹配' },
];

const categoryLimitOptions = [
  { label: '5个', value: 5 },
  { label: '10个', value: 10 },
  { label: '15个', value: 15 },
  { label: '20个', value: 20 },
];

const samplePrompt = `你是专业的智能问答知识抽取专家，请根据配置的实体类型和实体属性完成知识抽取：
1. 粗颗粒度：按实体类型输出实体识别结果
2. 细颗粒度：按实体类型下的属性输出结构化信息
3. 要求：
- 严格基于原文抽取，不添加任何主观信息
- 缺失的类别需用"无"
- 输出结构化JSON格式`;

const sampleText =
  '2023年10月15日，张三代表阿里巴巴集团在杭州举办云栖大会上发布了新AI大模型该模型测试中超过了行业平均水平。';

const sampleTexts = [
  {
    label: '新闻',
    text: '2023年10月15日，张三代表阿里巴巴集团在杭州举办云栖大会上发布了新AI大模型，该模型测试中超过了行业平均水平。',
  },
  {
    label: '公告',
    text: '本公司于2023年11月1日发布公告称，因业务发展需要，现招聘JAVA开发工程师5名，要求本科以上学历，工作地点在北京，月薪20000-35000元。',
  },
  {
    label: '政策',
    text: '为贯彻落实国家关于促进中小企业发展的若干意见，北京市政府于2023年12月1日起实施新的税收优惠政策，符合条件的企业可享受增值税减免。',
  },
  {
    label: '金融',
    text: '中国工商银行宣布，从2024年1月1日起调整贷款利率，首套房贷款利率调整为4.1%，二套房为4.9%。',
  },
  {
    label: '医疗',
    text: '患者李某，男，45岁，因反复咳嗽伴发热3天于2023年12月1日入院，体温38.5℃，经检查诊断为肺炎。',
  },
];

const sampleResult = `人物：张三
机构：阿里巴巴集团
地点：杭州
时间：2023年10月15日
事件：云栖大会`;

interface ModelOption {
  label: ReactNode;
  value: number;
  modelName: string;
}

const normalizeModelOption = (item: LlmModelConfigItem): ModelOption => {
  const displayName = item.name || item.modelCode;
  const providerText = item.providerType ? String(item.providerType).toUpperCase() : 'MODEL';
  const iconColorMap: Record<string, string> = {
    vllm: '#1677ff',
    ollama: '#52c41a',
    sub2api: '#722ed1',
    openai: '#10a37f',
    claude: '#fa8c16',
  };
  const iconColor = iconColorMap[item.providerType] || '#1677ff';

  return {
    label: (
      <Space>
        <RobotOutlined style={{ color: iconColor }} />
        <span>{displayName}</span>
        {item.modelCode && item.modelCode !== displayName && (
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>({item.modelCode})</span>
        )}
        <Tag color="blue" style={{ marginInlineStart: 4 }}>
          {providerText}
        </Tag>
      </Space>
    ),
    value: Number(item.id),
    modelName: displayName,
  };
};

export default function KnowledgeExtractConfigPage() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('id');
  const mode = searchParams.get('mode');
  const isReadOnly = mode === 'view';
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [config, setConfig] = useState<KnowledgeExtractConfig>({
    name: '',
    description: '',
    enabled: '启用',
    isBuiltin: false,
    sortNo: 0,
    tags: [],
    blockSize: 1000,
    splitMode: '字数',
    granularity: '粗颗粒度',
    model: '',
    modelId: undefined,
    categories: [],
    coarseEntityTypeIds: [],
    fineAttributeIdsByType: {},
    categoryLimit: 10,
    temperature: 0.1,
    topP: 0.3,
    presencePenalty: 0.4,
    frequencyPenalty: 0.7,
    maxTokens: 512,
  });
  const [testText, setTestText] = useState('');
  const [extractResult, setExtractResult] = useState('');
  const [modelPrecision, setModelPrecision] = useState<string>('精确抽取');
  const [tempEnabled, setTempEnabled] = useState(true);
  const [topPEnabled, setTopPEnabled] = useState(true);
  const [presencePenaltyEnabled, setPresencePenaltyEnabled] = useState(true);
  const [frequencyPenaltyEnabled, setFrequencyPenaltyEnabled] = useState(false);
  const [maxTokensEnabled, setMaxTokensEnabled] = useState(false);
  const [tagOptions, setTagOptions] = useState(defaultTagOptions);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(defaultModelOptions);
  const [entityTypeOptions, setEntityTypeOptions] = useState<EntityTypeItem[]>([]);
  const [attributeOptionsMap, setAttributeOptionsMap] = useState<
    Record<string, EntityTypeAttributeItem[]>
  >({});
  const [attributeLoadingMap, setAttributeLoadingMap] = useState<Record<string, boolean>>({});
  const [activeFineEntityTypeId, setActiveFineEntityTypeId] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');

  const getSelectedModelName = () => {
    const option = modelOptions.find((item) => item.value === config.modelId);
    return option?.modelName || config.model || '未选择模型';
  };

  const hydrateTemplateDetail = (payload: any) => {
    const detail = payload?.data || payload;
    const snapshot = detail?.configSnapshot || {};
    const extractSchema = detail?.extractSchema || {};
    const fineAttributeIdsByType =
      extractSchema?.fineAttributeIdsByType || snapshot?.fineAttributeIdsByType || {};
    const normalizedFineAttributeIdsByType = Object.keys(fineAttributeIdsByType).reduce<Record<string, string[]>>(
      (acc, key) => {
        acc[String(key)] = (fineAttributeIdsByType[key] || []).map(String);
        return acc;
      },
      {},
    );
    Object.keys(normalizedFineAttributeIdsByType).forEach((key) => {
      void loadAttributeOptions(String(key));
    });
    const coarseEntityTypeIds = (extractSchema?.coarseEntityTypeIds || snapshot?.coarseEntityTypeIds || []).map(String);
    setConfig((prev) => ({
      ...prev,
      id: detail?.id ? String(detail.id) : prev.id,
      name: detail?.name || snapshot?.name || '',
      description: detail?.description || snapshot?.description || '',
      enabled: detail?.enabled || prev.enabled,
      isBuiltin: detail?.isBuiltin ?? prev.isBuiltin,
      sortNo: Number(detail?.sortNo ?? prev.sortNo ?? 0),
      tags: (detail?.tags || snapshot?.tags || []).map(String),
      blockSize: Number(detail?.blockSize ?? snapshot?.blockSize ?? prev.blockSize),
      splitMode: (detail?.splitMode || snapshot?.splitMode || prev.splitMode) as '字数' | '段落',
      granularity: (detail?.granularity || snapshot?.granularity || prev.granularity) as '粗颗粒度' | '细颗粒度',
      model: detail?.modelName || snapshot?.modelName || prev.model,
      modelId: detail?.modelId ? Number(detail.modelId) : snapshot?.modelId ? Number(snapshot.modelId) : prev.modelId,
      categories: snapshot?.categories || prev.categories,
      coarseEntityTypeIds,
      fineAttributeIdsByType: normalizedFineAttributeIdsByType,
      categoryLimit: Number(extractSchema?.categoryLimit ?? snapshot?.categoryLimit ?? prev.categoryLimit),
      temperature: Number(detail?.temperature ?? snapshot?.temperature ?? prev.temperature),
      topP: Number(detail?.topP ?? snapshot?.topP ?? prev.topP),
      presencePenalty: Number(detail?.presencePenalty ?? snapshot?.presencePenalty ?? prev.presencePenalty),
      frequencyPenalty: Number(detail?.frequencyPenalty ?? snapshot?.frequencyPenalty ?? prev.frequencyPenalty),
      maxTokens: Number(detail?.maxTokens ?? snapshot?.maxTokens ?? prev.maxTokens),
    }));
    setModelPrecision(extractSchema?.modelPrecision || snapshot?.modelPrecision || '精确抽取');
    setTempEnabled(Boolean(detail?.temperatureEnabled ?? snapshot?.temperatureEnabled ?? true));
    setTopPEnabled(Boolean(detail?.topPEnabled ?? snapshot?.topPEnabled ?? true));
    setPresencePenaltyEnabled(Boolean(detail?.presencePenaltyEnabled ?? snapshot?.presencePenaltyEnabled ?? true));
    setFrequencyPenaltyEnabled(Boolean(detail?.frequencyPenaltyEnabled ?? snapshot?.frequencyPenaltyEnabled ?? false));
    setMaxTokensEnabled(Boolean(detail?.maxTokensEnabled ?? snapshot?.maxTokensEnabled ?? false));
    setGeneratedPrompt(detail?.generatedPrompt || snapshot?.generatedPrompt || '');
    const firstTypeId = Object.keys(normalizedFineAttributeIdsByType)[0];
    if (firstTypeId) {
      setActiveFineEntityTypeId(firstTypeId);
    }
  };

  const extractList = <T,>(response: any): T[] => {
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response?.list)) {
      return response.list;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  };

  const normalizeEntityTypeItem = (item: any): EntityTypeItem => ({
    id: String(item?.id ?? ''),
    name: String(item?.name ?? ''),
    description: item?.description,
    enabled: item?.enabled,
    icon: item?.icon,
    color: item?.color,
    bgColor: item?.bgColor,
    entityCount: Number(item?.entityCount ?? 0),
    isSystem: Boolean(item?.isSystem),
    createTime: item?.createTime,
  });

  const normalizeEntityTypeAttributeItem = (item: any): EntityTypeAttributeItem => ({
    id: String(item?.id ?? ''),
    entityTypeConfigId: String(item?.entityTypeConfigId ?? item?.entityTypeId ?? ''),
    name: String(item?.name ?? ''),
    code: item?.code,
    dataType: item?.dataType ?? 'string',
    description: item?.description,
    createTime: item?.createTime,
  });

  const loadAttributeOptions = async (entityTypeId: string) => {
    if (!entityTypeId || attributeOptionsMap[entityTypeId]) {
      return;
    }
    setAttributeLoadingMap((prev) => ({ ...prev, [entityTypeId]: true }));
    try {
      const res: any = await getEntityTypeAttributeList(entityTypeId);
      if (res?.code === 200) {
        const options = extractList<any>(res).map(normalizeEntityTypeAttributeItem);
        setAttributeOptionsMap((prev) => ({ ...prev, [entityTypeId]: options }));
      } else {
        message.error(res?.msg || '获取实体属性列表失败');
        setAttributeOptionsMap((prev) => ({ ...prev, [entityTypeId]: [] }));
      }
    } catch (error) {
      console.error(error);
      message.error('获取实体属性列表失败');
      setAttributeOptionsMap((prev) => ({ ...prev, [entityTypeId]: [] }));
    } finally {
      setAttributeLoadingMap((prev) => ({ ...prev, [entityTypeId]: false }));
    }
  };

  useEffect(() => {
    const fetchTagOptions = async () => {
      try {
        const res: any = await getTagList();
        if (res?.code === 200) {
          const options = extractList<any>(res).map((item) => ({
            label: item.tag,
            value: item.tag,
          }));
          setTagOptions(options.length > 0 ? options : defaultTagOptions);
        } else {
          message.error(res?.msg || '获取标签列表失败');
          setTagOptions(defaultTagOptions);
        }
      } catch (error) {
        console.error(error);
        message.error('获取标签列表失败');
        setTagOptions(defaultTagOptions);
      }
    };

    const fetchEntityTypeOptions = async () => {
      try {
        const res: any = await getEntityTypeList();
        if (res?.code === 200) {
          const options = extractList<any>(res).map(normalizeEntityTypeItem);
          setEntityTypeOptions(options);
          if (options.length > 0) {
            setActiveFineEntityTypeId((prev) => prev || String(options[0].id));
          }
        } else {
          message.error(res?.msg || '获取实体类型列表失败');
          setEntityTypeOptions([]);
        }
      } catch (error) {
        console.error(error);
        message.error('获取实体类型列表失败');
        setEntityTypeOptions([]);
      }
    };

    const fetchModelOptions = async () => {
      try {
        const res: any = await getLlmModelConfigList();
        if (res?.code === 200) {
          const options = extractList<LlmModelConfigItem>(res)
            .filter((item) => Number(item?.enabled) === 1)
            .map(normalizeModelOption);
          if (options.length > 0) {
            setModelOptions(options);
            setConfig((prev) => {
              const exists = options.some((option) => option.value === prev.modelId);
              return exists
                ? {
                    ...prev,
                    model: options.find((option) => option.value === prev.modelId)?.modelName || prev.model,
                  }
                : { ...prev, modelId: options[0].value, model: options[0].modelName };
            });
          } else {
            setModelOptions(defaultModelOptions);
          }
        } else {
          message.error(res?.msg || '获取模型列表失败');
          setModelOptions(defaultModelOptions);
        }
      } catch (error) {
        console.error(error);
        message.error('获取模型列表失败');
        setModelOptions(defaultModelOptions);
      }
    };

    fetchTagOptions();
    fetchEntityTypeOptions();
    fetchModelOptions();
  }, []);

  useEffect(() => {
    if (!activeFineEntityTypeId && entityTypeOptions.length > 0) {
      setActiveFineEntityTypeId(String(entityTypeOptions[0].id));
    }
  }, [activeFineEntityTypeId, entityTypeOptions]);

  useEffect(() => {
    if (activeFineEntityTypeId) {
      void loadAttributeOptions(activeFineEntityTypeId);
    }
  }, [activeFineEntityTypeId]);

  useEffect(() => {
    const fetchTemplateDetail = async () => {
      if (!templateId) {
        return;
      }
      setDetailLoading(true);
      try {
        const res: any = await getKnowledgeExtractConfigDetail(templateId);
        hydrateTemplateDetail(res);
      } catch (error) {
        console.error(error);
        message.error('获取模板详情失败');
      } finally {
        setDetailLoading(false);
      }
    };
    void fetchTemplateDetail();
  }, [templateId]);

  const selectedCoarseEntityTypes = entityTypeOptions.filter((item) =>
    config.coarseEntityTypeIds.includes(String(item.id)),
  );

  const selectedFineAttributeGroups = entityTypeOptions
    .map((entityType) => {
      const entityTypeId = String(entityType.id);
      const selectedIds = config.fineAttributeIdsByType[entityTypeId] || [];
      const attributes = (attributeOptionsMap[entityTypeId] || []).filter((attribute) =>
        selectedIds.includes(String(attribute.id)),
      );
      return {
        entityType,
        entityTypeId,
        attributes,
      };
    })
    .filter((item) => item.attributes.length > 0);

  const selectedFineAttributeCount = selectedFineAttributeGroups.reduce(
    (sum, item) => sum + item.attributes.length,
    0,
  );

  const updateCoarseEntityTypeIds = (values: Array<string | number>) => {
    setConfig({
      ...config,
      coarseEntityTypeIds: values.map(String).slice(0, config.categoryLimit),
    });
  };

  const updateFineAttributeSelection = (
    entityTypeId: string,
    values: Array<string | number>,
  ) => {
    const currentIds = config.fineAttributeIdsByType[entityTypeId] || [];
    const otherCount = selectedFineAttributeCount - currentIds.length;
    const nextIds = values
      .map(String)
      .slice(0, Math.max(0, config.categoryLimit - otherCount));
    setConfig({
      ...config,
      fineAttributeIdsByType: {
        ...config.fineAttributeIdsByType,
        [entityTypeId]: nextIds,
      },
    });
  };

  const inferAttributeValue = (attributeName: string, text: string) => {
    if (attributeName.includes('性别')) {
      return text.match(/男|女/)?.[0] || '无';
    }
    if (attributeName.includes('年龄')) {
      return text.match(/\d+岁/)?.[0] || '无';
    }
    if (attributeName.includes('学历')) {
      return text.match(/本科|硕士|博士|大专/)?.[0] || '无';
    }
    if (attributeName.includes('时间') || attributeName.includes('日期')) {
      return text.match(/\d{4}年\d{1,2}月\d{1,2}日/)?.[0] || '无';
    }
    if (attributeName.includes('金额') || attributeName.includes('薪资')) {
      return text.match(/\d+(?:\.\d+)?(?:元|万|亿元|%)/)?.[0] || '无';
    }
    if (attributeName.includes('地点') || attributeName.includes('地址')) {
      return text.match(/北京|杭州|上海|广州|深圳/)?.[0] || '无';
    }
    return '示例值';
  };

  const handleSave = async () => {
    if (!config.name?.trim()) {
      message.error('请输入模板名称');
      return;
    }
    if (!config.modelId) {
      message.error('请选择模型');
      return;
    }
    if (config.tags.length === 0) {
      message.error('请至少选择一个适用标签');
      return;
    }
    if (config.granularity === '粗颗粒度' && config.coarseEntityTypeIds.length === 0) {
      message.error('粗颗粒度模式下请至少选择一个实体类型');
      return;
    }
    if (config.granularity === '细颗粒度' && selectedFineAttributeCount === 0) {
      message.error('细颗粒度模式下请至少选择一个实体属性');
      return;
    }

    const prompt = generatedPrompt || samplePrompt;
    const extractSchema = {
      granularity: config.granularity,
      categoryLimit: config.categoryLimit,
      modelPrecision,
      coarseEntityTypeIds: config.coarseEntityTypeIds,
      fineAttributeIdsByType: config.fineAttributeIdsByType,
    };
    const configSnapshot = {
      name: config.name,
      description: config.description,
      tags: config.tags,
      splitMode: config.splitMode,
      blockSize: config.blockSize,
      granularity: config.granularity,
      modelName: getSelectedModelName(),
      modelId: config.modelId,
      modelPrecision,
      categoryLimit: config.categoryLimit,
      categories: config.categories,
      coarseEntityTypeIds: config.coarseEntityTypeIds,
      fineAttributeIdsByType: config.fineAttributeIdsByType,
      generatedPrompt: prompt,
      temperatureEnabled: tempEnabled,
      temperature: config.temperature,
      topPEnabled,
      topP: config.topP,
      presencePenaltyEnabled,
      presencePenalty: config.presencePenalty,
      frequencyPenaltyEnabled,
      frequencyPenalty: config.frequencyPenalty,
      maxTokensEnabled,
      maxTokens: config.maxTokens,
    };

    if (isReadOnly) {
      return;
    }
    setLoading(true);
    try {
      const payload = {
        id: config.id,
        name: config.name.trim(),
        description: config.description?.trim() || '',
        enabled: config.enabled,
        isBuiltin: Boolean(config.isBuiltin),
        tags: config.tags,
        splitMode: config.splitMode,
        blockSize: config.blockSize,
        granularity: config.granularity,
        modelName: getSelectedModelName(),
        modelId: config.modelId,
        temperatureEnabled: tempEnabled,
        temperature: config.temperature,
        topPEnabled,
        topP: config.topP,
        presencePenaltyEnabled,
        presencePenalty: config.presencePenalty,
        frequencyPenaltyEnabled,
        frequencyPenalty: config.frequencyPenalty,
        maxTokensEnabled,
        maxTokens: config.maxTokens,
        generatedPrompt: prompt,
        extractSchema,
        configSnapshot,
        sortNo: Number(config.sortNo ?? 0),
      };
      const res: any = config.id
        ? await updateKnowledgeExtractConfig(payload)
        : await createKnowledgeExtractConfig(payload);
      if (res?.code === 200) {
        message.success(config.id ? '更新成功' : '保存成功');
        history.push('/config-center/knowledge-extract');
      } else {
        message.error(res?.msg || '保存失败');
      }
    } catch (error) {
      console.error(error);
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = () => {
    setTestLoading(true);
    setTimeout(() => {
      const text = testText;
      let result = '';

      if (config.granularity === '粗颗粒度') {
        const selectedNames = selectedCoarseEntityTypes.map((item) => item.name);
        result = `【${getSelectedModelName()} - ${modelPrecision}粗颗粒度抽取结果】\n`;
        if (selectedNames.length === 0) {
          result += '未选择实体类型';
        } else {
          result += `抽取实体类型：${selectedNames.join('、')}\n\n`;
          selectedNames.forEach((name) => {
            result += `${name}：示例${name}结果\n`;
          });
        }
      } else {
        result = `【${getSelectedModelName()} - ${modelPrecision}细颗粒度抽取结果】\n`;
        if (selectedFineAttributeGroups.length === 0) {
          result += '未选择实体属性';
        } else {
          selectedFineAttributeGroups.forEach(({ entityType, attributes }) => {
            result += `\n【${entityType.name}】\n`;
            attributes.forEach((attribute) => {
              result += `${attribute.name}：${inferAttributeValue(attribute.name, text)}\n`;
            });
          });
        }
      }

      setExtractResult(result.trim() || '暂无结果');
      setTestLoading(false);
    }, 1500);
  };

  const handleGeneratePrompt = () => {
    const granularity = config.granularity;
    const blockSize = config.blockSize;
    const splitMode = config.splitMode;
    const precision = modelPrecision;

    let prompt = `你是专业的知识抽取专家，请从文本中抽取知识实体。\n\n`;
    prompt += `【抽取模式】${splitMode === '字数' ? `每${blockSize}字抽取一次` : `每${blockSize}段抽取一次`}\n\n`;
    prompt += `【颗粒度】${granularity}\n\n`;
    prompt += `【精度模式】${precision}\n\n`;

    if (granularity === '粗颗粒度') {
      const categoryText = selectedCoarseEntityTypes.map((item) => item.name).join('、') || '未选择';
      prompt += `【抽取类别】${categoryText}\n\n`;
    } else {
      prompt += `【抽取类别】按以下实体类型及属性抽取：\n\n`;
      if (selectedFineAttributeGroups.length === 0) {
        prompt += `【未选择属性】请先选择实体类型属性\n`;
      } else {
        selectedFineAttributeGroups.forEach(({ entityType, attributes }) => {
          prompt += `【${entityType.name}】${attributes.map((item) => item.name).join('、')}\n`;
        });
      }
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
          padding: '20px 24px',
          background: 'linear-gradient(90deg, #1677ff 0%, #4096ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space align="center">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => history.go(-1)}
            style={{ color: '#fff' }}
          />
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: '#fff',
            }}
          >
            {isReadOnly ? '查看知识抽取配置' : config.id ? '编辑知识抽取配置' : '知识抽取配置'}
          </h2>
        </Space>
        <p
          style={{
            margin: 0,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 14,
          }}
        >
          配置知识抽取规则，支持一级基础配置和二级精细化配置，满足不同场景的抽取需求。
        </p>
      </div>

      <Row gutter={24} style={isReadOnly ? { pointerEvents: 'none', opacity: 0.92 } : undefined}>
        <Col span={14}>
          <Card loading={detailLoading} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ fontWeight: 500, fontSize: 14, color: '#333', marginBottom: 4 }}>
                  <span style={{ color: '#ff4d4f' }}>*</span> 模板名称
                </div>
                <Input
                  placeholder="请输入模板名称"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                />
              </Col>
              <Col span={12}>
                <div style={{ fontWeight: 500, fontSize: 14, color: '#333', marginBottom: 4 }}>
                  模板描述
                </div>
                <Input
                  placeholder="请输入模板描述"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                />
              </Col>
            </Row>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 500,
                fontSize: 14,
                color: '#333',
                marginBottom: 4,
              }}
            >
              <span style={{ color: '#ff4d4f' }}>*</span> 适用标签范围
            </div>
            <p style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 12 }}>
              配置该抽取规则适用的内容标签，仅匹配标签的内容才会执行抽取
            </p>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#fafafa',
                border: '1px solid #f0f0f0',
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
                  options={tagOptions.filter((tag) => !config.tags.includes(tag.value))}
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
                color: '#262626',
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <SettingOutlined style={{ color: '#1677ff' }} />
              一级配置
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: '#262626',
                marginBottom: 8,
              }}
            >
              每次抽取块大小
              <span
                style={{
                  color: '#8c8c8c',
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
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                background: '#fafafa',
                padding: 16,
              }}
            >
              <Radio.Group
                value={config.splitMode}
                onChange={(e) => setConfig({ ...config, splitMode: e.target.value })}
                style={{ marginBottom: 16 }}
              >
                <Space size={24}>
                  <Radio value="字数">字数</Radio>
                  <Radio value="段落">段落</Radio>
                </Space>
              </Radio.Group>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                  每N{config.splitMode === '字数' ? '字' : '段'}
                  抽取一次，最后合并结果建议范围：
                </span>
                <span style={{ color: '#1677ff', fontSize: 12, fontWeight: 500 }}>
                  {config.splitMode === '字数' ? '100-3000字' : '1-50段'}
                </span>
              </div>
              <InputNumber
                min={config.splitMode === '字数' ? 100 : 1}
                max={config.splitMode === '字数' ? 3000 : 50}
                value={config.blockSize}
                onChange={(value) => setConfig({ ...config, blockSize: value || 1000 })}
                style={{ width: 140 }}
              />
            </div>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                color: '#262626',
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <SettingOutlined style={{ color: '#1677ff' }} />
              二级配置
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                抽取颗粒度选择
                <span
                  style={{
                    color: '#999',
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
                    onClick={() => setConfig({ ...config, granularity: '粗颗粒度' })}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: `2px solid ${
                        config.granularity === '粗颗粒度' ? '#1677ff' : '#d9d9d9'
                      }`,
                      background: config.granularity === '粗颗粒度' ? '#e6f7ff' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Radio checked={config.granularity === '粗颗粒度'} style={{ marginRight: 8 }} />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>粗颗粒度</span>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      推荐
                    </Tag>
                    <p
                      style={{
                        color: '#666',
                        fontSize: 12,
                        margin: '8px 0 0 0',
                      }}
                    >
                      抽取通用类别信息，如人物、地点、时间、机构等，适合大多数通用场景。
                    </p>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    onClick={() => setConfig({ ...config, granularity: '细颗粒度' })}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: `2px solid ${
                        config.granularity === '细颗粒度' ? '#1677ff' : '#d9d9d9'
                      }`,
                      background: config.granularity === '细颗粒度' ? '#e6f7ff' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Radio checked={config.granularity === '细颗粒度'} style={{ marginRight: 8 }} />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>细颗粒度</span>
                    <p
                      style={{
                        color: '#666',
                        fontSize: 12,
                        margin: '8px 0 0 0',
                      }}
                    >
                      抽取详细类别信息，如职位、产品、数值、年龄等，适合专业领域的精细化抽取需求。
                    </p>
                  </div>
                </Col>
              </Row>
            </div>

            {config.granularity === '粗颗粒度' ? (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: '1px solid #e8e8e8',
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
                            categoryLimit: Math.max(1, config.categoryLimit - 1),
                          })
                        }
                        disabled={config.categoryLimit <= 1}
                      >
                        -
                      </Button>
                      <b style={{ minWidth: 28, textAlign: 'center' }}>{config.categoryLimit}</b>
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
                      <span style={{ color: '#666', marginLeft: 4 }}>个</span>
                      <span style={{ color: '#1677ff', fontSize: 12 }}>
                        已选择 {selectedCoarseEntityTypes.length} / {config.categoryLimit} 个类别，还可添加{' '}
                        {Math.max(0, config.categoryLimit - selectedCoarseEntityTypes.length)} 个
                      </span>
                    </Space>
                  </div>

                  <Checkbox.Group
                    style={{ width: '100%' }}
                    value={config.coarseEntityTypeIds}
                    onChange={(values) => updateCoarseEntityTypeIds(values as Array<string | number>)}
                  >
                    <Row gutter={[8, 8]}>
                      {entityTypeOptions.map((entityType) => {
                        const entityTypeId = String(entityType.id);
                        const checked = config.coarseEntityTypeIds.includes(entityTypeId);
                        return (
                          <Col span={6} key={entityTypeId}>
                            <div
                              style={{
                                padding: '8px 8px',
                                borderRadius: 4,
                                border: `1px solid ${checked ? '#1677ff' : '#d9d9d9'}`,
                                background: checked ? '#e6f7ff' : '#fafafa',
                                transition: 'all 0.2s ease',
                                textAlign: 'center',
                              }}
                            >
                              <Checkbox value={entityTypeId}>{entityType.name}</Checkbox>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </Checkbox.Group>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: '1px solid #e8e8e8',
                    }}
                  >
                    <Space align="center">
                      <span style={{ fontWeight: 500 }}>属性数量限制：</span>
                      <Button
                        shape="circle"
                        size="small"
                        onClick={() =>
                          setConfig({
                            ...config,
                            categoryLimit: Math.max(1, config.categoryLimit - 1),
                          })
                        }
                        disabled={config.categoryLimit <= 1}
                      >
                        -
                      </Button>
                      <b style={{ minWidth: 28, textAlign: 'center' }}>{config.categoryLimit}</b>
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
                      <span style={{ color: '#666', marginLeft: 4 }}>个</span>
                      <span style={{ color: '#1677ff', fontSize: 12 }}>
                        已选择 {selectedFineAttributeCount} / {config.categoryLimit} 个属性，还可添加{' '}
                        {Math.max(0, config.categoryLimit - selectedFineAttributeCount)} 个
                      </span>
                    </Space>
                  </div>

                  {entityTypeOptions.length === 0 ? (
                    <div style={{ color: '#8c8c8c', textAlign: 'center', padding: '24px 0' }}>
                      暂无实体类型数据
                    </div>
                  ) : (
                    <Tabs
                      activeKey={activeFineEntityTypeId || String(entityTypeOptions[0]?.id || '')}
                      onChange={(key) => {
                        const entityTypeId = String(key);
                        setActiveFineEntityTypeId(entityTypeId);
                        void loadAttributeOptions(entityTypeId);
                      }}
                      items={entityTypeOptions.map((entityType) => {
                        const entityTypeId = String(entityType.id);
                        const selectedIds = config.fineAttributeIdsByType[entityTypeId] || [];
                        const attributes = attributeOptionsMap[entityTypeId] || [];
                        const isLoading = attributeLoadingMap[entityTypeId];
                        return {
                          key: entityTypeId,
                          label: entityType.name,
                          children: isLoading ? (
                            <div style={{ color: '#8c8c8c', textAlign: 'center', padding: '24px 0' }}>
                              属性加载中...
                            </div>
                          ) : attributes.length === 0 ? (
                            <div style={{ color: '#8c8c8c', textAlign: 'center', padding: '24px 0' }}>
                              当前实体类型下暂无属性
                            </div>
                          ) : (
                            <Checkbox.Group
                              style={{ width: '100%' }}
                              value={selectedIds}
                              onChange={(values) =>
                                updateFineAttributeSelection(entityTypeId, values as Array<string | number>)
                              }
                            >
                              <Row gutter={[8, 8]}>
                                {attributes.map((attribute) => {
                                  const attributeId = String(attribute.id);
                                  const checked = selectedIds.includes(attributeId);
                                  return (
                                    <Col span={6} key={attributeId}>
                                      <div
                                        style={{
                                          padding: '8px 8px',
                                          borderRadius: 4,
                                          border: `1px solid ${checked ? '#1677ff' : '#d9d9d9'}`,
                                          background: checked ? '#e6f7ff' : '#fafafa',
                                          transition: 'all 0.2s ease',
                                          textAlign: 'center',
                                        }}
                                      >
                                        <Checkbox value={attributeId}>{attribute.name}</Checkbox>
                                      </div>
                                    </Col>
                                  );
                                })}
                              </Row>
                            </Checkbox.Group>
                          ),
                        };
                      })}
                    />
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                color: '#262626',
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <SettingOutlined style={{ color: '#1677ff' }} />
              模型配置
            </div>
            <span
              style={{
                color: '#999',
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
                  color: '#262626',
                  marginTop: 12,
                  marginBottom: 12,
                }}
              >
                选择模型
              </div>
              <Select
                value={config.modelId}
                onChange={(value) => {
                  const option = modelOptions.find((item) => item.value === value);
                  setConfig({ ...config, modelId: value, model: option?.modelName || '' });
                }}
                options={modelOptions}
                placeholder="请选择模型"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#262626',
                  marginBottom: 12,
                }}
              >
                精度配置
              </div>
              <Radio.Group
                value={modelPrecision}
                onChange={(e) => setModelPrecision(e.target.value)}
                style={{ width: '100%' }}
              >
                <Row gutter={12} style={{ width: '100%' }}>
                  {modelPrecisionOptions.map((opt) => (
                    <Col key={opt.value} span={8}>
                      <Button
                        block
                        type={modelPrecision === opt.value ? 'primary' : 'default'}
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
                  color: '#262626',
                  marginBottom: 16,
                }}
              >
                推理参数配置
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>温度 (Temperature)</span>
                    <Tooltip title="控制生成文本的随机性，值越高越随机">
                      <SettingOutlined style={{ color: '#1890ff', cursor: 'help' }} />
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
                    onChange={(value) => setConfig({ ...config, temperature: value })}
                    disabled={!tempEnabled}
                    styles={{
                      track: { backgroundColor: '#1677ff' },
                      rail: { backgroundColor: '#d9d9d9' },
                      handle: { borderColor: '#1677ff' },
                    }}
                  />
                </div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>
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
                    style={{ width: '100%', marginTop: 8 }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>Top P</span>
                    <Tooltip title="核采样参数，控制候选词的多样性">
                      <SettingOutlined style={{ color: '#1890ff', cursor: 'help' }} />
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
                      track: { backgroundColor: '#1677ff' },
                      rail: { backgroundColor: '#d9d9d9' },
                      handle: { borderColor: '#1677ff' },
                    }}
                  />
                </div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>
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
                    style={{ width: '100%', marginTop: 8 }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>存在惩罚 (Presence Penalty)</span>
                    <Tooltip title="减少重复词出现的概率">
                      <SettingOutlined style={{ color: '#1890ff', cursor: 'help' }} />
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
                    onChange={(value) => setConfig({ ...config, presencePenalty: value })}
                    disabled={!presencePenaltyEnabled}
                    styles={{
                      track: { backgroundColor: '#1677ff' },
                      rail: { backgroundColor: '#d9d9d9' },
                      handle: { borderColor: '#1677ff' },
                    }}
                  />
                </div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                  决定对已出现token的惩罚程度，正值减少重复，负值允许更多重复，建议范围：-2.0 到 2.0
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
                    style={{ width: '100%', marginTop: 8 }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>频率惩罚 (Frequency Penalty)</span>
                    <Tooltip title="根据词频进一步惩罚重复">
                      <SettingOutlined style={{ color: '#1890ff', cursor: 'help' }} />
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
                    onChange={(value) => setConfig({ ...config, frequencyPenalty: value })}
                    disabled={!frequencyPenaltyEnabled}
                    styles={{
                      track: { backgroundColor: '#1677ff' },
                      rail: { backgroundColor: '#d9d9d9' },
                      handle: { borderColor: '#1677ff' },
                    }}
                  />
                </div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                  根据词频应用惩罚，高频词受惩罚更大，正值减少高频词出现，建议范围：-2.0 到 2.0
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
                    style={{ width: '100%', marginTop: 8 }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <span style={{ fontWeight: 500 }}>最大 Token 数</span>
                    <Tooltip title="限制生成内容的最大长度">
                      <SettingOutlined style={{ color: '#1890ff', cursor: 'help' }} />
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
                    onChange={(value) => setConfig({ ...config, maxTokens: value })}
                    disabled={!maxTokensEnabled}
                    styles={{
                      track: { backgroundColor: '#1677ff' },
                      rail: { backgroundColor: '#d9d9d9' },
                      handle: { borderColor: '#1677ff' },
                    }}
                  />
                </div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>
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
                    style={{ width: '100%', marginTop: 8 }}
                  />
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={10}>
          <Card title="配置预览" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: '#f0f5ff',
                  border: '1px solid #d6e4ff',
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#1677ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppstoreOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        color: '#1677ff',
                        fontSize: 12,
                      }}
                    >
                      抽取模式
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: '#1f1f1f',
                      }}
                    >
                      {config.splitMode === '字数'
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
                  background: '#f0f5ff',
                  border: '1px solid #d6e4ff',
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#1677ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TagOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        color: '#1677ff',
                        fontSize: 12,
                      }}
                    >
                      适用标签
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: '#1f1f1f',
                      }}
                    >
                      {config.tags.join('、')}
                    </div>
                  </div>
                </Space>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: '#f0f5ff',
                  border: '1px solid #d6e4ff',
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#1677ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ClusterOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        color: '#1677ff',
                        fontSize: 12,
                      }}
                    >
                      颗粒度级别
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: '#1f1f1f',
                      }}
                    >
                      {config.granularity}抽取
                    </div>
                    {config.granularity === '粗颗粒度' ? (
                      <div style={{ marginTop: 8 }}>
                        {selectedCoarseEntityTypes.length > 0 ? (
                          <Space wrap size={4}>
                            {selectedCoarseEntityTypes.map((entityType) => (
                              <Tag key={entityType.id} color="blue" style={{ margin: 0 }}>
                                {entityType.name}
                              </Tag>
                            ))}
                          </Space>
                        ) : (
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>未选择实体类型</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        {selectedFineAttributeGroups.length > 0 ? (
                          selectedFineAttributeGroups.map(({ entityType, attributes }) => (
                            <div key={entityType.id} style={{ marginBottom: 6 }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#595959',
                                  marginBottom: 2,
                                }}
                              >
                                {entityType.name}：
                              </div>
                              <Space wrap size={4}>
                                {attributes.map((attribute) => (
                                  <Tag key={attribute.id} color="orange" style={{ margin: 0 }}>
                                    {attribute.name}
                                  </Tag>
                                ))}
                              </Space>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>未选择实体属性</div>
                        )}
                      </div>
                    )}
                  </div>
                </Space>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: '#f0f5ff',
                  border: '1px solid #d6e4ff',
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#1677ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        color: '#1677ff',
                        fontSize: 12,
                      }}
                    >
                      抽取模型 / 精度
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: '#1f1f1f',
                      }}
                    >
                      {getSelectedModelName()}
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
                            color: '#595959',
                            marginBottom: 4,
                            paddingBottom: 4,
                            borderBottom: '1px solid #e8e8e8',
                          }}
                        >
                          推理参数配置
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 6,
                            marginTop: 6,
                          }}
                        >
                          {tempEnabled && (
                            <div
                              style={{
                                padding: '4px 8px',
                                background: '#fff',
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
                                padding: '4px 8px',
                                background: '#fff',
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
                                padding: '4px 8px',
                                background: '#fff',
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
                                padding: '4px 8px',
                                background: '#fff',
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
                                padding: '4px 8px',
                                background: '#fff',
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
                  width: '100%',
                  justifyContent: 'space-between',
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
              <pre style={styles.promptBox}>{generatedPrompt || samplePrompt}</pre>
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
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <div
                  style={{
                    fontWeight: 500,
                    marginBottom: 8,
                    color: '#595959',
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
                    color: '#595959',
                  }}
                >
                  快速填充示例文本
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
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
                        border: `1px solid ${testText === item.text ? '#1677ff' : '#e8e8e8'}`,
                        background: testText === item.text ? '#e6f7ff' : '#fafafa',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: 12,
                          color: '#1677ff',
                          marginBottom: 4,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#595959',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
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
                  background: '#f7f8fa',
                  border: '1px dashed #d9d9d9',
                }}
              >
                <Space align="center">
                  <span style={{ color: '#595959', fontSize: 12 }}>当前模型：</span>
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
                    color: '#595959',
                  }}
                >
                  抽取结果
                </div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#f0f5ff',
                    border: '1px solid #d6e4ff',
                    marginBottom: 12,
                    minHeight: 80,
                  }}
                >
                  {extractResult ? (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                      }}
                    >
                      {extractResult}
                    </pre>
                  ) : (
                    <span style={{ color: '#bfbfbf', fontSize: 13 }}>
                      点击执行抽取后显示结果...
                    </span>
                  )}
                </div>
              </div>

              {!isReadOnly && (
              <Button
                type="primary"
                block
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
                style={{ height: 44, fontSize: 15, fontWeight: 500 }}
              >
                {config.id ? '更新配置' : '保存配置'}
              </Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  categoryTag: {
    padding: '2px 8px',
    background: '#f5f5f5',
    borderRadius: 4,
    fontSize: 12,
    color: '#666',
  },
  promptBox: {
    background: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 1.6,
    maxHeight: 200,
    overflow: 'auto',
  },
  resultBox: {
    background: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.6,
  },
};












