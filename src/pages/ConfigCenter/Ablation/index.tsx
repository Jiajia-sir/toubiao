"use client";

import { Button, Card, Col, Row, Space } from "antd";
import { history } from "@umijs/max";
import { RightOutlined } from "@ant-design/icons";
import { ablationPageConfigs, overviewCards } from "./config";

export default function AblationIndexPage() {
  return (
    <div style={{ background: "#f5f7fa", minHeight: "calc(100vh - 300px)" }}>
      <Card styles={{ body: { flex: 1, minHeight: "86vh" } }}>
        <div style={{ padding: 24, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: "#262626" }}>
            消融配置
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#8c8c8c" }}>
            按实体、关系、属性拆分独立操作页面，分别管理各自的消融规则。
          </div>
        </div>

        <div style={{ padding: 24, paddingBottom: 8 }}>
          <Row gutter={[16, 16]}>
            {ablationPageConfigs.map((item) => (
              <Col xs={24} xl={8} key={item.key}>
                <Card
                  style={{
                    height: "100%",
                    borderRadius: 14,
                    border: `1px solid ${item.heroColor}20`,
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.heroColor,
                      background: "#fff",
                      boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                      fontSize: 24,
                      marginBottom: 16,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#262626",
                      marginBottom: 10,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      minHeight: 46,
                      color: "#595959",
                      lineHeight: 1.8,
                      marginBottom: 16,
                    }}
                  >
                    {item.intro}
                  </div>
                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    {item.metrics.map((metric) => (
                      <div
                        key={metric.title}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "#8c8c8c",
                          fontSize: 13,
                        }}
                      >
                        <span>{metric.title}</span>
                        <span style={{ color: metric.tone, fontWeight: 600 }}>
                          {metric.value}
                        </span>
                      </div>
                    ))}
                  </Space>
                  <Button
                    type="primary"
                    icon={<RightOutlined />}
                    style={{ marginTop: 18 }}
                    onClick={() => history.push(item.route)}
                  >
                    进入操作页
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <div style={{ padding: "8px 24px 24px" }}>
          <Card title="页面设计说明">
            <Row gutter={[16, 16]}>
              {overviewCards.map((card) => (
                <Col xs={24} md={12} xl={8} key={card.title}>
                  <div
                    style={{
                      height: "100%",
                      padding: 16,
                      borderRadius: 12,
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#262626",
                        marginBottom: 8,
                      }}
                    >
                      {card.icon}
                      {card.title}
                    </div>
                    <div style={{ color: "#595959", lineHeight: 1.8 }}>
                      {card.description}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </div>
      </Card>
    </div>
  );
}
