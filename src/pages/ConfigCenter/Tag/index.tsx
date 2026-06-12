"use client";

import { useState } from "react";
import {
  Card,
  Button,
  Space,
  Input,
  Table,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  message,
  Pagination,
  Popconfirm,
  Radio,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TagOutlined,
} from "@ant-design/icons";

interface TagItem {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  createTime: string;
  creator: string;
}

const initialData: TagItem[] = [
  {
    id: "1",
    name: "产品需求",
    color: "#1890ff",
    usageCount: 156,
    createTime: "2024-01-15 10:00:00",
    creator: "张三",
  },
  {
    id: "2",
    name: "技术文档",
    color: "#52c41a",
    usageCount: 89,
    createTime: "2024-01-16 14:30:00",
    creator: "李四",
  },
  {
    id: "3",
    name: "财务报告",
    color: "#faad14",
    usageCount: 67,
    createTime: "2024-01-17 09:15:00",
    creator: "王五",
  },
  {
    id: "4",
    name: "市场分析",
    color: "#eb2f96",
    usageCount: 45,
    createTime: "2024-01-18 11:20:00",
    creator: "赵六",
  },
  {
    id: "5",
    name: "项目管理",
    color: "#13c2c2",
    usageCount: 38,
    createTime: "2024-01-19 16:45:00",
    creator: "孙七",
  },
  {
    id: "6",
    name: "用户研究",
    color: "#722ed1",
    usageCount: 29,
    createTime: "2024-01-20 10:30:00",
    creator: "张三",
  },
  {
    id: "7",
    name: "合同协议",
    color: "#fa541c",
    usageCount: 23,
    createTime: "2024-01-21 15:00:00",
    creator: "李四",
  },
  {
    id: "8",
    name: "HR文档",
    color: "#2f54eb",
    usageCount: 18,
    createTime: "2024-01-22 09:45:00",
    creator: "王五",
  },
];

const colorOptions = [
  { label: "蓝色", value: "#1890ff" },
  { label: "绿色", value: "#52c41a" },
  { label: "黄色", value: "#faad14" },
  { label: "粉色", value: "#eb2f96" },
  { label: "青色", value: "#13c2c2" },
  { label: "紫色", value: "#722ed1" },
  { label: "橙色", value: "#fa541c" },
  { label: "红色", value: "#f5222d" },
];

export default function TagPage() {
  const [tags, setTags] = useState<TagItem[]>(initialData);
  const [searchName, setSearchName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTag, setCurrentTag] = useState<TagItem | null>(null);
  const [form] = Form.useForm();

  const filteredTags = tags.filter((item) => {
    if (
      searchName &&
      !item.name.toLowerCase().includes(searchName.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const paginatedTags = filteredTags.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const columns = [
    {
      title: "标签名称",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name: string, record: TagItem) => (
        <Tag
          style={{
            color: record.color,
            background: `${record.color}15`,
            border: `1px solid ${record.color}30`,
          }}
        >
          {name}
        </Tag>
      ),
    },
    {
      title: "颜色",
      dataIndex: "color",
      key: "color",
      width: 100,
      render: (color: string) => (
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: color,
          }}
        />
      ),
    },
    {
      title: "使用次数",
      dataIndex: "usageCount",
      key: "usageCount",
      width: 100,
      render: (count: number) => (
        <span style={{ color: "#1890ff", fontWeight: 500 }}>{count}</span>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
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
      width: 120,
      render: (_: any, record: TagItem) => (
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

  const handleAdd = () => {
    form.validateFields().then((values) => {
      const newTag: TagItem = {
        id: Date.now().toString(),
        name: values.name,
        color: values.color,
        usageCount: 0,
        createTime: new Date().toLocaleString(),
        creator: "管理员",
      };
      setTags([newTag, ...tags]);
      setModalVisible(false);
      form.resetFields();
      message.success("新增成功");
    });
  };

  const handleEdit = (record: TagItem) => {
    setCurrentTag(record);
    setEditMode(true);
    form.setFieldsValue({
      name: record.name,
      color: record.color,
    });
    setModalVisible(true);
  };

  const handleUpdate = () => {
    if (!currentTag) return;
    form.validateFields().then((values) => {
      const updatedTags = tags.map((item) =>
        item.id === currentTag.id
          ? { ...item, name: values.name, color: values.color }
          : item,
      );
      setTags(updatedTags);
      setModalVisible(false);
      setCurrentTag(null);
      setEditMode(false);
      form.resetFields();
      message.success("更新成功");
    });
  };

  const handleDelete = (id: string) => {
    setTags(tags.filter((item) => item.id !== id));
    message.success("删除成功");
  };

  const handleReset = () => {
    setSearchName("");
    setPage(1);
    setTags(initialData);
    message.success("已刷新");
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setCurrentTag(null);
    setEditMode(false);
    form.resetFields();
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
                  标签管理
                </div>
              </Col>
              <Col>
                <Space>
                  <span style={{ color: "#8c8c8c", marginRight: 8 }}>
                    共{filteredTags.length}条数据
                  </span>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    刷新
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditMode(false);
                      setModalVisible(true);
                    }}
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
                  placeholder="请输入标签名称关键词"
                  allowClear
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  style={{ width: 220 }}
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Col>
              <Col>
                <Button type="primary">搜索</Button>
                <Button
                  onClick={() => {
                    setSearchName("");
                  }}
                  style={{ marginLeft: 8 }}
                >
                  重置
                </Button>
              </Col>
            </Row>
          </div>

          <div style={{ padding: "0 24px" }}>
            <Table
              dataSource={paginatedTags}
              columns={columns}
              rowKey="id"
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
              total={filteredTags.length}
              onChange={setPage}
              showTotal={(total) => `共 ${total} 条记录`}
            />
          </div>
        </Card>
      </div>

      <Modal
        title={editMode ? "编辑标签" : "新增标签"}
        open={modalVisible}
        onCancel={handleModalClose}
        width={500}
        footer={[
          <Button key="cancel" onClick={handleModalClose}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={editMode ? handleUpdate : handleAdd}
          >
            确定
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="标签名称"
            rules={[{ required: true, message: "请输入标签名称" }]}
          >
            <Input placeholder="请输入标签名称" />
          </Form.Item>
          <Form.Item name="color" label="标签颜色" initialValue="#1890ff">
            <Radio.Group>
              {colorOptions.map((option) => (
                <Radio.Button key={option.value} value={option.value}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
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
