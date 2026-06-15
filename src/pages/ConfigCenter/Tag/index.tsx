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
import { getTagPage, addTag, updateTag, removeTag } from '@/services/biz/tag';
import type { TagItem } from '@/services/biz/tag';

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
  const [tags, setTags] = useState<TagItem[]>([]);
  const [searchName, setSearchName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTag, setCurrentTag] = useState<TagItem | null>(null);
  const [form] = Form.useForm();

  const fetchTags = async (currentPage = page, search = searchName) => {
    setLoading(true);
    try {
      const res: any = await getTagPage({
        pageNo: currentPage,
        pageSize,
        tag: search || undefined,
      });
      if (res && res.code === 200) {
        setTags(res.data?.list || res.rows || []);
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
    fetchTags(page, searchName);
  }, [page]);

  const columns = [
    {
      title: "标签名称",
      dataIndex: "tag",
      key: "tag",
      width: 200,
      render: (tag: string, record: TagItem) => (
        <Tag
          style={{
            color: record.color,
            background: `${record.color}15`,
            border: `1px solid ${record.color}30`,
          }}
        >
          {tag}
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
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
      render: (time: number | string) => time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "-",
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
    form.validateFields().then(async (values) => {
      try {
        const res: any = await addTag({
          tag: values.tag,
          color: values.color,
        });
        if (res && res.code === 200) {
          message.success("新增成功");
          setModalVisible(false);
          form.resetFields();
          fetchTags(1); // 重新加载第一页
          setPage(1);
        } else {
          message.error(res?.msg || "新增失败");
        }
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleEdit = (record: TagItem) => {
    setCurrentTag(record);
    setEditMode(true);
    form.setFieldsValue({
      tag: record.tag,
      color: record.color,
    });
    setModalVisible(true);
  };

  const handleUpdate = () => {
    if (!currentTag) return;
    form.validateFields().then(async (values) => {
      try {
        const res: any = await updateTag({
          id: currentTag.id,
          tag: values.tag,
          color: values.color,
        });
        if (res && res.code === 200) {
          message.success("更新成功");
          setModalVisible(false);
          setCurrentTag(null);
          setEditMode(false);
          form.resetFields();
          fetchTags(page); // 刷新当前页
        } else {
          message.error(res?.msg || "更新失败");
        }
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleDelete = async (id: number) => {
    try {
      const res: any = await removeTag(id);
      if (res && res.code === 200) {
        message.success("删除成功");
        fetchTags(page);
      } else {
        message.error(res?.msg || "删除失败");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReset = () => {
    setSearchName("");
    setPage(1);
    fetchTags(1, "");
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
                    共{total}条数据
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
                <Button type="primary" onClick={() => fetchTags(1)}>搜索</Button>
                <Button
                  onClick={() => {
                    setSearchName("");
                    setPage(1);
                    fetchTags(1, "");
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
              dataSource={tags}
              columns={columns}
              rowKey="id"
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
            name="tag"
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
