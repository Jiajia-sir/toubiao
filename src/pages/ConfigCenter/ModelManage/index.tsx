"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  addLlmModelConfig,
  getLlmModelConfigPage,
  removeLlmModelConfig,
  testLlmModelConfig,
  updateLlmModelConfig,
  type LlmModelConfigItem,
} from "@/services/biz/llm-model-config";

type EnabledFilter = "all" | "1" | "0";

interface PageItem extends LlmModelConfigItem {
  key: number;
}

const pageSize = 10;

const providerOptions = [
  { label: "vLLM", value: "vllm" },
  { label: "Ollama", value: "ollama" },
  { label: "Sub2API", value: "sub2api" },
  { label: "OpenAI", value: "openai" },
  { label: "Claude", value: "claude" },
];

const apiTypeOptions = [
  { label: "OpenAI 兼容协议", value: "openai" },
  { label: "Claude 协议", value: "claude" },
];

const enabledOptions = [
  { label: "全部状态", value: "all" },
  { label: "启用", value: "1" },
  { label: "停用", value: "0" },
];

function extractList(payload: any): PageItem[] {
  const list = payload?.data?.list || payload?.list || payload?.rows || [];
  return Array.isArray(list)
    ? list.map((item: LlmModelConfigItem) => ({
        ...item,
        key: item.id,
      }))
    : [];
}

function extractTotal(payload: any): number {
  return Number(payload?.data?.total || payload?.total || 0);
}

function getProviderLabel(value: string) {
  return providerOptions.find((item) => item.value === value)?.label || value;
}

function getApiTypeLabel(value: string) {
  return apiTypeOptions.find((item) => item.value === value)?.label || value;
}

function formatJsonPreview(value?: string) {
  if (!value) {
    return "";
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (_error) {
    return value;
  }
}

export default function ModelManagePage() {
  const [list, setList] = useState<PageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [editingItem, setEditingItem] = useState<PageItem | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchProviderType, setSearchProviderType] = useState<string | undefined>(undefined);
  const [searchApiType, setSearchApiType] = useState<string | undefined>(undefined);
  const [searchEnabled, setSearchEnabled] = useState<EnabledFilter>("all");
  const [form] = Form.useForm();

  const fetchList = async (
    currentPage = page,
    filters = {
      name: searchName,
      providerType: searchProviderType,
      apiType: searchApiType,
      enabled: searchEnabled,
    },
  ) => {
    setLoading(true);
    try {
      const res: any = await getLlmModelConfigPage({
        pageNo: currentPage,
        pageSize,
        name: filters.name.trim() || undefined,
        providerType: filters.providerType || undefined,
        apiType: filters.apiType || undefined,
        enabled: filters.enabled === "all" ? undefined : Number(filters.enabled),
      });
      if (res?.code === 200 || res?.data) {
        setList(extractList(res));
        setTotal(extractTotal(res));
      } else {
        message.error(res?.msg || "获取模型列表失败");
      }
    } catch (error) {
      console.error(error);
      message.error("获取模型列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
  }, []);

  const handleProviderChange = (value: string) => {
    if (value === "claude") {
      form.setFieldValue("apiType", "claude");
      return;
    }
    if (form.getFieldValue("apiType") === "claude") {
      form.setFieldValue("apiType", "openai");
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    form.setFieldsValue({
      name: "",
      providerType: "vllm",
      apiType: "openai",
      baseUrl: "",
      modelCode: "",
      apiKey: "",
      enabled: true,
      sort: 0,
      remark: "",
    });
    setModalVisible(true);
  };

  const openEditModal = (record: PageItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      name: record.name,
      providerType: record.providerType,
      apiType: record.apiType,
      baseUrl: record.baseUrl,
      modelCode: record.modelCode,
      apiKey: "",
      enabled: Number(record.enabled) === 1,
      sort: record.sort ?? 0,
      remark: record.remark || "",
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
    form.resetFields();
  };

  const buildSubmitPayload = async () => {
    const values = await form.validateFields();
    return {
      id: editingItem?.id,
      name: values.name.trim(),
      providerType: values.providerType,
      apiType: values.apiType,
      baseUrl: values.baseUrl.trim(),
      modelCode: values.modelCode.trim(),
      apiKey: values.apiKey?.trim() || "",
      enabled: values.enabled ? 1 : 0,
      sort: Number(values.sort || 0),
      remark: values.remark?.trim() || "",
    };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = await buildSubmitPayload();
      const res: any = editingItem
        ? await updateLlmModelConfig(payload)
        : await addLlmModelConfig(payload);
      if (res?.code === 200) {
        message.success(editingItem ? "模型配置已更新" : "模型配置已创建");
        closeModal();
        const nextPage = editingItem ? page : 1;
        setPage(nextPage);
        fetchList(nextPage);
      } else {
        message.error(res?.msg || (editingItem ? "更新失败" : "创建失败"));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res: any = await removeLlmModelConfig(id);
      if (res?.code === 200) {
        message.success("删除成功");
        const nextPage = list.length === 1 && page > 1 ? page - 1 : page;
        setPage(nextPage);
        fetchList(nextPage);
      } else {
        message.error(res?.msg || "删除失败");
      }
    } catch (error) {
      console.error(error);
      message.error("删除失败");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const payload = await buildSubmitPayload();
      const res: any = await testLlmModelConfig({
        providerType: payload.providerType,
        apiType: payload.apiType,
        baseUrl: payload.baseUrl,
        modelCode: payload.modelCode,
        apiKey: payload.apiKey,
      });
      if (res?.code === 200) {
        const result = res?.data;
        Modal.info({
          title: result?.success ? "模型测试成功" : "模型测试结果",
          width: 720,
          content: (
            <div style={{ marginTop: 12 }}>
              <p>结果说明：{result?.message || "-"}</p>
              <p>耗时：{result?.latencyMs ? `${result.latencyMs} ms` : "-"}</p>
              <Input.TextArea
                value={formatJsonPreview(result?.responsePreview)}
                rows={12}
                readOnly
                placeholder="无响应预览"
              />
            </div>
          ),
        });
      } else {
        message.error(res?.msg || "模型测试失败");
      }
    } catch (error) {
      console.error(error);
      message.error("模型测试失败");
    } finally {
      setTesting(false);
    }
  };

  const columns: ColumnsType<PageItem> = [
    {
      title: "模型名称",
      dataIndex: "name",
      key: "name",
      width: 240,
      render: (_value, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "#262626" }}>{record.name}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
            {record.remark || "暂无备注"}
          </div>
        </div>
      ),
    },
    {
      title: "提供方",
      dataIndex: "providerType",
      key: "providerType",
      width: 120,
      render: (value) => <Tag color="blue">{getProviderLabel(value)}</Tag>,
    },
    {
      title: "协议",
      dataIndex: "apiType",
      key: "apiType",
      width: 160,
      render: (value) => <Tag color="purple">{getApiTypeLabel(value)}</Tag>,
    },
    {
      title: "模型编码",
      dataIndex: "modelCode",
      key: "modelCode",
      width: 200,
    },
    {
      title: "基础地址",
      dataIndex: "baseUrl",
      key: "baseUrl",
      ellipsis: true,
    },
    {
      title: "API Key",
      dataIndex: "apiKeyMasked",
      key: "apiKeyMasked",
      width: 160,
      render: (value) => value || "未设置",
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      width: 100,
      render: (value) => (
        <Tag color={Number(value) === 1 ? "success" : "default"}>
          {Number(value) === 1 ? "启用" : "停用"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "--"),
    },
    {
      title: "操作",
      key: "action",
      width: 220,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该模型配置？"
            okText="确认"
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px)" }}>
        <Card styles={{ body: { flex: 1, minHeight: "86vh" } }}>
          <div style={{ padding: 24, borderBottom: "1px solid #f0f0f0" }}>
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
              <Col>
                <div style={{ fontSize: 26, fontWeight: 600, color: "#262626" }}>
                  模型管理
                </div>
                <div style={{ marginTop: 6, color: "#8c8c8c" }}>
                  统一维护本地 vLLM、Ollama等模型接入配置。
                </div>
              </Col>
              <Col>
                <Space>
                  <Tag color="blue">总数 {total}</Tag>
                  <Button icon={<ReloadOutlined />} onClick={() => fetchList(page)}>
                    刷新
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                    新增模型
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #f0f0f0",
              background: "linear-gradient(180deg, #f7f9fc 0%, #fff 100%)",
            }}
          >
            <Row gutter={[16, 12]}>
              <Col>
                <Input
                  placeholder="请输入模型名称"
                  allowClear
                  value={searchName}
                  onChange={(event) => setSearchName(event.target.value)}
                  onPressEnter={() => {
                    setPage(1);
                    fetchList(1);
                  }}
                  style={{ width: 220 }}
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Col>
              <Col>
                <Select
                  allowClear
                  placeholder="提供方类型"
                  value={searchProviderType}
                  onChange={setSearchProviderType}
                  style={{ width: 160 }}
                  options={providerOptions}
                />
              </Col>
              <Col>
                <Select
                  allowClear
                  placeholder="协议类型"
                  value={searchApiType}
                  onChange={setSearchApiType}
                  style={{ width: 180 }}
                  options={apiTypeOptions}
                />
              </Col>
              <Col>
                <Select
                  value={searchEnabled}
                  onChange={setSearchEnabled}
                  style={{ width: 140 }}
                  options={enabledOptions}
                />
              </Col>
              <Col>
                <Space>
                  <Button
                    type="primary"
                    onClick={() => {
                      setPage(1);
                      fetchList(1);
                    }}
                  >
                    搜索
                  </Button>
                  <Button
                    onClick={() => {
                      setSearchName("");
                      setSearchProviderType(undefined);
                      setSearchApiType(undefined);
                      setSearchEnabled("all");
                      setPage(1);
                      fetchList(1, {
                        name: "",
                        providerType: undefined,
                        apiType: undefined,
                        enabled: "all",
                      });
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          <div style={{ padding: "0 24px" }}>
            <Table
              dataSource={list}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={false}
              scroll={{ x: 1400 }}
            />
          </div>

          <div
            style={{
              padding: 16,
              display: "flex",
              justifyContent: "flex-end",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(nextPage) => {
                setPage(nextPage);
                fetchList(nextPage);
              }}
              showSizeChanger={false}
              showTotal={(value) => `共 ${value} 条记录`}
            />
          </div>
        </Card>
      </div>

      <Modal
        title={editingItem ? "编辑模型配置" : "新增模型配置"}
        open={modalVisible}
        onCancel={closeModal}
        width={760}
        footer={[
          <Button key="test" icon={<ApiOutlined />} loading={testing} onClick={handleTest}>
            测试连接
          </Button>,
          <Button key="cancel" onClick={closeModal}>
            取消
          </Button>,
          <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
            保存
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="模型名称"
                rules={[{ required: true, message: "请输入模型名称" }]}
              >
                <Input placeholder="例如：本地 Qwen 2.5 7B" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="enabled"
                label="是否启用"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="providerType"
                label="提供方类型"
                rules={[{ required: true, message: "请选择提供方类型" }]}
              >
                <Select options={providerOptions} onChange={handleProviderChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="apiType"
                label="协议类型"
                rules={[{ required: true, message: "请选择协议类型" }]}
              >
                <Select options={apiTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="baseUrl"
                label="基础地址"
                rules={[{ required: true, message: "请输入基础地址" }]}
              >
                <Input placeholder="例如：http://127.0.0.1:11434/v1 或 https://api.openai.com/v1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="modelCode"
                label="模型编码"
                rules={[{ required: true, message: "请输入模型编码" }]}
              >
                <Input placeholder="例如：qwen2.5:7b 或 gpt-4o-mini" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sort" label="排序号">
                <Input type="number" placeholder="默认 0" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="apiKey" label="API Key">
                <Input.Password
                  placeholder={editingItem ? "留空表示保持原有 API Key 不变" : "本地无密码服务可留空"}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={3} placeholder="说明该模型的使用场景，例如知识抽取、问答、推理等" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

