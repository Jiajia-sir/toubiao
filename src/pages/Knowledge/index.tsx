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
  Select,
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
import { useRequest } from "@umijs/max";
import {
  getKnowledgeBasePage,
  addKnowledgeBase,
  updateKnowledgeBase,
  removeKnowledgeBase,
  KnowledgeBaseItem,
  KnowledgeBasePageResult,
} from "@/services/biz/knowledge-base";

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

const ColorSelector = ({ value, onChange }: { value?: string; onChange?: (color: string) => void }) => {
  return (
    <Row gutter={[8, 8]}>
      {colorPalettes.map((c) => (
        <Col key={c}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: c,
              cursor: 'pointer',
              border: value === c ? '2px solid #fff' : '2px solid transparent',
              boxShadow: value === c ? `0 0 0 2px ${c}` : 'none',
              transition: 'all 0.2s',
            }}
            onClick={() => onChange?.(c)}
          />
        </Col>
      ))}
    </Row>
  );
};

export default function KnowledgePage() {
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<KnowledgeBaseItem | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const pageSize = 12;
  const [form] = Form.useForm();

  const { data, loading, refresh } = useRequest<KnowledgeBasePageResult>(
    () =>
      getKnowledgeBasePage({
        pageNo,
        pageSize,
        name: searchText,
      }),
    {
      refreshDeps: [pageNo, pageSize, searchText],
    },
  );

  const knowledgePageData = data as KnowledgeBasePageResult | undefined;
  const knowledgeList: KnowledgeBaseItem[] = knowledgePageData?.list || [];

  const handleAdd = () => {
    setEditRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: KnowledgeBaseItem) => {
    setEditRecord(record);
    form.setFieldsValue({
      ...record,
      enabled: String(record.enabled),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string | number) => {
    try {
      const res: any = await removeKnowledgeBase(id);
      if (res && res.code === 200) {
        message.success("删除成功");
        refresh();
      } else {
        message.error(res?.msg || "删除失败");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!values.color) {
        values.color = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
      }

      if (editRecord) {
        const res: any = await updateKnowledgeBase({
          ...values,
          id: editRecord.id,
        });
        if (res && res.code === 200) {
          message.success("更新成功");
          setModalVisible(false);
          form.resetFields();
          refresh();
        } else {
          message.error(res?.msg || "更新失败");
        }
      } else {
        const res: any = await addKnowledgeBase(values);
        if (res && res.code === 200) {
          message.success("添加成功");
          setModalVisible(false);
          form.resetFields();
          refresh();
        } else {
          message.error(res?.msg || "添加失败");
        }
      }
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
              {knowledgeList.map((item) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
                  <div
                    style={{
                      background:
                        String(item.enabled) === "0" ? "#fafafa" : "#fff",
                      borderRadius: 12,
                      border: `1px solid ${String(item.enabled) === "0" ? "#d9d9d9" : item.color + "20"}`,
                      padding: 20,
                      height: "100%",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                      opacity: String(item.enabled) === "0" ? 0.7 : 1,
                      cursor:
                        String(item.enabled) === "0" ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (String(item.enabled) === "0") return;
                      history.push(`/knowledge/detail/${item.id}`);
                    }}
                    onMouseEnter={(e) => {
                      if (String(item.enabled) === "0") return;
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
                          String(item.enabled) === "0" ? "#d9d9d9" : item.color,
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
                            String(item.enabled) === "0"
                              ? "#f0f0f0"
                              : `linear-gradient(135deg, ${item.color}15 0%, ${item.color}30 100%)`,
                          borderRadius: 12,
                          flexShrink: 0,
                          border: `1px solid ${String(item.enabled) === "0" ? "#d9d9d9" : item.color + "20"}`,
                        }}
                      >
                        <FolderOutlined
                          style={{
                            fontSize: 26,
                            color:
                              String(item.enabled) === "0"
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
                              String(item.enabled) === "0"
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
                              String(item.enabled) === "0"
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
                        color={String(item.enabled) === "1" ? "success" : "default"}
                        style={{ margin: 0 }}
                      >
                        {String(item.enabled) === "1" ? "启用" : "禁用"}
                      </Tag>
                      <div
                        style={{
                          fontSize: 12,
                          color:
                            String(item.enabled) === "0" ? "#d9d9d9" : "#8c8c8c",
                        }}
                      >
                        <FileTextOutlined style={{ marginRight: 4 }} />
                        {(item.documentCount || 0).toLocaleString()} 文档{" "}
                        <span style={{ color: "#d9d9d9", margin: "0 4px" }}>
                          |
                        </span>{" "}
                        {(item.entityCount || 0).toLocaleString()} 实体
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 4,
                        paddingTop: 12,
                        borderTop: `1px solid ${String(item.enabled) === "0" ? "#d9d9d9" : item.color + "10"}`,
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

            {knowledgeList.length === 0 && (
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
          <Form.Item
            name="color"
            label="主题颜色"
          >
            <ColorSelector />
          </Form.Item>
          <Form.Item name="enabled" label="状态" initialValue="1" rules={[{ required: true, message: "请选择状态" }]}>
            <Form.Item noStyle name="enabled">
              <Select placeholder="请选择状态" options={[{ label: '启用', value: '1' }, { label: '禁用', value: '0' }]} />
            </Form.Item>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
