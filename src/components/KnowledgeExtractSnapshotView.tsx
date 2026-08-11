'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ClusterOutlined,
  RobotOutlined,
  SettingOutlined,
  TagOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Card, Col, Empty, Row, Space, Spin, Tag, Typography } from 'antd';
import {
  getEntityTypeAttributeList,
  getEntityTypeList,
  type EntityTypeAttributeItem,
  type EntityTypeItem,
} from '@/services/biz/entity-type';

const { Paragraph, Text } = Typography;

type SnapshotObject = Record<string, any>;

type KnowledgeExtractSnapshotViewProps = {
  snapshot?: string | SnapshotObject | null;
  visible?: boolean;
};

type NormalizedSnapshot = {
  name: string;
  description: string;
  tags: string[];
  modelName: string;
  modelId?: number;
  granularity: string;
  splitMode: string;
  blockSize?: number;
  categoryLimit?: number;
  modelPrecision: string;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  generatedPrompt: string;
  coarseEntityTypeIds: string[];
  fineAttributeIdsByType: Record<string, string[]>;
};

type DisplayItem = {
  id: string;
  name: string;
  deleted?: boolean;
};

const normalizeString = (value: any, fallback = '-') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const normalizeNumber = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const ensureStringList = (value: any): string[] => {
  if (!Array.isArray(value)) {
    return value === undefined || value === null || value === '' ? [] : [String(value)];
  }
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
};

const parseSnapshot = (
  snapshot?: string | SnapshotObject | null,
): { data: NormalizedSnapshot | null; error: string } => {
  if (!snapshot) {
    return { data: null, error: '' };
  }

  try {
    const parsed =
      typeof snapshot === 'string'
        ? (JSON.parse(snapshot) as SnapshotObject)
        : (snapshot as SnapshotObject);
    const configSnapshot = parsed?.configSnapshot || {};
    const template = parsed?.template || {};
    const extractSchema = parsed?.extractSchema || {};

    return {
      data: {
        name: normalizeString(configSnapshot?.name ?? template?.模板名称 ?? template?.name, '未命名模板'),
        description: normalizeString(
          configSnapshot?.description ?? template?.模板描述 ?? template?.description,
          '暂无描述',
        ),
        tags: ensureStringList(parsed?.tags ?? configSnapshot?.tags),
        modelName: normalizeString(
          configSnapshot?.modelName ??
            template?.模型名称 ??
            configSnapshot?.model ??
            template?.model,
          '-',
        ),
        modelId: normalizeNumber(configSnapshot?.modelId ?? template?.模型ID),
        granularity: normalizeString(
          configSnapshot?.granularity ?? extractSchema?.granularity ?? template?.抽取颗粒度,
          '-',
        ),
        splitMode: normalizeString(configSnapshot?.splitMode ?? template?.分块模式, '-'),
        blockSize: normalizeNumber(configSnapshot?.blockSize ?? template?.分块大小),
        categoryLimit: normalizeNumber(
          configSnapshot?.categoryLimit ?? extractSchema?.categoryLimit,
        ),
        modelPrecision: normalizeString(
          extractSchema?.modelPrecision ?? configSnapshot?.modelPrecision,
          '-',
        ),
        temperature: normalizeNumber(configSnapshot?.temperature ?? template?.temperature),
        topP: normalizeNumber(configSnapshot?.topP ?? template?.topP),
        presencePenalty: normalizeNumber(
          configSnapshot?.presencePenalty ?? template?.presencePenalty,
        ),
        frequencyPenalty: normalizeNumber(
          configSnapshot?.frequencyPenalty ?? template?.frequencyPenalty,
        ),
        maxTokens: normalizeNumber(configSnapshot?.maxTokens ?? template?.maxTokens),
        generatedPrompt: normalizeString(
          configSnapshot?.generatedPrompt ?? template?.提示词,
          '-',
        ),
        coarseEntityTypeIds: ensureStringList(
          configSnapshot?.coarseEntityTypeIds ?? extractSchema?.coarseEntityTypeIds,
        ),
        fineAttributeIdsByType: Object.entries(
          extractSchema?.fineAttributeIdsByType ?? configSnapshot?.fineAttributeIdsByType ?? {},
        ).reduce<Record<string, string[]>>((acc, [key, value]) => {
          acc[String(key)] = ensureStringList(value);
          return acc;
        }, {}),
      },
      error: '',
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '解析知识抽取配置快照失败',
    };
  }
};

const sectionTitle = (icon: React.ReactNode, title: string) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: '1px solid #f0f0f0',
    }}
  >
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#eef4ff',
        color: '#1677ff',
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    <div style={{ fontSize: 16, fontWeight: 600, color: '#262626' }}>{title}</div>
  </div>
);

const blockStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  background: '#fafafa',
  border: '1px solid #f0f0f0',
  height: '100%',
};

const deletedTagStyle: React.CSSProperties = {
  color: '#8c8c8c',
  background: '#fafafa',
  borderColor: '#d9d9d9',
  margin: 0,
};

export default function KnowledgeExtractSnapshotView({
  snapshot,
  visible = true,
}: KnowledgeExtractSnapshotViewProps) {
  const { data, error } = useMemo(() => parseSnapshot(snapshot), [snapshot]);
  const [entityTypes, setEntityTypes] = useState<EntityTypeItem[]>([]);
  const [attributeMap, setAttributeMap] = useState<Record<string, EntityTypeAttributeItem[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !data) return;

    let active = true;

    const loadOptions = async () => {
      try {
        setLoading(true);
        const entityTypeResponse: any = await getEntityTypeList();
        if (!active) return;

        const nextEntityTypes: EntityTypeItem[] = Array.isArray(entityTypeResponse?.data)
          ? entityTypeResponse.data
          : Array.isArray(entityTypeResponse?.list)
            ? entityTypeResponse.list
            : Array.isArray(entityTypeResponse?.rows)
              ? entityTypeResponse.rows
              : Array.isArray(entityTypeResponse)
                ? entityTypeResponse
                : [];
        setEntityTypes(nextEntityTypes);

        const typeIds = Array.from(
          new Set([
            ...data.coarseEntityTypeIds,
            ...Object.keys(data.fineAttributeIdsByType).filter(Boolean),
          ]),
        );

        const results = await Promise.all(
          typeIds.map(async (typeId) => {
            const response: any = await getEntityTypeAttributeList(typeId);
            const list: EntityTypeAttributeItem[] = Array.isArray(response?.data)
              ? response.data
              : Array.isArray(response?.list)
                ? response.list
                : Array.isArray(response?.rows)
                  ? response.rows
                  : Array.isArray(response)
                    ? response
                    : [];
            return [typeId, list] as const;
          }),
        );

        if (!active) return;

        setAttributeMap(
          results.reduce<Record<string, EntityTypeAttributeItem[]>>((acc, [typeId, list]) => {
            acc[typeId] = list;
            return acc;
          }, {}),
        );
      } catch (loadError) {
        console.error(loadError);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, [data, visible]);

  const entityTypeNameMap = useMemo(
    () =>
      entityTypes.reduce<Record<string, string>>((acc, item) => {
        acc[String(item?.id ?? '')] = String(item?.entityTypeName ?? item?.name ?? item?.label ?? '');
        return acc;
      }, {}),
    [entityTypes],
  );

  const coarseEntityTypes = useMemo<DisplayItem[]>(
    () =>
      data?.coarseEntityTypeIds
        .map((typeId) => {
          const resolvedName = entityTypeNameMap[typeId];
          return {
            id: String(typeId),
            name: resolvedName || `已被删除实体类型 ${typeId}`,
            deleted: !resolvedName,
          };
        })
        .sort((a, b) => Number(a.deleted) - Number(b.deleted)) || [],
    [data?.coarseEntityTypeIds, entityTypeNameMap],
  );

  const fineGroups = useMemo(
    () =>
      Object.entries(data?.fineAttributeIdsByType || {})
        .map(([typeId, attributeIds]) => {
          const resolvedTypeName = entityTypeNameMap[typeId];
          const attributes: DisplayItem[] = attributeIds
            .map((attributeId) => {
              const match = (attributeMap[typeId] || []).find(
                (item) => String(item?.id ?? item?.attributeId ?? '') === String(attributeId),
              );
              return {
                id: String(attributeId),
                name:
                  String(match?.attributeName ?? match?.name ?? '').trim() ||
                  `已被删除属性 ${attributeId}`,
                deleted: !match,
              };
            })
            .sort((a, b) => Number(a.deleted) - Number(b.deleted));

          return {
            typeId,
            typeName: resolvedTypeName || `已被删除实体类型 ${typeId}`,
            deleted: !resolvedTypeName,
            attributes,
          };
        })
        .filter((group) => group.attributes.length > 0)
        .sort((a, b) => Number(a.deleted) - Number(b.deleted)),
    [attributeMap, data?.fineAttributeIdsByType, entityTypeNameMap],
  );

  if (!snapshot) return <Empty description="当前文档没有知识抽取配置快照" />;
  if (error) return <Empty description={`知识抽取配置快照解析失败：${error}`} />;
  if (!data) return <Empty description="当前文档没有知识抽取配置快照" />;

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Card
          bordered={false}
          styles={{ body: { padding: 20 } }}
          style={{ borderRadius: 14, border: '1px solid #e8eef7' }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>{data.name}</div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#667085', lineHeight: 1.7 }}>
            {data.description || '暂无描述'}
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card bordered={false} style={{ borderRadius: 14, border: '1px solid #e8eef7' }}>
              {sectionTitle(<TagOutlined />, '适用标签范围')}
              <div
                style={{
                  ...blockStyle,
                  marginBottom: 20,
                  background: '#f0f7ff',
                  border: '1px solid #bfdbfe',
                }}
              >
                <Space wrap size={[6, 6]}>
                  {data.tags.length > 0 ? (
                    data.tags.map((tag) => (
                      <Tag key={tag} color="blue" style={{ margin: 0 }}>
                        {tag}
                      </Tag>
                    ))
                  ) : (
                    <Text type="secondary">未配置标签</Text>
                  )}
                </Space>
              </div>

              {sectionTitle(<SettingOutlined />, '基础配置')}
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">分块模式</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{data.splitMode}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">分块大小</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      {data.blockSize !== undefined ? data.blockSize : '-'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">抽取颗粒度</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{data.granularity}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">属性数量限制</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      {data.categoryLimit !== undefined ? data.categoryLimit : '-'}
                    </div>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 20 }}>
                {sectionTitle(<ClusterOutlined />, '抽取范围')}
                <div style={blockStyle}>
                  {data.granularity === '粗颗粒度' ? (
                    <>
                      <div style={{ marginBottom: 10, fontSize: 13, color: '#8c8c8c' }}>
                        粗颗粒度实体类型
                      </div>
                      <Space wrap size={[6, 6]}>
                        {coarseEntityTypes.length > 0 ? (
                          coarseEntityTypes.map((type) => (
                            <Tag
                              key={type.id}
                              color={type.deleted ? 'default' : 'cyan'}
                              style={type.deleted ? deletedTagStyle : { margin: 0 }}
                            >
                              {type.name}
                              {type.deleted ? '（已删除）' : ''}
                            </Tag>
                          ))
                        ) : (
                          <Text type="secondary">未配置</Text>
                        )}
                      </Space>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: 10, fontSize: 13, color: '#8c8c8c' }}>
                        细颗粒度属性配置
                      </div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {fineGroups.length > 0 ? (
                          fineGroups.map((group) => (
                            <div
                              key={group.typeId}
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                background: '#fff',
                                border: '1px solid #ececec',
                              }}
                            >
                              <div
                                style={{
                                  marginBottom: 8,
                                  fontWeight: 600,
                                  color: group.deleted ? '#8c8c8c' : '#1f2937',
                                }}
                              >
                                {group.typeName}
                                {group.deleted ? '（已删除）' : ''}
                              </div>
                              <Space wrap size={[6, 6]}>
                                {group.attributes.map((attribute) => (
                                  <Tag
                                    key={`${group.typeId}-${attribute.id}`}
                                    color={attribute.deleted ? 'default' : 'orange'}
                                    style={attribute.deleted ? deletedTagStyle : { margin: 0 }}
                                  >
                                    {attribute.name}
                                    {attribute.deleted ? '（已删除）' : ''}
                                  </Tag>
                                ))}
                              </Space>
                            </div>
                          ))
                        ) : (
                          <Text type="secondary">未配置细颗粒度属性</Text>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            <Card bordered={false} style={{ borderRadius: 14, border: '1px solid #e8eef7' }}>
              {sectionTitle(<RobotOutlined />, '模型配置')}
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">模型名称</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{data.modelName}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">抽取精度</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{data.modelPrecision}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">温度 (Temperature)</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      {data.temperature !== undefined ? data.temperature : '-'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">Top P</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      {data.topP !== undefined ? data.topP : '-'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">存在惩罚 (Presence Penalty)</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      {data.presencePenalty !== undefined ? data.presencePenalty : '-'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={blockStyle}>
                    <Text type="secondary">频率惩罚 (Frequency Penalty)</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      {data.frequencyPenalty !== undefined ? data.frequencyPenalty : '-'}
                    </div>
                  </div>
                </Col>
                <Col span={24}>
                  <div style={blockStyle}>
                    <Text type="secondary">最大 token 数 (Max Tokens)</Text>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      {data.maxTokens !== undefined ? data.maxTokens : '-'}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card
              bordered={false}
              style={{ marginTop: 16, borderRadius: 14, border: '1px solid #e8eef7' }}
            >
              {sectionTitle(<ThunderboltOutlined />, '提示词预览')}
              <Paragraph
                style={{
                  marginBottom: 0,
                  minHeight: 220,
                  maxHeight: 320,
                  overflow: 'auto',
                  borderRadius: 10,
                  border: '1px solid #e6edf5',
                  background: '#f8fbff',
                  padding: 14,
                  fontSize: 13,
                  lineHeight: 1.8,
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {data.generatedPrompt || '-'}
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
}
