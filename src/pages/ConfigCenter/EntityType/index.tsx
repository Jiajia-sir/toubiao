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
  Modal,
  Form,
  message,
  Pagination,
  Popconfirm,
  Select,
  Statistic,
  Divider,
  Dropdown,
  Radio,
  Switch,
  ColorPicker,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MoreOutlined,
  UploadOutlined,
  DatabaseOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  FireOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { addEntityType, updateEntityType, removeEntityType, getEntityTypePage } from "@/services/biz/entity-type";
import dayjs from "dayjs";

interface EntityTypeItem {
  id: string;
  name: string;
  description: string;
  attributeCount: number;
  entityCount: number;
  status: "enabled" | "disabled";
  createTime?: string;
  icon?: string;
  color?: string;
  bgColor?: string;
  isSystem?: boolean;
}

interface EntityAttribute {
  key: string;
  name: string;
  code: string;
  dataType: string;
}

const fieldTypeOptions = [
  { label: "字符串", value: "string" },
  { label: "长文本", value: "text" },
  { label: "整数", value: "integer" },
  { label: "浮点数", value: "float" },
  { label: "日期", value: "date" },
  { label: "布尔值", value: "boolean" },
  { label: "枚举", value: "enum" },
];

const iconOptions = [
  { label: <span><DatabaseOutlined /> 数据库</span>, value: "DatabaseOutlined" },
  { label: <span><MedicineBoxOutlined /> 医疗</span>, value: "MedicineBoxOutlined" },
  { label: <span><ExperimentOutlined /> 实验</span>, value: "ExperimentOutlined" },
  { label: <span><FireOutlined /> 热门</span>, value: "FireOutlined" },
  { label: <span><BankOutlined /> 机构</span>, value: "BankOutlined" },
  { label: <span><CheckCircleOutlined /> 校验</span>, value: "CheckCircleOutlined" },
  { label: <span><ClockCircleOutlined /> 时间</span>, value: "ClockCircleOutlined" },
  { label: <span><SettingOutlined /> 设置</span>, value: "SettingOutlined" },
];

const iconMap: Record<string, React.ReactNode> = {
  DatabaseOutlined: <DatabaseOutlined />,
  MedicineBoxOutlined: <MedicineBoxOutlined />,
  ExperimentOutlined: <ExperimentOutlined />,
  FireOutlined: <FireOutlined />,
  BankOutlined: <BankOutlined />,
  CheckCircleOutlined: <CheckCircleOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
  SettingOutlined: <SettingOutlined />,
};

const initialData: EntityTypeItem[] = [
  {
    id: "1",
    name: "疾病实体",
    description: "描述各类疾病名称及分类",
    attributeCount: 1,
    entityCount: 3245,
    status: "enabled",
    updateTime: "2026-04-25 14:32",
  },
  {
    id: "2",
    name: "药品实体",
    description: "描述药品名称、成分、规格等",
    attributeCount: 4,
    entityCount: 5128,
    status: "enabled",
    updateTime: "2026-04-24 09:17",
  },
  {
    id: "3",
    name: "检查项目",
    description: "描述各类医学检查项目",
    attributeCount: 7,
    entityCount: 1872,
    status: "enabled",
    updateTime: "2026-04-23 16:45",
  },
  {
    id: "4",
    name: "症状实体",
    description: "描述各类症状及表现",
    attributeCount: 3,
    entityCount: 2241,
    status: "disabled",
    updateTime: "2026-04-22 11:28",
  },
  {
    id: "5",
    name: "公司实体",
    description: "描述企业、公司、机构名称",
    attributeCount: 4,
    entityCount: 8742,
    status: "enabled",
    updateTime: "2026-04-21 08:53",
  },
];

const statusOptions = [
  { label: "全部", value: "全部" },
  { label: "已启用", value: "enabled" },
  { label: "已禁用", value: "disabled" },
];

const entityTypeConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  疾病实体: {
    icon: <MedicineBoxOutlined />,
    color: "#1890ff",
    bgColor: "#e6f7ff",
  },
  药品实体: {
    icon: <MedicineBoxOutlined />,
    color: "#52c41a",
    bgColor: "#f6ffed",
  },
  检查项目: {
    icon: <ExperimentOutlined />,
    color: "#722ed1",
    bgColor: "#f9f0ff",
  },
  症状实体: {
    icon: <FireOutlined />,
    color: "#fa541c",
    bgColor: "#fff7e6",
  },
  公司实体: {
    icon: <BankOutlined />,
    color: "#13c2c2",
    bgColor: "#e6fffb",
  },
};

export default function EntityTypePage() {
  const [entityTypes, setEntityTypes] = useState<EntityTypeItem[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchStatus, setSearchStatus] = useState("全部");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFile, setImportFile] = useState<string>("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("新建实体类型");
  const [editingRecord, setEditingRecord] = useState<EntityTypeItem | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    attributes: [] as EntityAttribute[],
    status: "disabled",
    icon: "",
    color: "",
    bgColor: "",
    isSystem: false,
  });

  const fetchData = async (current = page, name = searchName, status = searchStatus) => {
    setLoading(true);
    try {
      const res = await getEntityTypePage({
        pageNo: current,
        pageSize,
        name: name || undefined,
        enabled: status === "全部" ? undefined : (status === "enabled" ? "1" : "0"),
      });
      const list = res?.rows || res?.data?.records || res?.data?.list || res?.list || res?.data || [];
      const totalCount = res?.total || res?.data?.total || 0;
      setEntityTypes(list);
      setTotal(totalCount);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, searchName, searchStatus);
  }, [page]);

  const columns = [
    {
      title: "实体类型名称",
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (_: string, record: EntityTypeItem & { enabled?: string | number }) => {
        const fallbackConfig = entityTypeConfig[record.name] || {
          icon: <DatabaseOutlined />,
          color: "#1890ff",
          bgColor: "#e6f7ff",
        };
        const displayIcon = record.icon && iconMap[record.icon] ? iconMap[record.icon] : fallbackConfig.icon;
        const displayColor = record.color || fallbackConfig.color;
        const displayBgColor = record.bgColor || fallbackConfig.bgColor;
        
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: displayBgColor,
                borderRadius: 8,
                border: `1px solid ${displayColor}50`,
              }}
            >
              {displayIcon && (
                <span style={{ fontSize: 18, color: displayColor }}>
                  {displayIcon}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "#262626" }}>
                {record.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#8c8c8c",
                  marginTop: 2,
                }}
              >
                {record.description}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "属性数量",
      dataIndex: "attributeCount",
      key: "attributeCount",
      width: 100,
      render: (count: number) => (
        <span style={{ color: "#595959" }}>{count}</span>
      ),
    },
    {
      title: "实体数量",
      dataIndex: "entityCount",
      key: "entityCount",
      width: 120,
      render: (count: number) => (
        <span style={{ color: "#1890ff", fontWeight: 500 }}>
          {count.toLocaleString()}
        </span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string, record: any) => {
        const isEnabled = record.enabled === '1' || record.enabled === 1 || status === 'enabled';
        const c = isEnabled ? { color: "#52c41a", text: "已启用" } : { color: "#8c8c8c", text: "已禁用" };
        
        return (
          <Tag
            style={{
              color: c.color,
              background: `${c.color}15`,
              border: `1px solid ${c.color}30`,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: c.color,
                marginRight: 4,
              }}
            />
            {c.text}
          </Tag>
        );
      },
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 160,
      render: (text: string | number) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: any, record: EntityTypeItem) => (
        <Space size={4}>
          {/* <Button type="link" size="small" icon={<EyeOutlined />}>
            查看
          </Button> */}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            编辑
          </Button>

          <Button type="link" size="small" icon={<UploadOutlined />}>
            导出
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

  const handleDelete = async (id: string) => {
    try {
      await removeEntityType(id);
      message.success("删除成功");
      if (entityTypes.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchData(page, searchName, searchStatus);
      }
    } catch (error) {
      console.error(error);
      message.error("删除失败");
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请先选择要删除的项");
      return;
    }
    setEntityTypes(
      entityTypes.filter((item) => !selectedRowKeys.includes(item.id)),
    );
    setSelectedRowKeys([]);
    message.success(`成功删除 ${selectedRowKeys.length} 项`);
  };

  const handleSearch = () => {
    if (page === 1) {
      fetchData(1, searchName, searchStatus);
    } else {
      setPage(1);
    }
  };

  const handleReset = () => {
    setSearchName("");
    setSearchStatus("全部");
    setSelectedRowKeys([]);
    if (page === 1) {
      fetchData(1, "", "全部");
    } else {
      setPage(1);
    }
    message.success("已刷新");
  };

  const handleImport = () => {
    if (!importFile) {
      message.warning("请输入文件路径或选择文件");
      return;
    }
    message.success("导入成功");
    setImportModalVisible(false);
    setImportFile("");
  };

  const openModal = (record?: EntityTypeItem) => {
    if (record) {
      setModalTitle("编辑实体类型");
      setEditingRecord(record);
      setFormData({
        name: record.name,
        description: record.description,
        attributes: [
          { key: "1", name: "实体名称", code: "name", dataType: "string" },
          { key: "2", name: "实体描述", code: "description", dataType: "text" },
          { key: "3", name: "标准编码", code: "code", dataType: "string" },
        ],
        status: record.status,
        icon: record.icon || "",
        color: record.color || "",
        bgColor: record.bgColor || "",
        isSystem: record.isSystem || false,
      });
    } else {
      setModalTitle("新建实体类型");
      setEditingRecord(null);
      setFormData({
        name: "",
        description: "",
        attributes: [
          { key: "1", name: "实体名称", code: "name", dataType: "string" },
          { key: "2", name: "实体描述", code: "description", dataType: "text" },
          { key: "3", name: "标准编码", code: "code", dataType: "string" },
        ],
        status: "disabled",
        icon: "",
        color: "",
        bgColor: "",
        isSystem: false,
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    setFormData({
      name: "",
      description: "",
      attributes: [],
      status: "disabled",
      icon: "",
      color: "",
      bgColor: "",
      isSystem: false,
    });
  };

  const addAttribute = () => {
    const newKey = Date.now().toString();
    setFormData({
      ...formData,
      attributes: [
        ...formData.attributes,
        { key: newKey, name: "", code: "", dataType: "string" },
      ],
    });
  };

  const removeAttribute = (key: string) => {
    if (formData.attributes.length <= 1) {
      message.warning("至少保留一个属性");
      return;
    }
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((attr) => attr.key !== key),
    });
  };

  const updateAttribute = (
    key: string,
    field: keyof EntityAttribute,
    value: string,
  ) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.map((attr) =>
        attr.key === key ? { ...attr, [field]: value } : attr,
      ),
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      message.error("请输入实体类型名称");
      return;
    }
    if (formData.name.length < 2 || formData.name.length > 30) {
      message.error("名称长度需在2-30字符之间");
      return;
    }
    const exists = entityTypes.some(
      (item) =>
        item.name === formData.name &&
        (!editingRecord || item.id !== editingRecord.id),
    );
    if (exists) {
      message.error("实体类型名称已存在");
      return;
    }
    for (const attr of formData.attributes) {
      if (!attr.name.trim() || !attr.code.trim()) {
        message.error("请完善属性信息");
        return;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(attr.code)) {
        message.error("属性编码需以小写字母开头，仅包含字母、数字和下划线");
        return;
      }
    }
    const codeSet = new Set(formData.attributes.map((a) => a.code));
    if (codeSet.size !== formData.attributes.length) {
      message.error("属性编码不可重复");
      return;
    }
    
    try {
      if (editingRecord) {
        await updateEntityType({
          id: editingRecord.id,
          name: formData.name,
          description: formData.description,
          enabled: formData.status === 'enabled' ? '1' : '0',
          icon: formData.icon,
          color: formData.color,
          bgColor: formData.bgColor,
          entityCount: editingRecord.entityCount || 0,
          isSystem: formData.isSystem,
        });

        fetchData(page, searchName, searchStatus);
        message.success("修改成功");
      } else {
        await addEntityType({
          name: formData.name,
          description: formData.description,
          enabled: formData.status === 'enabled' ? '1' : '0',
          icon: formData.icon,
          color: formData.color,
          bgColor: formData.bgColor,
          entityCount: 0,
          isSystem: formData.isSystem,
        });

        if (page !== 1) {
          setPage(1);
        } else {
          fetchData(1, searchName, searchStatus);
        }
        message.success("创建成功");
      }
      closeModal();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px)" }}>
        <Card styles={{ body: { flex: 1, minHeight: "86vh" } }}>
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#262626",
                  marginBottom: 4,
                }}
              >
                实体类型配置
              </div>
              <div style={{ fontSize: 14, color: "#8c8c8c" }}>
                配置专业领域关键实体类型，支持自定义实体属性和抽取规则
              </div>
            </div>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              <Col span={6}>
                <Card
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e8e8e8",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid rgba(24, 144, 255, 0.3)",
                      }}
                    >
                      <DatabaseOutlined
                        style={{ fontSize: 28, color: "#fff" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8c8c8c",
                          marginBottom: 4,
                        }}
                      >
                        实体类型总数
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          color: "#262626",
                        }}
                      >
                        42
                      </div>
                      <div style={{ fontSize: 12, color: "#52c41a" }}>
                        <ArrowUpOutlined /> 较上月新增 5 种
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e8e8e8",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg, #52c41a 0%, #73d13d 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid rgba(82, 196, 26, 0.3)",
                      }}
                    >
                      <CheckCircleOutlined
                        style={{ fontSize: 28, color: "#fff" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8c8c8c",
                          marginBottom: 4,
                        }}
                      >
                        启用实体总数
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          color: "#262626",
                        }}
                      >
                        38
                      </div>
                      <div style={{ fontSize: 12, color: "#52c41a" }}>
                        <ArrowUpOutlined /> 启用率 90.5%
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e8e8e8",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg, #722ed1 0%, #9254de 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid rgba(114, 46, 209, 0.3)",
                      }}
                    >
                      <DatabaseOutlined
                        style={{ fontSize: 28, color: "#fff" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8c8c8c",
                          marginBottom: 4,
                        }}
                      >
                        已配置实体数量
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          color: "#262626",
                        }}
                      >
                        12,487
                      </div>
                      <div style={{ fontSize: 12, color: "#52c41a" }}>
                        <ArrowUpOutlined /> 较上月新增 3,200
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e8e8e8",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg, #fa541c 0%, #ff7a45 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid rgba(250, 84, 28, 0.3)",
                      }}
                    >
                      <ClockCircleOutlined
                        style={{ fontSize: 28, color: "#fff" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8c8c8c",
                          marginBottom: 4,
                        }}
                      >
                        实体抽取准确率
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          color: "#fa541c",
                        }}
                      >
                        92.8%
                      </div>
                      <div style={{ fontSize: 12, color: "#52c41a" }}>
                        <ArrowUpOutlined /> 较上月提升 3.2%
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>

          <Divider style={{ margin: 0 }} />

          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #f0f0f0",
              background: "linear-gradient(180deg, #f7f9fc 0%, #fff 100%)",
            }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#262626",
                  }}
                >
                  实体类型列表
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "#8c8c8c",
                    marginLeft: 12,
                  }}
                >
                  管理所有专业领域关键实体类型及配置
                </span>
              </Col>
              <Col>
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    刷新
                  </Button>

                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBatchDelete}
                    disabled={selectedRowKeys.length === 0}
                  >
                    批量删除{" "}
                    {selectedRowKeys.length > 0
                      ? `(${selectedRowKeys.length})`
                      : ""}
                  </Button>
                  <Button
                    icon={<UploadOutlined />}
                    onClick={() => setImportModalVisible(true)}
                  >
                    导入实体类型
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openModal()}
                  >
                    新增实体类型
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Row gutter={[16, 12]}>
              <Col>
                <Input
                  placeholder="请输入实体类型名称"
                  allowClear
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  style={{ width: 200 }}
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Col>
              <Col>
                <Select
                  placeholder="请选择状态"
                  value={searchStatus}
                  onChange={setSearchStatus}
                  style={{ width: 120 }}
                  options={statusOptions}
                />
              </Col>
              <Col>
                <Space>
                  <Button type="primary" onClick={handleSearch}>搜索</Button>

                  <Button onClick={handleReset}>
                    重置
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          <Table
            dataSource={entityTypes}
            loading={loading}
            columns={columns}
            rowKey="id"
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedRowKeys,
              onChange: (keys: React.Key[]) =>
                setSelectedRowKeys(keys as string[]),
            }}
          />

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
        title="导入实体类型"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportFile("");
        }}
        width={500}
        footer={[
          <Button key="cancel" onClick={() => setImportModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleImport}>
            确定导入
          </Button>,
        ]}
      >
        <div
          style={{
            border: "2px dashed #d9d9d9",
            borderRadius: 8,
            padding: 40,
            textAlign: "center",
            background: "#fafafa",
          }}
        >
          <UploadOutlined style={{ fontSize: 40, color: "#8c8c8c" }} />
          <div style={{ marginTop: 8, color: "#595959" }}>
            点击上传文件或拖拽文件到此处
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
            支持 JSON、XML、TXT 格式文件
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, color: "#595959" }}>
            或输入文件路径：
          </div>
          <Input
            placeholder="请输入文件路径"
            value={importFile}
            onChange={(e) => setImportFile(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#f6f9ff",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#1890ff",
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            导入说明：
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
              fontSize: 12,
              color: "#8c8c8c",
            }}
          >
            <li>支持 JSON 格式文件，每行一个实体类型定义</li>
            <li>支持 XML 格式文件，符合实体类型schema规范</li>
            <li>导入将覆盖同名实体类型，请谨慎操作</li>
          </ul>
        </div>
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={closeModal}
        width={700}
        footer={[
          <Button key="cancel" onClick={closeModal}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingRecord ? "保存修改" : "创建实体类型"}
          </Button>,
        ]}
      >
        <div
          style={{
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#f5222d" }}>* </span>
              实体类型名称
            </div>
            <Input
              placeholder="请输入实体类型名称"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={!!editingRecord}
            />
            <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
              建议使用清晰易懂的中文名称，如"疾病实体"、"药品实体"
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>实体描述</div>
            <Input.TextArea
              placeholder="请描述该实体类型的用途和包含范围"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              maxLength={200}
              showCount
            />
          </div>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <div style={{ marginBottom: 6 }}>图标</div>
              <Select
                placeholder="请选择图标"
                value={formData.icon || undefined}
                onChange={(value) =>
                  setFormData({ ...formData, icon: value })
                }
                options={iconOptions}
                style={{ width: "100%" }}
                allowClear
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 6 }}>字体颜色</div>
              <ColorPicker
                value={formData.color}
                onChange={(color) =>
                  setFormData({ ...formData, color: color.toHexString() })
                }
                showText
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 6 }}>背景颜色</div>
              <ColorPicker
                value={formData.bgColor}
                onChange={(color) =>
                  setFormData({ ...formData, bgColor: color.toHexString() })
                }
                showText
              />
            </Col>
          </Row>

          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 6 }}>系统内置</div>
            <Switch
              checked={formData.isSystem}
              onChange={(checked) =>
                setFormData({ ...formData, isSystem: checked })
              }
            />
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            background: "#f6f9ff",
            padding: 16,
            marginBottom: 16,
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
            实体属性配置
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#8c8c8c",
              marginBottom: 12,
            }}
          >
            用于定义该实体类型包含哪些属性字段，每个属性对应一个抽取维度。
          </div>

          <Table
            dataSource={formData.attributes}
            pagination={false}
            size="small"
            columns={[
              {
                title: "属性名称",
                dataIndex: "name",
                key: "name",
                width: 150,
                render: (text: string, record: EntityAttribute) => (
                  <Input
                    placeholder="请输入属性名称"
                    value={text}
                    onChange={(e) =>
                      updateAttribute(record.key, "name", e.target.value)
                    }
                  />
                ),
              },
              {
                title: "属性编码",
                dataIndex: "code",
                key: "code",
                width: 150,
                render: (text: string, record: EntityAttribute) => (
                  <Input
                    placeholder="请输入属性编码"
                    value={text}
                    onChange={(e) =>
                      updateAttribute(record.key, "code", e.target.value)
                    }
                  />
                ),
              },
              {
                title: "数据类型",
                dataIndex: "dataType",
                key: "dataType",
                width: 120,
                render: (text: string, record: EntityAttribute) => (
                  <Select
                    placeholder="请选择类型"
                    value={text}
                    onChange={(value) =>
                      updateAttribute(record.key, "dataType", value)
                    }
                    options={fieldTypeOptions}
                    style={{ width: 100 }}
                  />
                ),
              },
              {
                title: "操作",
                key: "action",
                width: 60,
                render: (_: any, record: EntityAttribute) => (
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeAttribute(record.key)}
                  />
                ),
              },
            ]}
            rowKey="key"
          />

          <Button
            type="dashed"
            onClick={addAttribute}
            style={{ width: "100%", marginTop: 8 }}
            icon={<PlusOutlined />}
          >
            添加属性
          </Button>
        </div>

        <div
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
            <CheckCircleOutlined />
            状态设置
          </div>

          <Radio.Group
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
          >
            <Radio value="enabled">立即启用</Radio>
            <Radio value="disabled">暂不启用</Radio>
          </Radio.Group>
          <div
            style={{
              fontSize: 12,
              color: "#8c8c8c",
              marginTop: 8,
            }}
          >
            立即启用的实体类型将参与抽取任务，请确认属性配置完整后再启用。
          </div>
        </div>
      </Modal>
    </>
  );
}
