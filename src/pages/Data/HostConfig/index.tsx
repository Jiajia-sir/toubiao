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
  LinkOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
} from "@ant-design/icons";
import {
  createCollectHostConfig,
  getCollectHostConfigPage,
  removeCollectHostConfig,
  testCollectHostConfigConnection,
  toggleCollectHostConfigEnable,
  updateCollectHostConfig,
  type CollectHostConfigPageParams,
  type CollectHostConfigItem,
} from "@/services/biz/collect-host-config";

const { RangePicker } = DatePicker;

type StatusValue = 0 | 1;

interface SearchFormState {
  hostName: string;
  ip: string;
  port?: number;
  status?: StatusValue;
  createTime: [dayjs.Dayjs, dayjs.Dayjs] | null;
}

interface EditFormValues {
  hostName: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  status: StatusValue;
}

const pageSize = 10;

const defaultSearchState: SearchFormState = {
  hostName: "",
  ip: "",
  port: undefined,
  status: undefined,
  createTime: null,
};

const statusOptions = [
  { label: "全部状态", value: undefined },
  { label: "启用", value: 1 },
  { label: "停用", value: 0 },
];

function extractPageList(payload: any): any[] {
  return payload?.data?.list || payload?.data?.records || payload?.list || payload?.rows || [];
}

function extractPageTotal(payload: any): number {
  return Number(payload?.data?.total || payload?.total || 0);
}

function normalizeRecord(item: any): CollectHostConfigItem {
  return {
    id: Number(item?.id || 0),
    hostName: item?.hostName || "",
    ip: item?.ip || "",
    port: Number(item?.port || 0),
    username: item?.username || "",
    password: item?.password || "",
    status: Number(item?.status ?? 0),
    createTime: item?.createTime,
    updateTime: item?.updateTime,
  };
}

export default function HostConfigPage() {
  const [data, setData] = useState<CollectHostConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchState, setSearchState] = useState<SearchFormState>(defaultSearchState);

  const [modalVisible, setModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<CollectHostConfigItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<EditFormValues>();

  const fetchData = async (targetPage = page, filters = searchState) => {
    setLoading(true);
    try {
      const params: CollectHostConfigPageParams = {
        pageNo: targetPage,
        pageSize,
        hostName: filters.hostName || undefined,
        ip: filters.ip || undefined,
        port: typeof filters.port === "number" ? filters.port : undefined,
        status: typeof filters.status === "number" ? filters.status : undefined,
        createTime: [],
      };

      if (filters.createTime && filters.createTime.length === 2) {
        params.createTime = [
          filters.createTime[0].startOf("day").format("YYYY-MM-DD HH:mm:ss"),
          filters.createTime[1].endOf("day").format("YYYY-MM-DD HH:mm:ss"),
        ];
      }

      const res: any = await getCollectHostConfigPage(params);
      if (res?.code === 200 || res?.success === true || res?.data) {
        setData(extractPageList(res).map(normalizeRecord));
        setTotal(extractPageTotal(res));
      } else {
        message.error(res?.msg || "获取服务器配置列表失败");
      }
    } catch (error) {
      console.error(error);
      message.error("获取服务器配置列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, searchState);
  }, [page]);

  const openCreateModal = () => {
    setEditRecord(null);
    form.setFieldsValue({
      hostName: "",
      ip: "",
      port: 22,
      username: "",
      password: "",
      status: 1,
    });
    setModalVisible(true);
  };

  const openEditModal = (record: CollectHostConfigItem) => {
    setEditRecord(record);
    form.setFieldsValue({
      hostName: record.hostName,
      ip: record.ip,
      port: record.port,
      username: record.username,
      password: record.password || "",
      status: record.status as StatusValue,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = {
        id: editRecord?.id,
        hostName: values.hostName,
        ip: values.ip,
        port: values.port,
        username: values.username,
        password: values.password,
        status: values.status,
      };
      const res: any = editRecord
        ? await updateCollectHostConfig(payload)
        : await createCollectHostConfig(payload);

      if (res?.code === 200 || res?.success === true) {
        message.success(editRecord ? "服务器配置更新成功" : "服务器配置创建成功");
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
      const res: any = await removeCollectHostConfig(id);
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

  const handleTestConnection = async (id: number) => {
    try {
      const res: any = await testCollectHostConfigConnection(id);
      if (res?.code === 200 || res?.success === true) {
        message.success(res?.msg || "服务器连接测试成功");
      } else {
        message.error(res?.msg || "服务器连接测试失败");
      }
    } catch (error) {
      console.error(error);
      message.error("服务器连接测试失败");
    }
  };

  const handleToggleStatus = async (record: CollectHostConfigItem) => {
    try {
      const res: any = await toggleCollectHostConfigEnable(record.id);
      if (res?.code === 200 || res?.success === true) {
        message.success(record.status === 1 ? "服务器已停止" : "服务器已启动");
        fetchData(page, searchState);
      } else {
        message.error(res?.msg || "状态切换失败");
      }
    } catch (error) {
      console.error(error);
      message.error("状态切换失败");
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

  const columns: ColumnsType<CollectHostConfigItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "服务器名称",
      dataIndex: "hostName",
      key: "hostName",
      width: 180,
    },
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
      width: 160,
      render: (value) => value || "-",
    },
    {
      title: "端口",
      dataIndex: "port",
      key: "port",
      width: 100,
    },
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      width: 140,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value: number) =>
        value === 1 ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>,
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
      width: 320,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => handleTestConnection(record.id)}
          >
            测试连接
          </Button>
          <Popconfirm
            title={record.status === 1 ? "确认停止该服务器吗？" : "确认启动该服务器吗？"}
            onConfirm={() => handleToggleStatus(record)}
          >
            <Button
              type="link"
              size="small"
              icon={record.status === 1 ? <StopOutlined /> : <PlayCircleOutlined />}
            >
              {record.status === 1 ? "停止" : "启动"}
            </Button>
          </Popconfirm>
          <Popconfirm title="确认删除该服务器配置吗？" onConfirm={() => handleDelete(record.id)}>
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
                <div style={{ fontSize: 26, fontWeight: 600, color: "#262626" }}>服务器配置</div>
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
                  placeholder="请输入服务器名称"
                  allowClear
                  value={searchState.hostName}
                  onChange={(e) => setSearchState((prev) => ({ ...prev, hostName: e.target.value }))}
                  style={{ width: 220 }}
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Col>
              <Col>
                <Input
                  placeholder="请输入 IP"
                  allowClear
                  value={searchState.ip}
                  onChange={(e) => setSearchState((prev) => ({ ...prev, ip: e.target.value }))}
                  style={{ width: 180 }}
                />
              </Col>
              <Col>
                <InputNumber
                  placeholder="端口"
                  min={0}
                  value={searchState.port}
                  onChange={(value) => setSearchState((prev) => ({ ...prev, port: value ?? undefined }))}
                  style={{ width: 120 }}
                />
              </Col>
              <Col>
                <Select
                  allowClear
                  placeholder="请选择状态"
                  value={searchState.status}
                  onChange={(value) => setSearchState((prev) => ({ ...prev, status: value }))}
                  style={{ width: 140 }}
                  options={statusOptions.slice(1)}
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
              scroll={{ x: 1200 }}
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
        title={editRecord ? "编辑服务器配置" : "新增服务器配置"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditRecord(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="hostName"
                label="服务器名称"
                rules={[{ required: true, message: "请输入服务器名称" }]}
              >
                <Input placeholder="请输入服务器名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: "请选择状态" }]}
              >
                <Select
                  options={[
                    { label: "启用", value: 1 },
                    { label: "停用", value: 0 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ip" label="IP 地址" rules={[{ required: true, message: "请输入 IP 地址" }]}>
                <Input placeholder="请输入 IP 地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="port" label="端口" rules={[{ required: true, message: "请输入端口" }]}>
                <InputNumber min={0} style={{ width: "100%" }} placeholder="请输入端口" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: "请输入用户名" }]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: !editRecord, message: "请输入密码" }]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
