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

type BridgeNodeOverlay = {
  id: string;
  x: number;
  y: number;
  radius: number;
  active: boolean;
};

type CrossEdgeOverlay = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
      const centerX = members.reduce((sum, item) => sum + item.x, 0) / members.length;
      const centerY = members.reduce((sum, item) => sum + item.y, 0) / members.length;
      const spread = members.reduce((sum, item) => sum + Math.hypot(item.x - centerX, item.y - centerY), 0) / members.length || 1;
      return {
        communityId,
        members,
        centerX,
        centerY,
        spread,
      };
    })
    .sort((left, right) => right.members.length - left.members.length);

  const targetCenters = new Map<string, { x: number; y: number; scale: number }>();
  const primary = communities[0];
  if (primary) {
    targetCenters.set(primary.communityId, { x: 0, y: 0, scale: 1.15 });
  }

  const secondary = communities.slice(1);
  const ringRadius = Math.max(7, 5 + secondary.length * 0.6);
  secondary.forEach((community, index) => {
    const angle = (-Math.PI / 2) + (index / Math.max(secondary.length, 1)) * Math.PI * 2;
    const orbit = ringRadius + Math.min(index, 3) * 0.9;
    targetCenters.set(community.communityId, {
      x: Math.cos(angle) * orbit,
      y: Math.sin(angle) * orbit,
      scale: community.spread < 1.5 ? 1.55 : 1.25,
    });
  });

  return nodes.map((node) => {
    const community = communities.find((item) => item.communityId === node.communityId);
    const target = targetCenters.get(node.communityId);
    if (!community || !target) {
      return node;
    }

    const relativeX = node.x - community.centerX;
    const relativeY = node.y - community.centerY;
    return {
      ...node,
      x: target.x + relativeX * target.scale,
      y: target.y + relativeY * target.scale,
    };
  });
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
      return {
        id,
        label: String(node.name ?? id).trim(),
        communityId: String(node.community_id ?? "default").trim() || "default",
        x: Number(node.x ?? 0),
        y: Number(node.y ?? 0),
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
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const dims = (sigma as any).getDimensions?.() || {
    width: sigma.getContainer().clientWidth || 1,
    height: sigma.getContainer().clientHeight || 1,
  };
  const graphRatio = Math.max(
    width / Math.max(dims.width - 260, 1),
    height / Math.max(dims.height - 220, 1),
  );

  sigma.getCamera().setState({
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    ratio: Math.max(graphRatio * 56, 0.72),
    angle: 0,
  });
}

function focusCommunityInView(
  sigma: Sigma,
  nodes: CommunityNodeRecord[],
  communityId: string | null,
) {
  sigma.resize();
  sigma.refresh();

  if (!communityId) {
    fitSigmaToGraph(sigma, sigma.getGraph());
    return;
  }

  const members = nodes.filter((node) => node.communityId === communityId);
  if (members.length === 0) {
    fitSigmaToGraph(sigma, sigma.getGraph());
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  members.forEach((node) => {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  });

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const camera = sigma.getCamera();
  const dims = (sigma as any).getDimensions?.() || {
    width: sigma.getContainer().clientWidth || 1,
    height: sigma.getContainer().clientHeight || 1,
  };
  const ratio = Math.max(
    width / Math.max(dims.width - 320, 1),
    height / Math.max(dims.height - 260, 1),
  );
  const nextRatio = clamp(ratio * 52, 0.62, 1.04);

  camera.animate(
    {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      ratio: nextRatio,
      angle: 0,
    },
    { duration: 320 },
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
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [halos, setHalos] = useState<HaloItem[]>([]);
  const [bridgeNodeOverlays, setBridgeNodeOverlays] = useState<BridgeNodeOverlay[]>([]);
  const [crossEdgeOverlays, setCrossEdgeOverlays] = useState<CrossEdgeOverlay[]>([]);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const activeCommunityIdRef = useRef<string | null>(null);

  const { nodes, edges } = useMemo(() => buildCommunityGraph(networkData), [networkData]);
  const communityMap = useMemo(
    () => new Map(communities.map((community) => [community.id, community])),
    [communities],
  );
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const communityBridges = useMemo(
    () => buildCommunityBridges(edges, nodeMap),
    [edges, nodeMap],
  );
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
    const adjacency = new Map<string, Set<string>>();

    nodes.forEach((node) => {
      graph.addNode(node.id, {
        x: node.x,
        y: node.y,
        size: clamp(4 + node.degree * 0.9 + (node.isBridge ? 2.5 : 0), 7, 22),
        label: node.label,
        color: getCommunityColor(node.communityId),
        borderColor: "#ffffff",
        borderSize: node.isBridge ? 3 : 1.5,
        originalData: node,
      });
      adjacency.set(node.id, new Set());
    });

    edges.forEach((edge) => {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) return;
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      const color = sourceNode
        ? hexToRgba(getCommunityColor(sourceNode.communityId), edge.cross ? 0.34 : 0.52)
        : "rgba(148, 163, 184, 0.58)";
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        size: edge.cross ? 1.3 : 1.8,
        color,
        type: "line",
        label: edge.relation,
        originalData: edge,
      });
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
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
        const neighbors = hovered ? adjacency.get(hovered) || new Set<string>() : new Set<string>();
        const activeByHover = focused ? true : hovered ? hovered === nodeId || neighbors.has(nodeId) : true;
        const activeByFocus = focused ? node.communityId === focused : true;
        const active = activeByHover && activeByFocus;
        const showLabel = focused
          ? active
          : hovered
            ? active && (node.degree >= 3 || hovered === nodeId)
            : false;

        return {
          ...data,
          color: active
            ? node.isBridge
              ? "#f59e0b"
              : color
            : "rgba(148, 163, 184, 0.16)",
          borderColor: active
            ? node.isBridge
              ? "#fef3c7"
              : "#ffffff"
            : "rgba(255,255,255,0.36)",
          borderSize: node.isBridge ? 4.5 : data.borderSize,
          size: active
            ? node.isBridge
              ? Number(data.size) * 1.18
              : data.size
            : Math.max(Number(data.size) * 0.9, 5),
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
          ? new Set([hovered, ...Array.from(adjacency.get(hovered) || [])])
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
          ? "rgba(245, 158, 11, 0.92)"
          : hexToRgba(getCommunityColor(sourceNode.communityId), 0.46);

        return {
          ...data,
          color: edge.cross ? "rgba(245, 158, 11, 0)" : active ? baseColor : "rgba(148, 163, 184, 0.08)",
          size: active ? (edge.cross ? 0.01 : 2.1) : 0.8,
          zIndex: active ? 1 : 0,
        };
      },
    });

    fitSigmaToGraph(sigma, graph);

    sigma.on("enterNode", ({ node }) => {
      setHoveredNodeId(node);
      sigma.refresh();
    });

    sigma.on("leaveNode", () => {
      setHoveredNodeId(null);
      sigma.refresh();
    });

    sigma.on("clickNode", ({ node }) => {
      const currentNode = graph.getNodeAttribute(node, "originalData") as CommunityNodeRecord;
      const targetCommunity = communityMap.get(currentNode.communityId);
      if (targetCommunity) {
        onFocusCommunity(targetCommunity);
      }
    });

    sigma.on("clickStage", () => {
      onClearCommunity();
    });

    sigmaRef.current = sigma;
    graphRef.current = graph;

    return () => {
      sigma.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, [communities, communityMap, edges, nodeMap, nodes, onClearCommunity, onFocusCommunity]);

  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;
    focusCommunityInView(sigma, nodes, activeCommunityId);
  }, [activeCommunityId, nodes]);

  useEffect(() => {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    if (!sigma || !graph) {
      setHalos([]);
      setBridgeNodeOverlays([]);
      setCrossEdgeOverlays([]);
      return;
    }

    const updateOverlays = () => {
      const nextHalos: HaloItem[] = communities
        .map((community) => {
          const center = communityCenters.get(community.id);
          if (!center) {
            return null;
          }
          const point = sigma.graphToViewport(center);
          const members = nodes.filter((node) => node.communityId === community.id);
          let maxDistance = 72;
          members.forEach((node) => {
            const nodePoint = sigma.graphToViewport({ x: node.x, y: node.y });
            maxDistance = Math.max(
              maxDistance,
              Math.hypot(nodePoint.x - point.x, nodePoint.y - point.y),
            );
          });
          return {
            id: community.id,
            name: community.name,
            x: point.x,
            y: point.y,
            radius: clamp(maxDistance + 28, 72, 150),
            color: getCommunityColor(community.id),
            active: !activeCommunityId || activeCommunityId === community.id,
          };
        })
        .filter(Boolean) as HaloItem[];
      setHalos(nextHalos);

      const nextBridgeNodes = nodes
        .filter((node) => node.isBridge)
        .map((node) => {
          const point = sigma.graphToViewport({ x: node.x, y: node.y });
          return {
            id: node.id,
            x: point.x,
            y: point.y,
            radius: clamp(10 + node.degree * 0.8, 12, 24),
            active: !activeCommunityId || activeCommunityId === node.communityId,
          };
        });
      setBridgeNodeOverlays(nextBridgeNodes);

      const nextCrossEdges = edges
        .filter((edge) => edge.cross)
        .map((edge) => {
          const sourceNode = nodeMap.get(edge.source);
          const targetNode = nodeMap.get(edge.target);
          if (!sourceNode || !targetNode) {
            return null;
          }
          const sourcePoint = sigma.graphToViewport({ x: sourceNode.x, y: sourceNode.y });
          const targetPoint = sigma.graphToViewport({ x: targetNode.x, y: targetNode.y });
          return {
            id: edge.id,
            x1: sourcePoint.x,
            y1: sourcePoint.y,
            x2: targetPoint.x,
            y2: targetPoint.y,
            active:
              !activeCommunityId ||
              activeCommunityId === sourceNode.communityId ||
              activeCommunityId === targetNode.communityId,
          };
        })
        .filter(Boolean) as CrossEdgeOverlay[];
      setCrossEdgeOverlays(nextCrossEdges);
    };

    updateOverlays();
    const camera = sigma.getCamera();
    const onCameraUpdate = (_state?: CameraState) => updateOverlays();
    camera.on("updated", onCameraUpdate);
    window.addEventListener("resize", updateOverlays);

    return () => {
      camera.removeListener("updated", onCameraUpdate);
      window.removeEventListener("resize", updateOverlays);
    };
  }, [activeCommunityId, communities, communityCenters, edges, nodeMap, nodes]);

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
        {halos.map((halo) => (
          <React.Fragment key={halo.id}>
            <div
              style={{
                position: "absolute",
                left: halo.x - halo.radius,
                top: halo.y - halo.radius,
                width: halo.radius * 2,
                height: halo.radius * 2,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${hexToRgba(halo.color, 0.12)} 0%, ${hexToRgba(
                  halo.color,
                  0.04,
                )} 55%, ${hexToRgba(halo.color, 0)} 100%)`,
                opacity: halo.active ? 1 : 0.2,
                transition: "opacity 0.35s ease",
              }}
            />
          </React.Fragment>
        ))}
      </div>

      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
        {crossEdgeOverlays.map((edge) => (
          <line
            key={edge.id}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="rgba(245, 158, 11, 0.9)"
            strokeWidth={3}
            strokeDasharray="8 6"
            opacity={edge.active ? 0.95 : 0.18}
          />
        ))}
        {communityBridges.map((bridge) => {
          const sourceCenter = communityCenters.get(bridge.sourceCommunityId);
          const targetCenter = communityCenters.get(bridge.targetCommunityId);
          if (!sourceCenter || !targetCenter) return null;
          const sourcePoint = sigmaRef.current?.graphToViewport(sourceCenter);
          const targetPoint = sigmaRef.current?.graphToViewport(targetCenter);
          if (!sourcePoint || !targetPoint) return null;
          const active =
            !activeCommunityId ||
            activeCommunityId === bridge.sourceCommunityId ||
            activeCommunityId === bridge.targetCommunityId;
          const midX = (sourcePoint.x + targetPoint.x) / 2;
          const midY = (sourcePoint.y + targetPoint.y) / 2;

          return (
            <g key={bridge.id} opacity={active ? 0.92 : 0.18}>
              <line
                x1={sourcePoint.x}
                y1={sourcePoint.y}
                x2={targetPoint.x}
                y2={targetPoint.y}
                stroke="rgba(245, 158, 11, 0.75)"
                strokeWidth={Math.min(2.6 + bridge.weight * 0.75, 7)}
                strokeDasharray="10 6"
              />
              <g transform={`translate(${midX}, ${midY})`}>
                <rect
                  x={-20}
                  y={-12}
                  width={40}
                  height={24}
                  rx={12}
                  ry={12}
                  fill="rgba(255,251,235,0.96)"
                  stroke="rgba(245,158,11,0.55)"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fill: "#334155", fontSize: 12, fontWeight: 700, fontFamily: "Consolas, monospace" }}
                >
                  {bridge.weight}
                </text>
              </g>
            </g>
          );
        })}
        {bridgeNodeOverlays.map((node) => (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={node.radius}
            fill="none"
            stroke="rgba(245, 158, 11, 0.95)"
            strokeWidth={2.4}
            strokeDasharray="5 4"
            opacity={node.active ? 1 : 0.2}
          />
        ))}
      </svg>

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              minWidth: 26,
              height: 18,
              padding: "0 6px",
              borderRadius: 9,
              border: "1px solid rgba(148,163,184,0.5)",
              background: "rgba(255,255,255,0.92)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#334155",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "Consolas, monospace",
            }}
          >
            3
          </span>
          <span>社区间关系强度</span>
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
  const activeInsight = activeCommunity ? insightsMap.get(activeCommunity.id) : null;

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
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{activeCommunity.name}</div>
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
                {activeInsight?.coreMembers.map((member) => (
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
                {(activeInsight?.outbound || []).map((outbound) => {
                  const targetCommunity = communities.find((item) => item.id === outbound.to);
                  const targetColor = getCommunityColor(outbound.to);
                  const maxWeight = activeInsight?.outbound[0]?.weight || 1;
                  return (
                    <div key={outbound.to} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: targetColor }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "#0f172a", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {targetCommunity?.name || outbound.to}
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
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                            社区 {index + 1} · {community.name}
                          </div>
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
