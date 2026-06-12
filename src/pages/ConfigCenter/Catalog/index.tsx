"use client";

import { useState, useEffect } from "react";
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

const initialData: CatalogItem[] = [
  {
    id: "CM0001",
    name: "电子图书分类编目",
    type: "图书类",
    category: "数字资源",
    description: "包含电子图书的元数据规范描述",
    status: "published",
    resourceCount: 256,
    createTime: "2024-01-15 14:32",
    creator: "张三",
    metadataFields: [
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
    ],
  },
  {
    id: "CM0002",
    name: "视频资源元数据编目",
    type: "视频类",
    category: "多媒体",
    description: "视频资源的元数据规范",
    status: "pending",
    resourceCount: 189,
    createTime: "2024-01-16 10:20",
    creator: "李四",
    metadataFields: [
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
    ],
  },
  {
    id: "CM0003",
    name: "音频资源分类编目",
    type: "音频类",
    category: "多媒体",
    description: "音频资源的分类编目",
    status: "published",
    resourceCount: 342,
    createTime: "2024-01-17 09:15",
    creator: "王五",
    metadataFields: [
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
    ],
  },
  {
    id: "CM0004",
    name: "图片资源元数据编目",
    type: "图片类",
    category: "多媒体",
    description: "图片资源的元数据规范",
    status: "rejected",
    resourceCount: 567,
    createTime: "2024-01-18 16:45",
    creator: "赵六",
    metadataFields: [
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
    ],
  },
  {
    id: "CM0005",
    name: "文档资源分类编目",
    type: "文档类",
    category: "数字资源",
    description: "文档资源的分类编目",
    status: "published",
    resourceCount: 421,
    createTime: "2024-01-19 11:30",
    creator: "孙七",
    metadataFields: [
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
    ],
  },
];

const typeOptions = [
  { label: "图书类", value: "图书类" },
  { label: "视频类", value: "视频类" },
  { label: "音频类", value: "音频类" },
  { label: "图片类", value: "图片类" },
  { label: "文档类", value: "文档类" },
];

const categoryOptions = [
  { label: "数字资源", value: "数字资源" },
  { label: "多媒体", value: "多媒体" },
];

const fieldTypeOptions = [
  { label: "字符串", value: "字符串" },
  { label: "数值", value: "数值" },
  { label: "日期", value: "日期" },
  { label: "布尔值", value: "布尔值" },
];

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [catalogs, setCatalogs] = useState<CatalogItem[]>(initialData);
  const [searchName, setSearchName] = useState("");
  const [searchType, setSearchType] = useState<string>("全部");
  const [searchCreator, setSearchCreator] = useState("");
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

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

  const filteredCatalogs = catalogs.filter((item) => {
    if (
      searchName &&
      !item.name.toLowerCase().includes(searchName.toLowerCase())
    ) {
      return false;
    }
    if (searchType !== "全部" && item.type !== searchType) {
      return false;
    }
    if (searchCreator && !item.creator.includes(searchCreator)) {
      return false;
    }
    return true;
  });

  const paginatedCatalogs = filteredCatalogs.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

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
      title: "编目类型",
      dataIndex: "type",
      key: "type",
      width: 100,
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      width: 100,
    },
    {
      title: "关联资源",
      dataIndex: "resourceCount",
      key: "resourceCount",
      width: 100,
      render: (count: number) => (
        <span style={{ color: "#1890ff" }}>{count}个</span>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 160,
    },
    {
      title: "创建人",
      dataIndex: "creator",
      key: "creator",
      width: 100,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: any, record: CatalogItem) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            详情
          </Button>
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
    form.validateFields().then((values) => {
      const newCatalog: CatalogItem = {
        id: `CM${String(catalogs.length + 1).padStart(4, "0")}`,
        name: values.name,
        type: values.type,
        category: values.category,
        description: values.description || "",
        status: values.status || "pending",
        resourceCount: 0,
        createTime: new Date().toLocaleString(),
        creator: "管理员",
        metadataFields: metadataFields.filter((f) => !f.isSystem),
      };
      setCatalogs([newCatalog, ...catalogs]);
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
      message.success("新增成功");
    });
  };

  const handleEdit = (record: CatalogItem) => {
    setCurrentCatalog(record);
    editForm.setFieldsValue({
      name: record.name,
      type: record.type,
      category: record.category,
      description: record.description,
      status: record.status,
    });
    setMetadataFields([
      ...record.metadataFields,
      { key: Date.now().toString(), name: "", type: "字符串", required: false },
    ]);
    setEditModalVisible(true);
  };

  const handleUpdate = () => {
    if (!currentCatalog) return;
    editForm.validateFields().then((values) => {
      const updatedCatalogs = catalogs.map((item) =>
        item.id === currentCatalog.id
          ? {
              ...item,
              name: values.name,
              type: values.type,
              category: values.category,
              description: values.description,
              status: values.status,
              metadataFields: metadataFields.filter(
                (f) => f.isSystem || f.name,
              ),
            }
          : item,
      );
      setCatalogs(updatedCatalogs as CatalogItem[]);
      setEditModalVisible(false);
      message.success("更新成功");
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

  const handleDelete = (id: string) => {
    setCatalogs(catalogs.filter((item) => item.id !== id));
    message.success("删除成功");
  };

  const handleReset = () => {
    setSearchName("");
    setSearchType("全部");
    setSearchCreator("");
    setDateRange(null);
    setSelectedRows([]);
    setPage(1);
    setCatalogs(initialData);
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
                    共{filteredCatalogs.length}条数据
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
                <Select
                  placeholder="请选择编目类型"
                  value={searchType}
                  onChange={setSearchType}
                  style={{ width: 140 }}
                  options={[{ label: "全部", value: "全部" }, ...typeOptions]}
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
              <Col>
                <Input
                  placeholder="请输入创建人姓名"
                  allowClear
                  value={searchCreator}
                  onChange={(e) => setSearchCreator(e.target.value)}
                  style={{ width: 160 }}
                />
              </Col>
              <Col>
                <Space>
                  <Button type="primary">搜索</Button>
                  <Button
                    onClick={() => {
                      setSearchName("");
                      setSearchType("全部");
                      setSearchCreator("");
                      setDateRange(null);
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
              dataSource={paginatedCatalogs}
              columns={columns}
              rowKey="id"
              rowSelection={rowSelection}
              pagination={false}
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
              total={filteredCatalogs.length}
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
          <Form.Item
            name="type"
            label="编目类型"
            rules={[{ required: true, message: "请选择编目类型" }]}
          >
            <Select placeholder="请选择编目类型" options={typeOptions} />
          </Form.Item>
          <Form.Item
            name="category"
            label="所属分类"
            rules={[{ required: true, message: "请选择所属分类" }]}
          >
            <Select placeholder="请选择所属分类" options={categoryOptions} />
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
          <Form.Item
            name="type"
            label="编目类型"
            rules={[{ required: true, message: "请选择编目类型" }]}
          >
            <Select
              placeholder="请选择编目类型"
              options={typeOptions}
              disabled={
                currentCatalog?.status === "published" &&
                (currentCatalog?.resourceCount || 0) > 0
              }
            />
          </Form.Item>
          <Form.Item
            name="category"
            label="所属分类"
            rules={[{ required: true, message: "请选择所属分类" }]}
          >
            <Select
              placeholder="请选择所属分类"
              options={categoryOptions}
              disabled={
                currentCatalog?.status === "published" &&
                (currentCatalog?.resourceCount || 0) > 0
              }
            />
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
