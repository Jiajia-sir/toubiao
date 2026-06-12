"use client";

import { useState } from "react";
import { history } from "@umijs/max";
import {
  Card,
  Button,
  Space,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
  FolderOutlined,
  BookOutlined,
} from "@ant-design/icons";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  entityCount: number;
  status: "active" | "disabled";
  createTime: string;
  color?: string;
}

const initialData: KnowledgeBase[] = [
  {
    id: "1",
    name: "产品研发库",
    description: "公司2024年所有项目相关文档",
    documentCount: 1256,
    entityCount: 8945,
    status: "active",
    createTime: "2024-01-10 10:00:00",
    color: "#1890ff",
  },
  {
    id: "2",
    name: "行业研发库",
    description: "行业研发相关文档",
    documentCount: 856,
    entityCount: 5623,
    status: "active",
    createTime: "2024-01-12 14:30:00",
    color: "#52c41a",
  },
  {
    id: "3",
    name: "财务库",
    description: "各行业研究报告和数据分析财务相关文档",
    documentCount: 423,
    entityCount: 3215,
    status: "active",
    createTime: "2024-01-15 09:20:00",
    color: "#faad14",
  },
  {
    id: "4",
    name: "技术文档库",
    description: "技术团队文档和接口文档",
    documentCount: 234,
    entityCount: 1567,
    status: "disabled",
    createTime: "2024-01-18 16:45:00",
    color: "#722ed1",
  },
  {
    id: "5",
    name: "市场分析库",
    description: "市场分析文档",
    documentCount: 567,
    entityCount: 3420,
    status: "active",
    createTime: "2024-01-20 11:15:00",
    color: "#eb2f96",
  },
  {
    id: "6",
    name: "项目管理库",
    description: "员工手册和HR项目管理相关文档",
    documentCount: 189,
    entityCount: 1230,
    status: "active",
    createTime: "2024-01-22 15:30:00",
    color: "#13c2c2",
  },
];

const colorPalettes = [
  "#1890ff",
  "#52c41a",
  "#faad14",
  "#722ed1",
  "#eb2f96",
  "#13c2c2",
  "#fa541c",
  "#2f54eb",
];

export default function KnowledgePage() {
  const [data, setData] = useState<KnowledgeBase[]>(initialData);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<KnowledgeBase | null>(null);
  const [modalStatus, setModalStatus] = useState<"active" | "disabled">(
    "active",
  );
  const [form] = Form.useForm();

  const filteredData = data
    .filter((item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase()),
    )
    .sort((a, b) => {
      if (a.status === "disabled" && b.status === "active") return 1;
      if (a.status === "active" && b.status === "disabled") return -1;
      return 0;
    });

  const handleAdd = () => {
    setEditRecord(null);
    form.resetFields();
    setModalStatus("active");
    setModalVisible(true);
  };

  const handleEdit = (record: KnowledgeBase) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setModalStatus(record.status);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    setData(data.filter((item) => item.id !== id));
    message.success("删除成功");
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.status = modalStatus;
      const selectedColor =
        editRecord?.color ||
        colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

      if (editRecord) {
        setData(
          data.map((item) =>
            item.id === editRecord.id ? { ...item, ...values } : item,
          ),
        );
        message.success("更新成功");
      } else {
        const newItem: KnowledgeBase = {
          ...values,
          id: Date.now().toString(),
          documentCount: 0,
          entityCount: 0,
          createTime: new Date().toLocaleString(),
          color: selectedColor,
        };
        setData([newItem, ...data]);
        message.success("添加成功");
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  return (
    <div>
      <div
        style={{
          background: "#f5f7fa",
        }}
      >
        <Card
          style={{
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
          }}
          styles={{ body: { flex: 1, minHeight: "86vh" } }}
        >
          <div style={{ padding: 24, borderBottom: "1px solid #f0f0f0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{ fontSize: 26, fontWeight: 600, color: "#262626" }}
                >
                  知识库管理
                </div>
                <div style={{ fontSize: 14, color: "#8c8c8c", marginTop: 4 }}>
                  管理和维护您的知识库分类
                </div>
              </div>
              <Space size={12}>
                <Input
                  placeholder="搜索知识库..."
                  allowClear
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 220 }}
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  新增知识库
                </Button>
              </Space>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <Row gutter={[24, 24]}>
              {filteredData.map((item) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
                  <div
                    style={{
                      background:
                        item.status === "disabled" ? "#fafafa" : "#fff",
                      borderRadius: 12,
                      border: `1px solid ${item.status === "disabled" ? "#d9d9d9" : item.color + "20"}`,
                      padding: 20,
                      height: "100%",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                      opacity: item.status === "disabled" ? 0.7 : 1,
                      cursor:
                        item.status === "disabled" ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (item.status === "disabled") return;
                      history.push(`/knowledge/detail/${item.id}`);
                    }}
                    onMouseEnter={(e) => {
                      if (item.status === "disabled") return;
                      e.currentTarget.style.boxShadow = `0 8px 24px ${item.color}30`;
                      e.currentTarget.style.borderColor =
                        item.color || "#1890ff";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = `${item.color}20`;
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background:
                          item.status === "disabled" ? "#d9d9d9" : item.color,
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                        marginBottom: 16,
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            item.status === "disabled"
                              ? "#f0f0f0"
                              : `linear-gradient(135deg, ${item.color}15 0%, ${item.color}30 100%)`,
                          borderRadius: 12,
                          flexShrink: 0,
                          border: `1px solid ${item.status === "disabled" ? "#d9d9d9" : item.color + "20"}`,
                        }}
                      >
                        <FolderOutlined
                          style={{
                            fontSize: 26,
                            color:
                              item.status === "disabled"
                                ? "#bfbfbf"
                                : item.color,
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color:
                              item.status === "disabled"
                                ? "#bfbfbf"
                                : "#262626",
                            fontSize: 16,
                            marginBottom: 6,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color:
                              item.status === "disabled"
                                ? "#d9d9d9"
                                : "#8c8c8c",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.description}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Tag
                        color={item.status === "active" ? "success" : "default"}
                        style={{ margin: 0 }}
                      >
                        {item.status === "active" ? "启用" : "禁用"}
                      </Tag>
                      <div
                        style={{
                          fontSize: 12,
                          color:
                            item.status === "disabled" ? "#d9d9d9" : "#8c8c8c",
                        }}
                      >
                        <FileTextOutlined style={{ marginRight: 4 }} />
                        {item.documentCount.toLocaleString()} 文档{" "}
                        <span style={{ color: "#d9d9d9", margin: "0 4px" }}>
                          |
                        </span>{" "}
                        {item.entityCount.toLocaleString()} 实体
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 4,
                        paddingTop: 12,
                        borderTop: `1px solid ${item.status === "disabled" ? "#d9d9d9" : item.color + "10"}`,
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        style={{ color: "#595959" }}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title="确认删除?"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDelete(item.id);
                        }}
                        okText="确认"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>

            {filteredData.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 0",
                  color: "#8c8c8c",
                }}
              >
                暂无知识库，请点击上方"新增知识库"按钮添加
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        title={editRecord ? "编辑知识库" : "新增知识库"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={500}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[{ required: true, message: "请输入知识库名称" }]}
          >
            <Input placeholder="例如：技术文档知识库" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: "请输入描述" }]}
          >
            <Input.TextArea placeholder="请输入知识库描述" rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Space>
              <Button
                type={modalStatus === "active" ? "primary" : "default"}
                onClick={() => setModalStatus("active")}
              >
                启用
              </Button>
              <Button
                type={modalStatus === "disabled" ? "primary" : "default"}
                onClick={() => setModalStatus("disabled")}
              >
                禁用
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
