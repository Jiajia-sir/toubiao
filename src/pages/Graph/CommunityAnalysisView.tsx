"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Empty, Spin, Tag } from "antd";
import Graph from "graphology";
import { Sigma } from "sigma";
import type { CameraState } from "sigma/types";
import type { CommunityNetworkData } from "@/data/communityNetwork";

export interface CommunityCluster {
  id: string;
  name: string;
  seedNodeId: string;
  nodeIds: string[];
  relationCount: number;
  bridgeCount: number;
  density: string;
  description?: string;
  closure?: number;
  topic?: string;
}

export interface CommunityAnalysisViewProps {
  communities: CommunityCluster[];
  activeCommunity: CommunityCluster | null;
  activeCommunityId: string | null;
  onFocusCommunity: (comm: CommunityCluster) => void;
  onClearCommunity: () => void;
  communityLoading?: boolean;
  communityError?: string | null;
  entityCount?: number;
  relationCount?: number;
  networkData?: CommunityNetworkData | null;
}

type CommunityNodeRecord = {
  id: string;
  label: string;
  communityId: string;
  x: number;
  y: number;
  degree: number;
  isBridge: boolean;
};

type CommunityEdgeRecord = {
  id: string;
  source: string;
  target: string;
  relation: string;
  cross: boolean;
};

type CommunityBridgeRecord = {
  id: string;
  sourceCommunityId: string;
  targetCommunityId: string;
  weight: number;
  relations: string[];
};

type HaloItem = {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  active: boolean;
};

type CommunityInsight = {
  keywords: string[];
  coreMembers: Array<{ id: string; label: string; degree: number; isBridge: boolean }>;
  outbound: Array<{ to: string; weight: number; relations: string[] }>;
};

const COMMUNITY_COLORS = [
  "#78b9ee",
  "#f2c57c",
  "#7fd3b0",
  "#eda2b4",
  "#9b8cf2",
  "#69c5bc",
  "#f48c6a",
  "#84cc16",
];

function getCommunityColor(communityId: string) {
  let hash = 0;
  for (let i = 0; i < communityId.length; i += 1) {
    hash = (hash * 31 + communityId.charCodeAt(i)) >>> 0;
  }
  return COMMUNITY_COLORS[hash % COMMUNITY_COLORS.length];
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((item) => item + item).join("") : value;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function splitTopicKeywords(topic?: string, fallbackName?: string) {
  const source = `${topic || ""} ${fallbackName || ""}`.trim();
  return dedupeStrings(
    source
      .split(/[\s,，、;；:：\-_/()（）]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2),
  ).slice(0, 5);
}

type LabelBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function boxesOverlap(left: LabelBox, right: LabelBox, padding = 8) {
  return !(
    left.right + padding < right.left ||
    right.right + padding < left.left ||
    left.bottom + padding < right.top ||
    right.bottom + padding < left.top
  );
}

function rebalanceCommunityLayout(nodes: CommunityNodeRecord[]) {
  if (nodes.length === 0) {
    return nodes;
  }

  const grouped = new Map<string, CommunityNodeRecord[]>();
  nodes.forEach((node) => {
    if (!grouped.has(node.communityId)) {
      grouped.set(node.communityId, []);
    }
    grouped.get(node.communityId)!.push(node);
  });

  const communities = Array.from(grouped.entries())
    .map(([communityId, members]) => {
      const validMembers = members.filter(
        (item) => Number.isFinite(item.x) && Number.isFinite(item.y),
      );
      const safeMembers = validMembers.length > 0 ? validMembers : members;
      const centerX =
        safeMembers.reduce((sum, item) => sum + Number(item.x), 0) /
        safeMembers.length;
      const centerY =
        safeMembers.reduce((sum, item) => sum + Number(item.y), 0) /
        safeMembers.length;
      const spread =
        safeMembers.reduce(
          (sum, item) =>
            sum + Math.hypot(Number(item.x) - centerX, Number(item.y) - centerY),
          0,
        ) /
        safeMembers.length;
      const safeSpread = Number.isFinite(spread) && spread > 0.0001 ? spread : 1;
      return {
        communityId,
        members,
        centerX: Number.isFinite(centerX) ? centerX : 0,
        centerY: Number.isFinite(centerY) ? centerY : 0,
        spread: safeSpread,
      };
    })
    .sort((left, right) => right.members.length - left.members.length);

  const centerSlots =
    communities.length <= 4
      ? [
          { x: -26, y: -16 },
          { x: 26, y: -16 },
          { x: -26, y: 16 },
          { x: 26, y: 16 },
        ]
      : null;
  const communityCenters = new Map<string, { x: number; y: number }>();

  if (centerSlots) {
    communities.forEach((community, index) => {
      communityCenters.set(community.communityId, centerSlots[index] || { x: 0, y: 0 });
    });
  } else {
    const columns = Math.ceil(Math.sqrt(communities.length));
    const rows = Math.ceil(communities.length / columns);
    const gapX = 18;
    const gapY = 15;
    const offsetX = (columns - 1) / 2;
    const offsetY = (rows - 1) / 2;
    communities.forEach((community, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      communityCenters.set(community.communityId, {
        x: (col - offsetX) * gapX,
        y: (row - offsetY) * gapY,
      });
    });
  }

  const golden = Math.PI * (3 - Math.sqrt(5));
  const nextNodes: CommunityNodeRecord[] = [];
  communities.forEach((community) => {
    const members = community.members
      .slice()
      .sort((left, right) => {
        const leftPriority = Number(left.isBridge) * 100 + left.degree;
        const rightPriority = Number(right.isBridge) * 100 + right.degree;
        return rightPriority - leftPriority;
      });
    const center = communityCenters.get(community.communityId) || { x: 0, y: 0 };

    members.forEach((member, index) => {
      const isCore = index === 0;
      const radius = isCore ? 0 : 4.4 + Math.sqrt(index) * (member.isBridge ? 2.8 : 2.35);
      const angle = index * golden;
      nextNodes.push({
        ...member,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
        degree: isCore ? Math.max(member.degree, 9) : member.degree,
      });
    });
  });

  return nextNodes;
}

function buildCommunityGraph(networkData?: CommunityNetworkData | null) {
  const rawNodes = Array.isArray(networkData?.nodes) ? networkData.nodes : [];
  const rawEdges = Array.isArray(networkData?.edges) ? networkData.edges : [];
  const degreeMap = new Map<string, number>();

  rawEdges.forEach((edge) => {
    const sourceId = String(edge.source_id ?? "").trim();
    const targetId = String(edge.target_id ?? "").trim();
    if (sourceId) degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
    if (targetId) degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
  });

  const nodes: CommunityNodeRecord[] = rawNodes
    .map((node) => {
      const id = String(node.id ?? "").trim();
      if (!id) return null;
      const rawX = Number(node.x);
      const rawY = Number(node.y);
      return {
        id,
        label: String(node.name ?? id).trim(),
        communityId: String(node.community_id ?? "default").trim() || "default",
        x: Number.isFinite(rawX) ? rawX : Math.random() * 2 - 1,
        y: Number.isFinite(rawY) ? rawY : Math.random() * 2 - 1,
        degree: degreeMap.get(id) || 0,
        isBridge: Boolean(node.is_bridge),
      };
    })
    .filter(Boolean) as CommunityNodeRecord[];

  const rebalancedNodes = rebalanceCommunityLayout(nodes);
  const nodeCommunityMap = new Map(rebalancedNodes.map((node) => [node.id, node.communityId]));

  const edges: CommunityEdgeRecord[] = rawEdges
    .map((edge, index) => {
      const source = String(edge.source_id ?? "").trim();
      const target = String(edge.target_id ?? "").trim();
      if (!source || !target) return null;
      return {
        id: `${source}-${target}-${index}`,
        source,
        target,
        relation: String(edge.relation ?? "关联").trim() || "关联",
        cross: Boolean(edge.is_cross_community),
      };
    })
    .filter(Boolean) as CommunityEdgeRecord[];

  return {
    nodes: rebalancedNodes,
    edges: edges.map((edge) => ({
      ...edge,
      cross:
        edge.cross ||
        (nodeCommunityMap.get(edge.source) !== undefined &&
          nodeCommunityMap.get(edge.target) !== undefined &&
          nodeCommunityMap.get(edge.source) !== nodeCommunityMap.get(edge.target)),
    })),
  };
}

function buildCommunityBridges(
  edges: CommunityEdgeRecord[],
  nodeMap: Map<string, CommunityNodeRecord>,
) {
  const bridgeMap = new Map<string, CommunityBridgeRecord>();

  edges.forEach((edge) => {
    if (!edge.cross) return;
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode || sourceNode.communityId === targetNode.communityId) {
      return;
    }

    const [sourceCommunityId, targetCommunityId] =
      sourceNode.communityId < targetNode.communityId
        ? [sourceNode.communityId, targetNode.communityId]
        : [targetNode.communityId, sourceNode.communityId];
    const key = `${sourceCommunityId}__${targetCommunityId}`;
    const current = bridgeMap.get(key);
    if (current) {
      current.weight += 1;
      current.relations.push(edge.relation);
      return;
    }
    bridgeMap.set(key, {
      id: key,
      sourceCommunityId,
      targetCommunityId,
      weight: 1,
      relations: [edge.relation],
    });
  });

  return Array.from(bridgeMap.values())
    .map((item) => ({
      ...item,
      relations: dedupeStrings(item.relations).slice(0, 3),
    }))
    .sort((left, right) => right.weight - left.weight);
}

function buildCommunityInsights(
  communities: CommunityCluster[],
  nodes: CommunityNodeRecord[],
  edges: CommunityEdgeRecord[],
  bridges: CommunityBridgeRecord[],
) {
  const nodeGroups = new Map<string, CommunityNodeRecord[]>();
  const relationGroups = new Map<string, Map<string, number>>();

  communities.forEach((community) => {
    nodeGroups.set(community.id, []);
    relationGroups.set(community.id, new Map());
  });

  nodes.forEach((node) => {
    if (!nodeGroups.has(node.communityId)) {
      nodeGroups.set(node.communityId, []);
    }
    nodeGroups.get(node.communityId)!.push(node);
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode || sourceNode.communityId !== targetNode.communityId) {
      return;
    }
    const relationMap = relationGroups.get(sourceNode.communityId) || new Map();
    relationMap.set(edge.relation, (relationMap.get(edge.relation) || 0) + 1);
    relationGroups.set(sourceNode.communityId, relationMap);
  });

  const outboundMap = new Map<string, Array<{ to: string; weight: number; relations: string[] }>>();
  communities.forEach((community) => outboundMap.set(community.id, []));
  bridges.forEach((bridge) => {
    outboundMap.get(bridge.sourceCommunityId)?.push({
      to: bridge.targetCommunityId,
      weight: bridge.weight,
      relations: bridge.relations,
    });
    outboundMap.get(bridge.targetCommunityId)?.push({
      to: bridge.sourceCommunityId,
      weight: bridge.weight,
      relations: bridge.relations,
    });
  });

  const insightMap = new Map<string, CommunityInsight>();
  communities.forEach((community) => {
    const members = (nodeGroups.get(community.id) || []).sort((left, right) => right.degree - left.degree);
    const relationKeywords = Array.from((relationGroups.get(community.id) || new Map()).entries())
      .sort((left, right) => right[1] - left[1])
      .map(([name]) => name);

    insightMap.set(community.id, {
      keywords: dedupeStrings([
        ...splitTopicKeywords(community.topic, community.name),
        ...relationKeywords,
      ]).slice(0, 5),
      coreMembers: members.slice(0, 6).map((member) => ({
        id: member.id,
        label: member.label,
        degree: member.degree,
        isBridge: member.isBridge,
      })),
      outbound: (outboundMap.get(community.id) || []).sort((left, right) => right.weight - left.weight),
    });
  });

  return insightMap;
}

function fitSigmaToGraph(sigma: Sigma, graph: Graph) {
  if (graph.order === 0) return;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  graph.forEachNode((node) => {
    const x = Number(graph.getNodeAttribute(node, "x"));
    const y = Number(graph.getNodeAttribute(node, "y"));
    const size = Number(graph.getNodeAttribute(node, "size"));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const safeSize = Number.isFinite(size) ? size : 0;
    minX = Math.min(minX, x - safeSize);
    maxX = Math.max(maxX, x + safeSize);
    minY = Math.min(minY, y - safeSize);
    maxY = Math.max(maxY, y + safeSize);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return;
  }

  const dimensions =
    (sigma as any).getDimensions?.() || {
      width: sigma.getContainer().clientWidth || 1,
      height: sigma.getContainer().clientHeight || 1,
    };
  const viewportWidth = Math.max(1, Number(dimensions.width || 1));
  const viewportHeight = Math.max(1, Number(dimensions.height || 1));
  const padding = Math.max(56, Math.round(Math.min(viewportWidth, viewportHeight) * 0.1));

  sigma.setSetting("autoRescale", true);
  sigma.setSetting("stagePadding", padding);
  sigma.setCustomBBox({
    x: [minX, maxX],
    y: [minY, maxY],
  });
  sigma.resize();
  sigma.refresh();

  sigma.getCamera().setState({
    x: 0.5,
    y: 0.5,
    ratio: 1,
    angle: 0,
  });
}

function animateSigmaToBounds(
  sigma: Sigma,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  duration = 320,
) {
  const dimensions =
    (sigma as any).getDimensions?.() || {
      width: sigma.getContainer().clientWidth || 1,
      height: sigma.getContainer().clientHeight || 1,
    };
  const viewportWidth = Math.max(1, Number(dimensions.width || 1));
  const viewportHeight = Math.max(1, Number(dimensions.height || 1));
  const padding = Math.max(56, Math.round(Math.min(viewportWidth, viewportHeight) * 0.1));

  sigma.setSetting("autoRescale", true);
  sigma.setSetting("stagePadding", padding);
  sigma.setCustomBBox({
    x: [bounds.minX, bounds.maxX],
    y: [bounds.minY, bounds.maxY],
  });
  sigma.resize();
  sigma.refresh();

  const camera = sigma.getCamera();
  if (duration > 0 && typeof (camera as any).animate === "function") {
    (camera as any).animate(
      {
        x: 0.5,
        y: 0.5,
        ratio: 1,
        angle: 0,
      },
      { duration },
    );
    return;
  }

  camera.setState({
    x: 0.5,
    y: 0.5,
    ratio: 1,
    angle: 0,
  });
}

function focusCommunityInView(
  sigma: Sigma,
  nodes: CommunityNodeRecord[],
  communityId: string | null,
) {
  if (!communityId) {
    fitSigmaToGraph(sigma, sigma.getGraph());
    return;
  }

  const members = nodes.filter((node) => node.communityId === communityId);
  if (members.length === 0) {
    fitSigmaToGraph(sigma, sigma.getGraph());
    return;
  }

  const graph = sigma.getGraph();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  members.forEach((node) => {
    const nx = Number(graph.getNodeAttribute(node.id, "x"));
    const ny = Number(graph.getNodeAttribute(node.id, "y"));
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
    const size = Number(graph.getNodeAttribute(node.id, "size"));
    const safeSize = Number.isFinite(size) ? size : 0;
    minX = Math.min(minX, nx - safeSize);
    maxX = Math.max(maxX, nx + safeSize);
    minY = Math.min(minY, ny - safeSize);
    maxY = Math.max(maxY, ny + safeSize);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return;
  }

  animateSigmaToBounds(
    sigma,
    { minX, maxX, minY, maxY },
    320,
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = clamp(value * 100, 0, 100);
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

export function CommunityMiddleCanvas(props: CommunityAnalysisViewProps) {
  const { communities, activeCommunityId, onFocusCommunity, onClearCommunity, networkData } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [halos, setHalos] = useState<HaloItem[]>([]);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const activeCommunityIdRef = useRef<string | null>(null);
  const onFocusCommunityRef = useRef(onFocusCommunity);
  onFocusCommunityRef.current = onFocusCommunity;
  const onClearCommunityRef = useRef(onClearCommunity);
  onClearCommunityRef.current = onClearCommunity;

  const { nodes, edges } = useMemo(() => buildCommunityGraph(networkData), [networkData]);
  const communityMap = useMemo(
    () => new Map(communities.map((community) => [community.id, community])),
    [communities],
  );
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    nodes.forEach((node) => {
      map.set(node.id, new Set());
    });
    edges.forEach((edge) => {
      if (!map.has(edge.source)) {
        map.set(edge.source, new Set());
      }
      if (!map.has(edge.target)) {
        map.set(edge.target, new Set());
      }
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    });
    return map;
  }, [edges, nodes]);
  const communityNodeIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    nodes.forEach((node) => {
      if (!map.has(node.communityId)) {
        map.set(node.communityId, []);
      }
      map.get(node.communityId)!.push(node.id);
    });
    return map;
  }, [nodes]);
  const communityCenters = useMemo(() => {
    const centerMap = new Map<string, { x: number; y: number }>();
    communities.forEach((community) => {
      const members = nodes.filter((node) => node.communityId === community.id);
      if (!members.length) {
        return;
      }
      centerMap.set(community.id, {
        x: members.reduce((sum, item) => sum + item.x, 0) / members.length,
        y: members.reduce((sum, item) => sum + item.y, 0) / members.length,
      });
    });
    return centerMap;
  }, [communities, nodes]);
  const defaultVisibleNodeIds = useMemo(() => {
    const grouped = new Map<string, CommunityNodeRecord[]>();
    nodes.forEach((node) => {
      if (!grouped.has(node.communityId)) {
        grouped.set(node.communityId, []);
      }
      grouped.get(node.communityId)!.push(node);
    });

    const visibleIds = new Set<string>();
    grouped.forEach((members) => {
      members
        .slice()
        .sort((left, right) => {
          if (right.degree !== left.degree) {
            return right.degree - left.degree;
          }
          return Number(right.isBridge) - Number(left.isBridge);
        })
        .slice(0, 3)
        .forEach((member) => visibleIds.add(member.id));

      members
        .filter((member) => member.isBridge)
        .slice(0, 3)
        .forEach((member) => visibleIds.add(member.id));
    });

    return visibleIds;
  }, [nodes]);

  useEffect(() => {
    hoveredNodeIdRef.current = hoveredNodeId;
    sigmaRef.current?.refresh();
  }, [hoveredNodeId]);

  useEffect(() => {
    activeCommunityIdRef.current = activeCommunityId;
    sigmaRef.current?.refresh();
  }, [activeCommunityId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    sigmaRef.current?.kill();
    sigmaRef.current = null;

    const graph = new Graph({ multi: true });
    nodes.forEach((node) => {
      graph.addNode(node.id, {
        x: node.x,
        y: node.y,
        size: clamp(5.5 + node.degree * 1.05 + (node.isBridge ? 3.2 : 0), 9, 26),
        label: node.label,
        color: getCommunityColor(node.communityId),
        borderColor: "#ffffff",
        borderSize: node.isBridge ? 3.4 : 1.7,
        originalData: node,
      });
    });

    edges.forEach((edge) => {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) return;
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      const color = edge.cross
        ? "rgba(148, 163, 184, 0.16)"
        : "rgba(203, 213, 225, 0.82)";
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        size: edge.cross ? 1.1 : 1.8,
        color,
        type: "line",
        label: edge.relation,
        originalData: edge,
      });
    });

    const sigma = new Sigma(graph, container, {
      renderLabels: true,
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 0,
      defaultEdgeColor: "#94a3b8",
      labelFont: "Consolas, monospace",
      labelWeight: "500",
      labelColor: { color: "#0f172a" },
      zIndex: true,
      hideEdgesOnMove: false,
      hideLabelsOnMove: false,
      allowInvalidContainer: true,
      nodeReducer: (nodeId, data) => {
        const node = graph.getNodeAttribute(nodeId, "originalData") as CommunityNodeRecord;
        const focused = activeCommunityIdRef.current;
        const hovered = hoveredNodeIdRef.current;
        const color = getCommunityColor(node.communityId);
        const neighbors = hovered ? adjacencyMap.get(hovered) || new Set<string>() : new Set<string>();
        const activeByHover = focused ? true : hovered ? hovered === nodeId || neighbors.has(nodeId) : true;
        const activeByFocus = focused ? node.communityId === focused : true;
        const active = activeByHover && activeByFocus;
        const showLabel = focused
          ? active
          : hovered
            ? active && (node.degree >= 5 || hovered === nodeId || node.isBridge)
            : node.degree >= 6 || node.isBridge || defaultVisibleNodeIds.has(nodeId);

        return {
          ...data,
          color: active
            ? color
            : "rgba(148, 163, 184, 0.16)",
          borderColor: active
            ? "#ffffff"
            : "rgba(255,255,255,0.36)",
          borderSize: node.isBridge ? 3.8 : data.borderSize,
          size: active
            ? node.isBridge
              ? Number(data.size) * 1.18
              : Number(data.size) * 1.08
            : Math.max(Number(data.size) * 0.82, 4.5),
          label: showLabel ? node.label : "",
          zIndex: active ? (hovered === nodeId ? 3 : 2) : 0,
        };
      },
      edgeReducer: (edgeId, data) => {
        const edge = graph.getEdgeAttribute(edgeId, "originalData") as CommunityEdgeRecord;
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) return data;

        const focused = activeCommunityIdRef.current;
        const hovered = hoveredNodeIdRef.current;
        const highlightedNodes = hovered
          ? new Set([hovered, ...Array.from(adjacencyMap.get(hovered) || [])])
          : null;
        const activeByFocus = focused
          ? sourceNode.communityId === focused && targetNode.communityId === focused
          : true;
        const activeByHover = focused
          ? true
          : hovered
          ? Boolean(highlightedNodes?.has(edge.source) && highlightedNodes?.has(edge.target))
          : true;
        const active = activeByFocus && activeByHover;
        const baseColor = edge.cross
          ? "rgba(148, 163, 184, 0.18)"
          : "rgba(203, 213, 225, 0.96)";

        return {
          ...data,
          color: edge.cross ? "rgba(148, 163, 184, 0)" : active ? baseColor : "rgba(203, 213, 225, 0.22)",
          size: active ? (edge.cross ? 0.01 : 1.7) : 0.55,
          zIndex: active ? 1 : 0,
        };
      },
    });

    sigma.resize();
    fitSigmaToGraph(sigma, graph);
    sigma.refresh();

    sigma.on("enterNode", ({ node }) => {
      setHoveredNodeId(node);
      sigma.refresh();
    });

    sigma.on("leaveNode", () => {
      setHoveredNodeId(null);
      sigma.refresh();
    });

    sigma.on("clickNode", ({ node }) => {
      if (movedDuringDrag) {
        return;
      }
      const currentNode = graph.getNodeAttribute(node, "originalData") as CommunityNodeRecord;
      const targetCommunity = communityMap.get(currentNode.communityId);
      if (targetCommunity) {
        onFocusCommunityRef.current(targetCommunity);
      }
    });

    sigma.on("clickStage", () => {
      onClearCommunityRef.current();
    });

    let draggedCommunityId: string | null = null;
    let draggedNodeId: string | null = null;
    let dragWholeCommunity = false;
    let lastGraphPosition: { x: number; y: number } | null = null;
    let movedDuringDrag = false;

    sigma.on("downNode", ({ node, event }) => {
      const currentNode = graph.getNodeAttribute(node, "originalData") as CommunityNodeRecord;
      if (!currentNode) {
        return;
      }
      draggedNodeId = node;
      dragWholeCommunity = Boolean(event.original?.shiftKey);
      draggedCommunityId = dragWholeCommunity ? currentNode.communityId : null;
      lastGraphPosition = sigma.viewportToGraph(event);
      movedDuringDrag = false;
      sigma.getCamera().disable();
    });

    sigma.getMouseCaptor().on("mousemovebody", (event) => {
      if ((!draggedCommunityId && !draggedNodeId) || !lastGraphPosition) {
        return;
      }
      const nextPosition = sigma.viewportToGraph(event);
      const dx = nextPosition.x - lastGraphPosition.x;
      const dy = nextPosition.y - lastGraphPosition.y;
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) {
        return;
      }

      movedDuringDrag = true;
      if (dragWholeCommunity && draggedCommunityId) {
        const memberIds = communityNodeIdsMap.get(draggedCommunityId) || [];
        memberIds.forEach((nodeId) => {
          const currentX = Number(graph.getNodeAttribute(nodeId, "x"));
          const currentY = Number(graph.getNodeAttribute(nodeId, "y"));
          graph.setNodeAttribute(nodeId, "x", currentX + dx);
          graph.setNodeAttribute(nodeId, "y", currentY + dy);
        });
      } else if (draggedNodeId) {
        const currentX = Number(graph.getNodeAttribute(draggedNodeId, "x"));
        const currentY = Number(graph.getNodeAttribute(draggedNodeId, "y"));
        graph.setNodeAttribute(draggedNodeId, "x", currentX + dx);
        graph.setNodeAttribute(draggedNodeId, "y", currentY + dy);
      }
      lastGraphPosition = nextPosition;
      sigma.refresh();
      event.preventSigmaDefault();
      event.original?.preventDefault();
      event.original?.stopPropagation();
    });

    const handleMouseUp = () => {
      if (!draggedCommunityId && !draggedNodeId) {
        return;
      }
      draggedCommunityId = null;
      draggedNodeId = null;
      dragWholeCommunity = false;
      lastGraphPosition = null;
      sigma.getCamera().enable();
      window.setTimeout(() => {
        movedDuringDrag = false;
      }, 0);
    };

    sigma.getMouseCaptor().on("mouseup", handleMouseUp);

    sigmaRef.current = sigma;
    graphRef.current = graph;

    return () => {
      sigma.getMouseCaptor().removeListener("mouseup", handleMouseUp);
      sigma.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, [adjacencyMap, communities, communityMap, communityNodeIdsMap, defaultVisibleNodeIds, edges, nodeMap, nodes]);

  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;
    focusCommunityInView(sigma, nodes, activeCommunityId);
  }, [activeCommunityId, nodes]);

  useEffect(() => {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!sigma || !graph || !overlayCanvas) {
      setHalos([]);
      const ctx = overlayCanvas?.getContext("2d");
      if (ctx && overlayCanvas) {
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
      return;
    }

    const syncOverlayCanvasSize = () => {
      const width = sigma.getContainer().clientWidth || 1;
      const height = sigma.getContainer().clientHeight || 1;
      const dpr = window.devicePixelRatio || 1;
      if (overlayCanvas.width !== Math.round(width * dpr) || overlayCanvas.height !== Math.round(height * dpr)) {
        overlayCanvas.width = Math.round(width * dpr);
        overlayCanvas.height = Math.round(height * dpr);
        overlayCanvas.style.width = `${width}px`;
        overlayCanvas.style.height = `${height}px`;
      }
      const ctx = overlayCanvas.getContext("2d");
      if (!ctx) {
        return null;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      return { ctx, width, height };
    };

    const drawOverlayCanvas = () => {
      const synced = syncOverlayCanvasSize();
      if (!synced) {
        return;
      }
      const { ctx, width, height } = synced;

      edges
        .filter((edge) => edge.cross)
        .forEach((edge) => {
          const sourceNode = nodeMap.get(edge.source);
          const targetNode = nodeMap.get(edge.target);
          if (!sourceNode || !targetNode) {
            return;
          }
          const active =
            !activeCommunityId ||
            activeCommunityId === sourceNode.communityId ||
            activeCommunityId === targetNode.communityId;
          const sourcePoint = sigma.graphToViewport({
            x: Number(graph.getNodeAttribute(edge.source, "x")),
            y: Number(graph.getNodeAttribute(edge.source, "y")),
          });
          const targetPoint = sigma.graphToViewport({
            x: Number(graph.getNodeAttribute(edge.target, "x")),
            y: Number(graph.getNodeAttribute(edge.target, "y")),
          });
          if (
            !Number.isFinite(sourcePoint.x) ||
            !Number.isFinite(sourcePoint.y) ||
            !Number.isFinite(targetPoint.x) ||
            !Number.isFinite(targetPoint.y)
          ) {
            return;
          }

          ctx.save();
          ctx.globalAlpha = active ? 0.92 : 0.18;
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.lineWidth = 3.8;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(sourcePoint.x, sourcePoint.y);
          ctx.lineTo(targetPoint.x, targetPoint.y);
          ctx.stroke();

          ctx.strokeStyle = "rgba(148, 163, 184, 0.92)";
          ctx.lineWidth = 1.6;
          ctx.setLineDash([7, 7]);
          ctx.beginPath();
          ctx.moveTo(sourcePoint.x, sourcePoint.y);
          ctx.lineTo(targetPoint.x, targetPoint.y);
          ctx.stroke();
          ctx.restore();
        });

      const occupiedBoxes: LabelBox[] = [];
      const focused = activeCommunityIdRef.current;
      const hovered = hoveredNodeIdRef.current;
      const highlightedNodes = hovered
        ? new Set([hovered, ...Array.from(adjacencyMap.get(hovered) || [])])
        : null;
      const labelCandidates = edges
        .filter((edge) => !edge.cross && String(edge.relation || "").trim())
        .map((edge) => {
          const sourceNode = nodeMap.get(edge.source);
          const targetNode = nodeMap.get(edge.target);
          if (!sourceNode || !targetNode) {
            return null;
          }

          const activeByFocus = focused
            ? sourceNode.communityId === focused && targetNode.communityId === focused
            : true;
          const activeByHover = focused
            ? true
            : hovered
              ? Boolean(highlightedNodes?.has(edge.source) && highlightedNodes?.has(edge.target))
              : sourceNode.degree >= 7 || targetNode.degree >= 7 || sourceNode.isBridge || targetNode.isBridge;
          if (!activeByFocus || !activeByHover) {
            return null;
          }

          const sourcePoint = sigma.graphToViewport({
            x: Number(graph.getNodeAttribute(edge.source, "x")),
            y: Number(graph.getNodeAttribute(edge.source, "y")),
          });
          const targetPoint = sigma.graphToViewport({
            x: Number(graph.getNodeAttribute(edge.target, "x")),
            y: Number(graph.getNodeAttribute(edge.target, "y")),
          });
          if (
            !Number.isFinite(sourcePoint.x) ||
            !Number.isFinite(sourcePoint.y) ||
            !Number.isFinite(targetPoint.x) ||
            !Number.isFinite(targetPoint.y)
          ) {
            return null;
          }

          const dx = targetPoint.x - sourcePoint.x;
          const dy = targetPoint.y - sourcePoint.y;
          const length = Math.hypot(dx, dy);
          if (length < 52) {
            return null;
          }

          return {
            relation: String(edge.relation || "").trim(),
            sourceNode,
            targetNode,
            sourcePoint,
            targetPoint,
            length,
            priority:
              (sourceNode.isBridge ? 50 : 0) +
              (targetNode.isBridge ? 50 : 0) +
              sourceNode.degree +
              targetNode.degree,
          };
        })
        .filter(Boolean)
        .sort((left, right) => (right!.priority - left!.priority)) as Array<{
        relation: string;
        sourceNode: CommunityNodeRecord;
        targetNode: CommunityNodeRecord;
        sourcePoint: { x: number; y: number };
        targetPoint: { x: number; y: number };
        length: number;
        priority: number;
      }>;

      const labelLimit = focused ? 22 : hovered ? 14 : 10;
      let drawnLabels = 0;
      ctx.font = "600 12.5px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const item of labelCandidates) {
        if (drawnLabels >= labelLimit) {
          break;
        }

        const unitX = (item.targetPoint.x - item.sourcePoint.x) / item.length;
        const unitY = (item.targetPoint.y - item.sourcePoint.y) / item.length;
        const normalX = -unitY;
        const normalY = unitX;
        const centerX = (item.sourcePoint.x + item.targetPoint.x) / 2 + normalX * 12;
        const centerY = (item.sourcePoint.y + item.targetPoint.y) / 2 + normalY * 12;
        const textWidth = ctx.measureText(item.relation).width;
        const boxWidth = textWidth + 6;
        const boxHeight = 14;
        const box: LabelBox = {
          left: centerX - boxWidth / 2,
          right: centerX + boxWidth / 2,
          top: centerY - boxHeight / 2,
          bottom: centerY + boxHeight / 2,
        };

        if (box.left < 8 || box.top < 8 || box.right > width - 8 || box.bottom > height - 8) {
          continue;
        }
        if (occupiedBoxes.some((existingBox) => boxesOverlap(existingBox, box))) {
          continue;
        }

        occupiedBoxes.push(box);
        drawnLabels += 1;

        let angle = Math.atan2(
          item.targetPoint.y - item.sourcePoint.y,
          item.targetPoint.x - item.sourcePoint.x,
        );
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
          angle += Math.PI;
        }

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(51, 65, 85, 0.96)";
        ctx.fillText(item.relation, 0, 0);
        ctx.restore();
      }

      nodes
        .filter((node) => node.isBridge)
        .forEach((node) => {
          const point = sigma.graphToViewport({
            x: Number(graph.getNodeAttribute(node.id, "x")),
            y: Number(graph.getNodeAttribute(node.id, "y")),
          });
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            return;
          }
          const active = !activeCommunityId || activeCommunityId === node.communityId;
          const displayData = sigma.getNodeDisplayData(node.id);
          const rawSize = Number(displayData?.size);
          const scaledSize =
            Number.isFinite(rawSize) && typeof (sigma as any).scaleSize === "function"
              ? Number((sigma as any).scaleSize(rawSize))
              : NaN;
          const safeRenderedSize = Number.isFinite(scaledSize)
            ? scaledSize
            : Number.isFinite(rawSize)
              ? rawSize
              : clamp(5.5 + node.degree * 1.05 + 3.2, 9, 26);
          const radius = safeRenderedSize + 6;
          const color = getCommunityColor(node.communityId);

          ctx.save();
          ctx.globalAlpha = active ? 1 : 0.22;
          ctx.fillStyle = hexToRgba(color, 0.08);
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius + 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = hexToRgba(color, 1);
          ctx.lineWidth = 2.8;
          ctx.setLineDash([6, 5]);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "rgba(255,255,255,0.24)";
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(radius - 4, 4), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
    };

    const updateOverlays = () => {
      const nextHalos: HaloItem[] = communities
        .map((community) => {
          const members = nodes.filter((node) => node.communityId === community.id);
          if (!members.length) {
            return null;
          }
          let sumX = 0;
          let sumY = 0;
          let count = 0;
          members.forEach((node) => {
            const x = Number(graph.getNodeAttribute(node.id, "x"));
            const y = Number(graph.getNodeAttribute(node.id, "y"));
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              return;
            }
            sumX += x;
            sumY += y;
            count += 1;
          });
          if (!count) {
            return null;
          }
          const center = {
            x: sumX / count,
            y: sumY / count,
          };
          const point = sigma.graphToViewport(center);
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
          let maxDistance = 72;
          members.forEach((node) => {
            const nodePoint = sigma.graphToViewport({
              x: Number(graph.getNodeAttribute(node.id, "x")),
              y: Number(graph.getNodeAttribute(node.id, "y")),
            });
            if (Number.isFinite(nodePoint.x) && Number.isFinite(nodePoint.y)) {
              maxDistance = Math.max(
                maxDistance,
                Math.hypot(nodePoint.x - point.x, nodePoint.y - point.y),
              );
            }
          });
          return {
            id: community.id,
            name: community.name,
            x: point.x,
            y: point.y,
            radius: Math.max(maxDistance + 62, 124),
            color: getCommunityColor(community.id),
            active: !activeCommunityId || activeCommunityId === community.id,
          };
        })
        .filter(Boolean) as HaloItem[];
      setHalos(nextHalos);
      drawOverlayCanvas();
    };

    updateOverlays();
    const camera = sigma.getCamera();
    const onCameraUpdate = (_state?: CameraState) => updateOverlays();
    camera.on("updated", onCameraUpdate);
    sigma.on("afterRender", updateOverlays);
    window.addEventListener("resize", updateOverlays);

    return () => {
      camera.removeListener("updated", onCameraUpdate);
      sigma.removeListener("afterRender", updateOverlays);
      window.removeEventListener("resize", updateOverlays);
    };
  }, [activeCommunityId, adjacencyMap, communities, communityCenters, edges, nodeMap, nodes]);

  if (props.communityLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
        <Spin size="large" tip="社区网络分析中..." />
      </div>
    );
  }

  if (props.communityError) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" showIcon message={props.communityError} />
      </div>
    );
  }

  if (nodes.length === 0) {
    return <Empty description="暂无社区网络图数据" style={{ marginTop: 220 }} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#f8fafc",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
        {halos.map((halo) =>
          !Number.isFinite(halo.x) || !Number.isFinite(halo.y) || !Number.isFinite(halo.radius) ? null : (
          <React.Fragment key={halo.id}>
            <div
              style={{
                position: "absolute",
                left: halo.x - halo.radius,
                top: halo.y - halo.radius,
                width: halo.radius * 2,
                height: halo.radius * 2,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${hexToRgba(halo.color, 0.16)} 0%, ${hexToRgba(
                  halo.color,
                  0.06,
                )} 58%, ${hexToRgba(halo.color, 0)} 100%)`,
                opacity: halo.active ? 1 : 0.12,
                transition: "opacity 0.35s ease",
                filter: "blur(2px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: halo.x,
                top: Math.max(halo.y - halo.radius - 28, 10),
                transform: "translateX(-50%)",
                padding: "5px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.84)",
                border: `1px solid ${hexToRgba(halo.color, 0.24)}`,
                color: "#1e293b",
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                letterSpacing: "0.02em",
                opacity: halo.active ? 0.94 : 0.34,
                boxShadow: "0 10px 22px rgba(148, 163, 184, 0.12)",
                backdropFilter: "blur(10px)",
              }}
            >
              {halo.name}
            </div>
          </React.Fragment>
        ))}
      </div>

      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
        }}
      />

      <div style={{ position: "absolute", top: 18, right: 18, zIndex: 10 }}>
        <Button
          size="small"
          onClick={onClearCommunity}
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
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: "2px dashed #94a3b8",
              display: "inline-block",
            }}
          />
          <span>桥接节点</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 18, borderTop: "2px dashed #94a3b8", display: "inline-block" }} />
          <span>跨社区边</span>
        </div>
        <span style={{ marginLeft: "auto" }}>默认展示全部社区，点击社区后显示该社区全部节点名称</span>
      </div>
    </div>
  );
}

export function CommunityRightSidebar(props: CommunityAnalysisViewProps) {
  const {
    communities,
    activeCommunity,
    activeCommunityId,
    onFocusCommunity,
    onClearCommunity,
    communityLoading,
    communityError,
    entityCount,
    relationCount,
    networkData,
  } = props;

  const { nodes, edges } = useMemo(() => buildCommunityGraph(networkData), [networkData]);
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const communityBridges = useMemo(
    () => buildCommunityBridges(edges, nodeMap),
    [edges, nodeMap],
  );
  const insightsMap = useMemo(
    () => buildCommunityInsights(communities, nodes, edges, communityBridges),
    [communities, nodes, edges, communityBridges],
  );
  const activeCommunityKey = String(activeCommunity?.id ?? activeCommunityId ?? "").trim();
  const activeInsight =
    (activeCommunityKey ? insightsMap.get(activeCommunityKey) : null) ||
    (activeCommunity?.id ? insightsMap.get(String(activeCommunity.id)) : null) ||
    null;
  const rawNetworkNodes = useMemo(
    () => Array.isArray(networkData?.nodes) ? networkData.nodes : [],
    [networkData],
  );
  const rawNetworkEdges = useMemo(
    () => Array.isArray(networkData?.edges) ? networkData.edges : [],
    [networkData],
  );
  const rawNodeNameMap = useMemo(
    () =>
      new Map(
        rawNetworkNodes.map((node) => {
          const id = String(node.id ?? "").trim();
          const name = String(
            node.name ?? node.label ?? node.entity_name ?? node.display_name ?? node.id ?? "",
          ).trim();
          return [id, name];
        }),
      ),
    [rawNetworkNodes],
  );
  const rawNodeMap = useMemo(
    () =>
      new Map(
        rawNetworkNodes.map((node) => {
          const id = String(node.id ?? "").trim();
          const label = String(
            node.name ?? node.label ?? node.entity_name ?? node.display_name ?? node.id ?? "",
          ).trim();
          return [
            id,
            {
              id,
              label,
              communityId: String(node.community_id ?? "").trim(),
              isBridge: Boolean(node.is_bridge),
            },
          ];
        }),
      ),
    [rawNetworkNodes],
  );
  const rawNodeByNameMap = useMemo(
    () =>
      new Map(
        rawNetworkNodes.map((node) => {
          const name = String(
            node.name ?? node.label ?? node.entity_name ?? node.display_name ?? "",
          ).trim();
          return [
            name,
            {
              id: String(node.id ?? "").trim(),
              label: name,
              communityId: String(node.community_id ?? "").trim(),
              isBridge: Boolean(node.is_bridge),
            },
          ];
        }),
      ),
    [rawNetworkNodes],
  );
  const rawNodeDegreeMap = useMemo(() => {
    const map = new Map<string, number>();
    rawNetworkEdges.forEach((edge) => {
      const sourceId = String(edge.source_id ?? edge.source ?? "").trim();
      const targetId = String(edge.target_id ?? edge.target ?? "").trim();
      if (sourceId) {
        map.set(sourceId, (map.get(sourceId) || 0) + 1);
      }
      if (targetId) {
        map.set(targetId, (map.get(targetId) || 0) + 1);
      }
    });
    return map;
  }, [rawNetworkEdges]);
  const rawNodeDegreeByNameMap = useMemo(() => {
    const map = new Map<string, number>();
    rawNetworkEdges.forEach((edge) => {
      const sourceKey = String(edge.source_id ?? edge.source ?? "").trim();
      const targetKey = String(edge.target_id ?? edge.target ?? "").trim();
      const sourceNode =
        rawNodeMap.get(sourceKey) ||
        rawNodeByNameMap.get(String(edge.source ?? "").trim()) ||
        null;
      const targetNode =
        rawNodeMap.get(targetKey) ||
        rawNodeByNameMap.get(String(edge.target ?? "").trim()) ||
        null;
      if (sourceNode?.label) {
        map.set(sourceNode.label, (map.get(sourceNode.label) || 0) + 1);
      }
      if (targetNode?.label) {
        map.set(targetNode.label, (map.get(targetNode.label) || 0) + 1);
      }
    });
    return map;
  }, [rawNetworkEdges, rawNodeByNameMap, rawNodeMap]);
  const rawNodesByCommunityId = useMemo(() => {
    const map = new Map<string, CommunityNodeRecord[]>();
    rawNetworkNodes.forEach((node) => {
      const id = String(node.id ?? "").trim();
      const communityId = String(node.community_id ?? "").trim();
      if (!id || !communityId) {
        return;
      }
      const nextNode: CommunityNodeRecord = {
        id,
        label: String(
          node.name ?? node.label ?? node.entity_name ?? node.display_name ?? id,
        ).trim(),
        communityId,
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
        degree: rawNodeDegreeMap.get(id) || 0,
        isBridge: Boolean(node.is_bridge),
      };
      if (!map.has(communityId)) {
        map.set(communityId, []);
      }
      map.get(communityId)!.push(nextNode);
    });
    return map;
  }, [rawNetworkEdges, rawNetworkNodes, rawNodeDegreeMap]);
  const rawNodeCommunityMap = useMemo(() => {
    const map = new Map<string, string>();
    rawNetworkNodes.forEach((node) => {
      const id = String(node.id ?? "").trim();
      const communityId = String(node.community_id ?? "").trim();
      if (id && communityId) {
        map.set(id, communityId);
      }
    });
    return map;
  }, [rawNetworkNodes]);
  const rawCommunityMap = useMemo(() => {
    const map = new Map<
      string,
      {
        nodeIds: string[];
        nodeNames: string[];
      }
    >();
    (Array.isArray(networkData?.communities) ? networkData.communities : []).forEach((community) => {
      const id = String(community.community_id ?? "").trim();
      if (!id) {
        return;
      }
      map.set(id, {
        nodeIds: (community.node_ids || []).map((item) => String(item ?? "").trim()).filter(Boolean),
        nodeNames: (community.nodes || []).map((item) => String(item ?? "").trim()).filter(Boolean),
      });
    });
    return map;
  }, [networkData]);
  const communityNodeIdToCommunityMap = useMemo(() => {
    const map = new Map<string, string>();
    communities.forEach((community) => {
      (community.nodeIds || []).forEach((nodeId) => {
        const key = String(nodeId).trim();
        if (key) {
          map.set(key, String(community.id).trim());
        }
      });
    });
    return map;
  }, [communities]);
  const rawBridgeNodeIdSet = useMemo(
    () =>
      new Set(
        rawNetworkNodes
          .filter((node) => Boolean(node.is_bridge))
          .map((node) => String(node.id ?? "").trim())
          .filter(Boolean),
      ),
    [rawNetworkNodes],
  );
  const activeCommunityMembers = useMemo(() => {
    if (!activeCommunityKey) {
      return [];
    }
    const rawCommunity = rawCommunityMap.get(activeCommunityKey);
    const tokens = dedupeStrings([
      ...(activeCommunity?.nodeIds || []).map((item) => String(item).trim()),
      ...(rawCommunity?.nodeIds || []),
      ...(rawCommunity?.nodeNames || []),
    ]);

    const memberMap = new Map<
      string,
      { id: string; label: string; degree: number; isBridge: boolean; communityId: string }
    >();

    tokens.forEach((token) => {
      const rawNode = rawNodeMap.get(token) || rawNodeByNameMap.get(token) || null;
      const graphNode = nodeMap.get(token) || null;
      const id = String(rawNode?.id || graphNode?.id || token).trim();
      const label = String(
        rawNode?.label ||
          graphNode?.label ||
          rawNodeNameMap.get(id) ||
          rawNodeNameMap.get(token) ||
          token,
      ).trim();
      const communityId = String(
        rawNode?.communityId ||
          graphNode?.communityId ||
          rawNodeCommunityMap.get(id) ||
          rawNodeCommunityMap.get(token) ||
          activeCommunityKey,
      ).trim();
      if (!label || communityId !== activeCommunityKey) {
        return;
      }
      memberMap.set(id || label, {
        id: id || label,
        label,
        degree:
          rawNodeDegreeMap.get(id) ||
          rawNodeDegreeMap.get(token) ||
          rawNodeDegreeByNameMap.get(label) ||
          graphNode?.degree ||
          0,
        isBridge: Boolean(
          rawNode?.isBridge ||
            graphNode?.isBridge ||
            rawBridgeNodeIdSet.has(id) ||
            rawBridgeNodeIdSet.has(token),
        ),
        communityId,
      });
    });

    (rawNodesByCommunityId.get(activeCommunityKey) || []).forEach((node) => {
      memberMap.set(node.id, {
        id: node.id,
        label: String(node.label || rawNodeNameMap.get(node.id) || node.id).trim(),
        degree:
          rawNodeDegreeMap.get(node.id) ||
          rawNodeDegreeByNameMap.get(node.label) ||
          node.degree ||
          0,
        isBridge: Boolean(node.isBridge || rawBridgeNodeIdSet.has(node.id)),
        communityId: activeCommunityKey,
      });
    });

    return Array.from(memberMap.values());
  }, [
    activeCommunity,
    activeCommunityKey,
    nodeMap,
    rawBridgeNodeIdSet,
    rawCommunityMap,
    rawNodeByNameMap,
    rawNodeCommunityMap,
    rawNodeDegreeByNameMap,
    rawNodeDegreeMap,
    rawNodeMap,
    rawNodeNameMap,
    rawNodesByCommunityId,
  ]);
  const activeCoreMembers = useMemo(() => {
    if (!activeCommunityKey) {
      return [];
    }
    const rawCommunity = rawCommunityMap.get(activeCommunityKey);
    const preferredCommunityMembers = dedupeStrings([
      ...(rawCommunity?.nodeIds || []),
      ...(activeCommunity?.nodeIds || []).map((item) => String(item).trim()),
    ])
      .map((nodeId) => {
        const rawNode = rawNodeMap.get(nodeId) || null;
        const graphNode = nodeMap.get(nodeId) || null;
        const label = String(
          rawNode?.label ||
            graphNode?.label ||
            rawNodeNameMap.get(nodeId) ||
            nodeId,
        ).trim();
        return {
          id: String(rawNode?.id || graphNode?.id || nodeId).trim(),
          label,
          degree:
            rawNodeDegreeMap.get(nodeId) ||
            rawNodeDegreeByNameMap.get(label) ||
            graphNode?.degree ||
            0,
          isBridge: Boolean(
            rawNode?.isBridge ||
              graphNode?.isBridge ||
              rawBridgeNodeIdSet.has(nodeId),
          ),
        };
      })
      .filter((member) => member.id && member.label);

    const fromRawMembers = (preferredCommunityMembers.length > 0 ? preferredCommunityMembers : activeCommunityMembers)
      .slice()
      .sort((left, right) => {
        const leftPriority = Number(left.isBridge) * 100 + left.degree;
        const rightPriority = Number(right.isBridge) * 100 + right.degree;
        return rightPriority - leftPriority;
      })
      .slice(0, 6)
      .map((member) => ({
        id: member.id,
        label: member.label,
        degree: member.degree,
        isBridge: member.isBridge,
      }));
    if (fromRawMembers.length > 0) {
      return fromRawMembers;
    }

    const fromInsight = activeInsight?.coreMembers || [];
    if (fromInsight.length > 0) {
      return fromInsight;
    }

    return nodes
      .filter((node) => String(node.communityId).trim() === activeCommunityKey)
      .sort((left, right) => {
        const leftPriority = Number(left.isBridge) * 100 + left.degree;
        const rightPriority = Number(right.isBridge) * 100 + right.degree;
        return rightPriority - leftPriority;
      })
      .slice(0, 6)
      .map((node) => ({
        id: node.id,
        label: node.label,
        degree: node.degree,
        isBridge: node.isBridge,
      }));
  }, [activeCommunity, activeCommunityKey, activeCommunityMembers, activeInsight, nodeMap, nodes, rawBridgeNodeIdSet, rawCommunityMap, rawNodeDegreeByNameMap, rawNodeDegreeMap, rawNodeMap, rawNodeNameMap]);
  const activeOutbound = useMemo(() => {
    if (!activeCommunityKey) {
      return [];
    }

    const outboundMap = new Map<string, { to: string; weight: number; relations: string[] }>();
    rawNetworkEdges.forEach((edge) => {
      const sourceId = String(edge.source_id ?? edge.source ?? "").trim();
      const targetId = String(edge.target_id ?? edge.target ?? "").trim();
      const sourceNode =
        rawNodeMap.get(sourceId) ||
        rawNodeByNameMap.get(sourceId) ||
        rawNodeByNameMap.get(String(edge.source ?? "").trim()) ||
        null;
      const targetNode =
        rawNodeMap.get(targetId) ||
        rawNodeByNameMap.get(targetId) ||
        rawNodeByNameMap.get(String(edge.target ?? "").trim()) ||
        null;
      const sourceCommunityId = String(
        edge.source_community_id ??
          sourceNode?.communityId ??
          rawNodeCommunityMap.get(sourceId) ??
          communityNodeIdToCommunityMap.get(sourceId) ??
          "",
      ).trim();
      const targetCommunityId = String(
        edge.target_community_id ??
          targetNode?.communityId ??
          rawNodeCommunityMap.get(targetId) ??
          communityNodeIdToCommunityMap.get(targetId) ??
          "",
      ).trim();
      const isCrossCommunity =
        Boolean(edge.is_cross_community) ||
        (sourceCommunityId && targetCommunityId && sourceCommunityId !== targetCommunityId);
      if (!isCrossCommunity) {
        return;
      }
      const sourceInActiveCommunity = sourceCommunityId === activeCommunityKey;
      const targetInActiveCommunity = targetCommunityId === activeCommunityKey;
      if (!sourceInActiveCommunity && !targetInActiveCommunity) {
        return;
      }

      const toCommunityId = sourceInActiveCommunity
        ? String(targetCommunityId || targetNode?.communityId || "").trim()
        : String(sourceCommunityId || sourceNode?.communityId || "").trim();
      if (!toCommunityId) {
        return;
      }
      // 优先显示对端实体名称，而非社区 ID
      const toEntityName =
        (sourceInActiveCommunity ? targetNode?.label : sourceNode?.label) || "";
      const to = toEntityName || toCommunityId;
      const current = outboundMap.get(to) || { to, weight: 0, relations: [] };
      current.weight += Number(edge.weight ?? 1) || 1;
      const relation = String(edge.relation ?? "").trim();
      if (relation) {
        current.relations.push(relation);
      }
      outboundMap.set(to, current);
    });
    const fromRawEdges = Array.from(outboundMap.values())
      .map((item) => ({
        ...item,
        relations: dedupeStrings(item.relations).slice(0, 3),
      }))
      .sort((left, right) => right.weight - left.weight);
    if (fromRawEdges.length > 0) {
      return fromRawEdges;
    }

    const fromInsight = activeInsight?.outbound || [];
    if (fromInsight.length > 0) {
      return fromInsight;
    }

    return communityBridges
      .flatMap((bridge) => {
        if (String(bridge.sourceCommunityId).trim() === activeCommunityKey) {
          return [{
            to: String(bridge.targetCommunityId).trim(),
            weight: bridge.weight,
            relations: bridge.relations,
          }];
        }
        if (String(bridge.targetCommunityId).trim() === activeCommunityKey) {
          return [{
            to: String(bridge.sourceCommunityId).trim(),
            weight: bridge.weight,
            relations: bridge.relations,
          }];
        }
        return [];
      })
      .sort((left, right) => right.weight - left.weight);
  }, [activeCommunityKey, activeInsight, communityBridges, communityNodeIdToCommunityMap, rawNetworkEdges, rawNodeByNameMap, rawNodeCommunityMap, rawNodeMap]);

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
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>社区网络图</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
              实体 {entityCount ?? 0} 个 / 关系 {relationCount ?? 0} 条 / 社区 {communities.length} 个
            </div>
          </div>
          <Button size="small" onClick={onClearCommunity}>
            重置
          </Button>
        </div>

        {communityLoading ? <Spin tip="社区网络分析中..." /> : null}
        {!communityLoading && communityError ? <Alert type="error" showIcon message={communityError} /> : null}

        {!communityLoading && !communityError && activeCommunity ? (
          <div style={{ display: "grid", gap: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: getCommunityColor(activeCommunity.id),
                  }}
                />
                {activeCommunity.name ? (
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{activeCommunity.name}</div>
                ) : null}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#64748b" }}>
                {activeCommunity.description || activeCommunity.topic || "该社区由一组高关联实体构成。"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ borderRadius: 16, border: "1px solid #dbe5f0", padding: 16, background: "#fff" }}>
                <div style={{ fontSize: 34, lineHeight: 1, fontFamily: "Consolas, monospace", color: "#0f172a" }}>
                  {activeCommunity.nodeIds.length}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>成员节点</div>
              </div>
              <div style={{ borderRadius: 16, border: "1px solid #dbe5f0", padding: 16, background: "#fff" }}>
                <div style={{ fontSize: 34, lineHeight: 1, fontFamily: "Consolas, monospace", color: "#0f172a" }}>
                  {activeInsight?.keywords.length || 0}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>主题标签</div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Meter
                label="内部密度"
                value={Number(activeCommunity.density) || 0}
                color={getCommunityColor(activeCommunity.id)}
              />
              <Meter
                label="封闭度（低外联）"
                value={typeof activeCommunity.closure === "number" ? activeCommunity.closure : 0}
                color="#7aaee6"
              />
            </div>

            {(activeInsight?.keywords.length || 0) > 0 ? (
              <div>
                <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 700, color: "#475569" }}>自动归纳主题</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {activeInsight?.keywords.map((keyword) => (
                    <Tag
                      key={keyword}
                      style={{
                        margin: 0,
                        borderRadius: 999,
                        padding: "5px 12px",
                        color: getCommunityColor(activeCommunity.id),
                        borderColor: hexToRgba(getCommunityColor(activeCommunity.id), 0.45),
                        background: "#fff",
                      }}
                    >
                      {keyword}
                    </Tag>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 700, color: "#475569" }}>核心成员</div>
              <div style={{ display: "grid", gap: 8 }}>
                {activeCoreMembers.map((member) => (
                  <div key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ color: "#0f172a", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {member.label}
                      </span>
                      {member.isBridge ? (
                        <Tag style={{ margin: 0, fontSize: 10, lineHeight: "16px", padding: "0 6px", borderRadius: 10 }}>
                          桥梁
                        </Tag>
                      ) : null}
                    </div>
                    <span style={{ color: "#475569", fontFamily: "Consolas, monospace", fontSize: 13 }}>
                      度 {member.degree}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 700, color: "#475569" }}>对外联络方向</div>
              <div style={{ display: "grid", gap: 10 }}>
                {activeOutbound.map((outbound) => {
                  const outboundKey = String(outbound.to).trim();
                  const targetCommunity = communities.find(
                    (item) =>
                      String(item.id).trim() === outboundKey ||
                      String(item.name).trim() === outboundKey,
                  );
                  const targetColor = getCommunityColor(
                    targetCommunity?.id ?? outboundKey,
                  );
                  const maxWeight = activeOutbound[0]?.weight || 1;
                  const displayName =
                    targetCommunity?.name || outboundKey;
                  return (
                    <div key={outboundKey} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: targetColor }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "#0f172a", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {displayName}
                        </div>
                        <div style={{ marginTop: 2, color: "#94a3b8", fontSize: 11 }}>
                          {outbound.relations.join(" / ") || "跨社区关联"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 84, height: 6, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${clamp((outbound.weight / maxWeight) * 100, 12, 100)}%`,
                              height: "100%",
                              borderRadius: 999,
                              background: targetColor,
                            }}
                          />
                        </div>
                        <span style={{ color: "#475569", fontFamily: "Consolas, monospace", fontSize: 12 }}>
                          {outbound.weight}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {!communityLoading && !communityError && !activeCommunity ? (
          <div style={{ borderRadius: 16, border: "1px solid #e5e7eb", background: "#fff", padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>社区总览</div>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#64748b" }}>
              当前默认展示全部社区。画布中的虚线粗连线表示社区与社区之间存在跨社区关系，数字越大说明联系越强。点击某个社区后，会高亮该社区并显示全部节点名称。
            </div>
          </div>
        ) : null}

        {!communityLoading && !communityError ? (
          communities.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {communities.map((community, index) => {
                const active = activeCommunityId === community.id;
                return (
                  <button
                    key={community.id}
                    type="button"
                    onClick={() => onFocusCommunity(community)}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      border: active ? `1px solid ${getCommunityColor(community.id)}` : "1px solid #e5e7eb",
                      background: active ? hexToRgba(getCommunityColor(community.id), 0.12) : "#fff",
                      padding: 14,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: getCommunityColor(community.id),
                              flexShrink: 0,
                            }}
                          />
                          {community.name ? (
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{community.name}</div>
                          ) : null}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                          {community.description || community.topic || "暂无主题描述"}
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: 4, flexShrink: 0 }}>
                        <Tag style={{ margin: 0 }}>节点 {community.nodeIds.length}</Tag>
                        <Tag style={{ margin: 0 }}>关系 {community.relationCount}</Tag>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty description="暂无社区网络数据" />
          )
        ) : null}
      </div>
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
