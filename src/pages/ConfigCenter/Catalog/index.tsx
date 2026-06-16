"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  Card,
  Button,
  Space,
  Input,
  Table,
  Tag,
  Row,
  Col,
  Tabs,
  Modal,
  Form,
  message,
  Divider,
  Select,
  DatePicker,
  Pagination,
  Popconfirm,
  Checkbox,
  Tooltip,
  Radio,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  getCatalogTypePage,
  addCatalogType,
  updateCatalogType,
  removeCatalogType,
} from "@/services/biz/catalogType";

interface CatalogItem {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  status: "published" | "pending" | "rejected";
  resourceCount: number;
  createTime: string;
  creator: string;
  metadataFields: MetadataField[];
}

interface MetadataField {
  key: string;
  name: string;
  type: string;
  required: boolean;
  isSystem?: boolean;
}





const fieldTypeOptions = [
  { label: "字符串", value: "字符串" },
  { label: "数值", value: "数值" },
  { label: "日期", value: "日期" },
  { label: "布尔值", value: "布尔值" },
];

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchCreator, setSearchCreator] = useState("");
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentCatalog, setCurrentCatalog] = useState<CatalogItem | null>(
    null,
  );
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    { key: "1", name: "标题", type: "字符串", required: true, isSystem: true },
    { key: "2", name: "作者", type: "字符串", required: true, isSystem: true },
  ]);

  const fetchCatalogs = async (currentPage = page) => {
    setLoading(true);
    try {
      const res: any = await getCatalogTypePage({
        pageNo: currentPage,
        pageSize,
        name: searchName || undefined,
        createTime: dateRange || undefined,
      });
      if (res && res.code === 200) {
        setCatalogs(res.data?.list || res.rows || []);
        setTotal(res.data?.total || res.total || 0);
      } else {
        message.error(res?.msg || "获取列表失败");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs(page);
  }, [page]);



  const columns = [
    {
      title: "编目ID",
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: "编目名称",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name: string, record: CatalogItem) => (
        <span style={{ fontWeight: 600 }}>{name}</span>
      ),
    },
    {
      title: "编目描述",
      dataIndex: "description",
      key: "description",
      width: 200,
      render: (text: string) => text || "--",
    },

    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 160,
      render: (time: number | string) => time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "--",
    },
    {
      title: "创建人",
      dataIndex: "creatorNickname",
      key: "creatorNickname",
      width: 100,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: any, record: CatalogItem) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedRows,
    onChange: (keys: React.Key[]) => {
      setSelectedRows(keys as string[]);
    },
  };

  const handleAdd = () => {
    form.validateFields().then(async (values) => {
      try {
        const res: any = await addCatalogType({
          name: values.name,
          description: values.description || "",
        });
        if (res && res.code === 200) {
          message.success("新增成功");
          setAddModalVisible(false);
          form.resetFields();
          fetchCatalogs(1);
          setPage(1);
        } else {
          message.error(res?.msg || "新增失败");
        }
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleEdit = (record: CatalogItem) => {
    setCurrentCatalog(record);
    editForm.setFieldsValue({
      name: record.name,
      description: record.description,
      status: record.status,
    });
    setMetadataFields([
      ...(record.metadataFields || []),
      { key: Date.now().toString(), name: "", type: "字符串", required: false },
    ]);
    setEditModalVisible(true);
  };

  const handleUpdate = () => {
    if (!currentCatalog) return;
    editForm.validateFields().then(async (values) => {
      try {
        const res: any = await updateCatalogType({
          id: currentCatalog.id,
          name: values.name,
          description: values.description,
        });
        if (res && res.code === 200) {
          message.success("更新成功");
          setEditModalVisible(false);
          fetchCatalogs(page);
        } else {
          message.error(res?.msg || "更新失败");
        }
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleBatchDelete = () => {
    if (selectedRows.length === 0) {
      message.warning("请选择要删除的项");
      return;
    }
    setCatalogs(catalogs.filter((item) => !selectedRows.includes(item.id)));
    setSelectedRows([]);
    message.success(`已删除${selectedRows.length}条记录`);
  };

  const handleDelete = async (id: string) => {
    try {
      const res: any = await removeCatalogType(id);
      if (res && res.code === 200) {
        message.success("删除成功");
        fetchCatalogs(page);
      } else {
        message.error(res?.msg || "删除失败");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReset = () => {
    setSearchName("");
    setSearchCreator("");
    setDateRange(null);
    setSelectedRows([]);
    setPage(1);
    fetchCatalogs(1);
    message.success("已刷新");
  };

  const addMetadataField = () => {
    setMetadataFields([
      ...metadataFields,
      {
        key: Date.now().toString(),
        name: "",
        type: "字符串",
        required: false,
      },
    ]);
  };

  const removeMetadataField = (key: string) => {
    const field = metadataFields.find((f) => f.key === key);
    if (field?.isSystem) {
      message.warning("系统预置字段不可删除");
      return;
    }
    setMetadataFields(metadataFields.filter((f) => f.key !== key));
  };

  const updateMetadataField = (
    key: string,
    field: string,
    value: string | boolean,
  ) => {
    setMetadataFields(
      metadataFields.map((f) => (f.key === key ? { ...f, [field]: value } : f)),
    );
  };

  return (
    <>
      <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px)" }}>
        <Card styles={{ body: { flex: 1, minHeight: "86vh" } }}>
          <div style={{ padding: 24, borderBottom: "1px solid #f0f0f0" }}>
            <Row justify="space-between" align="middle">
              <Col>
                <div
                  style={{ fontSize: 26, fontWeight: 600, color: "#262626" }}
                >
                  编目管理
                </div>
              </Col>
              <Col>
                <Space>
                  <span style={{ color: "#8c8c8c", marginRight: 8 }}>
                    共{total}条数据
                  </span>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    刷新
                  </Button>
                  <Button
                    onClick={handleBatchDelete}
                    disabled={selectedRows.length === 0}
                  >
                    批量删除
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddModalVisible(true)}
                  >
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
                  placeholder="请输入编目名称关键词"
                  allowClear
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  style={{ width: 220 }}
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Col>

              <Col>
                <DatePicker.RangePicker
                  placeholder={["开始日期", "结束日期"]}
                  onChange={(dates) => {
                    if (dates) {
                      setDateRange([
                        dates[0]?.format("YYYY-MM-DD") || "",
                        dates[1]?.format("YYYY-MM-DD") || "",
                      ]);
                    } else {
                      setDateRange(null);
                    }
                  }}
                  style={{ width: 240 }}
                />
              </Col>
              {/* <Col>
                <Input
                  placeholder="请输入创建人姓名"
                  allowClear
                  value={searchCreator}
                  onChange={(e) => setSearchCreator(e.target.value)}
                  style={{ width: 160 }}
                />
              </Col> */}
              <Col>
                <Space>
                  <Button type="primary" onClick={() => fetchCatalogs(1)}>搜索</Button>
                  <Button
                    onClick={() => {
                      setSearchName("");
                      setSearchCreator("");
                      setDateRange(null);
                      setPage(1);
                      fetchCatalogs(1);
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
              dataSource={catalogs}
              columns={columns}
              rowKey="id"
              rowSelection={rowSelection}
              pagination={false}
              loading={loading}
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
              showTotal={(total) => `共 ${total} 条记录`}
            />
          </div>
        </Card>
      </div>

      <Modal
        title="新增编目"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
          setMetadataFields([
            {
              key: "1",
              name: "标题",
              type: "字符串",
              required: true,
              isSystem: true,
            },
            {
              key: "2",
              name: "作者",
              type: "字符串",
              required: true,
              isSystem: true,
            },
          ]);
        }}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setAddModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleAdd}>
            确定
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="编目名称"
            rules={[{ required: true, message: "请输入编目名称" }]}
          >
            <Input placeholder="请输入编目名称" />
          </Form.Item>

          <Form.Item name="description" label="编目描述">
            <Input.TextArea
              placeholder="请输入编目描述信息，最多不超过200字"
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>

        {/* <div
          style={{
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            background: "#f6f9ff",
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#1890ff",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <SettingOutlined />
            元数据配置
          </div>

          <Table
            dataSource={metadataFields}
            pagination={false}
            size="small"
            columns={[
              {
                title: "字段名",
                dataIndex: "name",
                key: "name",
                width: 180,
                render: (text: string, record: MetadataField) => (
                  <Input
                    placeholder="请输入字段名"
                    value={text}
                    onChange={(e) =>
                      updateMetadataField(record.key, "name", e.target.value)
                    }
                  />
                ),
              },
              {
                title: "字段类型",
                dataIndex: "type",
                key: "type",
                width: 120,
                render: (type: string, record: MetadataField) => (
                  <Select
                    placeholder="请选择类型"
                    value={type}
                    onChange={(value) =>
                      updateMetadataField(record.key, "type", value)
                    }
                    options={fieldTypeOptions}
                    style={{ width: 100 }}
                  />
                ),
              },
              {
                title: "是否必填",
                dataIndex: "required",
                key: "required",
                width: 100,
                render: (required: boolean, record: MetadataField) => (
                  <Checkbox
                    checked={required}
                    onChange={(e) =>
                      updateMetadataField(
                        record.key,
                        "required",
                        e.target.checked,
                      )
                    }
                  />
                ),
              },
              {
                title: "操作",
                key: "action",
                width: 60,
                render: (_: any, record: MetadataField) => (
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeMetadataField(record.key)}
                  />
                ),
              },
            ]}
            rowKey="key"
          />

          <Button
            type="dashed"
            onClick={addMetadataField}
            style={{ width: "100%", marginTop: 8 }}
            icon={<PlusOutlined />}
          >
            添加字段
          </Button>
        </div> */}
      </Modal>

      <Modal
        title="编辑编目"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setCurrentCatalog(null);
        }}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setEditModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleUpdate}>
            确定
          </Button>,
        ]}
      >
        {/* {currentCatalog?.status === "published" &&
          currentCatalog.resourceCount > 0 && (
            <div
              style={{
                background: "#fffbe6",
                border: "1px solid #ffe58f",
                borderRadius: 4,
                padding: "8px 12px",
                marginBottom: 16,
                fontSize: 12,
                color: "#d48806",
              }}
            >
              已发布的编目仅允许修改编目名称、描述和元数据配置，编目类型与所属分类不可变更。
            </div>
          )} */}

        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="编目名称"
            rules={[{ required: true, message: "请输入编目名称" }]}
          >
            <Input placeholder="请输入编目名称" />
          </Form.Item>

          <Form.Item name="description" label="编目描述">
            <Input.TextArea
              placeholder="请输入编目描述信息，最多不超过200字"
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>

        {/* <div
          style={{
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            background: "#f6f9ff",
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#1890ff",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <SettingOutlined />
            元数据配置
          </div>

          <Table
            dataSource={metadataFields}
            pagination={false}
            size="small"
            columns={[
              {
                title: "字段名",
                dataIndex: "name",
                key: "name",
                width: 180,
                render: (text: string, record: MetadataField) => (
                  <Input
                    placeholder="请输入字段名"
                    value={text}
                    onChange={(e) =>
                      updateMetadataField(record.key, "name", e.target.value)
                    }
                  />
                ),
              },
              {
                title: "字段类型",
                dataIndex: "type",
                key: "type",
                width: 120,
                render: (type: string, record: MetadataField) => (
                  <Select
                    placeholder="请选择类型"
                    value={type}
                    onChange={(value) =>
                      updateMetadataField(record.key, "type", value)
                    }
                    options={fieldTypeOptions}
                    style={{ width: 100 }}
                  />
                ),
              },
              {
                title: "是否必填",
                dataIndex: "required",
                key: "required",
                width: 100,
                render: (required: boolean, record: MetadataField) => (
                  <Checkbox
                    checked={required}
                    onChange={(e) =>
                      updateMetadataField(
                        record.key,
                        "required",
                        e.target.checked,
                      )
                    }
                  />
                ),
              },
              {
                title: "操作",
                key: "action",
                width: 60,
                render: (_: any, record: MetadataField) => (
                  <Popconfirm
                    title="确定删除该字段？"
                    onConfirm={() => removeMetadataField(record.key)}
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                ),
              },
            ]}
            rowKey="key"
          />

          <Button
            type="dashed"
            onClick={addMetadataField}
            style={{ width: "100%", marginTop: 8 }}
            icon={<PlusOutlined />}
          >
            添加字段
          </Button>
        </div> */}

        {/* <Divider>状态</Divider> */}

        {/* <Form form={editForm} layout="vertical">
          <Form.Item name="status">
            <Select placeholder="请选择状态" style={{ width: 200 }}>
              <Select.Option value="pending">
                <Tag
                  style={{
                    color: "#faad14",
                    background: "#fffbe6",
                    border: "1px solid #ffe58f",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#faad14",
                      marginRight: 4,
                    }}
                  />
                  待审核
                </Tag>
              </Select.Option>
              <Select.Option value="published">
                <Tag
                  style={{
                    color: "#52c41a",
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#52c41a",
                      marginRight: 4,
                    }}
                  />
                  已发布
                </Tag>
              </Select.Option>
              <Select.Option value="rejected">
                <Tag
                  style={{
                    color: "#ff4d4f",
                    background: "#fff1f0",
                    border: "1px solid #ffccc7",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#ff4d4f",
                      marginRight: 4,
                    }}
                  />
                  已驳回
                </Tag>
              </Select.Option>
            </Select>
          </Form.Item>
        </Form> */}
      </Modal>
    </>
  );
}
