'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  createDataSource,
  deleteDataSource,
  getDataSourcePage,
  getSupportedDataSourceTypes,
  testDataSourceConnection,
  updateDataSource,
  type DataSourcePayload,
  type DataSourceRecord,
  type SupportedDataSourceType,
} from '@/services/biz/data-source';

const { Text, Paragraph } = Typography;

const PAGE_SIZE = 10;

interface SearchFormValues {
  name?: string;
  type?: string;
  category?: string;
  status?: number;
}

interface EditFormValues {
  name: string;
  type: string;
  description?: string;
  host?: string;
  port?: number | null;
  databaseName?: string;
  username?: string;
  password?: string;
  connectionUri?: string;
  properties?: Record<string, any>;
  status: number;
}

/**
 * 把后端 CommonResult / PageResult 兼容成稳定的前端列表结构。
 * 由于仓库内不同接口存在少量历史返回差异，这里统一兜底，降低页面接入风险。
 */
function extractPageList(payload: any): DataSourceRecord[] {
  return payload?.data?.list || payload?.data?.records || payload?.list || payload?.rows || [];
}

function extractPageTotal(payload: any): number {
  return Number(payload?.data?.total || payload?.total || 0);
}

function extractData<T = any>(payload: any): T {
  return payload?.data ?? payload;
}

function normalizeRecord(item: any): DataSourceRecord {
  return {
    id: Number(item?.id || 0),
    name: item?.name || '',
    type: item?.type || '',
    typeName: item?.typeName || '',
    category: item?.category || '',
    categoryName: item?.categoryName || '',
    description: item?.description || '',
    host: item?.host || '',
    port: item?.port ?? null,
    databaseName: item?.databaseName || '',
    username: item?.username || '',
    password: item?.password || '',
    connectionUri: item?.connectionUri || '',
    properties: item?.properties || {},
    status: Number(item?.status ?? 1),
    lastTestStatus: item?.lastTestStatus ?? null,
    lastTestMessage: item?.lastTestMessage || '',
    lastTestTime: item?.lastTestTime || '',
    createTime: item?.createTime || '',
    updateTime: item?.updateTime || '',
  };
}

/**
 * 根据不同数据库类型控制通用字段显示。
 * 当前仍保留统一页面，但通过类型规则动态裁剪字段，避免表单被无关参数淹没。
 */
function getBasicFieldVisibility(type?: string) {
  switch (type) {
    case 'sqlite':
      return {
        showHost: false,
        showPort: false,
        showDatabaseName: false,
        showUsername: false,
        showPassword: false,
        showConnectionUri: false,
      };
    case 'neo4j':
      return {
        showHost: true,
        showPort: true,
        showDatabaseName: true,
        showUsername: true,
        showPassword: true,
        showConnectionUri: true,
      };
    case 'mongodb':
      return {
        showHost: true,
        showPort: true,
        showDatabaseName: true,
        showUsername: true,
        showPassword: true,
        showConnectionUri: true,
      };
    case 'oracle':
      return {
        showHost: true,
        showPort: true,
        showDatabaseName: false,
        showUsername: true,
        showPassword: true,
        showConnectionUri: false,
      };
    default:
      return {
        showHost: true,
        showPort: true,
        showDatabaseName: true,
        showUsername: true,
        showPassword: true,
        showConnectionUri: false,
      };
  }
}

/**
 * 把表单值整理成后端所需的统一连接定义。
 * 这里显式裁剪空字符串，避免把一堆无意义空值写回数据库。
 */
function buildPayload(values: EditFormValues, editRecord?: DataSourceRecord | null): DataSourcePayload {
  const properties = Object.entries(values.properties || {}).reduce<Record<string, any>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});

  return {
    id: editRecord?.id,
    name: values.name?.trim(),
    type: values.type,
    description: values.description?.trim() || undefined,
    host: values.host?.trim() || undefined,
    port: values.port ?? undefined,
    databaseName: values.databaseName?.trim() || undefined,
    username: values.username?.trim() || undefined,
    password: values.password || undefined,
    connectionUri: values.connectionUri?.trim() || undefined,
    properties,
    status: values.status,
  };
}

export default function DataSourcePage() {
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();

  const [data, setData] = useState<DataSourceRecord[]>([]);
  const [typeOptions, setTypeOptions] = useState<SupportedDataSourceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editRecord, setEditRecord] = useState<DataSourceRecord | null>(null);
  const [searchValues, setSearchValues] = useState<SearchFormValues>({
    name: undefined,
    type: undefined,
    category: undefined,
    status: undefined,
  });

  const currentType = Form.useWatch('type', editForm);
  const currentTypeMeta = useMemo(
    () => typeOptions.find((item) => item.type === currentType),
    [currentType, typeOptions],
  );
  const fieldVisibility = getBasicFieldVisibility(currentType);

  const fetchSupportedTypes = async () => {
    setMetaLoading(true);
    try {
      const res: any = await getSupportedDataSourceTypes();
      const list = (extractData<any[]>(res) || []) as SupportedDataSourceType[];
      setTypeOptions(list);
    } catch (error) {
      console.error(error);
      message.error('获取数据源类型失败');
    } finally {
      setMetaLoading(false);
    }
  };

  const fetchData = async (targetPage = page, filters = searchValues) => {
    setLoading(true);
    try {
      const res: any = await getDataSourcePage({
        pageNo: targetPage,
        pageSize: PAGE_SIZE,
        name: filters.name || undefined,
        type: filters.type || undefined,
        category: filters.category || undefined,
        status: typeof filters.status === 'number' ? filters.status : undefined,
      });
      setData(extractPageList(res).map(normalizeRecord));
      setTotal(extractPageTotal(res));
    } catch (error) {
      console.error(error);
      message.error('获取数据源列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportedTypes();
  }, []);

  useEffect(() => {
    fetchData(page, searchValues);
  }, [page]);

  const openCreateModal = () => {
    const firstType = typeOptions[0];
    setEditRecord(null);
    editForm.setFieldsValue({
      name: '',
      type: firstType?.type,
      description: '',
      host: '',
      port: firstType?.defaultPort ?? undefined,
      databaseName: '',
      username: '',
      password: '',
      connectionUri: '',
      properties: {},
      status: 1,
    });
    setModalVisible(true);
  };

  const openEditModal = (record: DataSourceRecord) => {
    const selectedType = typeOptions.find((item) => item.type === record.type);
    setEditRecord(record);
    editForm.setFieldsValue({
      name: record.name,
      type: record.type,
      description: record.description,
      host: record.host,
      port: record.port ?? selectedType?.defaultPort ?? undefined,
      databaseName: record.databaseName,
      username: record.username,
      password: record.password,
      connectionUri: record.connectionUri,
      properties: record.properties || {},
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleSearch = async () => {
    const values = searchForm.getFieldsValue();
    setSearchValues(values);
    setPage(1);
    await fetchData(1, values);
  };

  const handleReset = async () => {
    const values = {
      name: undefined,
      type: undefined,
      category: undefined,
      status: undefined,
    };
    searchForm.setFieldsValue(values);
    setSearchValues(values);
    setPage(1);
    await fetchData(1, values);
  };

  const handleSubmit = async () => {
    const values = await editForm.validateFields();
    const payload = buildPayload(values, editRecord);
    setSubmitting(true);
    try {
      const res: any = editRecord ? await updateDataSource(payload) : await createDataSource(payload);
      if (res?.code === 200 || res?.code === 0 || res?.success === true) {
        message.success(editRecord ? '数据源更新成功' : '数据源创建成功');
        setModalVisible(false);
        setEditRecord(null);
        editForm.resetFields();
        const targetPage = editRecord ? page : 1;
        setPage(targetPage);
        await fetchData(targetPage, searchValues);
      } else {
        message.error(res?.msg || (editRecord ? '数据源更新失败' : '数据源创建失败'));
      }
    } catch (error) {
      console.error(error);
      message.error(editRecord ? '数据源更新失败' : '数据源创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res: any = await deleteDataSource(id);
      if (res?.code === 200 || res?.code === 0 || res?.success === true) {
        message.success('删除成功');
        await fetchData(page, searchValues);
      } else {
        message.error(res?.msg || '删除失败');
      }
    } catch (error) {
      console.error(error);
      message.error('删除失败');
    }
  };

  /**
   * 已保存记录测试连接时，直接复用记录内容。
   * 这样可以保证测试结果和当前库中配置一致，而不是依赖表格上展示的部分字段。
   */
  const handleTableTest = async (record: DataSourceRecord) => {
    setTesting(true);
    try {
      const res: any = await testDataSourceConnection({
        id: record.id,
        name: record.name,
        type: record.type,
        description: record.description,
        host: record.host,
        port: record.port,
        databaseName: record.databaseName,
        username: record.username,
        password: record.password,
        connectionUri: record.connectionUri,
        properties: record.properties || {},
        status: record.status,
      });
      const result = extractData<any>(res);
      if (result?.success) {
        message.success(`连接成功，耗时 ${result?.latencyMs ?? 0} ms`);
      } else {
        message.error(result?.message || '连接失败');
      }
      await fetchData(page, searchValues);
    } catch (error) {
      console.error(error);
      message.error('连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  /**
   * 表单内测试连接支持“先测后存”。
   * 这对首次录入新数据源尤其重要，可以在不落库的情况下先确认连接参数是否正确。
   */
  const handleModalTest = async () => {
    const values = await editForm.validateFields();
    const payload = buildPayload(values, editRecord);
    setTesting(true);
    try {
      const res: any = await testDataSourceConnection(payload);
      const result = extractData<any>(res);
      if (result?.success) {
        message.success(`连接成功，耗时 ${result?.latencyMs ?? 0} ms`);
      } else {
        message.error(result?.message || '连接失败');
      }
    } catch (error) {
      console.error(error);
      message.error('连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const columns: ColumnsType<DataSourceRecord> = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || '未填写说明'}
          </Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'typeName',
      key: 'typeName',
      width: 160,
      render: (_, record) => (
        <Space size={6} wrap>
          <Tag color="blue">{record.typeName || record.type}</Tag>
          <Tag>{record.categoryName || record.category}</Tag>
        </Space>
      ),
    },
    {
      title: '连接信息',
      key: 'connection',
      width: 260,
      render: (_, record) => {
        const connectionText = record.connectionUri
          ? record.connectionUri
          : [record.host, record.port, record.databaseName].filter(Boolean).join(' / ');
        return <Text>{connectionText || '-'}</Text>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: number) => (value === 1 ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '最近测试',
      key: 'lastTest',
      width: 260,
      render: (_, record) => {
        const statusTag =
          record.lastTestStatus === 1 ? (
            <Tag color="success">成功</Tag>
          ) : record.lastTestStatus === 0 ? (
            <Tag color="error">失败</Tag>
          ) : (
            <Tag>未测试</Tag>
          );
        return (
          <Space direction="vertical" size={2}>
            <Space size={6}>
              {statusTag}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.lastTestTime ? dayjs(record.lastTestTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.lastTestMessage || '暂无测试记录'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={8} wrap>
          <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => handleTableTest(record)}>
            测试连接
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该数据源吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Space direction="vertical" size={6}>
          <Text strong style={{ fontSize: 18 }}>
            多源结构化数据源管理
          </Text>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            当前阶段仅实现连接资产管理与连通性测试，已覆盖 MySQL、Oracle、PostgreSQL、SQLite、Neo4j、Nebula、MongoDB 七类数据库，并通过类型元数据为后续扩展保留统一入口。
          </Paragraph>
        </Space>
      </Card>

      <Card bordered={false} loading={metaLoading}>
        <Row gutter={[12, 12]}>
          {typeOptions.map((item) => (
            <Col xs={24} sm={12} md={8} lg={6} xl={4} key={item.type}>
              <Card size="small" style={{ height: '100%' }}>
                <Space direction="vertical" size={6}>
                  <Space size={6} wrap>
                    <Tag color="blue">{item.typeName}</Tag>
                    <Tag>{item.categoryName}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    类型编码：{item.type}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    默认端口：{item.defaultPort ?? '无'}
                  </Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card bordered={false}>
        <Form form={searchForm} layout="vertical">
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="name" label="数据源名称">
                <Input placeholder="请输入数据源名称" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="type" label="数据源类型">
                <Select
                  allowClear
                  placeholder="请选择数据源类型"
                  options={typeOptions.map((item) => ({ label: item.typeName, value: item.type }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="category" label="数据库分类">
                <Select
                  allowClear
                  placeholder="请选择数据库分类"
                  options={[
                    { label: '关系型数据库', value: 'relational' },
                    { label: '图数据库', value: 'graph' },
                    { label: '文档数据库', value: 'document' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="status" label="启停状态">
                <Select
                  allowClear
                  placeholder="请选择状态"
                  options={[
                    { label: '启用', value: 1 },
                    { label: '停用', value: 0 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Space size={8}>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              新增数据源
            </Button>
          </Space>
        </Form>
      </Card>

      <Card bordered={false}>
        <Table<DataSourceRecord>
          rowKey="id"
          loading={loading || testing}
          dataSource={data}
          columns={columns}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (count) => `共 ${count} 条`,
            onChange: (nextPage) => setPage(nextPage),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editRecord ? '编辑数据源' : '新增数据源'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditRecord(null);
          editForm.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={900}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button key="test" icon={<LinkOutlined />} loading={testing} onClick={handleModalTest}>
            测试连接
          </Button>,
          <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
            保存
          </Button>,
        ]}
      >
        <Form<EditFormValues>
          form={editForm}
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, 'type')) {
              const nextType = typeOptions.find((item) => item.type === changedValues.type);
              editForm.setFieldsValue({
                port: nextType?.defaultPort ?? undefined,
                properties: {},
                connectionUri: '',
              });
            }
          }}
        >
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item name="name" label="数据源名称" rules={[{ required: true, message: '请输入数据源名称' }]}>
                <Input placeholder="例如：业务主库 MySQL" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="数据源类型" rules={[{ required: true, message: '请选择数据源类型' }]}>
                <Select
                  placeholder="请选择数据源类型"
                  options={typeOptions.map((item) => ({ label: item.typeName, value: item.type }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="数据源说明">
                <Input.TextArea rows={3} placeholder="说明该数据源承载的业务域、主要用途和后续导入目标" maxLength={300} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="启停状态" rules={[{ required: true, message: '请选择状态' }]}>
                <Select
                  options={[
                    { label: '启用', value: 1 },
                    { label: '停用', value: 0 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {fieldVisibility.showConnectionUri && (
            <Row gutter={[16, 8]}>
              <Col span={24}>
                <Form.Item name="connectionUri" label="连接 URI">
                  <Input placeholder="例如：bolt://127.0.0.1:7687 或 mongodb://user:pass@127.0.0.1:27017/db" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={[16, 8]}>
            {fieldVisibility.showHost && (
              <Col span={12}>
                <Form.Item
                  name="host"
                  label="主机地址"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('host')
                      ? [{ required: true, message: '请输入主机地址' }]
                      : undefined
                  }
                >
                  <Input placeholder="例如：127.0.0.1" />
                </Form.Item>
              </Col>
            )}
            {fieldVisibility.showPort && (
              <Col span={12}>
                <Form.Item
                  name="port"
                  label="端口"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('port')
                      ? [{ required: true, message: '请输入端口' }]
                      : undefined
                  }
                >
                  <InputNumber style={{ width: '100%' }} min={1} max={65535} placeholder="请输入端口" />
                </Form.Item>
              </Col>
            )}
            {fieldVisibility.showDatabaseName && (
              <Col span={12}>
                <Form.Item
                  name="databaseName"
                  label="数据库名称"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('databaseName')
                      ? [{ required: true, message: '请输入数据库名称' }]
                      : undefined
                  }
                >
                  <Input
                    placeholder={
                      '例如：ruoyi-vue-pro / admin / neo4j'
                    }
                  />
                </Form.Item>
              </Col>
            )}
            {fieldVisibility.showUsername && (
              <Col span={12}>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('username')
                      ? [{ required: true, message: '请输入用户名' }]
                      : undefined
                  }
                >
                  <Input placeholder="请输入用户名" autoComplete="off" />
                </Form.Item>
              </Col>
            )}
            {fieldVisibility.showPassword && (
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('password')
                      ? [{ required: true, message: '请输入密码' }]
                      : undefined
                  }
                  extra={editRecord ? '编辑时如需保留原密码，可直接使用当前值；后端会在空密码场景下兜底保留。' : undefined}
                >
                  <Input.Password placeholder="请输入密码" autoComplete="new-password" />
                </Form.Item>
              </Col>
            )}
          </Row>

          {currentTypeMeta?.propertyFields?.length ? (
            <Card
              size="small"
              title="类型专属参数"
              style={{ marginTop: 8, background: '#fafafa' }}
              bodyStyle={{ paddingBottom: 8 }}
            >
              <Row gutter={[16, 8]}>
                {currentTypeMeta.propertyFields.map((field) => (
                  <Col span={12} key={field.key}>
                    <Form.Item
                      name={['properties', field.key]}
                      label={field.label}
                      rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
                      extra={field.helpText}
                    >
                      {field.inputType === 'number' ? (
                        <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />
                      ) : field.inputType === 'password' ? (
                        <Input.Password placeholder={field.placeholder} />
                      ) : (
                        <Input placeholder={field.placeholder} />
                      )}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>
          ) : null}
        </Form>
      </Modal>
    </Space>
  );
}
