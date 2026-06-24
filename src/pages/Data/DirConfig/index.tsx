"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  createCollectDirConfig,
  getCollectDirConfigPage,
  removeCollectDirConfig,
  updateCollectDirConfig,
  type CollectDirConfigItem,
  type CollectDirConfigPageParams,
} from "@/services/biz/collect-dir-config";
import { getCatalogTypeList } from "@/services/biz/catalogType";
import {
  getCollectHostConfigPage,
  type CollectHostConfigItem,
} from "@/services/biz/collect-host-config";
import { getChannelConfigPage, type ChannelConfigItem } from "@/services/biz/channel-config";
import { getKnowledgeBaseList, type KnowledgeBaseItem } from "@/services/biz/knowledge-base";
import { getTagPage, type TagItem } from "@/services/biz/tag";

const { RangePicker } = DatePicker;

type StatusValue = 0 | 1 | 2;
type ToggleValue = 0 | 1;

interface SearchFormState {
  name: string;
  inputPath: string;
  errorPath: string;
  backPath: string;
  hostId?: number;
  status?: StatusValue;
  createTime: [dayjs.Dayjs, dayjs.Dayjs] | null;
}

interface EditFormValues {
  name: string;
  catalogId: number;
  channelConfigId: number;
  knowledgeBaseIds: Array<number | string>;
  fileTagIds: Array<number | string>;
  enableOcr: ToggleValue;
  enableTrans: ToggleValue;
  enableExtract: ToggleValue;
  inputPath: string;
  errorPath: string;
  backPath: string;
  hostId: number;
  pollInterval: number;
}

interface SelectOption {
  label: string;
  value: number;
}

const pageSize = 10;

const defaultSearchState: SearchFormState = {
  name: "",
  inputPath: "",
  errorPath: "",
  backPath: "",
  hostId: undefined,
  status: undefined,
  createTime: null,
};

const toggleOptions = [
  { label: "开启", value: 1 },
  { label: "关闭", value: 0 },
];

const statusOptions = [
  { label: "启用", value: 1, color: "success" },
  { label: "停用", value: 0, color: "default" },
];

function extractPageList(payload: any): any[] {
  return payload?.data?.list || payload?.data?.records || payload?.list || payload?.rows || [];
}

function extractPageTotal(payload: any): number {
  return Number(payload?.data?.total || payload?.total || 0);
}

function toIdArray(value?: string): number[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item));
}

function toIdString(values?: Array<number | string>): string {
  return (values || [])
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join(",");
}

function normalizeRecord(item: any): CollectDirConfigItem {
  return {
    id: Number(item?.id || 0),
    name: item?.name || "",
    catalogId: Number(item?.catalogId || 0),
    catalogName: item?.catalogName || "",
    channelConfigId: Number(item?.channelConfigId || 0),
    channelConfigName: item?.channelConfigName || item?.channelName || "",
    knowledgeBaseIds: item?.knowledgeBaseIds || "",
    knowledgeBaseNames: item?.knowledgeBaseNames || "",
    fileTagIds: item?.fileTagIds || "",
    fileTagNames: item?.fileTagNames || "",
    enableOcr: Number(item?.enableOcr ?? 0),
    enableTrans: Number(item?.enableTrans ?? 0),
    enableExtract: Number(item?.enableExtract ?? 0),
    inputPath: item?.inputPath || "",
    errorPath: item?.errorPath || "",
    backPath: item?.backPath || "",
    hostId: Number(item?.hostId || 0),
    hostName: item?.hostName || "",
    pollInterval: Number(item?.pollInterval || 0),
    status: typeof item?.status === "number" ? item.status : undefined,
    createTime: item?.createTime,
    updateTime: item?.updateTime,
  };
}

function getStatusTag(status?: number) {
  const option = statusOptions.find((item) => item.value === status);
  if (!option) {
    return <Tag>{status ?? "-"}</Tag>;
  }
  return <Tag color={option.color}>{option.label}</Tag>;
}

function renderToggleTag(value: number) {
  return value === 1 ? <Tag color="success">开启</Tag> : <Tag>关闭</Tag>;
}

export default function DirConfigPage() {
  const [data, setData] = useState<CollectDirConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchState, setSearchState] = useState<SearchFormState>(defaultSearchState);

  const [modalVisible, setModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<CollectDirConfigItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<EditFormValues>();

  const [catalogOptions, setCatalogOptions] = useState<SelectOption[]>([]);
  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  const [hostOptions, setHostOptions] = useState<SelectOption[]>([]);
  const [knowledgeOptions, setKnowledgeOptions] = useState<SelectOption[]>([]);
  const [tagOptions, setTagOptions] = useState<SelectOption[]>([]);

  const fetchOptions = async () => {
    try {
      const [catalogRes, channelRes, hostRes, knowledgeRes, tagRes]: any = await Promise.all([
        getCatalogTypeList(),
        getChannelConfigPage({ pageNo: 1, pageSize: 1000 }),
        getCollectHostConfigPage({ pageNo: 1, pageSize: 1000 }),
        getKnowledgeBaseList({ pageNo: 1, pageSize: 1000 }),
        getTagPage({ pageNo: 1, pageSize: 1000 }),
      ]);

      setCatalogOptions(
        (catalogRes?.data || catalogRes || []).map((item: any) => ({
          label: item.name,
          value: Number(item.id),
        })),
      );
      setChannelOptions(
        extractPageList(channelRes).map((item: ChannelConfigItem) => ({
          label: item.name,
          value: Number(item.id),
        })),
      );
      setHostOptions(
        extractPageList(hostRes).map((item: CollectHostConfigItem) => ({
          label: item.hostName,
          value: Number(item.id),
        })),
      );
      setKnowledgeOptions(
        extractPageList(knowledgeRes).map((item: KnowledgeBaseItem) => ({
          label: item.name,
          value: Number(item.id),
        })),
      );
      setTagOptions(
        extractPageList(tagRes).map((item: TagItem) => ({
          label: item.tag,
          value: Number(item.id),
        })),
      );
    } catch (error) {
      console.error(error);
      message.error("获取关联配置选项失败");
    }
  };

  const fetchData = async (targetPage = page, filters = searchState) => {
    setLoading(true);
    try {
      const params: CollectDirConfigPageParams = {
        pageNo: targetPage,
        pageSize,
        name: filters.name || undefined,
        inputPath: filters.inputPath || undefined,
        errorPath: filters.errorPath || undefined,
        backPath: filters.backPath || undefined,
        hostId: typeof filters.hostId === "number" ? filters.hostId : undefined,
        status: typeof filters.status === "number" ? filters.status : undefined,
        createTime: [],
      };

      if (filters.createTime && filters.createTime.length === 2) {
        params.createTime = [
          filters.createTime[0].startOf("day").format("YYYY-MM-DD HH:mm:ss"),
          filters.createTime[1].endOf("day").format("YYYY-MM-DD HH:mm:ss"),
        ];
      }

      const res: any = await getCollectDirConfigPage(params);
      if (res?.code === 200 || res?.success === true || res?.data) {
        setData(extractPageList(res).map(normalizeRecord));
        setTotal(extractPageTotal(res));
      } else {
        message.error(res?.msg || "获取线路配置列表失败");
      }
    } catch (error) {
      console.error(error);
      message.error("获取线路配置列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchData(page, searchState);
  }, [page]);

  const openCreateModal = () => {
    setEditRecord(null);
    form.setFieldsValue({
      name: "",
      catalogId: undefined as unknown as number,
      channelConfigId: undefined as unknown as number,
      knowledgeBaseIds: [],
      fileTagIds: [],
      enableOcr: 0,
      enableTrans: 0,
      enableExtract: 0,
      inputPath: "",
      errorPath: "",
      backPath: "",
      hostId: undefined as unknown as number,
      pollInterval: 5,
    });
    setModalVisible(true);
  };

  const openEditModal = (record: CollectDirConfigItem) => {
    setEditRecord(record);
    form.setFieldsValue({
      name: record.name,
      catalogId: record.catalogId,
      channelConfigId: record.channelConfigId,
      knowledgeBaseIds: toIdArray(record.knowledgeBaseIds),
      fileTagIds: toIdArray(record.fileTagIds),
      enableOcr: record.enableOcr as ToggleValue,
      enableTrans: record.enableTrans as ToggleValue,
      enableExtract: record.enableExtract as ToggleValue,
      inputPath: record.inputPath,
      errorPath: record.errorPath,
      backPath: record.backPath,
      hostId: record.hostId,
      pollInterval: record.pollInterval || 5,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = {
        id: editRecord?.id,
        name: values.name,
        catalogId: Number(values.catalogId),
        channelConfigId: Number(values.channelConfigId),
        knowledgeBaseIds: toIdString(values.knowledgeBaseIds),
        fileTagIds: toIdString(values.fileTagIds),
        enableOcr: Number(values.enableOcr),
        enableTrans: Number(values.enableTrans),
        enableExtract: Number(values.enableExtract),
        inputPath: values.inputPath,
        errorPath: values.errorPath,
        backPath: values.backPath,
        hostId: Number(values.hostId),
        pollInterval: Number(values.pollInterval),
      };

      const res: any = editRecord
        ? await updateCollectDirConfig(payload)
        : await createCollectDirConfig(payload);

      if (res?.code === 200 || res?.success === true) {
        message.success(editRecord ? "线路配置更新成功" : "线路配置创建成功");
        setModalVisible(false);
        setEditRecord(null);
        form.resetFields();
        fetchData(editRecord ? page : 1, searchState);
        if (!editRecord) {
          setPage(1);
        }
      } else {
        message.error(res?.msg || (editRecord ? "更新失败" : "创建失败"));
      }
    } catch (error) {
      console.error(error);
      message.error(editRecord ? "更新失败" : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res: any = await removeCollectDirConfig(id);
      if (res?.code === 200 || res?.success === true) {
        message.success("删除成功");
        fetchData(page, searchState);
      } else {
        message.error(res?.msg || "删除失败");
      }
    } catch (error) {
      console.error(error);
      message.error("删除失败");
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchData(1, searchState);
  };

  const handleReset = () => {
    setSearchState(defaultSearchState);
    setPage(1);
    fetchData(1, defaultSearchState);
  };

  const columns: ColumnsType<CollectDirConfigItem> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "线路名称", dataIndex: "name", key: "name", width: 160 },
    {
      title: "编目",
      dataIndex: "catalogName",
      key: "catalogName",
      width: 180,
      render: (_, record) => record.catalogName || record.catalogId || "-",
    },
    {
      title: "渠道",
      dataIndex: "channelConfigName",
      key: "channelConfigName",
      width: 140,
      render: (_, record) => record.channelConfigName || record.channelConfigId || "-",
    },
    {
      title: "服务器",
      dataIndex: "hostName",
      key: "hostName",
      width: 160,
      render: (_, record) => record.hostName || record.hostId || "-",
    },
    {
      title: "读取路径",
      dataIndex: "inputPath",
      key: "inputPath",
      width: 220,
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "错误路径",
      dataIndex: "errorPath",
      key: "errorPath",
      width: 220,
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "备份路径",
      dataIndex: "backPath",
      key: "backPath",
      width: 220,
      ellipsis: true,
      render: (value) => value || "-",
    },
    { title: "OCR", dataIndex: "enableOcr", key: "enableOcr", width: 90, render: renderToggleTag },
    { title: "翻译", dataIndex: "enableTrans", key: "enableTrans", width: 90, render: renderToggleTag },
    { title: "抽取", dataIndex: "enableExtract", key: "enableExtract", width: 90, render: renderToggleTag },
    { title: "轮询间隔(秒)", dataIndex: "pollInterval", key: "pollInterval", width: 120 },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (value: number | undefined) => getStatusTag(value),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-"),
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      fixed: "right",
      render: (_, record) => (
        <Space size={4} wrap>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该线路配置吗？" onConfirm={() => handleDelete(record.id)}>
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
            <Row justify="space-between" align="middle">
              <Col>
                <div style={{ fontSize: 26, fontWeight: 600, color: "#262626" }}>线路配置</div>
              </Col>
              <Col>
                <Space>
                  <span style={{ color: "#8c8c8c", marginRight: 8 }}>共 {total} 条数据</span>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    刷新
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    新增
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
                  placeholder="请输入线路名称"
                  allowClear
                  value={searchState.name}
                  onChange={(e) => setSearchState((prev) => ({ ...prev, name: e.target.value }))}
                  style={{ width: 200 }}
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Col>
              <Col>
                <Input
                  placeholder="读取路径"
                  allowClear
                  value={searchState.inputPath}
                  onChange={(e) => setSearchState((prev) => ({ ...prev, inputPath: e.target.value }))}
                  style={{ width: 220 }}
                />
              </Col>
              <Col>
                <Input
                  placeholder="错误路径"
                  allowClear
                  value={searchState.errorPath}
                  onChange={(e) => setSearchState((prev) => ({ ...prev, errorPath: e.target.value }))}
                  style={{ width: 220 }}
                />
              </Col>
              <Col>
                <Input
                  placeholder="备份路径"
                  allowClear
                  value={searchState.backPath}
                  onChange={(e) => setSearchState((prev) => ({ ...prev, backPath: e.target.value }))}
                  style={{ width: 220 }}
                />
              </Col>
              <Col>
                <Select
                  allowClear
                  placeholder="选择服务器"
                  value={searchState.hostId}
                  onChange={(value) => setSearchState((prev) => ({ ...prev, hostId: value }))}
                  style={{ width: 180 }}
                  options={hostOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </Col>
              <Col>
                <Select
                  allowClear
                  placeholder="选择状态"
                  value={searchState.status}
                  onChange={(value) => setSearchState((prev) => ({ ...prev, status: value }))}
                  style={{ width: 140 }}
                  options={statusOptions.map(({ label, value }) => ({ label, value }))}
                />
              </Col>
              <Col>
                <RangePicker
                  value={searchState.createTime as any}
                  onChange={(dates) =>
                    setSearchState((prev) => ({ ...prev, createTime: (dates as any) || null }))
                  }
                  style={{ width: 280 }}
                />
              </Col>
              <Col>
                <Button type="primary" onClick={handleSearch}>
                  搜索
                </Button>
                <Button onClick={handleReset} style={{ marginLeft: 8 }}>
                  重置
                </Button>
              </Col>
            </Row>
          </div>

          <div style={{ padding: "0 24px" }}>
            <Table
              dataSource={data}
              columns={columns}
              rowKey="id"
              pagination={false}
              loading={loading}
              scroll={{ x: 2300 }}
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
              onChange={setPage}
              showTotal={(count) => `共 ${count} 条记录`}
            />
          </div>
        </Card>
      </div>

      <Modal
        title={editRecord ? "编辑线路配置" : "新增线路配置"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditRecord(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnHidden
        width={900}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="线路名称"
                rules={[{ required: true, message: "请输入线路名称" }]}
              >
                <Input placeholder="请输入线路名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="catalogId"
                label="编目"
                rules={[{ required: true, message: "请选择编目" }]}
              >
                <Select options={catalogOptions} placeholder="请选择编目" showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="channelConfigId"
                label="来源渠道"
                rules={[{ required: true, message: "请选择来源渠道" }]}
              >
                <Select options={channelOptions} placeholder="请选择来源渠道" showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="hostId"
                label="服务器"
                rules={[{ required: true, message: "请选择服务器" }]}
              >
                <Select options={hostOptions} placeholder="请选择服务器" showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="knowledgeBaseIds"
                label="知识库"
              >
                <Select
                  mode="multiple"
                  allowClear
                  options={knowledgeOptions}
                  placeholder="请选择知识库"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fileTagIds"
                label="文件标签"
              >
                <Select
                  mode="multiple"
                  allowClear
                  options={tagOptions}
                  placeholder="请选择文件标签"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="enableOcr"
                label="OCR"
                rules={[{ required: true, message: "请选择 OCR 状态" }]}
              >
                <Select options={toggleOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="enableTrans"
                label="翻译"
                rules={[{ required: true, message: "请选择翻译状态" }]}
              >
                <Select options={toggleOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="enableExtract"
                label="抽取"
                rules={[{ required: true, message: "请选择抽取状态" }]}
              >
                <Select options={toggleOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="inputPath"
                label="读取路径"
                rules={[{ required: true, message: "请输入读取路径" }]}
              >
                <Input placeholder="请输入读取路径" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pollInterval"
                label="轮询间隔(秒)"
                rules={[{ required: true, message: "请输入轮询间隔" }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} placeholder="请输入轮询间隔" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="errorPath"
                label="错误路径"
                rules={[{ required: true, message: "请输入错误路径" }]}
              >
                <Input placeholder="请输入错误路径" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="backPath"
                label="备份路径"
                rules={[{ required: true, message: "请输入备份路径" }]}
              >
                <Input placeholder="请输入备份路径" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
