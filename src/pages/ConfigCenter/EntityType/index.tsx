"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  ColorPicker,
  Empty,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  addEntityType,
  addEntityTypeAttribute,
  getEntityTypeAttributePage,
  getEntityTypePage,
  removeEntityType,
  removeEntityTypeAttribute,
  updateEntityType,
  updateEntityTypeAttribute,
} from "@/services/biz/entity-type";

type StatusValue = "enabled" | "disabled";

interface EntityTypeItem {
  id: string;
  name: string;
  description: string;
  attributeCount: number;
  entityCount: number;
  status: StatusValue;
  enabled?: string | number;
  createTime?: string;
  updateTime?: string;
  icon?: string;
  color?: string;
  bgColor?: string;
  isSystem?: boolean;
}

interface EntityAttributeItem {
  id: string;
  entityTypeConfigId: string;
  entityTypeName: string;
  name: string;
  code: string;
  dataType: string;
  description: string;
  createTime?: string;
  updateTime?: string;
}

const pageSize = 10;
const attributePageSize = 10;

const statusOptions = [
  { label: "全部状态", value: "all" },
  { label: "已启用", value: "enabled" },
  { label: "已停用", value: "disabled" },
];

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
  { label: "数据库", value: "DatabaseOutlined" },
  { label: "业务对象", value: "SettingOutlined" },
  { label: "校验对象", value: "CheckCircleOutlined" },
];

const iconMap: Record<string, React.ReactNode> = {
  DatabaseOutlined: <DatabaseOutlined />,
  SettingOutlined: <SettingOutlined />,
  CheckCircleOutlined: <CheckCircleOutlined />,
};

function normalizeEntityType(item: any): EntityTypeItem {
  return {
    id: String(item?.id ?? item?.entityTypeConfigId ?? ""),
    name: item?.name ?? "",
    description: item?.description ?? "",
    attributeCount: Number(item?.attributeCount ?? 0),
    entityCount: Number(item?.entityCount ?? 0),
    status:
      String(item?.enabled) === "0" || item?.status === "disabled"
        ? "disabled"
        : "enabled",
    enabled: item?.enabled,
    createTime: item?.createTime,
    updateTime: item?.updateTime,
    icon: item?.icon,
    color: item?.color || "#1890ff",
    bgColor: item?.bgColor || "#e6f4ff",
    isSystem: Boolean(item?.isSystem),
  };
}

function normalizeEntityAttribute(
  item: any,
  entityTypes: EntityTypeItem[],
): EntityAttributeItem {
  const entityTypeId = String(item?.entityTypeConfigId ?? item?.entityTypeId ?? "");
  const entityType = entityTypes.find((entry) => entry.id === entityTypeId);

  return {
    id: String(item?.id ?? ""),
    entityTypeConfigId: entityTypeId,
    entityTypeName:
      item?.entityTypeName || entityType?.name || `类型 ${entityTypeId || "-"}`,
    name: item?.name ?? "",
    code: item?.code ?? "",
    dataType: item?.dataType ?? "string",
    description: item?.description ?? "",
    createTime: item?.createTime,
    updateTime: item?.updateTime,
  };
}

function extractPageList(payload: any): any[] {
  return (
    payload?.rows ||
    payload?.data?.records ||
    payload?.data?.list ||
    payload?.list ||
    payload?.data ||
    []
  );
}

function extractPageTotal(payload: any): number {
  return Number(payload?.total ?? payload?.data?.total ?? 0);
}

export default function EntityTypePage() {
  const [entityTypes, setEntityTypes] = useState<EntityTypeItem[]>([]);
  const [entityPage, setEntityPage] = useState(1);
  const [entityTotal, setEntityTotal] = useState(0);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entitySearchName, setEntitySearchName] = useState("");
  const [entitySearchStatus, setEntitySearchStatus] = useState("all");
  const [selectedEntityTypeId, setSelectedEntityTypeId] = useState<string>("");
  const [selectedEntityRowKeys, setSelectedEntityRowKeys] = useState<string[]>([]);

  const [attributeList, setAttributeList] = useState<EntityAttributeItem[]>([]);
  const [attributePage, setAttributePage] = useState(1);
  const [attributeTotal, setAttributeTotal] = useState(0);
  const [attributeLoading, setAttributeLoading] = useState(false);
  const [attributeSearchName, setAttributeSearchName] = useState("");

  const [entityModalVisible, setEntityModalVisible] = useState(false);
  const [editingEntity, setEditingEntity] = useState<EntityTypeItem | null>(null);
  const [entityForm, setEntityForm] = useState({
    name: "",
    description: "",
    status: "enabled" as StatusValue,
    icon: "DatabaseOutlined",
    color: "#1890ff",
    bgColor: "#e6f4ff",
    isSystem: false,
  });

  const [attributeModalVisible, setAttributeModalVisible] = useState(false);
  const [editingAttribute, setEditingAttribute] =
    useState<EntityAttributeItem | null>(null);
  const [attributeForm, setAttributeForm] = useState({
    name: "",
    code: "",
    dataType: "string",
    description: "",
  });

  const selectedEntityType = useMemo(
    () => entityTypes.find((item) => item.id === selectedEntityTypeId) || null,
    [entityTypes, selectedEntityTypeId],
  );

  const enabledEntityCount = useMemo(
    () => entityTypes.filter((item) => item.status === "enabled").length,
    [entityTypes],
  );

  const totalAttributeCount = useMemo(
    () => entityTypes.reduce((sum, item) => sum + item.attributeCount, 0),
    [entityTypes],
  );

  const entityTypeOptions = useMemo(
    () => entityTypes.map((item) => ({ label: item.name, value: item.id })),
    [entityTypes],
  );

  const fetchEntityTypes = async (
    targetPage = entityPage,
    name = entitySearchName,
    status = entitySearchStatus,
  ) => {
    setEntityLoading(true);
    try {
      const response = await getEntityTypePage({
        pageNo: targetPage,
        pageSize,
        name: name || undefined,
        enabled:
          status === "all" ? undefined : status === "enabled" ? "1" : "0",
      });
      const nextList = extractPageList(response).map(normalizeEntityType);
      setEntityTypes(nextList);
      setEntityTotal(extractPageTotal(response));

      if (!nextList.length) {
        setSelectedEntityTypeId("");
        setAttributeList([]);
        setAttributeTotal(0);
        return;
      }

      setSelectedEntityTypeId((current) => {
        if (current && nextList.some((item) => item.id === current)) {
          return current;
        }
        return nextList[0].id;
      });
    } catch (error) {
      console.error(error);
      message.error("加载实体类型失败");
    } finally {
      setEntityLoading(false);
    }
  };

  const fetchAttributes = async (
    entityTypeId = selectedEntityTypeId,
    targetPage = attributePage,
    keyword = attributeSearchName,
  ) => {
    if (!entityTypeId) {
      setAttributeList([]);
      setAttributeTotal(0);
      return;
    }

    setAttributeLoading(true);
    try {
      const response = await getEntityTypeAttributePage({
        pageNo: targetPage,
        pageSize: attributePageSize,
        entityTypeConfigId: entityTypeId,
        name: keyword || undefined,
      });
      const nextList = extractPageList(response).map((item: any) =>
        normalizeEntityAttribute(item, entityTypes),
      );
      setAttributeList(nextList);
      setAttributeTotal(extractPageTotal(response));
    } catch (error) {
      console.error(error);
      message.error("加载实体属性失败");
    } finally {
      setAttributeLoading(false);
    }
  };

  useEffect(() => {
    fetchEntityTypes(entityPage, entitySearchName, entitySearchStatus);
  }, [entityPage]);

  useEffect(() => {
    setAttributePage(1);
  }, [selectedEntityTypeId]);

  useEffect(() => {
    fetchAttributes(selectedEntityTypeId, attributePage, attributeSearchName);
  }, [selectedEntityTypeId, attributePage]);

  const openEntityModal = (record?: EntityTypeItem) => {
    setEditingEntity(record || null);
    setEntityForm({
      name: record?.name || "",
      description: record?.description || "",
      status: record?.status || "enabled",
      icon: record?.icon || "DatabaseOutlined",
      color: record?.color || "#1890ff",
      bgColor: record?.bgColor || "#e6f4ff",
      isSystem: Boolean(record?.isSystem),
    });
    setEntityModalVisible(true);
  };

  const closeEntityModal = () => {
    setEntityModalVisible(false);
    setEditingEntity(null);
  };

  const submitEntity = async () => {
    if (!entityForm.name.trim()) {
      message.error("请填写实体类型名称");
      return;
    }

    const payload = {
      id: editingEntity?.id,
      name: entityForm.name.trim(),
      description: entityForm.description.trim(),
      enabled: entityForm.status === "enabled" ? "1" : "0",
      icon: entityForm.icon,
      color: entityForm.color,
      bgColor: entityForm.bgColor,
      entityCount: editingEntity?.entityCount || 0,
      isSystem: entityForm.isSystem,
    };

    try {
      if (editingEntity) {
        await updateEntityType(payload);
        message.success("实体类型已更新");
      } else {
        await addEntityType(payload);
        message.success("实体类型已创建");
        if (entityPage !== 1) {
          setEntityPage(1);
        }
      }
      fetchEntityTypes(editingEntity ? entityPage : 1, entitySearchName, entitySearchStatus);
      closeEntityModal();
    } catch (error) {
      console.error(error);
      message.error(editingEntity ? "更新实体类型失败" : "创建实体类型失败");
    }
  };

  const deleteEntity = async (id: string) => {
    try {
      await removeEntityType(id);
      message.success("实体类型已删除");
      const nextPage = entityTypes.length === 1 && entityPage > 1 ? entityPage - 1 : entityPage;
      if (nextPage !== entityPage) {
        setEntityPage(nextPage);
      } else {
        fetchEntityTypes(nextPage, entitySearchName, entitySearchStatus);
      }
    } catch (error) {
      console.error(error);
      message.error("删除实体类型失败");
    }
  };

  const batchDeleteEntity = async () => {
    if (!selectedEntityRowKeys.length) {
      message.warning("请先选择实体类型");
      return;
    }

    try {
      await Promise.all(selectedEntityRowKeys.map((id) => removeEntityType(id)));
      message.success(`已删除 ${selectedEntityRowKeys.length} 个实体类型`);
      setSelectedEntityRowKeys([]);
      fetchEntityTypes(entityPage, entitySearchName, entitySearchStatus);
    } catch (error) {
      console.error(error);
      message.error("批量删除实体类型失败");
    }
  };

  const openAttributeModal = (record?: EntityAttributeItem) => {
    if (!selectedEntityType) {
      message.warning("请先选择实体类型");
      return;
    }
    setEditingAttribute(record || null);
    setAttributeForm({
      name: record?.name || "",
      code: record?.code || "",
      dataType: record?.dataType || "string",
      description: record?.description || "",
    });
    setAttributeModalVisible(true);
  };

  const closeAttributeModal = () => {
    setAttributeModalVisible(false);
    setEditingAttribute(null);
  };

  const submitAttribute = async () => {
    if (!selectedEntityType) {
      message.error("当前未选择实体类型");
      return;
    }
    if (!attributeForm.name.trim() || !attributeForm.code.trim()) {
      message.error("请填写属性名称和属性编码");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(attributeForm.code.trim())) {
      message.error("属性编码需以小写字母开头，仅支持字母、数字和下划线");
      return;
    }

    const payload = {
      id: editingAttribute?.id,
      entityTypeConfigId: selectedEntityType.id,
      name: attributeForm.name.trim(),
      code: attributeForm.code.trim(),
      dataType: attributeForm.dataType,
      description: attributeForm.description.trim(),
    };

    try {
      if (editingAttribute) {
        await updateEntityTypeAttribute(payload);
        message.success("实体属性已更新");
      } else {
        await addEntityTypeAttribute(payload);
        message.success("实体属性已创建");
        if (attributePage !== 1) {
          setAttributePage(1);
        }
      }
      fetchAttributes(selectedEntityType.id, editingAttribute ? attributePage : 1, attributeSearchName);
      fetchEntityTypes(entityPage, entitySearchName, entitySearchStatus);
      closeAttributeModal();
    } catch (error) {
      console.error(error);
      message.error(editingAttribute ? "更新实体属性失败" : "创建实体属性失败");
    }
  };

  const deleteAttribute = async (id: string) => {
    try {
      await removeEntityTypeAttribute(id);
      message.success("实体属性已删除");
      fetchAttributes(selectedEntityTypeId, attributePage, attributeSearchName);
      fetchEntityTypes(entityPage, entitySearchName, entitySearchStatus);
    } catch (error) {
      console.error(error);
      message.error("删除实体属性失败");
    }
  };

  const entityColumns: ColumnsType<EntityTypeItem> = [
    {
      title: "实体类型",
      dataIndex: "name",
      key: "name",
      width: 260,
      render: (_value, record) => {
        const icon = iconMap[record.icon || "DatabaseOutlined"] || <DatabaseOutlined />;
        return (
          <Space align="start" size={12}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: record.bgColor || "#e6f4ff",
                color: record.color || "#1890ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {icon}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "#262626" }}>{record.name}</div>
              <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
                {record.description || "暂无描述"}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: "属性数",
      dataIndex: "attributeCount",
      key: "attributeCount",
      width: 100,
    },
    {
      title: "实体量",
      dataIndex: "entityCount",
      key: "entityCount",
      width: 120,
      render: (value) => Number(value || 0).toLocaleString(),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (value: StatusValue) => (
        <Tag color={value === "enabled" ? "success" : "default"}>
          {value === "enabled" ? "启用" : "停用"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
      render: (value) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "--",
    },
    {
      title: "操作",
      key: "action",
      width: 220,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEntityModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该实体类型？"
            okText="确认"
            cancelText="取消"
            onConfirm={() => deleteEntity(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const attributeColumns: ColumnsType<EntityAttributeItem> = [
    {
      title: "属性",
      dataIndex: "name",
      key: "name",
      width: 240,
      render: (_value, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "#262626" }}>{record.name}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>{record.code}</div>
        </div>
      ),
    },
    {
      title: "数据类型",
      dataIndex: "dataType",
      key: "dataType",
      width: 120,
      render: (value) => (
        <Tag>{fieldTypeOptions.find((item) => item.value === value)?.label || value}</Tag>
      ),
    },
    {
      title: "说明",
      dataIndex: "description",
      key: "description",
      render: (value) => value || "--",
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
      render: (value) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "--",
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openAttributeModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该属性？"
            okText="确认"
            cancelText="取消"
            onConfirm={() => deleteAttribute(record.id)}
          >
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
      <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 140px)" }}>
        <Card
          bordered={false}
          styles={{ body: { padding: 20, minHeight: "calc(100vh - 160px)" } }}
          style={{ borderRadius: 14, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#1f1f1f" }}>
                实体类型与属性配置
              </div>
              <div style={{ fontSize: 13, color: "#8c8c8c", marginTop: 4 }}>
                左侧维护实体类型，右侧只处理当前选中类型的属性。
              </div>
            </div>
            <Space size={8} wrap>
              <Tag color="blue">类型 {entityTotal}</Tag>
              <Tag color="green">启用 {enabledEntityCount}</Tag>
              <Tag color="gold">属性 {totalAttributeCount}</Tag>
            </Space>
          </div>

          <Row gutter={16} align="stretch" style={{ minHeight: "calc(100vh - 280px)" }}>
            <Col xs={24} xl={11}>
              <Card
                title="实体类型"
                bordered={false}
                style={{
                  height: "100%",
                  minHeight: "calc(100vh - 280px)",
                  borderRadius: 12,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                }}
                styles={{ body: { padding: 16 } }}
                extra={
                  <Space size={8}>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() =>
                        fetchEntityTypes(entityPage, entitySearchName, entitySearchStatus)
                      }
                    >
                      刷新
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!selectedEntityRowKeys.length}
                      onClick={batchDeleteEntity}
                    >
                      删除
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => openEntityModal()}
                    >
                      新增
                    </Button>
                  </Space>
                }
              >
                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                  <Col flex="auto">
                    <Input
                      placeholder="搜索实体类型"
                      allowClear
                      value={entitySearchName}
                      onChange={(event) => setEntitySearchName(event.target.value)}
                      onPressEnter={() =>
                        fetchEntityTypes(1, entitySearchName, entitySearchStatus)
                      }
                      prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                    />
                  </Col>
                  <Col>
                    <Select
                      value={entitySearchStatus}
                      onChange={setEntitySearchStatus}
                      style={{ width: 120 }}
                      options={statusOptions}
                    />
                  </Col>
                  <Col>
                    <Button
                      type="primary"
                      onClick={() =>
                        fetchEntityTypes(1, entitySearchName, entitySearchStatus)
                      }
                    >
                      查询
                    </Button>
                  </Col>
                </Row>

                <Table
                  dataSource={entityTypes}
                  columns={entityColumns}
                  rowKey="id"
                  size="small"
                  loading={entityLoading}
                  pagination={false}
                  scroll={{ x: 920 }}
                  rowSelection={{
                    selectedRowKeys: selectedEntityRowKeys,
                    onChange: (keys) => setSelectedEntityRowKeys(keys as string[]),
                  }}
                  onRow={(record) => ({
                    onClick: () => setSelectedEntityTypeId(record.id),
                    style: {
                      cursor: "pointer",
                      background: record.id === selectedEntityTypeId ? "#edf5ff" : "#fff",
                    },
                  })}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <Pagination
                    current={entityPage}
                    pageSize={pageSize}
                    total={entityTotal}
                    onChange={setEntityPage}
                    showSizeChanger={false}
                    showTotal={(value) => `共 ${value} 条`}
                    size="small"
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={13}>
              <Card
                title="实体属性"
                bordered={false}
                style={{
                  height: "100%",
                  minHeight: "calc(100vh - 280px)",
                  borderRadius: 12,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                }}
                styles={{ body: { padding: 16 } }}
                extra={
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!selectedEntityType}
                    onClick={() => openAttributeModal()}
                  >
                    新增属性
                  </Button>
                }
              >
                {selectedEntityType ? (
                  <>
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "#fff",
                        border: "1px solid #e8f1ff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#262626" }}>
                            {selectedEntityType.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
                            {selectedEntityType.description || "该实体类型暂未填写描述。"}
                          </div>
                        </div>
                        <Space size={6} wrap>
                          <Tag color={selectedEntityType.status === "enabled" ? "success" : "default"}>
                            {selectedEntityType.status === "enabled" ? "启用" : "停用"}
                          </Tag>
                          <Tag color="blue">属性 {selectedEntityType.attributeCount}</Tag>
                          <Tag color="geekblue">实体 {selectedEntityType.entityCount}</Tag>
                        </Space>
                      </div>
                    </div>

                    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                      <Col flex="auto">
                        <Input
                          placeholder="搜索当前类型下的属性名称或编码"
                          allowClear
                          value={attributeSearchName}
                          onChange={(event) => setAttributeSearchName(event.target.value)}
                          onPressEnter={() =>
                            fetchAttributes(selectedEntityType.id, 1, attributeSearchName)
                          }
                          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                        />
                      </Col>
                      <Col>
                        <Button
                          type="primary"
                          onClick={() =>
                            fetchAttributes(selectedEntityType.id, 1, attributeSearchName)
                          }
                        >
                          查询
                        </Button>
                      </Col>
                    </Row>

                    <Table
                      dataSource={attributeList}
                      columns={attributeColumns}
                      rowKey="id"
                      size="small"
                      loading={attributeLoading}
                      pagination={false}
                      scroll={{ x: 760 }}
                      locale={{ emptyText: <Empty description="当前实体类型下暂无属性" /> }}
                    />

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <Pagination
                        current={attributePage}
                        pageSize={attributePageSize}
                        total={attributeTotal}
                        onChange={setAttributePage}
                        showSizeChanger={false}
                        showTotal={(value) => `共 ${value} 条`}
                        size="small"
                      />
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      minHeight: "calc(100vh - 420px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Empty description="先在左侧选择一个实体类型" />
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Card>
      </div>

      <Modal
        title={editingEntity ? "编辑实体类型" : "新增实体类型"}
        open={entityModalVisible}
        onCancel={closeEntityModal}
        onOk={submitEntity}
        okText="保存"
        cancelText="取消"
        width={720}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div style={{ marginBottom: 6 }}>实体类型名称</div>
            <Input
              value={entityForm.name}
              onChange={(event) =>
                setEntityForm({ ...entityForm, name: event.target.value })
              }
              placeholder="例如：疾病实体"
              disabled={Boolean(editingEntity)}
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 6 }}>状态</div>
            <Select
              value={entityForm.status}
              onChange={(value: StatusValue) =>
                setEntityForm({ ...entityForm, status: value })
              }
              options={[
                { label: "启用", value: "enabled" },
                { label: "停用", value: "disabled" },
              ]}
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={24}>
            <div style={{ marginBottom: 6 }}>描述</div>
            <Input.TextArea
              rows={3}
              value={entityForm.description}
              onChange={(event) =>
                setEntityForm({ ...entityForm, description: event.target.value })
              }
              placeholder="说明该实体类型的业务范围和抽取用途"
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 6 }}>图标</div>
            <Select
              value={entityForm.icon}
              onChange={(value) => setEntityForm({ ...entityForm, icon: value })}
              options={iconOptions}
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 6 }}>主色</div>
            <ColorPicker
              value={entityForm.color}
              onChange={(color) =>
                setEntityForm({ ...entityForm, color: color.toHexString() })
              }
              showText
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 6 }}>背景色</div>
            <ColorPicker
              value={entityForm.bgColor}
              onChange={(color) =>
                setEntityForm({ ...entityForm, bgColor: color.toHexString() })
              }
              showText
            />
          </Col>
          <Col span={24}>
            <div style={{ marginBottom: 6 }}>系统内置</div>
            <Switch
              checked={entityForm.isSystem}
              onChange={(checked) =>
                setEntityForm({ ...entityForm, isSystem: checked })
              }
            />
          </Col>
        </Row>
      </Modal>

      <Modal
        title={editingAttribute ? "编辑实体属性" : "新增实体属性"}
        open={attributeModalVisible}
        onCancel={closeAttributeModal}
        onOk={submitAttribute}
        okText="保存"
        cancelText="取消"
        width={720}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div style={{ marginBottom: 6 }}>所属实体类型</div>
            <Select
              value={selectedEntityType?.id}
              options={entityTypeOptions}
              disabled
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 6 }}>数据类型</div>
            <Select
              value={attributeForm.dataType}
              onChange={(value) =>
                setAttributeForm({ ...attributeForm, dataType: value })
              }
              options={fieldTypeOptions}
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 6 }}>属性名称</div>
            <Input
              value={attributeForm.name}
              onChange={(event) =>
                setAttributeForm({ ...attributeForm, name: event.target.value })
              }
              placeholder="例如：实体名称"
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 6 }}>属性编码</div>
            <Input
              value={attributeForm.code}
              onChange={(event) =>
                setAttributeForm({ ...attributeForm, code: event.target.value })
              }
              placeholder="例如：entity_name"
            />
          </Col>
          <Col span={24}>
            <div style={{ marginBottom: 6 }}>描述</div>
            <Input.TextArea
              rows={3}
              value={attributeForm.description}
              onChange={(event) =>
                setAttributeForm({
                  ...attributeForm,
                  description: event.target.value,
                })
              }
              placeholder="说明该属性的业务含义"
            />
          </Col>
        </Row>
      </Modal>
    </>
  );
}
