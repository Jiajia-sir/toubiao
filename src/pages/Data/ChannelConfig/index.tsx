"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  Card,
  Button,
  Space,
  Input,
  Table,
  Row,
  Col,
  Modal,
  Form,
  message,
  Pagination,
  Popconfirm,
  DatePicker,
  Tag,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { getChannelConfigPage, addChannelConfig, updateChannelConfig, removeChannelConfig } from '@/services/biz/channel-config';
import type { ChannelConfigItem } from '@/services/biz/channel-config';

const { RangePicker } = DatePicker;

export default function ChannelConfigPage() {
  const [data, setData] = useState<ChannelConfigItem[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchCreateTime, setSearchCreateTime] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState<ChannelConfigItem | null>(null);
  const [form] = Form.useForm();

  const fetchData = async (currentPage = page, name = searchName, createTime = searchCreateTime) => {
    setLoading(true);
    try {
      const params: any = {
        pageNo: currentPage,
        pageSize,
        name: name || undefined,
      };
      
      if (createTime && createTime.length === 2) {
        params.createTime = [
          createTime[0].startOf('day').format('YYYY-MM-DD HH:mm:ss'),
          createTime[1].endOf('day').format('YYYY-MM-DD HH:mm:ss')
        ];
      } else {
        params.createTime = [];
      }

      const res: any = await getChannelConfigPage(params);
      if (res && res.code === 200) {
        setData(res.data?.list || res.rows || []);
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
    fetchData(page, searchName, searchCreateTime);
  }, [page]);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: "渠道名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "来源",
      dataIndex: "isSystem",
      key: "isSystem",
      width: 120,
      render: (isSystem: string) => {
        if (isSystem === 'inner') {
          return <Tag color="blue">系统内置</Tag>;
        }
        if (isSystem === 'ext') {
          return <Tag color="green">手动添加</Tag>;
        }
        return '-';
      },
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 200,
      render: (time: number | string) => time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: any, record: ChannelConfigItem) => (
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
        const res: any = await addChannelConfig({
          name: values.name,
        });
        if (res && res.code === 200) {
          message.success("新增成功");
          setModalVisible(false);
          form.resetFields();
          fetchData(1);
          setPage(1);
        } else {
          message.error(res?.msg || "新增失败");
        }
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleEdit = (record: ChannelConfigItem) => {
    setCurrentItem(record);
    setEditMode(true);
    form.setFieldsValue({
      name: record.name,
    });
    setModalVisible(true);
  };

  const handleUpdate = () => {
    if (!currentItem) return;
    form.validateFields().then(async (values) => {
      try {
        const res: any = await updateChannelConfig({
          id: currentItem.id,
          name: values.name,
        });
        if (res && res.code === 200) {
          message.success("更新成功");
          setModalVisible(false);
          setCurrentItem(null);
          setEditMode(false);
          form.resetFields();
          fetchData(page);
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
      const res: any = await removeChannelConfig(id);
      if (res && res.code === 200) {
        message.success("删除成功");
        fetchData(page);
      } else {
        message.error(res?.msg || "删除失败");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReset = () => {
    setSearchName("");
    setSearchCreateTime(null);
    setPage(1);
    fetchData(1, "", null);
    message.success("已刷新");
  };

  const handleSearch = () => {
    setPage(1);
    fetchData(1, searchName, searchCreateTime);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setCurrentItem(null);
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
                  来源渠道
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
                  placeholder="请输入渠道名称关键词"
                  allowClear
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  style={{ width: 220 }}
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Col>
              <Col>
                <RangePicker 
                  value={searchCreateTime as any} 
                  onChange={(dates) => setSearchCreateTime(dates as any)}
                  style={{ width: 260 }}
                />
              </Col>
              <Col>
                <Button type="primary" onClick={handleSearch}>搜索</Button>
                <Button
                  onClick={handleReset}
                  style={{ marginLeft: 8 }}
                >
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
        title={editMode ? "编辑渠道" : "新增渠道"}
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
            label="渠道名称"
            rules={[{ required: true, message: "请输入渠道名称" }]}
          >
            <Input placeholder="请输入渠道名称" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
