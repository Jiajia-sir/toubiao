import { useEffect, useState } from 'react';
import { history } from '@umijs/max';
import {
  Card,
  Button,
  Space,
  Input,
  Table,
  Tag,
  Row,
  Col,
  Select,
  Pagination,
  Popconfirm,
  message,
  InputNumber,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PythonOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  UpOutlined,
  DownOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  getKnowledgeExtractConfigPage,
  removeKnowledgeExtractConfig,
  updateKnowledgeExtractConfigSort,
  type KnowledgeExtractConfigItem,
  type KnowledgeExtractConfigPageParams,
  type KnowledgeExtractTemplateSortItem,
} from '@/services/biz/knowledge-extract-config';

interface ExtractTemplate {
  id: string;
  name: string;
  tags: string[];
  granularity: '粗颗粒度' | '细颗粒度';
  modelName: string;
  createTime: string;
  creator: string;
  enabled: '启用' | '停用';
  description: string;
  isBuiltin?: boolean;
  sortNo: number;
}

const statusOptions = [
  { label: '全部状态', value: '全部状态' },
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' },
];

const granularityOptions = [
  { label: '全部颗粒度', value: '全部颗粒度' },
  { label: '粗颗粒度', value: '粗颗粒度' },
  { label: '细颗粒度', value: '细颗粒度' },
];

const tagColorMap: Record<string, string> = {
  产品需求: '#1890ff',
  技术文档: '#52c41a',
  市场分析: '#faad14',
  医疗: '#eb2f96',
  金融: '#13c2c2',
  法律: '#722ed1',
  科研: '#fa541c',
  技术: '#2f54eb',
};

const normalizeTemplate = (item: KnowledgeExtractConfigItem): ExtractTemplate => ({
  id: String(item.id),
  name: item.name,
  tags: item.tags?.length ? item.tags : ['通用标签'],
  granularity: item.granularity,
  modelName: item.modelName || '-',
  createTime: item.createTime || '-',
  creator: item.creator || '-',
  enabled: item.enabled,
  description: item.description || '',
  isBuiltin: item.isBuiltin,
  sortNo: Number(item.sortNo ?? 0),
});

export default function KnowledgeExtractPage() {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部状态');
  const [granularityFilter, setGranularityFilter] = useState('全部颗粒度');
  const [modelNameFilter, setModelNameFilter] = useState('');
  const [templates, setTemplates] = useState<ExtractTemplate[]>([]);
  const [sortDraftMap, setSortDraftMap] = useState<Record<string, number>>({});
  const [sortSavingMap, setSortSavingMap] = useState<Record<string, boolean>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchTemplates = async (
    pageNo = currentPage,
    nextPageSize = pageSize,
    filters = {
      name: searchText,
      enabled: statusFilter,
      granularity: granularityFilter,
      modelName: modelNameFilter,
    },
  ) => {
    setLoading(true);
    try {
      const params: KnowledgeExtractConfigPageParams = {
        pageNo,
        pageSize: nextPageSize,
      };
      if (filters.name.trim()) {
        params.name = filters.name.trim();
      }
      if (filters.enabled !== '全部状态') {
        params.enabled = filters.enabled as KnowledgeExtractConfigPageParams['enabled'];
      }
      if (filters.granularity !== '全部颗粒度') {
        params.granularity = filters.granularity as KnowledgeExtractConfigPageParams['granularity'];
      }
      if (filters.modelName.trim()) {
        params.modelName = filters.modelName.trim();
      }

      const data = await getKnowledgeExtractConfigPage(params);
      const nextTemplates = (data.list || []).map(normalizeTemplate);
      setTemplates(nextTemplates);
      setSortDraftMap(
        nextTemplates.reduce<Record<string, number>>((acc, item) => {
          acc[item.id] = item.sortNo;
          return acc;
        }, {}),
      );
      setTotal(data.total || 0);
    } catch (error) {
      message.error('获取抽取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates(1, pageSize);
  }, []);

  const persistSort = async (items: KnowledgeExtractTemplateSortItem[]) => {
    const savingMap = items.reduce<Record<string, boolean>>((acc, item) => {
      acc[String(item.id)] = true;
      return acc;
    }, {});
    setSortSavingMap((prev) => ({ ...prev, ...savingMap }));
    try {
      const res: any = await updateKnowledgeExtractConfigSort(items);
      if (res?.code === 200) {
        message.success('排序已保存');
        fetchTemplates(currentPage, pageSize);
      } else {
        message.error(res?.msg || '排序保存失败');
      }
    } catch (error) {
      console.error(error);
      message.error('排序保存失败');
    } finally {
      setSortSavingMap((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          delete next[String(item.id)];
        });
        return next;
      });
    }
  };

  const handleSaveSort = async (record: ExtractTemplate) => {
    const sortNo = Number(sortDraftMap[record.id] ?? record.sortNo ?? 0);
    await persistSort([{ id: record.id, sortNo }]);
  };

  const handleMoveSort = async (record: ExtractTemplate, direction: 'up' | 'down') => {
    const index = templates.findIndex((item) => item.id === record.id);
    if (index === -1) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= templates.length) {
      message.warning(direction === 'up' ? '已经是当前页第一条' : '已经是当前页最后一条');
      return;
    }

    const target = templates[targetIndex];
    const currentSort = Number(sortDraftMap[record.id] ?? record.sortNo ?? 0);
    const targetSort = Number(sortDraftMap[target.id] ?? target.sortNo ?? 0);
    const items: KnowledgeExtractTemplateSortItem[] =
      currentSort === targetSort
        ? [
            {
              id: record.id,
              sortNo: direction === 'up' ? currentSort + 1 : currentSort - 1,
            },
          ]
        : [
            { id: record.id, sortNo: targetSort },
            { id: target.id, sortNo: currentSort },
          ];

    setSortDraftMap((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        next[String(item.id)] = item.sortNo;
      });
      return next;
    });
    await persistSort(items);
  };

  const handleDelete = async (id: string) => {
    try {
      const res: any = await removeKnowledgeExtractConfig(id);
      if (res?.code === 200 || res === true) {
        message.success('删除成功');
        const nextPage = templates.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
        setCurrentPage(nextPage);
        fetchTemplates(nextPage, pageSize);
      } else {
        message.error(res?.msg || '删除失败');
      }
    } catch (error) {
      console.error(error);
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      render: (_: string, record: ExtractTemplate) => {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                borderRadius: 10,
                border: '1px solid #91d5ff',
                boxShadow: '0 2px 4px rgba(24, 144, 255, 0.1)',
              }}
            >
              <PythonOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#262626',
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {record.name}
                {record.isBuiltin && (
                  <Tag
                    color="blue"
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      padding: '0 4px',
                      lineHeight: '18px',
                    }}
                  >
                    内置
                  </Tag>
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#8c8c8c',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {record.description || '暂无描述'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: '适用标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 220,
      render: (tags: string[]) => {
        const maxShow = 2;
        const showTags = tags.slice(0, maxShow);
        const remaining = tags.length - maxShow;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {showTags.map((tag) => {
              const tagColor = tagColorMap[tag] || '#1890ff';
              return (
                <Tag
                  key={tag}
                  style={{
                    color: tagColor,
                    background: `${tagColor}15`,
                    border: `1px solid ${tagColor}30`,
                    margin: 0,
                    fontSize: 12,
                  }}
                >
                  {tag}
                </Tag>
              );
            })}
            {remaining > 0 && (
              <Tag
                style={{
                  color: '#8c8c8c',
                  background: '#f5f5f5',
                  border: '1px solid #d9d9d9',
                  margin: 0,
                  fontSize: 12,
                }}
              >
                +{remaining}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '使用模型',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 200,
    },
    {
      title: '抽取颗粒度',
      dataIndex: 'granularity',
      key: 'granularity',
      width: 120,
      render: (granularity: string) => (
        <span
          style={{
            color: granularity === '细颗粒度' ? '#1890ff' : '#52c41a',
          }}
        >
          {granularity}
        </span>
      ),
    },
    {
      title: '排序',
      key: 'sortNo',
      width: 220,
      render: (_: any, record: ExtractTemplate) => {
        const saving = Boolean(sortSavingMap[record.id]);
        return (
          <Space size={6}>
            <InputNumber
              size="small"
              style={{ width: 78 }}
              value={sortDraftMap[record.id] ?? record.sortNo}
              onChange={(value) =>
                setSortDraftMap((prev) => ({
                  ...prev,
                  [record.id]: Number(value ?? 0),
                }))
              }
            />
            <Button
              size="small"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => handleSaveSort(record)}
            />
            <Button
              size="small"
              icon={<UpOutlined />}
              disabled={saving}
              onClick={() => handleMoveSort(record, 'up')}
            />
            <Button
              size="small"
              icon={<DownOutlined />}
              disabled={saving}
              onClick={() => handleMoveSort(record, 'down')}
            />
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (status: string) => {
        const config = {
          启用: { color: '#52c41a', text: '启用' },
          停用: { color: '#8c8c8c', text: '停用' },
        };
        const c = config[status as keyof typeof config];
        return (
          <Tag
            style={{
              color: c.color,
              background: `${c.color}15`,
              border: `1px solid ${c.color}30`,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: c.color,
                marginRight: 4,
              }}
            />
            {c.text}
          </Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 120,
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      key: 'creator',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: ExtractTemplate) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/config-center/knowledge-extract/config?id=${record.id}&mode=view`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            disabled={record.isBuiltin}
            onClick={() => history.push(`/config-center/knowledge-extract/config?id=${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
            disabled={record.isBuiltin}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.isBuiltin}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
    fetchTemplates(page, size);
  };

  return (
    <div style={{ background: '#f5f7fa', minHeight: 'calc(100vh - 300px)' }}>
      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
        styles={{ body: { flex: 1, minHeight: '86vh' } }}
      >
        <div style={{ padding: 24, borderBottom: '1px solid #f0f0f0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: '#262626',
                }}
              >
                抽取规则配置模板管理
              </div>
              <div style={{ fontSize: 14, color: '#8c8c8c', marginTop: 2 }}>
                统一管理抽取规则配置模板，支持快速复用、编辑和分享，提高知识抽取配置效率
              </div>
            </div>
            <Space size={24}>
              <div style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 20, color: '#1890ff', fontWeight: 600 }}>{total}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>模板数量</div>
              </div>
            </Space>
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #f0f0f0',
            background: 'linear-gradient(180deg, #f7f9fc 0%, #fff 100%)',
          }}
        >
          <Row gutter={[16, 12]}>
            <Col>
              <Input
                placeholder="请输入模板名称"
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              />
            </Col>
            <Col>
              <Select
                placeholder="请选择状态"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 140 }}
                options={statusOptions}
              />
            </Col>
            <Col>
              <Select
                placeholder="抽取颗粒度"
                value={granularityFilter}
                onChange={setGranularityFilter}
                style={{ width: 150 }}
                options={granularityOptions}
              />
            </Col>
            <Col>
              <Input
                placeholder="请输入模型名称"
                allowClear
                value={modelNameFilter}
                onChange={(e) => setModelNameFilter(e.target.value)}
                style={{ width: 180 }}
              />
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    setCurrentPage(1);
                    fetchTemplates(1, pageSize);
                  }}
                >
                  搜索
                </Button>
                <Button
                  onClick={() => {
                    setSearchText('');
                    setStatusFilter('全部状态');
                    setGranularityFilter('全部颗粒度');
                    setModelNameFilter('');
                    setCurrentPage(1);
                    fetchTemplates(1, pageSize, {
                      name: '',
                      enabled: '全部状态',
                      granularity: '全部颗粒度',
                      modelName: '',
                    });
                  }}
                >
                  重置
                </Button>
              </Space>
            </Col>
            <Col flex="auto" style={{ textAlign: 'right' }}>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => fetchTemplates(currentPage, pageSize)}>
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => history.push('/config-center/knowledge-extract/config')}
                >
                  新增模板
                </Button>
                <Button
                  type={viewMode === 'list' ? 'primary' : 'default'}
                  icon={<UnorderedListOutlined />}
                  onClick={() => setViewMode('list')}
                />
                <Button
                  type={viewMode === 'grid' ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => setViewMode('grid')}
                />
              </Space>
            </Col>
          </Row>
        </div>

        {viewMode === 'list' ? (
          <Table
            columns={columns}
            dataSource={templates}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1450 }}
          />
        ) : (
          <div style={{ padding: 24 }}>
            <Row gutter={[24, 24]}>
              {templates.map((template) => (
                <Col span={8} key={template.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 16,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: template.enabled === '停用' ? 0.6 : 1,
                      filter: template.enabled === '停用' ? 'grayscale(80%)' : 'none',
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#e6f7ff',
                          borderRadius: 8,
                          border: '1px solid #1890ff50',
                        }}
                      >
                        <PythonOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#262626',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {template.name}
                        </div>
                      </div>
                      <Tag color="geekblue">排序 {sortDraftMap[template.id] ?? template.sortNo}</Tag>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      {template.tags.map((tag) => {
                        const tagColor = tagColorMap[tag] || '#1890ff';
                        return (
                          <Tag
                            key={tag}
                            style={{
                              color: tagColor,
                              background: `${tagColor}15`,
                              border: `1px solid ${tagColor}30`,
                              marginRight: 4,
                              marginBottom: 4,
                            }}
                          >
                            {tag}
                          </Tag>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#595959' }}>{template.modelName}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          color: template.granularity === '细颗粒度' ? '#1890ff' : '#52c41a',
                          fontSize: 12,
                        }}
                      >
                        {template.granularity}
                      </span>
                      <span style={{ color: '#d9d9d9' }}>|</span>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>{template.creator}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      {(() => {
                        const statusColors = {
                          启用: { color: '#52c41a', text: '启用' },
                          停用: { color: '#8c8c8c', text: '停用' },
                        };
                        const s = statusColors[template.enabled as keyof typeof statusColors];
                        return (
                          <Tag
                            style={{
                              color: s.color,
                              background: `${s.color}15`,
                              border: `1px solid ${s.color}30`,
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: s.color,
                                marginRight: 4,
                              }}
                            />
                            {s.text}
                          </Tag>
                        );
                      })()}
                      <span style={{ color: '#d9d9d9' }}>|</span>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>{template.createTime}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #f0f0f0',
                        paddingTop: 12,
                      }}
                    >
                      <Space size={4}>
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => history.push(`/config-center/knowledge-extract/config?id=${template.id}&mode=view`)}
                        >
                          查看
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          disabled={template.isBuiltin}
                          onClick={() => history.push(`/config-center/knowledge-extract/config?id=${template.id}`)}
                        >
                          编辑
                        </Button>
                                              <Popconfirm
                          title="确认删除?"
                          onConfirm={() => handleDelete(template.id)}
                          okText="确认"
                          cancelText="取消"
                          disabled={template.isBuiltin}
                        >
                          <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={template.isBuiltin}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </Space>
                      <Space size={4}>
                        <Button size="small" icon={<UpOutlined />} onClick={() => handleMoveSort(template, 'up')} />
                        <Button size="small" icon={<DownOutlined />} onClick={() => handleMoveSort(template, 'down')} />
                      </Space>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 14, color: '#8c8c8c' }}>
            建议：常用模板设置更大的排序值，可直接上移/下移快速调整。
          </span>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={handlePageChange}
          />
        </div>
      </Card>
    </div>
  );
}


