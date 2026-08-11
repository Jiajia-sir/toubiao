'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { history, useSearchParams } from '@umijs/max';
import {
  createKnowledgeExtractConfig,
  getKnowledgeExtractConfigDetail,
  updateKnowledgeExtractConfig,
} from '@/services/biz/knowledge-extract-config';
import { addTag, getTagList, type TagItem } from '@/services/biz/tag';
import {
  getEntityTypeAttributeList,
  getEntityTypeList,
  type EntityTypeAttributeItem,
  type EntityTypeItem,
} from '@/services/biz/entity-type';
import EntityRelationGraph from '@/components/Graph/EntityRelationGraph';
import type { EntityGraphData } from '@/data/entityGraphMock';
import {
  buildKnowledgeExtractPrompt,
  extractEntityLlm,
  type ExtractEntityLlmResult,
} from '@/services/biz/graph';
import KnowledgeExtractSnapshotView from '@/components/KnowledgeExtractSnapshotView';
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
  Modal,
  Form,
  Spin,
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
  PlusOutlined,
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

interface ExtractPreviewEntity {
  name: string;
  type: string;
  description: string;
  entityId: string;
  attributes: Array<[string, string]>;
}

interface ExtractPreviewRelation {
  source: string;
  relation: string;
  target: string;
  evidence: string;
  sourceEntityId?: string;
  targetEntityId?: string;
}

interface ExtractPreviewResolution {
  mention: string;
  canonicalEntity: string;
  entityId: string;
}

interface ExtractPreviewData {
  entities: ExtractPreviewEntity[];
  relations: ExtractPreviewRelation[];
  resolutions: ExtractPreviewResolution[];
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
const tagColorOptions = [
  { label: '蓝色', value: '#1890ff' },
  { label: '绿色', value: '#52c41a' },
  { label: '黄色', value: '#faad14' },
  { label: '粉色', value: '#eb2f96' },
  { label: '青色', value: '#13c2c2' },
  { label: '紫色', value: '#722ed1' },
  { label: '橙色', value: '#fa541c' },
  { label: '红色', value: '#f5222d' },
];

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

interface ModelOption {
  label: ReactNode;
  value: number;
  modelName: string;
}

type TagFormValues = {
  tag: string;
  color: string;
};

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
  const snapshotKey = searchParams.get('snapshotKey');
  const snapshotPayload = snapshotKey ? window.sessionStorage.getItem(snapshotKey) : null;
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
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    maxTokens: 512,
  });
  const [testText, setTestText] = useState('');
  const [extractPreviewData, setExtractPreviewData] = useState<ExtractPreviewData | null>(null);
  const [extractGraphLabelMaxLength, setExtractGraphLabelMaxLength] = useState(16);
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
  const [promptBuilding, setPromptBuilding] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [tagForm] = Form.useForm<TagFormValues>();

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
    const normalizedFineAttributeIdsByType = Object.keys(fineAttributeIdsByType).reduce<
      Record<string, string[]>
    >((acc, key) => {
      acc[String(key)] = (fineAttributeIdsByType[key] || []).map(String);
      return acc;
    }, {});
    Object.keys(normalizedFineAttributeIdsByType).forEach((key) => {
      void loadAttributeOptions(String(key));
    });
    const coarseEntityTypeIds = (
      extractSchema?.coarseEntityTypeIds ||
      snapshot?.coarseEntityTypeIds ||
      []
    ).map(String);
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
      granularity: (detail?.granularity || snapshot?.granularity || prev.granularity) as
        '粗颗粒度' | '细颗粒度',
      model: detail?.modelName || snapshot?.modelName || prev.model,
      modelId: detail?.modelId
        ? Number(detail.modelId)
        : snapshot?.modelId
          ? Number(snapshot.modelId)
          : prev.modelId,
      categories: snapshot?.categories || prev.categories,
      coarseEntityTypeIds,
      fineAttributeIdsByType: normalizedFineAttributeIdsByType,
      categoryLimit: Number(
        extractSchema?.categoryLimit ?? snapshot?.categoryLimit ?? prev.categoryLimit,
      ),
      temperature: Number(detail?.temperature ?? snapshot?.temperature ?? prev.temperature),
      topP: Number(detail?.topP ?? snapshot?.topP ?? prev.topP),
      presencePenalty: Number(
        detail?.presencePenalty ?? snapshot?.presencePenalty ?? prev.presencePenalty,
      ),
      frequencyPenalty: Number(
        detail?.frequencyPenalty ?? snapshot?.frequencyPenalty ?? prev.frequencyPenalty,
      ),
      maxTokens: Number(detail?.maxTokens ?? snapshot?.maxTokens ?? prev.maxTokens),
    }));
    setModelPrecision(extractSchema?.modelPrecision || snapshot?.modelPrecision || '精确抽取');
    setTempEnabled(Boolean(detail?.temperatureEnabled ?? snapshot?.temperatureEnabled ?? true));
    setTopPEnabled(Boolean(detail?.topPEnabled ?? snapshot?.topPEnabled ?? true));
    setPresencePenaltyEnabled(
      Boolean(detail?.presencePenaltyEnabled ?? snapshot?.presencePenaltyEnabled ?? true),
    );
    setFrequencyPenaltyEnabled(
      Boolean(detail?.frequencyPenaltyEnabled ?? snapshot?.frequencyPenaltyEnabled ?? false),
    );
    setMaxTokensEnabled(Boolean(detail?.maxTokensEnabled ?? snapshot?.maxTokensEnabled ?? false));
    setGeneratedPrompt(String(detail?.generatedPrompt ?? snapshot?.generatedPrompt ?? ''));
    const firstTypeId = Object.keys(normalizedFineAttributeIdsByType)[0];
    if (firstTypeId) {
      setActiveFineEntityTypeId(firstTypeId);
    }
  };

  const hydrateSnapshotDetail = (snapshotPayload: any) => {
    hydrateTemplateDetail({
      data: {
        ...snapshotPayload,
        name:
          snapshotPayload?.configSnapshot?.name ??
          snapshotPayload?.template?.模板名称 ??
          snapshotPayload?.name,
        description:
          snapshotPayload?.configSnapshot?.description ??
          snapshotPayload?.template?.模板描述 ??
          snapshotPayload?.description,
        modelName:
          snapshotPayload?.configSnapshot?.modelName ??
          snapshotPayload?.template?.模型名称 ??
          snapshotPayload?.modelName,
        modelId:
          snapshotPayload?.configSnapshot?.modelId ??
          snapshotPayload?.template?.模型ID ??
          snapshotPayload?.modelId,
        tags: snapshotPayload?.tags ?? snapshotPayload?.configSnapshot?.tags ?? [],
        generatedPrompt:
          snapshotPayload?.configSnapshot?.generatedPrompt ?? snapshotPayload?.template?.提示词 ?? '',
        temperature:
          snapshotPayload?.configSnapshot?.temperature ?? snapshotPayload?.template?.temperature,
        topP: snapshotPayload?.configSnapshot?.topP ?? snapshotPayload?.template?.topP,
        presencePenalty:
          snapshotPayload?.configSnapshot?.presencePenalty ??
          snapshotPayload?.template?.presencePenalty,
        frequencyPenalty:
          snapshotPayload?.configSnapshot?.frequencyPenalty ??
          snapshotPayload?.template?.frequencyPenalty,
        maxTokens:
          snapshotPayload?.configSnapshot?.maxTokens ?? snapshotPayload?.template?.maxTokens,
        temperatureEnabled:
          snapshotPayload?.configSnapshot?.temperatureEnabled ??
          snapshotPayload?.template?.temperatureEnabled,
        topPEnabled:
          snapshotPayload?.configSnapshot?.topPEnabled ?? snapshotPayload?.template?.topPEnabled,
        presencePenaltyEnabled:
          snapshotPayload?.configSnapshot?.presencePenaltyEnabled ??
          snapshotPayload?.template?.presencePenaltyEnabled,
        frequencyPenaltyEnabled:
          snapshotPayload?.configSnapshot?.frequencyPenaltyEnabled ??
          snapshotPayload?.template?.frequencyPenaltyEnabled,
        maxTokensEnabled:
          snapshotPayload?.configSnapshot?.maxTokensEnabled ??
          snapshotPayload?.template?.maxTokensEnabled,
        extractSchema: snapshotPayload?.extractSchema,
        configSnapshot: snapshotPayload?.configSnapshot,
      },
    });
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
                    model:
                      options.find((option) => option.value === prev.modelId)?.modelName ||
                      prev.model,
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

  const handleAddTag = async () => {
    setTagSubmitting(true);
    try {
      const values = await tagForm.validateFields();
      const tagName = values.tag.trim();
      const res: any = await addTag({
        tag: tagName,
        color: values.color,
      });
      if (res?.code === 200) {
        message.success('新增标签成功');
        setTagModalVisible(false);
        tagForm.resetFields();
        await fetchTagOptions();
      } else {
        message.error(res?.msg || '新增标签失败');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTagSubmitting(false);
    }
  };

  const handleCloseTagModal = () => {
    setTagModalVisible(false);
    tagForm.resetFields();
  };

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
    if (!snapshotKey) {
      return;
    }

    setDetailLoading(true);
    try {
      const rawSnapshot = window.sessionStorage.getItem(snapshotKey);
      if (!rawSnapshot) {
        message.error('未找到知识抽取配置快照');
        return;
      }
      hydrateSnapshotDetail(JSON.parse(rawSnapshot));
    } catch (error) {
      console.error(error);
      message.error('加载知识抽取配置快照失败');
    } finally {
      setDetailLoading(false);
    }
  }, [snapshotKey]);

  useEffect(() => {
    const fetchTemplateDetail = async () => {
      if (!templateId || snapshotKey) {
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
  }, [snapshotKey, templateId]);

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

  const updateFineAttributeSelection = (entityTypeId: string, values: Array<string | number>) => {
    const currentIds = config.fineAttributeIdsByType[entityTypeId] || [];
    const otherCount = selectedFineAttributeCount - currentIds.length;
    const nextIds = values.map(String).slice(0, Math.max(0, config.categoryLimit - otherCount));
    setConfig({
      ...config,
      fineAttributeIdsByType: {
        ...config.fineAttributeIdsByType,
        [entityTypeId]: nextIds,
      },
    });
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

    const prompt = generatedPrompt.trim();
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

  const handleExtract = async () => {
    if (!testText.trim()) {
      message.warning('请输入测试文本');
      return;
    }
    if (!generatedPrompt.trim()) {
      message.warning('请先生成提示词');
      return;
    }

    setTestLoading(true);
    try {
      const prompt = generatedPrompt.trim();
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
      const modelParams = {
        id: config.id,
        name: config.name?.trim(),
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

      const res = await extractEntityLlm({
        input_text: testText.trim(),
        model_params: modelParams,
      });

      if (!res?.success) {
        message.error(res?.error?.message || '执行抽取失败');
        return;
      }
      if (!res?.data || typeof res.data !== 'object') {
        message.error('执行抽取失败');
        return;
      }

      const graphData = normalizeExtractGraphData(res.data);
      setExtractPreviewData(graphData);
      message.success('执行抽取成功');
    } catch (error) {
      console.error(error);
      message.error('执行抽取失败');
    } finally {
      setTestLoading(false);
    }
  };

  const handleGeneratePromptByApi = async () => {
    const isCoarse = config.granularity === '粗颗粒度';
    const isFine = config.granularity === '细颗粒度';

    if (isCoarse && config.coarseEntityTypeIds.length === 0) {
      message.warning('请先选择实体类型');
      return;
    }

    if (isFine && selectedFineAttributeCount === 0) {
      message.warning('请先选择实体属性');
      return;
    }

    const payload = {
      granularity: config.granularity,
      coarseEntityTypeIds: isCoarse ? config.coarseEntityTypeIds : [],
      fineAttributeIdsByType: isFine ? config.fineAttributeIdsByType : {},
    };

    setPromptBuilding(true);
    try {
      const res: any = await buildKnowledgeExtractPrompt(payload);
      if (!res?.success) {
        message.error(res?.error || '生成提示词失败');
        return;
      }

      if (typeof res?.data !== 'string' || !res.data) {
        message.error('生成提示词失败');
        return;
      }

      setGeneratedPrompt(res.data);
      message.success('已生成提示词，请查看提示词预览');
    } catch (error) {
      console.error(error);
      message.error('生成提示词失败');
    } finally {
      setPromptBuilding(false);
    }
  };

  const normalizeExtractGraphData = (
    parsed: ExtractEntityLlmResult | null | undefined,
  ): ExtractPreviewData => {
    const entities = Array.isArray(parsed?.entities) ? parsed.entities : [];
    const relations = Array.isArray(parsed?.relations)
      ? parsed.relations
      : Array.isArray(parsed?.relationships)
        ? parsed.relationships
        : [];
    const resolutions = Array.isArray(parsed?.resolutions) ? parsed.resolutions : [];

    return {
      entities: entities
        .map((item) => {
          const name = String(item?.name ?? '').trim();
          if (!name) return null;
          const attributes =
            item?.attributes && typeof item.attributes === 'object'
              ? Object.entries(item.attributes)
                  .filter(
                    ([key, value]) => key && value !== null && value !== undefined && value !== '',
                  )
                  .map(([key, value]) => [String(key), String(value)] as [string, string])
              : [];
          return {
            name,
            type: String(item?.type ?? '').trim() || '-',
            description: String(item?.description ?? '').trim() || '-',
            entityId: String(item?.entity_id ?? '').trim() || '-',
            attributes,
          };
        })
        .filter(Boolean) as ExtractPreviewEntity[],
      relations: relations
        .map((item) => {
          const source = String(item?.source ?? '').trim();
          const target = String(item?.target ?? '').trim();
          const sourceEntityId = String(item?.head_entity_id ?? '').trim();
          const targetEntityId = String(item?.tail_entity_id ?? '').trim();
          const relation = String(item?.relation ?? item?.relationCode ?? '').trim();
          if (!relation || (!source && !sourceEntityId) || (!target && !targetEntityId)) return null;
          return {
            source,
            relation,
            target,
            evidence: String(item?.evidence ?? '').trim() || '-',
            sourceEntityId: sourceEntityId || undefined,
            targetEntityId: targetEntityId || undefined,
          };
        })
        .filter(Boolean) as ExtractPreviewRelation[],
      resolutions: resolutions
        .map((item) => {
          const mention = String(item?.mention ?? '').trim();
          const canonicalEntity = String(item?.canonical_entity ?? '').trim();
          if (!mention || !canonicalEntity) return null;
          return {
            mention,
            canonicalEntity,
            entityId: String(item?.entity_id ?? '').trim() || '-',
          };
        })
        .filter(Boolean) as ExtractPreviewResolution[],
    };
  };

  const buildEntityRelationGraphData = (
    data: ExtractPreviewData | null | undefined,
  ): EntityGraphData => {
    if (!data || data.entities.length === 0) {
      return {
        centerId: 'empty-center',
        nodes: [],
        links: [],
      };
    }

    const relationDegreeMap = new Map<string, number>();
    data.entities.forEach((item) => relationDegreeMap.set(item.name, 0));
    data.relations.forEach((item) => {
      relationDegreeMap.set(item.source, (relationDegreeMap.get(item.source) || 0) + 1);
      relationDegreeMap.set(item.target, (relationDegreeMap.get(item.target) || 0) + 1);
    });
    data.resolutions.forEach((item) => {
      relationDegreeMap.set(
        item.canonicalEntity,
        (relationDegreeMap.get(item.canonicalEntity) || 0) + 1,
      );
    });

    const centerEntity =
      [...data.entities].sort((left, right) => {
        const degreeDiff =
          (relationDegreeMap.get(right.name) || 0) - (relationDegreeMap.get(left.name) || 0);
        if (degreeDiff !== 0) return degreeDiff;
        return left.name.length - right.name.length;
      })[0] || data.entities[0];

    const entityNodes = data.entities.map((entity) => ({
      id: `entity_${entity.entityId}_${entity.name}`,
      name: entity.name,
      type: entity.name === centerEntity.name ? ('center' as const) : ('entity' as const),
      desc: entity.description !== '-' ? entity.description : undefined,
      tag: entity.type && entity.type !== '-' ? [entity.type] : [],
      avp: [...entity.attributes],
      entityType: entity.type !== '-' ? entity.type : undefined,
      relationCount: relationDegreeMap.get(entity.name) || 0,
      branchId: centerEntity.name,
      depth: entity.name === centerEntity.name ? 0 : 1,
    }));

    const resolutionNodes = data.resolutions.map((item, index) => ({
      id: `resolution_${index}_${item.mention}`,
      name: item.mention,
      type: 'value' as const,
      desc: `指向 ${item.canonicalEntity}`,
      tag: ['消歧'],
      avp: [['规范实体', item.canonicalEntity]],
      parentId: `entity_${item.entityId}_${item.canonicalEntity}`,
      branchId: centerEntity.name,
      relationFromParent: '别名',
      depth: 2,
    }));

    const entityIdMap = new Map<string, string>();
    const entityNodeIdByEntityId = new Map<string, string>();
    entityNodes.forEach((node) => {
      entityIdMap.set(node.name, node.id);
      const originalEntityId = String(node.id).split('_')[1];
      if (originalEntityId) {
        entityNodeIdByEntityId.set(originalEntityId, node.id);
      }
    });

    const relationLinks = data.relations
      .map((relation) => {
        const source =
          (relation.sourceEntityId && entityNodeIdByEntityId.get(relation.sourceEntityId)) ||
          entityIdMap.get(relation.source);
        const target =
          (relation.targetEntityId && entityNodeIdByEntityId.get(relation.targetEntityId)) ||
          entityIdMap.get(relation.target);
        if (!source || !target) return null;
        return {
          source,
          target,
          relation: relation.relation,
        };
      })
      .filter(Boolean) as EntityGraphData['links'];

    const fallbackLinks =
      relationLinks.length > 0
        ? []
        : entityNodes
            .filter((node) => node.id !== entityIdMap.get(centerEntity.name))
            .map((node) => ({
              source: entityIdMap.get(centerEntity.name) || node.id,
              target: node.id,
              relation: '关联',
            }));

    const resolutionLinks = data.resolutions
      .map((item, index) => {
        const source = entityIdMap.get(item.canonicalEntity);
        const target = `resolution_${index}_${item.mention}`;
        if (!source) return null;
        return {
          source,
          target,
          relation: '别名',
        };
      })
      .filter(Boolean) as EntityGraphData['links'];

    return {
      centerId: entityIdMap.get(centerEntity.name) || entityNodes[0]?.id || 'empty-center',
      nodes: [...entityNodes, ...resolutionNodes],
      links: [...relationLinks, ...fallbackLinks, ...resolutionLinks],
    };
  };

  const extractEntityRelationGraphData = buildEntityRelationGraphData(extractPreviewData);

  if (snapshotKey && snapshotPayload) {
    return (
      <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
        <KnowledgeExtractSnapshotView snapshot={snapshotPayload} visible />
      </div>
    );
  }

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
                  placeholder="选择标签"
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
                {!isReadOnly && (
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      tagForm.setFieldsValue({
                        tag: '',
                        color: '#1890ff',
                      });
                      setTagModalVisible(true);
                    }}
                  >
                    新增标签
                  </Button>
                )}
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
                        已选择 {selectedCoarseEntityTypes.length} / {config.categoryLimit}{' '}
                        个类别，还可添加{' '}
                        {Math.max(0, config.categoryLimit - selectedCoarseEntityTypes.length)} 个
                      </span>
                    </Space>
                  </div>

                  <Checkbox.Group
                    style={{ width: '100%' }}
                    value={config.coarseEntityTypeIds}
                    onChange={(values) =>
                      updateCoarseEntityTypeIds(values as Array<string | number>)
                    }
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
                        已选择 {selectedFineAttributeCount} / {config.categoryLimit}{' '}
                        个属性，还可添加{' '}
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
                            <div
                              style={{ color: '#8c8c8c', textAlign: 'center', padding: '24px 0' }}
                            >
                              属性加载中...
                            </div>
                          ) : attributes.length === 0 ? (
                            <div
                              style={{ color: '#8c8c8c', textAlign: 'center', padding: '24px 0' }}
                            >
                              当前实体类型下暂无属性
                            </div>
                          ) : (
                            <Checkbox.Group
                              style={{ width: '100%' }}
                              value={selectedIds}
                              onChange={(values) =>
                                updateFineAttributeSelection(
                                  entityTypeId,
                                  values as Array<string | number>,
                                )
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
                    max={32768}
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
                  限制单次生成的最大token数量，较短值控制成本，较长值提供更完整内容，建议范围：256-32768
                </div>
                {maxTokensEnabled && (
                  <InputNumber
                    min={128}
                    max={32768}
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
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#f0f5ff',
                    border: '1px solid #d6e4ff',
                  }}
                >
                  <Space align="start">
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
              </Col>

              <Col span={12}>
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
              </Col>

              <Col span={12} style={{ display: 'flex' }}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: 12,
                    borderRadius: 8,
                    background: '#f0f5ff',
                    border: '1px solid #d6e4ff',
                    minHeight: 152,
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
              </Col>

              <Col span={12} style={{ display: 'flex' }}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: 12,
                    borderRadius: 8,
                    background: '#f0f5ff',
                    border: '1px solid #d6e4ff',
                    minHeight: 152,
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
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div>
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
                        </div>
                        {(tempEnabled ||
                          topPEnabled ||
                          presencePenaltyEnabled ||
                          frequencyPenaltyEnabled ||
                          maxTokensEnabled) && (
                          <div
                            style={{
                              marginTop: 0,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 6,
                              }}
                            >
                              {tempEnabled && (
                                <Tag color="orange" style={{ margin: 0 }}>
                                  温度：{config.temperature}
                                </Tag>
                              )}
                              {topPEnabled && (
                                <Tag color="orange" style={{ margin: 0 }}>
                                  Top P：{config.topP}
                                </Tag>
                              )}
                              {presencePenaltyEnabled && (
                                <Tag color="orange" style={{ margin: 0 }}>
                                  存在惩罚：{config.presencePenalty}
                                </Tag>
                              )}
                              {frequencyPenaltyEnabled && (
                                <Tag color="orange" style={{ margin: 0 }}>
                                  频率惩罚：{config.frequencyPenalty}
                                </Tag>
                              )}
                              {maxTokensEnabled && (
                                <Tag color="orange" style={{ margin: 0 }}>
                                  最大Token：{config.maxTokens}
                                </Tag>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Space>
                </div>
              </Col>
            </Row>

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
                  loading={promptBuilding}
                  onClick={handleGeneratePromptByApi}
                >
                  生成提示词
                </Button>
              </Space>
              <Input.TextArea
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                readOnly={isReadOnly}
                autoSize={{ minRows: 10, maxRows: 20 }}
                placeholder="请先完成实体类型或属性配置，然后点击“生成提示词”，系统会根据当前抽取粒度自动生成提示词。"
                styles={{
                  textarea: generatedPrompt ? styles.promptBox : styles.promptPlaceholderInput,
                }}
              />
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

              {/* <div style={{ marginTop: 12 }}>
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
              </div> */}

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
                    minHeight: 120,
                  }}
                >
                  {testLoading ? (
                    <div
                      style={{
                        height: '71vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 14,
                        background: '#f8fbff',
                        border: '1px solid #d6e4ff',
                      }}
                    >
                      <Spin size="large" tip="抽取结果生成中..." />
                    </div>
                  ) : extractPreviewData ? (
                    <div>
                      <div
                        style={{
                          marginBottom: 12,
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 260 }}>
                          <span style={{ color: '#334155', fontSize: 13 }}>文本长度</span>
                          <Slider
                            style={{ flex: 1, margin: 0 }}
                            min={2}
                            max={20}
                            step={1}
                            value={extractGraphLabelMaxLength}
                            onChange={setExtractGraphLabelMaxLength}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          marginBottom: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                          display: 'none',
                        }}
                      >
                        <div style={{ color: '#64748b', fontSize: 13 }}>
                          本次抽取共识别 {extractPreviewData.entities.length} 个实体，{' '}
                          {extractPreviewData.relations.length} 条关系，{' '}
                          {extractPreviewData.resolutions.length} 条消歧结果
                        </div>
                        <Space size={8} wrap>
                          <Tag color="blue">实体 {extractPreviewData.entities.length}</Tag>
                          <Tag color="cyan">关系 {extractPreviewData.relations.length}</Tag>
                          <Tag color="purple">消歧 {extractPreviewData.resolutions.length}</Tag>
                        </Space>
                      </div>
                      <div style={styles.extractPreviewWrap}>
                        <div style={styles.extractPreviewMain}>
                          <div style={styles.extractPanel}>
                            <div style={styles.extractPanelHeader}>
                              <Space align="center" size={8}>
                                <ClusterOutlined style={{ color: '#1677ff' }} />
                                <span style={styles.extractPanelTitle}>实体结果</span>
                              </Space>
                              <Tag color="blue">{extractPreviewData.entities.length}</Tag>
                            </div>
                            {extractPreviewData.entities.length > 0 ? (
                              <>
                                <div style={styles.graphWrap}>
                                  <EntityRelationGraph
                                    data={extractEntityRelationGraphData}
                                    height="71vh"
                                    labelMaxLength={extractGraphLabelMaxLength}
                                    renderHoverCard={(node) => {
                                      if (node.type === 'value') return null;
                                      const detailPairs = Array.isArray(node.avp) ? node.avp : [];
                                      return (
                                        <div
                                          style={{
                                            padding: 14,
                                            borderRadius: 12,
                                            background: 'rgba(255,255,255,0.96)',
                                            border: '1px solid #d6e4ff',
                                            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.16)',
                                            backdropFilter: 'blur(8px)',
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: 16,
                                              fontWeight: 600,
                                              color: '#1f2937',
                                              lineHeight: 1.5,
                                              marginBottom: 8,
                                            }}
                                          >
                                            {node.name}
                                          </div>
                                          <Space size={[8, 8]} wrap style={{ marginBottom: 10 }}>
                                            {node.entityType ? (
                                              <Tag color="blue">{node.entityType}</Tag>
                                            ) : null}
                                            {node.type === 'center' ? (
                                              <Tag color="gold">中心实体</Tag>
                                            ) : null}
                                          </Space>
                                          <div
                                            style={{
                                              fontSize: 13,
                                              color: '#475569',
                                              lineHeight: 1.75,
                                              marginBottom: detailPairs.length > 0 ? 10 : 0,
                                              whiteSpace: 'pre-wrap',
                                              wordBreak: 'break-word',
                                            }}
                                          >
                                            {node.desc || '暂无描述'}
                                          </div>
                                          {detailPairs.length > 0 ? (
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8,
                                              }}
                                            >
                                              {detailPairs.map(([key, value], index) => (
                                                <div
                                                  key={`${node.id}-${key}-${index}`}
                                                  style={{
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    background: '#f8fbff',
                                                    border: '1px solid #e5edff',
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      fontSize: 12,
                                                      color: '#1677ff',
                                                      fontWeight: 500,
                                                      marginBottom: 4,
                                                    }}
                                                  >
                                                    {key}
                                                  </div>
                                                  <div
                                                    style={{
                                                      fontSize: 13,
                                                      color: '#334155',
                                                      lineHeight: 1.6,
                                                      wordBreak: 'break-word',
                                                    }}
                                                  >
                                                    {value || '-'}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    }}
                                  />
                                </div>
                                <div style={styles.entityGrid}>
                                  {extractPreviewData.entities.map((entity) => (
                                    <div
                                      key={`${entity.entityId}-${entity.name}`}
                                      style={styles.entityCard}
                                    >
                                      <div style={styles.entityCardHeader}>
                                        <div style={styles.entityName}>{entity.name}</div>
                                        <Tag color="geekblue">{entity.type}</Tag>
                                      </div>
                                      <div style={styles.entityDesc}>{entity.description}</div>
                                      <div style={styles.entityMeta}>
                                        实体 ID：{entity.entityId}
                                      </div>
                                      <div style={styles.entityAttrWrap}>
                                        {entity.attributes.length > 0 ? (
                                          entity.attributes.map(([key, value]) => (
                                            <div
                                              key={`${entity.name}-${key}`}
                                              style={styles.entityAttrItem}
                                            >
                                              <span style={styles.entityAttrKey}>{key}</span>
                                              <span style={styles.entityAttrValue}>{value}</span>
                                            </div>
                                          ))
                                        ) : (
                                          <div style={styles.emptyTipInline}>暂无属性信息</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div style={styles.emptyBlock}>当前未抽取到实体</div>
                            )}
                          </div>
                          <div style={styles.extractPanel}>
                            <div style={styles.extractPanelHeader}>
                              <Space align="center" size={8}>
                                <BranchesOutlined style={{ color: '#13c2c2' }} />
                                <span style={styles.extractPanelTitle}>关系结果</span>
                              </Space>
                              <Tag color="cyan">{extractPreviewData.relations.length}</Tag>
                            </div>
                            {extractPreviewData.relations.length > 0 ? (
                              <div style={styles.relationList}>
                                {extractPreviewData.relations.map((relation, index) => (
                                  <div
                                    key={`${relation.source}-${relation.target}-${index}`}
                                    style={styles.relationItem}
                                  >
                                    <div style={styles.relationMain}>
                                      <span style={styles.relationNode}>{relation.source}</span>
                                      <Tag color="cyan">{relation.relation}</Tag>
                                      <span style={styles.relationNode}>{relation.target}</span>
                                    </div>
                                    <div style={styles.relationEvidence}>
                                      证据：{relation.evidence}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={styles.emptyBlock}>当前未抽取到关系</div>
                            )}
                          </div>
                        </div>
                        <div style={styles.extractPreviewSide}>
                          <div style={styles.extractPanel}>
                            <div style={styles.extractPanelHeader}>
                              <Space align="center" size={8}>
                                <AppstoreOutlined style={{ color: '#722ed1' }} />
                                <span style={styles.extractPanelTitle}>消歧结果</span>
                              </Space>
                              <Tag color="purple">{extractPreviewData.resolutions.length}</Tag>
                            </div>
                            {extractPreviewData.resolutions.length > 0 ? (
                              <div style={styles.resolutionList}>
                                {extractPreviewData.resolutions.map((item, index) => (
                                  <div
                                    key={`${item.mention}-${item.canonicalEntity}-${index}`}
                                    style={styles.resolutionItem}
                                  >
                                    <div style={styles.resolutionMention}>{item.mention}</div>
                                    <div style={styles.resolutionArrow}>指向</div>
                                    <div style={styles.resolutionCanonical}>
                                      {item.canonicalEntity}
                                    </div>
                                    <div style={styles.entityMeta}>实体 ID：{item.entityId}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={styles.emptyBlock}>当前未抽取到消歧结果</div>
                            )}
                          </div>
                          <div style={styles.extractPanel}>
                            <div style={styles.extractPanelHeader}>
                              <Space align="center" size={8}>
                                <FireOutlined style={{ color: '#fa8c16' }} />
                                <span style={styles.extractPanelTitle}>结果概览</span>
                              </Space>
                            </div>
                            <div style={styles.summaryList}>
                              <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>实体类型数</span>
                                <span style={styles.summaryValue}>
                                  {
                                    new Set(extractPreviewData.entities.map((item) => item.type))
                                      .size
                                  }
                                </span>
                              </div>
                              <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>含属性实体</span>
                                <span style={styles.summaryValue}>
                                  {
                                    extractPreviewData.entities.filter(
                                      (item) => item.attributes.length > 0,
                                    ).length
                                  }
                                </span>
                              </div>
                              <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>已识别关系</span>
                                <span style={styles.summaryValue}>
                                  {extractPreviewData.relations.length}
                                </span>
                              </div>
                              <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>已识别消歧</span>
                                <span style={styles.summaryValue}>
                                  {extractPreviewData.resolutions.length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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

      <Modal
        title="新增标签"
        open={tagModalVisible}
        onCancel={handleCloseTagModal}
        onOk={() => void handleAddTag()}
        confirmLoading={tagSubmitting}
        okText="确定"
        cancelText="取消"
        width={520}
      >
        <Form form={tagForm} layout="vertical" initialValues={{ color: '#1890ff' }}>
          <Form.Item
            name="tag"
            label="标签名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称" maxLength={30} />
          </Form.Item>
          <Form.Item name="color" label="标签颜色">
            <Radio.Group>
              {tagColorOptions.map((option) => (
                <Radio.Button key={option.value} value={option.value}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        background: option.value,
                      }}
                    />
                    {option.label}
                  </div>
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
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
    minHeight: 300,
    maxHeight: 300,
    background: 'linear-gradient(180deg, #f8fbff 0%, #f3f6fb 100%)',
    border: '1px solid #d9e6f7',
    boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
    padding: 16,
    borderRadius: 12,
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 1.75,
    color: '#1f2937',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    overflow: 'auto',
    margin: 0,
  },
  promptPlaceholderInput: {
    minHeight: 300,
    maxHeight: 300,
    padding: '24px 28px',
    borderRadius: 12,
    border: '1px dashed #c7d8ee',
    background: 'linear-gradient(180deg, #fbfdff 0%, #f4f8fd 100%)',
    fontSize: 14,
    lineHeight: 1.8,
    color: '#4b5563',
    resize: 'none' as const,
  },
  promptPlaceholder: {
    minHeight: 300,
    maxHeight: 300,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    gap: 12,
    padding: '24px 28px',
    borderRadius: 12,
    border: '1px dashed #c7d8ee',
    background: 'linear-gradient(180deg, #fbfdff 0%, #f4f8fd 100%)',
  },
  promptPlaceholderTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1d3557',
  },
  promptPlaceholderText: {
    fontSize: 14,
    lineHeight: 1.8,
    color: '#4b5563',
    maxWidth: 720,
  },
  promptPlaceholderTip: {
    fontSize: 13,
    lineHeight: 1.7,
    color: '#6b7280',
  },
  resultBox: {
    background: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.6,
  },
  extractPreviewWrap: {
    height: '71vh',
    display: 'block',
  },
  extractPreviewMain: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  extractPreviewSide: {
    display: 'none',
  },
  extractPanel: {
    minHeight: 0,
    flex: 1,
    padding: 0,
    borderRadius: 0,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  extractPanelHeader: {
    display: 'none',
  },
  extractPanelTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1f2937',
  },
  graphWrap: {
    height: '71vh',
    marginBottom: 0,
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid #d6e4ff',
    background: '#f8fbff',
  },
  entityGrid: {
    display: 'none',
  },
  entityCard: {
    padding: 14,
    borderRadius: 12,
    background: 'linear-gradient(180deg, #f8fbff 0%, #f3f8ff 100%)',
    border: '1px solid #d6e4ff',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  entityCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  entityName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1d3557',
    lineHeight: 1.5,
  },
  entityDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.7,
  },
  entityMeta: {
    fontSize: 12,
    color: '#94a3b8',
    wordBreak: 'break-all',
  },
  entityAttrWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  entityAttrItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '8px 10px',
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #e5edff',
  },
  entityAttrKey: {
    fontSize: 12,
    color: '#1677ff',
    fontWeight: 500,
  },
  entityAttrValue: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 1.6,
    wordBreak: 'break-word',
  },
  relationList: {
    display: 'none',
  },
  relationItem: {
    padding: 14,
    borderRadius: 12,
    background: '#f6fffe',
    border: '1px solid #d9f7ef',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  relationMain: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationNode: {
    padding: '4px 10px',
    borderRadius: 999,
    background: '#ffffff',
    border: '1px solid #b7eb8f',
    color: '#135200',
    fontSize: 13,
    lineHeight: 1.5,
  },
  relationEvidence: {
    fontSize: 13,
    lineHeight: 1.7,
    color: '#4b5563',
    wordBreak: 'break-word',
  },
  resolutionList: {
    display: 'none',
  },
  resolutionItem: {
    padding: 14,
    borderRadius: 12,
    background: '#faf5ff',
    border: '1px solid #ead5ff',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  resolutionMention: {
    fontSize: 13,
    color: '#722ed1',
    fontWeight: 500,
  },
  resolutionArrow: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  resolutionCanonical: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: 600,
    lineHeight: 1.6,
  },
  summaryList: {
    display: 'none',
  },
  summaryItem: {
    padding: 14,
    borderRadius: 12,
    background: 'linear-gradient(180deg, #fff7e6 0%, #fffaf0 100%)',
    border: '1px solid #ffe7ba',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#ad6800',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.2,
    color: '#d46b08',
  },
  emptyBlock: {
    display: 'none',
  },
  emptyTipInline: {
    fontSize: 12,
    color: '#8c8c8c',
  },
};
