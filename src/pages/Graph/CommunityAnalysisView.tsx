"use client";

import React, { useMemo, useState } from "react";
import { Button } from "antd";

export interface CommunityCluster {
  id: string;
  name: string;
  seedNodeId: string;
  nodeIds: string[];
  relationCount: number;
  bridgeCount: number;
  density: string;
  description?: string;
}

export interface CommunityAnalysisViewProps {
  graphData: any;
  communities: CommunityCluster[];
  activeCommunity: CommunityCluster | null;
  activeCommunityId: string | null;
  onFocusCommunity: (comm: CommunityCluster) => void;
  onClearCommunity: () => void;
  graphViewMode: "raw" | "community";
  onSwitchViewMode: (mode: "raw" | "community") => void;
  nodeScale?: number;
  graphRef?: React.RefObject<any>;
}

type CommunityId = "c1" | "c2" | "c3" | "c4";

interface ReferenceCommunity {
  id: CommunityId;
  sourceId: string;
  name: string;
  theme: string;
  center: { x: number; y: number };
  description: string;
  size: number;
  density: number;
  conductance: number;
  keywords: string[];
  outbound: { to: CommunityId; weight: number }[];
}

interface GraphNode {
  id: string;
  label: string;
  community: CommunityId;
  degree: number;
  bridge?: boolean;
  x: number;
  y: number;
}

interface GraphEdge {
  source: string;
  target: string;
  cross?: boolean;
}

const communityTones: Record<CommunityId, string> = {
  c1: "#78b9ee",
  c2: "#f2c57c",
  c3: "#7fd3b0",
  c4: "#eda2b4",
};

const communitySurface: Record<CommunityId, string> = {
  c1: "#eef7ff",
  c2: "#fff7e9",
  c3: "#eefbf5",
  c4: "#fdf1f4",
};

const fallbackCommunities: ReferenceCommunity[] = [
  {
    id: "c1",
    sourceId: "comm_1",
    name: "金融投资圈",
    theme: "资本运作与股权投资",
    center: { x: 285, y: 235 },
    description: "以头部投资机构与被投企业为核心的资本网络，内部资金流动与股权关系密集。",
    size: 11,
    density: 0.62,
    conductance: 0.18,
    keywords: ["股权投资", "并购", "融资轮次", "对赌协议", "退出"],
    outbound: [
      { to: "c2", weight: 6 },
      { to: "c4", weight: 3 },
    ],
  },
  {
    id: "c2",
    sourceId: "comm_2",
    name: "半导体合作网络",
    theme: "芯片设计与制造供应链",
    center: { x: 730, y: 220 },
    description: "围绕晶圆代工、IP 授权与设备材料形成的产业协作集群，供应链耦合度高。",
    size: 10,
    density: 0.58,
    conductance: 0.24,
    keywords: ["晶圆代工", "EDA", "IP 授权", "先进制程", "封测"],
    outbound: [
      { to: "c1", weight: 6 },
      { to: "c3", weight: 4 },
    ],
  },
  {
    id: "c3",
    sourceId: "comm_3",
    name: "新能源产业带",
    theme: "动力电池与光伏储能",
    center: { x: 300, y: 525 },
    description: "由电池材料、整车厂与储能运营商构成的上下游联盟，技术与产能协同显著。",
    size: 9,
    density: 0.55,
    conductance: 0.21,
    keywords: ["动力电池", "光伏", "储能", "整车", "充电网络"],
    outbound: [
      { to: "c2", weight: 4 },
      { to: "c4", weight: 3 },
    ],
  },
  {
    id: "c4",
    sourceId: "comm_4",
    name: "人工智能研究群",
    theme: "算法研究与算力基础设施",
    center: { x: 745, y: 520 },
    description: "以科研院所、大模型团队与云算力厂商为纽带的学术-产业混合网络。",
    size: 9,
    density: 0.6,
    conductance: 0.19,
    keywords: ["大模型", "算力", "开源框架", "多模态", "推理优化"],
    outbound: [
      { to: "c1", weight: 3 },
      { to: "c2", weight: 3 },
    ],
  },
];

const fallbackNodeDefs: Array<{ community: CommunityId; labels: string[]; bridges?: string[] }> = [
  {
    community: "c1",
    labels: ["红杉资本", "高瓴创投", "IDG 基金", "元璟控股", "深创投", "华兴资本", "GGV", "钟鼎资本", "云锋基金", "启明创投", "经纬中国"],
    bridges: ["华兴资本", "云锋基金"],
  },
  {
    community: "c2",
    labels: ["台积电", "中芯国际", "ASML", "英伟达", "ARM", "长电科技", "华为海思", "应用材料", "新思科技", "联电"],
    bridges: ["英伟达", "华为海思"],
  },
  {
    community: "c3",
    labels: ["宁德时代", "比亚迪", "隆基绿能", "阳光电源", "亿纬锂能", "特斯拉", "国轩高科", "天合光能", "蔚来能源"],
    bridges: ["特斯拉", "宁德时代"],
  },
  {
    community: "c4",
    labels: ["智源研究院", "深度求索", "商汤科技", "百川智能", "阿里云", "华为云", "月之暗面", "上海 AI Lab", "腾讯混元"],
    bridges: ["阿里云", "智源研究院"],
  },
];

function layoutReferenceNodes(communities: ReferenceCommunity[]): GraphNode[] {
  const nodes: GraphNode[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (const def of fallbackNodeDefs) {
    const community = communities.find((item) => item.id === def.community)!;
    def.labels.forEach((label, index) => {
      const isCore = index === 0;
      const isBridge = def.bridges?.includes(label) ?? false;
      const radius = isCore ? 0 : 34 + Math.sqrt(index) * 26;
      const angle = index * golden;
      nodes.push({
        id: `${def.community}-${index}`,
        label,
        community: def.community,
        degree: isCore ? 9 : isBridge ? 6 : 2 + ((index * 7) % 4),
        bridge: isBridge,
        x: community.center.x + Math.cos(angle) * radius,
        y: community.center.y + Math.sin(angle) * radius,
      });
    });
  }

  return nodes;
}

function buildReferenceEdges(): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const nodeId = (community: CommunityId, index: number) => `${community}-${index}`;

  for (const def of fallbackNodeDefs) {
    const count = def.labels.length;
    for (let index = 1; index < count; index += 1) {
      edges.push({ source: nodeId(def.community, 0), target: nodeId(def.community, index) });
      if (index % 2 === 0 && index + 1 < count) {
        edges.push({ source: nodeId(def.community, index), target: nodeId(def.community, index + 1) });
      }
      if (index % 3 === 0) {
        edges.push({ source: nodeId(def.community, index), target: nodeId(def.community, 1) });
      }
    }
  }

  const crossEdges: Array<[string, string]> = [
    ["c1-5", "c2-6"],
    ["c1-8", "c2-3"],
    ["c1-5", "c4-4"],
    ["c2-3", "c3-5"],
    ["c2-6", "c4-0"],
    ["c3-5", "c4-4"],
    ["c3-0", "c2-0"],
    ["c4-4", "c1-8"],
  ];

  crossEdges.forEach(([source, target]) => {
    edges.push({ source, target, cross: true });
  });

  return edges;
}

function buildReferenceData(inputCommunities: CommunityCluster[]) {
  const communities = fallbackCommunities.map((fallback, index) => {
    const source = inputCommunities[index];
    return {
      ...fallback,
      sourceId: source?.id || fallback.sourceId,
      name: source?.name || fallback.name,
      theme: source?.description || fallback.theme,
      description: source?.description || fallback.description,
      size: source?.nodeIds.length || fallback.size,
      density: Number(source?.density || fallback.density),
    };
  });

  return {
    communities,
    nodes: layoutReferenceNodes(communities),
    edges: buildReferenceEdges(),
  };
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = Math.max(0, Math.min(100, value * 100));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "#64748b" }}>{label}</span>
        <span style={{ color: "#0f172a", fontFamily: "Consolas, monospace" }}>{percent.toFixed(0)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", borderRadius: 999, background: color }} />
      </div>
    </div>
  );
}

function CommunityPanel({
  focused,
  communities,
  nodes,
}: {
  focused: CommunityId | null;
  communities: ReferenceCommunity[];
  nodes: GraphNode[];
}) {
  if (!focused) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>社区总览</div>
          <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.7, color: "#64748b" }}>
            算法在网络中识别出 {communities.length} 个社区。点击图中任一社区或节点可聚焦查看内部结构与外部联络关系。
          </div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {communities.map((community) => (
            <div
              key={community.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                padding: "12px 14px",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: communityTones[community.id],
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{community.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {community.theme}
                </div>
              </div>
              <span style={{ fontSize: 12, color: "#64748b", fontFamily: "Consolas, monospace" }}>{community.size} 节点</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const community = communities.find((item) => item.id === focused)!;
  const color = communityTones[community.id];
  const members = nodes
    .filter((item) => item.community === focused)
    .sort((left, right) => right.degree - left.degree)
    .slice(0, 6);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{community.name}</div>
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>{community.theme}</div>
        <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.7, color: "#64748b" }}>{community.description}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", background: "#ffffff", padding: "12px 14px" }}>
          <div style={{ fontFamily: "Consolas, monospace", fontSize: 22, color: "#0f172a" }}>{community.size}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>成员节点</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", background: "#ffffff", padding: "12px 14px" }}>
          <div style={{ fontFamily: "Consolas, monospace", fontSize: 22, color: "#0f172a" }}>{community.keywords.length}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>主题标签</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <Meter label="内部密度" value={community.density} color={color} />
        <Meter label="封闭度（低外联）" value={1 - community.conductance} color={color} />
      </div>

      <div>
        <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: "#64748b" }}>自动归纳主题</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {community.keywords.map((keyword) => (
            <span
              key={keyword}
              style={{
                borderRadius: 999,
                border: `1px solid ${color}`,
                padding: "4px 10px",
                fontSize: 12,
                color,
                background: "#ffffff",
              }}
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: "#64748b" }}>核心成员</div>
        <div style={{ display: "grid", gap: 8 }}>
          {members.map((member) => (
            <div key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#0f172a" }}>
                {member.label}
                {member.bridge ? (
                  <span style={{ borderRadius: 6, border: "1px solid #e5e7eb", padding: "1px 6px", fontSize: 10, color: "#64748b" }}>
                    桥梁
                  </span>
                ) : null}
              </span>
              <span style={{ fontFamily: "Consolas, monospace", fontSize: 12, color: "#64748b" }}>度 {member.degree}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: "#64748b" }}>对外联络方向</div>
        <div style={{ display: "grid", gap: 10 }}>
          {community.outbound.map((outbound) => {
            const target = communities.find((item) => item.id === outbound.to)!;
            return (
              <div key={outbound.to} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 8, alignItems: "center", fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: communityTones[outbound.to] }} />
                <span style={{ color: "#0f172a" }}>{target.name}</span>
                <div style={{ width: 64, height: 6, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                  <div style={{ width: `${(outbound.weight / 6) * 100}%`, height: "100%", borderRadius: 999, background: communityTones[outbound.to] }} />
                </div>
                <span style={{ fontFamily: "Consolas, monospace", color: "#64748b" }}>{outbound.weight}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CommunityGraph({
  communities,
  nodes,
  edges,
  focused,
  hovered,
  onFocusCommunity,
  onHoverNode,
}: {
  communities: ReferenceCommunity[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  focused: CommunityId | null;
  hovered: string | null;
  onFocusCommunity: (id: CommunityId | null) => void;
  onHoverNode: (id: string | null) => void;
}) {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    });
    return map;
  }, [edges]);

  const isNodeActive = (id: string) => {
    const node = nodeMap.get(id)!;
    if (focused) return node.community === focused;
    if (hovered) return hovered === id || adjacency.get(hovered)?.has(id) || false;
    return true;
  };

  const isEdgeActive = (source: string, target: string) => {
    if (focused) {
      return nodeMap.get(source)?.community === focused && nodeMap.get(target)?.community === focused;
    }
    if (hovered) {
      return source === hovered || target === hovered;
    }
    return true;
  };

  const dimmed = focused !== null || hovered !== null;

  return (
    <svg viewBox="0 0 1030 760" style={{ width: "100%", height: "100%" }} role="img" aria-label="知识图谱社区结构图，共四个社区">
      <defs>
        {communities.map((community) => (
          <radialGradient key={community.id} id={`halo-${community.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={communityTones[community.id]} stopOpacity="0.16" />
            <stop offset="70%" stopColor={communityTones[community.id]} stopOpacity="0.05" />
            <stop offset="100%" stopColor={communityTones[community.id]} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {communities.map((community) => {
        const active = !focused || focused === community.id;
        return (
          <g
            key={community.id}
            style={{ cursor: "pointer", opacity: active ? 1 : 0.15, transition: "opacity 0.4s ease" }}
            onClick={() => onFocusCommunity(focused === community.id ? null : community.id)}
          >
            <circle cx={community.center.x} cy={community.center.y} r={150} fill={`url(#halo-${community.id})`} />
            <text
              x={community.center.x}
              y={community.center.y - 132}
              textAnchor="middle"
              style={{ fill: "rgba(15, 23, 42, 0.75)", fontSize: 13, letterSpacing: 1 }}
            >
              {community.name}
            </text>
          </g>
        );
      })}

      <g strokeLinecap="round">
        {edges.map((edge, index) => {
          const source = nodeMap.get(edge.source)!;
          const target = nodeMap.get(edge.target)!;
          const active = isEdgeActive(edge.source, edge.target);
          const stroke = edge.cross ? "#94a3b8" : communityTones[source.community];
          return (
            <line
              key={`${edge.source}-${edge.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={stroke}
              strokeWidth={edge.cross ? 1 : 1.2}
              strokeDasharray={edge.cross ? "4 4" : undefined}
              style={{ opacity: active ? (edge.cross ? 0.5 : 0.4) : 0.06, transition: "opacity 0.4s ease" }}
            />
          );
        })}
      </g>

      <g>
        {nodes.map((node) => {
          const active = isNodeActive(node.id);
          const radius = 4 + node.degree * 1.1;
          const color = communityTones[node.community];
          const showLabel = node.degree >= 6 || focused === node.community || hovered === node.id;
          return (
            <g
              key={node.id}
              style={{ cursor: "pointer", opacity: dimmed && !active ? 0.12 : 1, transition: "opacity 0.4s ease" }}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() => onHoverNode(null)}
              onClick={() => {
                const community = communities.find((item) => item.id === node.community);
                onFocusCommunity(focused === community?.id ? null : (community?.id || null));
              }}
            >
              {node.bridge ? (
                <circle cx={node.x} cy={node.y} r={radius + 4} fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
              ) : null}
              <circle cx={node.x} cy={node.y} r={radius} fill={color} stroke="#ffffff" strokeWidth={1.5} opacity={node.degree >= 9 ? 1 : 0.9} />
              {showLabel ? (
                <text
                  x={node.x}
                  y={node.y - radius - 5}
                  textAnchor="middle"
                  style={{ fill: "#0f172a", fontSize: 10.5, fontWeight: node.degree >= 9 ? 600 : 400, pointerEvents: "none" }}
                >
                  {node.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function CommunityMiddleCanvas(props: CommunityAnalysisViewProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const { communities, nodes, edges } = useMemo(
    () => buildReferenceData(props.communities || []),
    [props.communities],
  );
  const focusedCommunity = useMemo(
    () => communities.find((item) => item.id === props.activeCommunityId || item.sourceId === props.activeCommunityId)?.id || null,
    [communities, props.activeCommunityId],
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 18% 20%, rgba(29,155,240,0.13), transparent 20%), radial-gradient(circle at 75% 20%, rgba(240,174,58,0.16), transparent 20%), radial-gradient(circle at 20% 76%, rgba(50,196,141,0.14), transparent 20%), radial-gradient(circle at 76% 76%, rgba(233,116,140,0.14), transparent 20%), #f8fafc",
      }}
    >
      <div style={{ position: "absolute", top: 18, right: 18, zIndex: 10 }}>
        <Button
          size="small"
          onClick={() => {
            props.onClearCommunity();
            setHoveredNodeId(null);
          }}
          style={{
            background: "rgba(255,255,255,0.95)",
            borderColor: "#dbe3ef",
            color: "#334155",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(148, 163, 184, 0.16)",
          }}
        >
          重置视图
        </Button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 18,
          borderRadius: 12,
          border: "1px solid #dbe3ef",
          background: "rgba(255,255,255,0.88)",
          padding: "10px 14px",
          color: "#64748b",
          fontSize: 12,
          boxShadow: "0 6px 16px rgba(148, 163, 184, 0.16)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px dashed #94a3b8", display: "inline-block" }} />
          <span>桥梁节点</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 18, borderTop: "2px dashed #94a3b8", display: "inline-block" }} />
          <span>跨社区边</span>
        </div>
        <span style={{ marginLeft: "auto" }}>悬停节点查看邻接关系 · 点击社区聚焦</span>
      </div>

      <div style={{ width: "100%", height: "100%" }}>
        <CommunityGraph
          communities={communities}
          nodes={nodes}
          edges={edges}
          focused={focusedCommunity}
          hovered={hoveredNodeId}
          onHoverNode={setHoveredNodeId}
          onFocusCommunity={(communityId) => {
            if (!communityId) {
              props.onClearCommunity();
              return;
            }
            const referenceCommunity = communities.find((item) => item.id === communityId);
            const target = props.communities.find(
              (item) => item.id === referenceCommunity?.sourceId || item.id === communityId,
            );
            if (target) {
              props.onFocusCommunity(target);
            }
          }}
        />
      </div>
    </div>
  );
}

export function CommunityRightSidebar(props: CommunityAnalysisViewProps) {
  const { communities, nodes } = useMemo(
    () => buildReferenceData(props.communities || []),
    [props.communities],
  );
  const focusedCommunity = useMemo(
    () => communities.find((item) => item.id === props.activeCommunityId || item.sourceId === props.activeCommunityId)?.id || null,
    [communities, props.activeCommunityId],
  );

  return (
    <aside
      className="hide-scrollbar"
      style={{
        background: "#fff",
        borderLeft: "1px solid #e5e7eb",
        overflowY: "auto",
        minWidth: 0,
        height: "100%",
        padding: 16,
      }}
    >
      <CommunityPanel focused={focusedCommunity} communities={communities} nodes={nodes} />
    </aside>
  );
}

export default function CommunityAnalysisView(props: CommunityAnalysisViewProps) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden", background: "#f7f9fc" }}>
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <CommunityMiddleCanvas {...props} />
      </div>
      <div style={{ width: 350, flexShrink: 0, height: "100%" }}>
        <CommunityRightSidebar {...props} />
      </div>
    </div>
  );
}
