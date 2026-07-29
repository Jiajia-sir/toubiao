"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Graph from "graphology";
import { Sigma } from "sigma";
import { NodeBorderProgram } from "@sigma/node-border";
import { createEdgeArrowProgram } from "sigma/rendering";
import { createEdgeCurveProgram, DEFAULT_EDGE_CURVE_PROGRAM_OPTIONS } from "@sigma/edge-curve";

import type {
  EntityGraphData,
  EntityGraphLink,
  EntityGraphNode,
  EntityGraphNodeType,
} from "@/data/entityGraphMock";

export interface EntityRelationGraphRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

interface EntityRelationGraphProps {
  data: EntityGraphData;
  selectedNodeId?: string | null;
  height?: number | string;
  nodeScale?: number;
  linkWidth?: number;
  showNodes?: boolean;
  showLinks?: boolean;
  showLabels?: boolean;
  labelMaxLength?: number;
  maxVisibleLabels?: number;
  onNodeClick?: (node: EntityGraphNode) => void;
  onNodeDoubleClick?: (node: EntityGraphNode) => void;
  actionRef?: React.Ref<EntityRelationGraphRef>;
}

const nodeBaseStyleMap: Record<
  EntityGraphNodeType,
  {
    radius: number;
    text: string;
  }
> = {
  center: {
    radius: 18,
    text: "#ffffff",
  },
  entity: {
    radius: 18,
    text: "#102a43",
  },
  value: {
    radius: 14,
    text: "#1f3d5b",
  },
};

const branchPalette = [
  { strong: "#4F7CAC", medium: "#6D95BE", light: "#91B2D0", stroke: "#B3CADE" },
  { strong: "#7B6DB0", medium: "#9388C2", light: "#AEA6D4", stroke: "#CAC4E4" },
  { strong: "#4FAFA3", medium: "#6FC0B7", light: "#95D2CC", stroke: "#B8E2DE" },
  { strong: "#D08A5B", medium: "#DEA274", light: "#E9BC97", stroke: "#F0D3B8" },
  { strong: "#C96B8A", medium: "#D8879F", light: "#E3A6B8", stroke: "#EDC4D0" },
  { strong: "#5B9DB8", medium: "#79B1C8", light: "#9BC7D8", stroke: "#BEDCE7" },
  { strong: "#6F8FCB", medium: "#8AA5D8", light: "#A9BDE4", stroke: "#CAD6EF" },
  { strong: "#7CAF6B", medium: "#97C584", light: "#B2D69F", stroke: "#CFE8C1" }
];

function getRadius(node: EntityGraphNode, nodeScale: number) {
  return nodeBaseStyleMap[node.type].radius * nodeScale;
}

function stableHash(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33 + text.charCodeAt(index)) >>> 0;
  }
  return Math.abs(hash);
}

export function getEntityTypePalette(typeName: string) {
  if (typeName === "中心实体") return { strong: "#5D5CDE", medium: "#7F7EF0", stroke: "#4A49B2", text: "#ffffff" };
  if (typeName === "人物" || typeName === "角色") return { strong: "#12A2A8", medium: "#12A2A8", stroke: "#12A2A8", text: "#ffffff" };
  if (typeName === "产品") return { strong: "#F09B1A", medium: "#F09B1A", stroke: "#F09B1A", text: "#ffffff" };
  if (typeName === "机构" || typeName === "公司") return { strong: "#14B274", medium: "#14B274", stroke: "#14B274", text: "#ffffff" };
  if (typeName === "技术") return { strong: "#EE4292", medium: "#EE4292", stroke: "#EE4292", text: "#ffffff" };
  if (typeName === "地点" || typeName === "地区" || typeName === "城市" || typeName === "国家") return { strong: "#EF4352", medium: "#EF4352", stroke: "#EF4352", text: "#ffffff" };

  const seed = stableHash(typeName);
  return branchPalette[seed % branchPalette.length];
}

function getBranchColor(node: EntityGraphNode, nodeMap?: Map<string, EntityGraphNode>) {
  if (node.color) {
    return {
      fill: node.color,
      medium: node.color,
      stroke: node.color,
      text: "#ffffff",
    };
  }
  if (node.type === "center") {
    return {
      fill: "#5D5CDE",
      medium: "#7F7EF0",
      stroke: "#4A49B2",
      text: "#ffffff",
    };
  }

  let rootNode = node;
  if (node.branchId && nodeMap?.has(node.branchId)) {
    rootNode = nodeMap.get(node.branchId)!;
  } else if (node.parentId && nodeMap?.has(node.parentId)) {
    rootNode = nodeMap.get(node.parentId)!;
  }

  const tags = rootNode.tag || [];
  const typeName = tags.length > 0 ? tags[0] : (node.branchId || node.id);
  const palette = getEntityTypePalette(typeName);

  return {
    fill: node.type === "entity" ? palette.strong : palette.medium,
    medium: palette.medium,
    stroke: palette.stroke,
    text: "#ffffff",
  };
}

function truncateLabel(name: string, maxLength: number) {
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
}

function resolveNodeLabel(node: EntityGraphNode, maxLength: number) {
  if (node.type === "value") {
    return truncateLabel(getValueNodeFullText(node), maxLength);
  }
  return truncateLabel(node.name, maxLength);
}

function drawValueNodeTag(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accentColor: string,
  nodeSize: number,
) {
  const fontSize = Math.max(10, Math.min(18, Math.round(nodeSize * 0.72)));
  const paddingX = Math.max(8, Math.round(fontSize * 0.75));
  const paddingY = Math.max(4, Math.round(fontSize * 0.42));
  const accentWidth = 4;
  context.font = `500 ${fontSize}px sans-serif`;
  const textWidth = context.measureText(text).width;
  const width = textWidth + paddingX * 2 + accentWidth;
  const height = fontSize + paddingY * 2;
  const radius = height / 2;
  const left = x - width / 2;
  const top = y - height / 2;

  context.beginPath();
  if (context.roundRect) {
    context.roundRect(left, top, width, height, radius);
  } else {
    context.moveTo(left + radius, top);
    context.lineTo(left + width - radius, top);
    context.quadraticCurveTo(left + width, top, left + width, top + radius);
    context.lineTo(left + width, top + height - radius);
    context.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
    context.lineTo(left + radius, top + height);
    context.quadraticCurveTo(left, top + height, left, top + height - radius);
    context.lineTo(left, top + radius);
    context.quadraticCurveTo(left, top, left + radius, top);
  }
  context.fillStyle = "#f8fafc";
  context.fill();
  context.setLineDash([4, 3]);
  context.strokeStyle = accentColor;
  context.lineWidth = 1;
  context.stroke();
  context.setLineDash([]);

  context.beginPath();
  if (context.roundRect) {
    context.roundRect(left + 2, top + 2, accentWidth, height - 4, 2);
  } else {
    context.rect(left + 2, top + 2, accentWidth, height - 4);
  }
  context.fillStyle = accentColor;
  context.fill();

  context.fillStyle = "#334155";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x + accentWidth / 2, y);
}

function getValueNodeFullText(node: EntityGraphNode) {
  const key = String(node.relationFromParent || node.desc || "属性").trim();
  const value = String(node.name || "").trim();
  return key ? `${key}: ${value}` : value;
}


function drawStableEdgeLabel(
  context: CanvasRenderingContext2D,
  edgeData: Record<string, any>,
  sourceData: Record<string, any>,
  targetData: Record<string, any>,
  settings: Record<string, any>,
) {
  const sourceX = Number(sourceData?.x ?? 0);
  const sourceY = Number(sourceData?.y ?? 0);
  const targetX = Number(targetData?.x ?? 0);
  const targetY = Number(targetData?.y ?? 0);

  if (edgeData?.isBridgeLink || edgeData?.relation === "跨社区边" || edgeData?.relation === "跨社区联系") {
    context.save();
    context.beginPath();
    context.setLineDash([5, 5]);
    context.strokeStyle = "#64748b";
    context.lineWidth = 1.8;
    context.moveTo(sourceX, sourceY);
    context.lineTo(targetX, targetY);
    context.stroke();
    context.restore();
  }

  const label = String(edgeData?.label || "").trim();
  if (!label) return;

  const fontSize = Number(settings.edgeLabelSize || 11);
  const fontWeight = settings.edgeLabelWeight || "600";
  const fontFamily = settings.labelFont || "sans-serif";
  const textColor =
    typeof settings.edgeLabelColor === "object" && settings.edgeLabelColor?.color
      ? settings.edgeLabelColor.color
      : "#475569";

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.hypot(dx, dy);
  if (!length) return;

  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;

  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;
  let normalOffset = 12;

  if (edgeData?.type === "curvedArrow") {
    const curvature = Number(edgeData?.curvature || 0);
    const curveOffset = length * curvature * 0.35;
    labelX += normalX * curveOffset;
    labelY += normalY * curveOffset;
  }

  labelX += normalX * normalOffset;
  labelY += normalY * normalOffset;

  context.save();
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  context.fillStyle = textColor;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, labelX, labelY);
  context.restore();
}

function buildCommunityClustersLayout(nodes: EntityGraphNode[]) {
  const positionMap = new Map<
    string,
    { x: number; y: number; angle: number; sectorStart: number; sectorEnd: number; radius: number }
  >();

  const clusterCenters: Record<string, { x: number; y: number }> = {
    comm_fin: { x: -330, y: -190 },
    comm_semi: { x: 330, y: -190 },
    comm_energy: { x: -330, y: 190 },
    comm_ai: { x: 330, y: 190 },
  };

  const groups = new Map<string, EntityGraphNode[]>();
  nodes.forEach((node) => {
    const cid = String(node.branchId || "comm_fin");
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid)!.push(node);
  });

  const fallbackCenters = [
    { x: -330, y: -190 },
    { x: 330, y: -190 },
    { x: -330, y: 190 },
    { x: 330, y: 190 },
  ];

  let groupIdx = 0;
  groups.forEach((groupNodes, cid) => {
    const center = clusterCenters[cid] || fallbackCenters[groupIdx % fallbackCenters.length];
    groupIdx += 1;

    const seedIds = ["node_seq", "node_tsmc", "node_catl", "node_baai"];
    const seedNode =
      groupNodes.find((n) => seedIds.includes(n.id)) ||
      groupNodes.find((n) => n.type === "center") ||
      groupNodes[0];

    const otherNodes = groupNodes.filter((n) => n.id !== seedNode?.id);

    if (seedNode) {
      positionMap.set(seedNode.id, {
        x: center.x,
        y: center.y,
        angle: 0,
        sectorStart: -Math.PI,
        sectorEnd: Math.PI,
        radius: 0,
      });
    }

    const r = Math.max(115, 88 + otherNodes.length * 3.5);
    const count = Math.max(1, otherNodes.length);
    otherNodes.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / count - Math.PI / 2 + (groupIdx * Math.PI) / 10;
      positionMap.set(node.id, {
        x: center.x + Math.cos(angle) * r,
        y: center.y + Math.sin(angle) * r,
        angle,
        sectorStart: angle - 0.1,
        sectorEnd: angle + 0.1,
        radius: r,
      });
    });
  });

  nodes.forEach((node) => {
    if (!positionMap.has(node.id)) {
      positionMap.set(node.id, { x: 0, y: 0, angle: 0, sectorStart: 0, sectorEnd: 0, radius: 0 });
    }
  });

  return positionMap;
}

function buildGroupedLayout(
  nodes: EntityGraphNode[],
  links: EntityGraphLink[],
  centerId: string,
  focusNodeId?: string | null,
) {
  const isCommunityGraph = nodes.some((n) => n.branchId && String(n.branchId).startsWith("comm_"));
  if (isCommunityGraph) {
    return buildCommunityClustersLayout(nodes);
  }
  const positionMap = new Map<
    string,
    { x: number; y: number; angle: number; sectorStart: number; sectorEnd: number; radius: number }
  >();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const rootId =
    (focusNodeId && nodeMap.has(focusNodeId) ? focusNodeId : null) ||
    (nodeMap.has(centerId) ? centerId : null) ||
    nodes[0]?.id;

  if (!rootId) {
    return positionMap;
  }

  positionMap.set(rootId, {
    x: 0,
    y: 0,
    angle: -Math.PI / 2,
    sectorStart: -Math.PI,
    sectorEnd: Math.PI,
    radius: 0,
  });

  const adjacencyMap = new Map<string, Array<{ node: EntityGraphNode; relation: string }>>();
  nodes.forEach((node) => {
    adjacencyMap.set(node.id, []);
  });

  links.forEach((link) => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);
    if (!sourceNode || !targetNode) return;

    adjacencyMap.get(link.source)?.push({ node: targetNode, relation: link.relation });
    adjacencyMap.get(link.target)?.push({ node: sourceNode, relation: link.relation });
  });

  const childrenByParent = new Map<string, EntityGraphNode[]>();
  const depthMap = new Map<string, number>([[rootId, 0]]);
  const visited = new Set<string>([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = [...(adjacencyMap.get(currentId) || [])].sort((left, right) => {
      const relationCompare = (left.relation || "").localeCompare(
        right.relation || "",
        "zh-CN",
      );
      if (relationCompare !== 0) return relationCompare;
      return left.node.name.localeCompare(right.node.name, "zh-CN");
    });

    neighbors.forEach(({ node }) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      depthMap.set(node.id, (depthMap.get(currentId) || 0) + 1);
      const current = childrenByParent.get(currentId) || [];
      current.push(node);
      childrenByParent.set(currentId, current);
      queue.push(node.id);
    });
  }

  const weightCache = new Map<string, number>();

  function getSubtreeWeight(nodeId: string): number {
    if (weightCache.has(nodeId)) return weightCache.get(nodeId)!;
    const children = childrenByParent.get(nodeId) || [];
    if (children.length === 0) {
      weightCache.set(nodeId, 1);
      return 1;
    }

    const total = children.reduce((sum, child) => sum + getSubtreeWeight(child.id), 0);
    const weight = Math.max(1, total);
    weightCache.set(nodeId, weight);
    return weight;
  }

  const rootChildren = childrenByParent.get(rootId) || [];
  const rootGap = Math.PI / 32;
  const rootPadding = Math.PI / 36;
  const totalRootWeight = rootChildren.reduce(
    (sum, child) => sum + getSubtreeWeight(child.id),
    0,
  );
  const fullAngle = Math.PI * 2 - Math.max(0, rootChildren.length - 1) * rootGap;
  let cursor = -Math.PI / 2;

  function resolveRadius(depth: number, layerCount: number) {
    if (depth <= 1) return Math.max(220, 160 + layerCount * 26);
    return Math.max(220 + (depth - 1) * 150, 170 + layerCount * 22);
  }

  function placeChildren(
    parentId: string,
    sectorStart: number,
    sectorEnd: number,
    depth: number,
  ) {
    const children = childrenByParent.get(parentId) || [];
    if (children.length === 0) return;

    const padding = depth === 1 ? rootPadding : Math.min(0.12, (sectorEnd - sectorStart) * 0.14);
    const gap = depth === 1 ? rootGap : Math.min(0.08, (sectorEnd - sectorStart) / 18);
    const usableStart = sectorStart + padding;
    const usableEnd = sectorEnd - padding;
    const usableRange = Math.max(
      0.18,
      usableEnd - usableStart - Math.max(0, children.length - 1) * gap,
    );
    const totalWeight = children.reduce((sum, child) => sum + getSubtreeWeight(child.id), 0);
    let localCursor = usableStart;

    children.forEach((child) => {
      const weight = getSubtreeWeight(child.id);
      const span = usableRange * (weight / Math.max(totalWeight, 1));
      const childStart = localCursor;
      const childEnd = childStart + span;
      const childAngle = (childStart + childEnd) / 2;
      const radius = resolveRadius(depth, children.length);
      const x = Math.cos(childAngle) * radius;
      const y = Math.sin(childAngle) * radius;

      positionMap.set(child.id, {
        x,
        y,
        angle: childAngle,
        sectorStart: childStart,
        sectorEnd: childEnd,
        radius,
      });

      placeChildren(child.id, childStart, childEnd, depth + 1);
      localCursor = childEnd + gap;
    });
  }

  rootChildren.forEach((child) => {
    const weight = getSubtreeWeight(child.id);
    const span = fullAngle * (weight / Math.max(totalRootWeight, 1));
    const childStart = cursor;
    const childEnd = childStart + span;
    const childAngle = (childStart + childEnd) / 2;
    const radius = resolveRadius(1, rootChildren.length);

    positionMap.set(child.id, {
      x: Math.cos(childAngle) * radius,
      y: Math.sin(childAngle) * radius,
      angle: childAngle,
      sectorStart: childStart,
      sectorEnd: childEnd,
      radius,
    });

    placeChildren(child.id, childStart, childEnd, 2);
    cursor = childEnd + rootGap;
  });

  nodes.forEach((node) => {
    if (!positionMap.has(node.id)) {
      const fallbackDepth = depthMap.get(node.id) ?? node.depth ?? 1;
      const fallbackAngle = stableHash(node.id) % 360;
      const radius = resolveRadius(fallbackDepth, 1);
      positionMap.set(node.id, {
        x: Math.cos((fallbackAngle * Math.PI) / 180) * radius,
        y: Math.sin((fallbackAngle * Math.PI) / 180) * radius,
        angle: (fallbackAngle * Math.PI) / 180,
        sectorStart: -Math.PI,
        sectorEnd: Math.PI,
        radius,
      });
    }
  });

  return positionMap;
}

const EntityRelationGraph = forwardRef<
  EntityRelationGraphRef,
  EntityRelationGraphProps
>(function EntityRelationGraph(
  {
    data,
    selectedNodeId,
    height = "100%",
    nodeScale = 1,
    linkWidth = 1.4,
    showNodes = true,
    showLinks = true,
    showLabels = true,
    labelMaxLength,
    maxVisibleLabels,
    onNodeClick,
    onNodeDoubleClick,
    actionRef,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const isCommunityGraphData = data.nodes.some((node) => String(node.id).startsWith("comm_"));

  useImperativeHandle(actionRef || ref, () => ({
    zoomIn: () => {
      const camera = sigmaRef.current?.getCamera();
      if (camera) camera.animatedZoom({ duration: 300 });
    },
    zoomOut: () => {
      const camera = sigmaRef.current?.getCamera();
      if (camera) camera.animatedUnzoom({ duration: 300 });
    },
    resetZoom: () => {
      const camera = sigmaRef.current?.getCamera();
      if (camera) camera.animatedReset({ duration: 300 });
    },
  }));

  useEffect(() => {
    const graph = new Graph({ multi: true });
    graphRef.current = graph;

    return () => {
      graph.clear();
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setSize({
        width: container.clientWidth || 900,
        height: container.clientHeight || (typeof height === "number" ? height : 640),
      });
      sigmaRef.current?.resize();
      sigmaRef.current?.refresh();
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || data.nodes.length === 0) return;

    const targetPositions = buildGroupedLayout(data.nodes, data.links, data.centerId, selectedNodeId);
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));

    const existingNodes = new Set(graph.nodes());
    const newNodes = new Set(data.nodes.map(n => n.id));

    existingNodes.forEach(nodeId => {
      if (!newNodes.has(nodeId)) {
        graph.dropNode(nodeId);
      }
    });

    const anchorNodeId =
      (selectedNodeId && targetPositions.has(selectedNodeId) ? selectedNodeId : null) ||
      (targetPositions.has(data.centerId) ? data.centerId : null) ||
      data.nodes[0]?.id;
    const anchorTargetPosition = anchorNodeId ? targetPositions.get(anchorNodeId) : null;
    const anchorCurrentPosition =
      anchorNodeId && graph.hasNode(anchorNodeId)
        ? {
            x: Number(graph.getNodeAttribute(anchorNodeId, "x") ?? 0),
            y: Number(graph.getNodeAttribute(anchorNodeId, "y") ?? 0),
          }
        : null;
    const layoutOffset =
      anchorTargetPosition && anchorCurrentPosition
        ? {
            x: anchorCurrentPosition.x - anchorTargetPosition.x,
            y: anchorCurrentPosition.y - anchorTargetPosition.y,
          }
        : { x: 0, y: 0 };

    data.nodes.forEach(node => {
      const existingPosition = graph.hasNode(node.id)
        ? {
            x: Number(graph.getNodeAttribute(node.id, "x") ?? 0),
            y: Number(graph.getNodeAttribute(node.id, "y") ?? 0),
          }
        : null;
      const targetPosition = targetPositions.get(node.id) || { x: 0, y: 0 };
      const pos = isCommunityGraphData
        ? {
            x: targetPosition.x,
            y: targetPosition.y,
          }
        : existingPosition || {
            x: targetPosition.x + layoutOffset.x,
            y: targetPosition.y + layoutOffset.y,
          };
      const radius = getRadius(node, nodeScale);
      const colors = getBranchColor(node, nodeMap);
      const isSelected = node.id === selectedNodeId;
      const isValueNode = node.type === "value";
      const maxLength = labelMaxLength || (node.type === "center" ? 6 : node.type === "entity" ? 5 : 4);
      const label = resolveNodeLabel(node, maxLength);
      const visibleNodeSize = isValueNode ? Math.max(12, radius * 0.9) : radius;

      const nodeData = {
        x: pos.x,
        y: pos.y,
        size: visibleNodeSize,
        label: (showNodes && showLabels !== false) ? label : "",
        forceLabel: showNodes && showLabels !== false,
        zIndex: isSelected ? 3 : 1,
        color: showNodes ? (isValueNode ? "rgba(0, 0, 0, 0)" : colors.fill) : "rgba(0, 0, 0, 0)",
        borderColor: showNodes
          ? (
              isValueNode
                ? "rgba(0, 0, 0, 0)"
                : (isSelected ? "#d8b15d" : (node.expandable ? colors.stroke : "rgba(148, 163, 184, 0.55)"))
            )
          : "rgba(0, 0, 0, 0)",
        borderSize: isValueNode
          ? 0
          : (isSelected ? 4 : (node.expandable ? (node.type === "center" ? 2.6 : 1.8) : 0.9)),
        hidden: !showNodes,
        customColor: colors.fill,
        customLabelSize: visibleNodeSize,
        isBridgeNode: (node as any).isBridgeNode,
        originalData: node
      };

      if (!graph.hasNode(node.id)) {
        graph.addNode(node.id, nodeData);
      } else {
        graph.mergeNodeAttributes(node.id, nodeData);
      }
    });

    const existingEdges = new Set(graph.edges());
    const newEdges = new Set(data.links.map(l => `${l.source}__${l.relation}__${l.target}`));

    existingEdges.forEach(edgeId => {
      if (!newEdges.has(edgeId)) {
        graph.dropEdge(edgeId);
      }
    });

    data.links.forEach(link => {
      const edgeId = `${link.source}__${link.relation}__${link.target}`;
      if (!graph.hasNode(link.source) || !graph.hasNode(link.target)) return;

      const targetNode = data.nodes.find(n => n.id === link.target);
      const isBridgeEdge =
        (link as any).isBridgeLink ||
        link.relation === "跨社区边" ||
        link.relation === "跨社区联系";
      const color = isBridgeEdge ? "rgba(0, 0, 0, 0)" : "#94a3b8";

      // 判断是否存在反向关系，或者同方向存在多条关系
      const pairEdges = data.links.filter(l => 
        (l.source === link.source && l.target === link.target) || 
        (l.source === link.target && l.target === link.source)
      );
      
      let type = "arrow";
      let curvature: number | undefined = undefined;

      if (pairEdges.length > 1) {
        type = "curvedArrow";
        
        // 区分同向连线，让同向多条线左右交替散开，双向线各自向外弯曲形成对称
        const sameDirEdges = pairEdges.filter(l => l.source === link.source);
        const indexInSameDir = sameDirEdges.indexOf(link);
        
        let baseCurvature = 0.18 + (Math.floor(indexInSameDir / 2) * 0.15);
        if (indexInSameDir % 2 !== 0) {
          baseCurvature = -baseCurvature;
        }
        
        curvature = baseCurvature;
      }

      const edgeData = {
        label: link.relation,
        color: color,
        size: isBridgeEdge ? Math.max(1, linkWidth * 0.75) : linkWidth,
        hidden: !showLinks,
        // Sigma only renders a subset of edge labels by default.
        // Force relation labels to stay visible without hover.
        forceLabel: showLinks,
        type: type,
        curvature: curvature,
        isBridgeLink: isBridgeEdge,
      };

      if (!graph.hasEdge(edgeId)) {
        graph.addEdgeWithKey(edgeId, link.source, link.target, edgeData);
      } else {
        graph.mergeEdgeAttributes(edgeId, edgeData);
      }
    });

    sigmaRef.current?.refresh();
  }, [data, nodeScale, linkWidth, showNodes, showLinks, showLabels, selectedNodeId, labelMaxLength]);

  const onNodeClickRef = useRef(onNodeClick);
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);
  useEffect(() => {
    onNodeDoubleClickRef.current = onNodeDoubleClick;
  }, [onNodeDoubleClick]);

  const selectedNodeIdRef = useRef(selectedNodeId);
  const hoveredNodeRef = useRef<string | null>(null);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
    sigmaRef.current?.refresh();
  }, [selectedNodeId]);

  useEffect(() => {
    const container = containerRef.current;
    const graph = graphRef.current;
    if (!container || !graph || size.width === 0 || size.height === 0) return;

    sigmaRef.current?.kill();
    sigmaRef.current = null;

    const sigma = new Sigma(graph, container, {
      doubleClickZoomingRatio: 1,
      doubleClickZoomingDuration: 0,
      // Keep labels and relations visible during canvas/camera movement.
      // The previous optimization caused the graph to temporarily degrade into
      // unlabeled points while dragging or right after animated camera updates.
      hideLabelsOnMove: false,
      hideEdgesOnMove: false,
      labelRenderedSizeThreshold: 0,
      labelDensity: 1,
      labelGridCellSize: 1,
      renderLabels: true,
      renderEdgeLabels: showLinks,
      zIndex: true,
      defaultDrawNodeHover: (context, data, settings) => {
        if (!showNodes) return;
        const nodeId = (data as any).key;
        const originalData = (data as any).originalData || (nodeId && graphRef.current ? graphRef.current.getNodeAttribute(nodeId, "originalData") : null);
        
        if (originalData && (originalData.isBridgeNode || originalData.isBridge)) {
          context.save();
          context.beginPath();
          context.setLineDash([3.5, 3.5]);
          context.strokeStyle = "#0284c7";
          context.lineWidth = 1.8;
          context.arc(data.x!, data.y!, data.size! + 5, 0, Math.PI * 2);
          context.stroke();
          context.restore();
        }

        if (originalData && originalData.type === "value") {
          const maxLength =
            labelMaxLength || (originalData.type === "center" ? 6 : originalData.type === "entity" ? 5 : 4);
          const capsuleText = resolveNodeLabel(originalData, maxLength);
          if (!capsuleText) return;
          const accentColor = (data as any).customColor || getBranchColor(originalData).fill;
          drawValueNodeTag(context, data.x!, data.y!, capsuleText, accentColor, (data as any).customLabelSize || 14);
        } else {
          const label = data.label;
          if (!label) return;
          const size = settings.labelSize || 12;
          context.font = `${settings.labelWeight || "normal"} ${size}px ${settings.labelFont || "sans-serif"}`;
          
          context.beginPath();
          context.fillStyle = "#ffffff";
          context.arc(data.x!, data.y!, data.size! + 2, 0, Math.PI * 2);
          context.fill();
          
          const textWidth = context.measureText(label).width;
          const boxWidth = textWidth + 12;
          const boxHeight = size + 10;
          const boxX = data.x! + data.size! + 4;
          const boxY = data.y! - boxHeight / 2;
          
          context.beginPath();
          if (context.roundRect) {
            context.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
          } else {
            context.rect(boxX, boxY, boxWidth, boxHeight);
          }
          context.fillStyle = "rgba(255, 255, 255, 0.9)";
          context.fill();
          
          context.fillStyle = (settings.labelColor && settings.labelColor.color) ? settings.labelColor.color : "#334155";
          context.textAlign = "left";
          context.textBaseline = "middle";
          context.fillText(label, data.x! + data.size! + 8, data.y!);
        }
      },
      defaultDrawNodeLabel: (context, data, settings) => {
        if (!showNodes || data.hidden || (data as any).zIndex === 0) return;
        const nodeId = (data as any).key;
        const originalData = (data as any).originalData || (nodeId && graphRef.current ? graphRef.current.getNodeAttribute(nodeId, "originalData") : null);
        
        const isBridge = (originalData && (originalData.isBridgeNode || originalData.isBridge)) || (data as any).isBridgeNode;
        if (isBridge) {
          context.save();
          context.beginPath();
          context.setLineDash([4, 4]);
          context.strokeStyle = "#64748b";
          context.lineWidth = 1.8;
          context.arc(data.x!, data.y!, data.size! + 6, 0, Math.PI * 2);
          context.stroke();
          context.restore();
        }

        if (originalData && originalData.type === "value") {
          const maxLength =
            labelMaxLength || (originalData.type === "center" ? 6 : originalData.type === "entity" ? 5 : 4);
          const capsuleText = String(data.label || resolveNodeLabel(originalData, maxLength) || "");
          if (!capsuleText) return;
          const accentColor = (data as any).customColor || getBranchColor(originalData).fill;
          drawValueNodeTag(context, data.x!, data.y!, capsuleText, accentColor, (data as any).customLabelSize || 14);
        } else {
          // Fallback label drawer for entities
          const label = data.label;
          if (!label) return;
          const size = settings.labelSize || 12;
          context.font = `${settings.labelWeight || "normal"} ${size}px ${settings.labelFont || "sans-serif"}`;
          context.fillStyle = (settings.labelColor && settings.labelColor.color) ? settings.labelColor.color : "#334155";
          context.fillText(label, data.x! + data.size! + 6, data.y! + size / 3);
        }
      },
      defaultDrawEdgeLabel: (context, edgeData, sourceData, targetData, settings) => {
        drawStableEdgeLabel(context, edgeData as Record<string, any>, sourceData as Record<string, any>, targetData as Record<string, any>, settings as Record<string, any>);
      },
      edgeLabelColor: { color: "#475569" }, // 加深连线文字颜色
      edgeLabelSize: 11,
      edgeLabelWeight: "600",
      nodeProgramClasses: {
        border: NodeBorderProgram,
      },
      edgeProgramClasses: {
        arrow: createEdgeArrowProgram({
          lengthToThicknessRatio: 6.5,
          widenessToThicknessRatio: 5.0,
        }),
        curvedArrow: createEdgeCurveProgram({
          ...DEFAULT_EDGE_CURVE_PROGRAM_OPTIONS,
          arrowHead: {
            extremity: "target",
            lengthToThicknessRatio: 6.5,
            widenessToThicknessRatio: 5.0,
          },
        }),
      },
      defaultNodeType: "border",
      defaultEdgeType: "arrow",
      allowInvalidContainer: true,
      nodeReducer: (node, data) => {
        const res: Record<string, any> = { ...data };
        const hovered = hoveredNodeRef.current;
        const sel = selectedNodeIdRef.current;
        const isSelectedCommunityNode = Boolean(isCommunityGraphData && sel && node === sel && sel.startsWith("comm_"));

        const isNodeHoverHighlighted = (n: string, h: string): boolean =>
          n === h || graph.areNeighbors(n, h);

        if (hovered && isCommunityGraphData) {
          if (!isNodeHoverHighlighted(node, hovered)) {
            res.color = "rgba(148, 163, 184, 0.16)";
            res.label = "";
            res.zIndex = 0;
          } else {
            res.zIndex = 2;
          }
        } else if (isCommunityGraphData && sel && sel.startsWith("comm_")) {
          let targetCommId = sel;
          const commNum = targetCommId.replace("comm_", "");
          const originalData = data.originalData;
          const isBelong =
            originalData &&
            (originalData.branchId === targetCommId ||
              originalData.branchId === `comm_${commNum}` ||
              originalData.branchId === commNum);

          if (isSelectedCommunityNode) {
            res.color = data.customColor || data.color;
            res.borderColor = "#d8b15d";
            res.borderSize = Math.max(Number(data.borderSize || 0), 4);
            res.zIndex = 3;
          } else if (!isBelong) {
            res.color = "rgba(148, 163, 184, 0.16)";
            res.label = "";
            res.zIndex = 0;
          } else {
            res.zIndex = 2;
          }
        }
        return res;
      },
      edgeReducer: (edge, data) => {
        const res: Record<string, any> = { ...data };
        const hovered = hoveredNodeRef.current;
        const sel = selectedNodeIdRef.current;

        const isNodeHoverHighlighted = (n: string, h: string): boolean =>
          n === h || graph.areNeighbors(n, h);

        if (hovered && isCommunityGraphData) {
          const extremities = graph.extremities(edge);
          const u = extremities[0];
          const v = extremities[1];
          const isHighlighted = isNodeHoverHighlighted(u, hovered) && isNodeHoverHighlighted(v, hovered);
          const isBridgeEdge = Boolean((data as any).isBridgeLink);

          if (isHighlighted) {
            res.color = isBridgeEdge ? "#94a3b8" : "#64748b";
            res.size = (res.size || 1.8) * 1.5;
            res.zIndex = 2;
          } else {
            res.color = "rgba(148, 163, 184, 0.08)";
            res.label = "";
            res.zIndex = 0;
          }
        } else if (isCommunityGraphData && sel && sel.startsWith("comm_")) {
          let targetCommId = sel;
          const commNum = targetCommId.replace("comm_", "");
          const extremities = graph.extremities(edge);
          let bothInComm = true;
          for (const u of extremities) {
            const uData = graph.getNodeAttribute(u, "originalData");
            if (
              !uData ||
              (uData.branchId !== targetCommId &&
                uData.branchId !== `comm_${commNum}` &&
                uData.branchId !== commNum)
            ) {
              bothInComm = false;
              break;
            }
          }
          if (!bothInComm) {
            res.color = "rgba(148, 163, 184, 0.08)";
            res.label = "";
            res.zIndex = 0;
          } else {
            res.zIndex = 2;
            res.size = (res.size || 1.8) * 1.3;
          }
        }
        return res;
      },
    });
    sigmaRef.current = sigma;

    let draggedNode: string | null = null;
    let movedDuringDrag = false;

    sigma.on("enterNode", (e) => {
      if (movedDuringDrag) return;
      hoveredNodeRef.current = e.node;
      sigma.refresh();
    });

    sigma.on("leaveNode", () => {
      if (movedDuringDrag) return;
      hoveredNodeRef.current = null;
      sigma.refresh();
    });

    sigma.on("clickNode", (e) => {
      if (movedDuringDrag) return;
      const originalData = graph.getNodeAttribute(e.node, "originalData");
      if (originalData && onNodeClickRef.current) {
        onNodeClickRef.current(originalData);
      }
    });

    sigma.on("doubleClickNode", (e) => {
      if (movedDuringDrag) return;
      const originalData = graph.getNodeAttribute(e.node, "originalData");
      if (originalData && onNodeDoubleClickRef.current) {
        onNodeDoubleClickRef.current(originalData);
      }
    });

    // 节点拖拽逻辑
    sigma.on("downNode", (e) => {
      draggedNode = e.node;
      movedDuringDrag = false;
      sigma.getCamera().disable();
    });
    
    sigma.getMouseCaptor().on("mousemovebody", (e) => {
      if (!draggedNode) return;
      movedDuringDrag = true;
      const pos = sigma.viewportToGraph(e);
      graph.setNodeAttribute(draggedNode, "x", pos.x);
      graph.setNodeAttribute(draggedNode, "y", pos.y);
      e.preventSigmaDefault();
      if (e.original) {
        e.original.preventDefault();
        e.original.stopPropagation();
      }
      sigma.refresh();
    });
    
    const handleUp = () => {
      if (draggedNode) {
        draggedNode = null;
        sigma.getCamera().enable();
        window.setTimeout(() => {
          movedDuringDrag = false;
        }, 0);
      }
    };
    
    sigma.getMouseCaptor().on("mouseup", handleUp);
    
    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [size.height, size.width]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        minHeight: typeof height === "number" ? height : 640,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        .sigma-container,
        .sigma-container canvas,
        .sigma-container .sigma-mouse {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

    </div>
  );
});

export default EntityRelationGraph;
