"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
} from "antd";
import {
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { AblationPageConfig } from "./config";

type AblationStatus = "enabled" | "disabled";
type ImpactLevel = "low" | "medium" | "high";

interface ExperimentResult {
  sampleSize: number;
  baselineScore: number;
  resultScore: number;
  precision: number;
  recall: number;
  f1: number;
  hits10: number;
  mrr: number;
  impactLevel: ImpactLevel;
  summary: string;
  conclusion: string;
  removedComponent: string;
}

interface AblationRule {
  id: string;
  name: string;
  target: string;
  ratio: number;
  strategy: "random" | "rule" | "priority";
  status: AblationStatus;
  remark: string;
  updateTime: string;
  experimentResult: ExperimentResult;
}

interface Props {
  config: AblationPageConfig;
}

const strategyOptions = [
  { label: "随机消融", value: "random" },
  { label: "规则消融", value: "rule" },
  { label: "优先级消融", value: "priority" },
];

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "启用", value: "enabled" },
  { label: "停用", value: "disabled" },
];

const seedData: Record<string, AblationRule[]> = {
  entity: [
    {
      id: "EA001",
      name: "去除实体类型",
      target: "人物实体 / 行业知识库",
      ratio: 12,
      strategy: "priority",
      status: "enabled",
      remark: "优先移除低置信度实体类型嵌入",
      updateTime: "2026-06-15 10:30:00",
      experimentResult: {
        sampleSize: 1280,
        baselineScore: 88.9,
        resultScore: 84.6,
        precision: 87.1,
        recall: 84.0,
        f1: 84.6,
        hits10: 82.3,
        mrr: 71.1,
        impactLevel: "medium",
        summary: "实体类型相关特征移除后，F1 下降 4.3 个百分点，召回与 Hits@10 同步下降。",
        conclusion: "实体类型特征对实体定位与召回有明显贡献，建议保留在主实验链路中。",
        removedComponent: "实体类型嵌入",
      },
    },
    {
      id: "EA002",
      name: "去除实体描述",
      target: "机构实体 / 近7天文档",
      ratio: 18,
      strategy: "rule",
      status: "enabled",
      remark: "验证实体文本描述缺失后的影响",
      updateTime: "2026-06-15 11:10:00",
      experimentResult: {
        sampleSize: 1460,
        baselineScore: 88.9,
        resultScore: 83.2,
        precision: 85.8,
        recall: 82.6,
        f1: 83.2,
        hits10: 80.5,
        mrr: 69.0,
        impactLevel: "medium",
        summary: "实体描述编码移除后，精确率与 F1 同步下降，说明描述对实体区分有效。",
        conclusion: "实体描述是重要辅助特征，尤其对同名实体消歧有价值，不建议在生产链路中关闭。",
        removedComponent: "实体描述编码",
      },
    },
    {
      id: "EA003",
      name: "去除全部实体特征",
      target: "全量实体 / 基线对照",
      ratio: 30,
      strategy: "priority",
      status: "disabled",
      remark: "仅保留结构信息做极限对照",
      updateTime: "2026-06-14 16:20:00",
      experimentResult: {
        sampleSize: 980,
        baselineScore: 88.9,
        resultScore: 76.4,
        precision: 79.3,
        recall: 75.8,
        f1: 76.4,
        hits10: 72.2,
        mrr: 60.1,
        impactLevel: "high",
        summary: "全部实体特征移除后，F1 下降 12.5 个百分点，整体性能衰减最明显。",
        conclusion: "实体类型、描述与上下文共同构成实体识别主特征集，不能整体移除。",
        removedComponent: "实体类型嵌入 / 实体描述编码 / 邻域上下文聚合",
      },
    },
  ],
  relation: [
    {
      id: "RA001",
      name: "去除低权重关系",
      target: "合作关系 / 全量图谱",
      ratio: 20,
      strategy: "priority",
      status: "enabled",
      remark: "优先裁剪低权重边",
      updateTime: "2026-06-15 09:10:00",
      experimentResult: {
        sampleSize: 2140,
        baselineScore: 90.2,
        resultScore: 82.4,
        precision: 84.1,
        recall: 81.2,
        f1: 82.4,
        hits10: 79.5,
        mrr: 68.4,
        impactLevel: "high",
        summary: "关系边减少后路径可达率明显下降，跨实体关联推荐衰减显著。",
        conclusion: "低权重关系中仍包含关键连接边，后续必须增加关键路径保护名单。",
        removedComponent: "低权重关系边",
      },
    },
    {
      id: "RA002",
      name: "去除上下位关系",
      target: "层级关系 / 试验批次A",
      ratio: 16,
      strategy: "rule",
      status: "enabled",
      remark: "观察层级链路影响",
      updateTime: "2026-06-14 14:40:00",
      experimentResult: {
        sampleSize: 920,
        baselineScore: 90.2,
        resultScore: 84.8,
        precision: 86.3,
        recall: 83.5,
        f1: 84.8,
        hits10: 81.7,
        mrr: 70.8,
        impactLevel: "medium",
        summary: "层级关系去除后，导航型检索和链路探索场景下降更明显。",
        conclusion: "上下位关系对层级查询贡献明显，目录型业务不建议大比例裁剪。",
        removedComponent: "上下位关系边",
      },
    },
  ],
  attribute: [
    {
      id: "AA001",
      name: "去除详情展示属性",
      target: "详情属性 / 文档检索",
      ratio: 10,
      strategy: "rule",
      status: "enabled",
      remark: "保留主标题与时间字段",
      updateTime: "2026-06-15 11:20:00",
      experimentResult: {
        sampleSize: 1460,
        baselineScore: 87.6,
        resultScore: 81.4,
        precision: 84.2,
        recall: 80.8,
        f1: 81.4,
        hits10: 78.6,
        mrr: 66.8,
        impactLevel: "medium",
        summary: "详情属性裁剪后页面仍可读，但高级筛选与排序结果下降明显。",
        conclusion: "展示属性可适度裁剪，但筛选与排序字段不能同时压缩过多。",
        removedComponent: "详情展示属性",
      },
    },
    {
      id: "AA002",
      name: "去除低频筛选属性",
      target: "过滤属性 / 编目数据",
      ratio: 18,
      strategy: "priority",
      status: "disabled",
      remark: "降低低频字段索引参与度",
      updateTime: "2026-06-12 18:00:00",
      experimentResult: {
        sampleSize: 1180,
        baselineScore: 87.6,
        resultScore: 85.9,
        precision: 86.8,
        recall: 84.7,
        f1: 85.9,
        hits10: 84.1,
        mrr: 74.2,
        impactLevel: "low",
        summary: "低频属性退出索引后排序变化有限，普通检索场景基本无感。",
        conclusion: "低频属性可以作为优先消融对象，但要保留少量高级检索依赖字段。",
        removedComponent: "低频筛选属性",
      },
    },
  ],
};

const impactToneMap: Record<ImpactLevel, { label: string; color: string }> = {
  low: { label: "低", color: "success" },
  medium: { label: "中", color: "warning" },
  high: { label: "高", color: "error" },
};

export default function OperationManagerPage({ config }: Props) {
  const [rules, setRules] = useState<AblationRule[]>(seedData[config.key] || []);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | AblationStatus>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AblationRule | null>(null);
  const [form] = Form.useForm<AblationRule>();

  const filteredRules = useMemo(
    () =>
      rules.filter((item) => {
        if (
          keyword &&
          !`${item.name} ${item.target} ${item.remark} ${item.experimentResult.summary}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false;
        }
        if (status !== "all" && item.status !== status) {
          return false;
        }
        return true;
      }),
    [keyword, rules, status],
  );

  const baselineScore = filteredRules.length
    ? Number(
        (
          filteredRules.reduce(
            (sum, item) => sum + item.experimentResult.baselineScore,
            0,
          ) / filteredRules.length
        ).toFixed(1),
      )
    : 0;

  const maxDropItem = filteredRules.reduce<AblationRule | null>((current, item) => {
    if (!current) {
      return item;
    }
    const currentDrop =
      current.experimentResult.baselineScore - current.experimentResult.resultScore;
    const nextDrop =
      item.experimentResult.baselineScore - item.experimentResult.resultScore;
    return nextDrop > currentDrop ? item : current;
  }, null);

  const maxDrop = maxDropItem
    ? Number(
        (
          maxDropItem.experimentResult.baselineScore -
          maxDropItem.experimentResult.resultScore
        ).toFixed(1),
      )
    : 0;

  const avgDrop = filteredRules.length
    ? Number(
        (
          filteredRules.reduce(
            (sum, item) =>
              sum +
              (item.experimentResult.baselineScore -
                item.experimentResult.resultScore),
            0,
          ) / filteredRules.length
        ).toFixed(1),
      )
    : 0;

  const bestSummary = maxDropItem?.experimentResult.summary || "暂无实验结果数据";
  const bestConclusion =
    maxDropItem?.experimentResult.conclusion || "暂无实验结论数据";

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      strategy: "random",
      ratio: 10,
      status: "enabled",
      experimentResult: {
        sampleSize: 1000,
        baselineScore: 88.9,
        resultScore: 84,
        precision: 85,
        recall: 83,
        f1: 84,
        hits10: 81,
        mrr: 70,
        impactLevel: "medium",
        summary: "",
        conclusion: "",
        removedComponent: "",
      },
    } as AblationRule);
    setModalVisible(true);
  };

  const openEdit = (record: AblationRule) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload: AblationRule = {
      ...values,
      id: editing?.id || `${config.key.slice(0, 1).toUpperCase()}A${Date.now()}`,
      updateTime: new Date().toLocaleString("zh-CN"),
      experimentResult: {
        sampleSize: values.experimentResult?.sampleSize || 1000,
        baselineScore: values.experimentResult?.baselineScore || 88.9,
        resultScore: values.experimentResult?.resultScore || 84,
        precision: values.experimentResult?.precision || 85,
        recall: values.experimentResult?.recall || 83,
        f1: values.experimentResult?.f1 || values.experimentResult?.resultScore || 84,
        hits10: values.experimentResult?.hits10 || 81,
        mrr: values.experimentResult?.mrr || 70,
        impactLevel: values.experimentResult?.impactLevel || "medium",
        summary:
          values.experimentResult?.summary ||
          "已完成本轮消融实验，当前结果可用于与基线做效果对比。",
        conclusion:
          values.experimentResult?.conclusion ||
          "当前消融策略已对核心指标产生可观测影响，建议结合业务场景继续扩大样本验证。",
        removedComponent:
          values.experimentResult?.removedComponent || "未填写移除组件",
      },
    };

    if (editing) {
      setRules((prev) => prev.map((item) => (item.id === editing.id ? payload : item)));
      message.success("消融规则已更新");
    } else {
      setRules((prev) => [payload, ...prev]);
      message.success("消融规则已新建");
    }

    setModalVisible(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSwitch = (record: AblationRule, checked: boolean) => {
    setRules((prev) =>
      prev.map((item) =>
        item.id === record.id
          ? {
              ...item,
              status: checked ? "enabled" : "disabled",
              updateTime: new Date().toLocaleString("zh-CN"),
            }
          : item,
      ),
    );
    message.success(checked ? "规则已启用" : "规则已停用");
  };

  const handleDelete = (id: string) => {
    setRules((prev) => prev.filter((item) => item.id !== id));
    message.success("规则已删除");
  };

  return (
    <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px)" }}>
      <Card styles={{ body: { flex: 1, minHeight: "86vh" } }}>
        <div
          style={{
            margin: 24,
            marginBottom: 16,
            padding: 24,
            borderRadius: 16,
            background: config.heroBackground,
            border: `1px solid ${config.heroColor}22`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: config.heroColor,
                background: "#fff",
                fontSize: 28,
              }}
            >
              {config.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#262626" }}>
                {config.title}
              </div>
              <div style={{ marginTop: 8, color: "#595959" }}>{config.intro}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 24px 16px" }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Card bordered={false} style={{ borderRadius: 14 }}>
                <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 6 }}>
                  完整模型 F1
                </div>
                <div style={{ fontSize: 16, color: "#595959", marginBottom: 4 }}>基线表现</div>
                <div style={{ fontSize: 34, fontWeight: 700, color: "#111" }}>
                  {baselineScore}%
                </div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card bordered={false} style={{ borderRadius: 14 }}>
                <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 6 }}>
                  消融变体数
                </div>
                <div style={{ fontSize: 16, color: "#595959", marginBottom: 4 }}>对照实验组</div>
                <div style={{ fontSize: 34, fontWeight: 700, color: "#111" }}>
                  {filteredRules.length}
                </div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card bordered={false} style={{ borderRadius: 14 }}>
                <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 6 }}>
                  最大 F1 下降
                </div>
                <div style={{ fontSize: 16, color: "#595959", marginBottom: 4 }}>
                  {maxDropItem?.name || "暂无"}
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, color: "#f5222d" }}>
                  -{maxDrop} pt
                </div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card bordered={false} style={{ borderRadius: 14 }}>
                <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 6 }}>
                  平均 F1 下降
                </div>
                <div style={{ fontSize: 16, color: "#595959", marginBottom: 4 }}>
                  全部变体均值
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, color: "#f5222d" }}>
                  -{avgDrop} pt
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        <div style={{ padding: "0 24px 16px" }}>
          <Card>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={8}>
                <Input
                  allowClear
                  placeholder={`搜索${config.title}规则名/目标/备注`}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </Col>
              <Col xs={24} md={5}>
                <Select
                  style={{ width: "100%" }}
                  value={status}
                  onChange={setStatus}
                  options={statusOptions}
                />
              </Col>
              <Col xs={24} md={11}>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setKeyword("");
                      setStatus("all");
                      message.success("筛选条件已重置");
                    }}
                  >
                    重置
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    新建{config.title}
                  </Button>
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        <div style={{ padding: "0 24px 16px" }}>
          <Table
            rowKey="id"
            dataSource={filteredRules}
            pagination={{ pageSize: 8 }}
            columns={[
              {
                title: "规则名称",
                dataIndex: "name",
                key: "name",
                render: (value: string, record: AblationRule) => (
                  <div>
                    <div style={{ fontWeight: 600, color: "#262626" }}>{value}</div>
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                      {record.target}
                    </div>
                  </div>
                ),
              },
              {
                title: "消融比例",
                dataIndex: "ratio",
                key: "ratio",
                width: 110,
                render: (value: number) => `${value}%`,
              },
              {
                title: "策略",
                dataIndex: "strategy",
                key: "strategy",
                width: 130,
                render: (value: string) =>
                  strategyOptions.find((item) => item.value === value)?.label || value,
              },
              {
                title: "状态",
                dataIndex: "status",
                key: "status",
                width: 130,
                render: (_: string, record: AblationRule) => (
                  <Space>
                    <Switch
                      checked={record.status === "enabled"}
                      onChange={(checked) => handleSwitch(record, checked)}
                    />
                    {record.status === "enabled" ? (
                      <Tag color="success">启用</Tag>
                    ) : (
                      <Tag>停用</Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: "备注",
                dataIndex: "remark",
                key: "remark",
              },
              {
                title: "更新时间",
                dataIndex: "updateTime",
                key: "updateTime",
                width: 180,
              },
              {
                title: "操作",
                key: "action",
                width: 140,
                render: (_: unknown, record: AblationRule) => (
                  <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                      编辑
                    </Button>
                    <Popconfirm
                      title="确认删除这条消融规则？"
                      onConfirm={() => handleDelete(record.id)}
                    >
                      <Button type="link" danger>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </div>

        <div style={{ padding: "0 24px 16px" }}>
          <Card
            title="详细消融结果"
            extra={<span style={{ color: "#8c8c8c" }}>括号内为相对基线变化</span>}
          >
            <Table
              rowKey="id"
              pagination={false}
              dataSource={filteredRules}
              columns={[
                {
                  title: "模型变体",
                  dataIndex: "name",
                  key: "name",
                  width: 180,
                  render: (value: string, record: AblationRule) => (
                    <div>
                      <div style={{ fontWeight: 600, color: "#111" }}>{value}</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                        {record.remark}
                      </div>
                    </div>
                  ),
                },
                {
                  title: "移除组件",
                  dataIndex: ["experimentResult", "removedComponent"],
                  key: "removedComponent",
                  render: (value: string) => (
                    <Tag color="default" style={{ whiteSpace: "normal" }}>
                      {value}
                    </Tag>
                  ),
                },
                {
                  title: "准确率",
                  dataIndex: ["experimentResult", "precision"],
                  key: "precision",
                  width: 100,
                },
                {
                  title: "召回率",
                  dataIndex: ["experimentResult", "recall"],
                  key: "recall",
                  width: 100,
                },
                {
                  title: "F1 值",
                  dataIndex: ["experimentResult", "f1"],
                  key: "f1",
                  width: 100,
                  render: (value: number, record: AblationRule) => {
                    const diff = Number(
                      (value - record.experimentResult.baselineScore).toFixed(1),
                    );
                    return (
                      <div>
                        <div style={{ fontWeight: 600 }}>{value}</div>
                        <div
                          style={{
                            fontSize: 12,
                            color: diff < 0 ? "#f5222d" : "#52c41a",
                          }}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </div>
                      </div>
                    );
                  },
                },
                {
                  title: "Hits@10",
                  dataIndex: ["experimentResult", "hits10"],
                  key: "hits10",
                  width: 100,
                },
                {
                  title: "MRR",
                  dataIndex: ["experimentResult", "mrr"],
                  key: "mrr",
                  width: 100,
                },
                {
                  title: "影响等级",
                  dataIndex: ["experimentResult", "impactLevel"],
                  key: "impactLevel",
                  width: 100,
                  render: (value: ImpactLevel) => (
                    <Tag color={impactToneMap[value].color}>
                      {impactToneMap[value].label}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          <Card title="实验结论">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={10}>
                <Card
                  bordered={false}
                  style={{
                    background: "#fafafa",
                    borderRadius: 12,
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 8 }}>
                    结果摘要
                  </div>
                  <div style={{ fontSize: 15, color: "#262626", lineHeight: 1.9 }}>
                    {bestSummary}
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={14}>
                <Card
                  bordered={false}
                  style={{
                    background: "#fff7f6",
                    borderRadius: 12,
                    border: "1px solid #ffd8bf",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 8 }}>
                    结论建议
                  </div>
                  <div style={{ fontSize: 15, color: "#262626", lineHeight: 1.9 }}>
                    {bestConclusion}
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </div>
      </Card>

      <Modal
        title={editing ? `编辑${config.title}` : `新建${config.title}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        width={760}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: "请输入规则名称" }]}
          >
            <Input placeholder="例如：去除实体描述" />
          </Form.Item>
          <Form.Item
            name="target"
            label="消融对象"
            rules={[{ required: true, message: "请输入消融对象" }]}
          >
            <Input placeholder="例如：人物实体 / 行业知识库 / 近7天文档" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="ratio"
                label="消融比例"
                rules={[{ required: true, message: "请输入消融比例" }]}
              >
                <InputNumber min={0} max={100} style={{ width: "100%" }} addonAfter="%" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="strategy"
                label="消融策略"
                rules={[{ required: true, message: "请选择消融策略" }]}
              >
                <Select options={strategyOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: "请选择状态" }]}
              >
                <Radio.Group>
                  <Radio value="enabled">启用</Radio>
                  <Radio value="disabled">停用</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注说明">
            <Input.TextArea rows={3} placeholder="填写本次消融实验说明" />
          </Form.Item>

          <Card size="small" title="实验结果与结论">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={["experimentResult", "sampleSize"]}
                  label="实验样本量"
                  rules={[{ required: true, message: "请输入实验样本量" }]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={["experimentResult", "baselineScore"]}
                  label="基线 F1"
                  rules={[{ required: true, message: "请输入基线 F1" }]}
                >
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={["experimentResult", "resultScore"]}
                  label="实验 F1"
                  rules={[{ required: true, message: "请输入实验 F1" }]}
                >
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name={["experimentResult", "precision"]} label="准确率">
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["experimentResult", "recall"]} label="召回率">
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["experimentResult", "hits10"]} label="Hits@10">
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["experimentResult", "mrr"]} label="MRR">
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name={["experimentResult", "removedComponent"]} label="移除组件">
              <Input placeholder="例如：实体描述编码" />
            </Form.Item>
            <Form.Item
              name={["experimentResult", "impactLevel"]}
              label="影响等级"
              rules={[{ required: true, message: "请选择影响等级" }]}
            >
              <Select
                options={[
                  { label: "低", value: "low" },
                  { label: "中", value: "medium" },
                  { label: "高", value: "high" },
                ]}
              />
            </Form.Item>
            <Form.Item name={["experimentResult", "summary"]} label="实验结果摘要">
              <Input.TextArea rows={3} placeholder="填写实验结果摘要" />
            </Form.Item>
            <Form.Item name={["experimentResult", "conclusion"]} label="实验结论">
              <Input.TextArea rows={4} placeholder="填写实验结论和建议" />
            </Form.Item>
          </Card>
        </Form>
      </Modal>
    </div>
  );
}
