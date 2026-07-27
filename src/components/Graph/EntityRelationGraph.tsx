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
    radius: 28,
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

function drawValueNodeTag(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accentColor: string,
) {
  const fontSize = 11;
  const paddingX = 10;
  const paddingY = 5;
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

function drawStableEdgeLabel(
  context: CanvasRenderingContext2D,
  edgeData: Record<string, any>,
  sourceData: Record<string, any>,
  targetData: Record<string, any>,
  settings: Record<string, any>,
) {
  const label = String(edgeData?.label || "").trim();
  if (!label) return;

  const fontSize = Number(settings.edgeLabelSize || 11);
  const fontWeight = settings.edgeLabelWeight || "600";
  const fontFamily = settings.labelFont || "sans-serif";
  const textColor =
    typeof settings.edgeLabelColor === "object" && settings.edgeLabelColor?.color
      ? settings.edgeLabelColor.color
      : "#475569";

  const sourceX = Number(sourceData?.x ?? 0);
  const sourceY = Number(sourceData?.y ?? 0);
  const targetX = Number(targetData?.x ?? 0);
  const targetY = Number(targetData?.y ?? 0);
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

function buildGroupedLayout(
  nodes: EntityGraphNode[],
  links: EntityGraphLink[],
  centerId: string,
  focusNodeId?: string | null,
) {
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

    const sortedNodes = [...data.nodes].sort((left, right) => {
      const leftWeight = left.type === "center" ? 0 : left.type === "entity" ? 1 : 2;
      const rightWeight = right.type === "center" ? 0 : right.type === "entity" ? 1 : 2;
      if (leftWeight !== rightWeight) return leftWeight - rightWeight;
      return (right.relationCount || 0) - (left.relationCount || 0);
    });
    const limit = maxVisibleLabels !== undefined ? maxVisibleLabels : data.nodes.length;
    const visibleLabelNodeIds = new Set(
      sortedNodes
        .slice(0, Math.max(limit, 0))
        .map((item) => item.id),
    );

    data.nodes.forEach(node => {
      const pos = targetPositions.get(node.id) || { x: 0, y: 0 };
      const radius = getRadius(node, nodeScale);
      const colors = getBranchColor(node, nodeMap);
      const isSelected = node.id === selectedNodeId;
      const isValueNode = node.type === "value";
      const maxLength = labelMaxLength || (node.type === "center" ? 6 : node.type === "entity" ? 5 : 4);
      const label = visibleLabelNodeIds.has(node.id) || isValueNode
        ? truncateLabel(node.name, maxLength)
        : "";
      const visibleNodeSize = isValueNode ? Math.max(12, radius * 0.9) : radius;

      const nodeData = {
        x: pos.x,
        y: pos.y,
        size: visibleNodeSize,
        label: (showNodes && showLabels !== false) ? label : "",
        color: showNodes ? (isValueNode ? "rgba(0, 0, 0, 0)" : colors.fill) : "rgba(0, 0, 0, 0)",
        borderColor: showNodes ? (isValueNode ? "rgba(0, 0, 0, 0)" : (isSelected ? "#d8b15d" : colors.stroke)) : "rgba(0, 0, 0, 0)",
        borderSize: isValueNode ? 0.01 : (isSelected ? 4 : (node.type === "center" ? 2 : 1.2)),
        hidden: false,
        customColor: colors.fill,
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
      // 加深连线颜色，由 stroke 改为 medium
      const color = "#98a2b3";

      // 判断是否存在反向关系，或者同方向存在多条关系
      const pairEdges = data.links.filter(l => 
        (l.source === link.source && l.target === link.target) || 
        (l.source === link.target && l.target === link.source)
      );
      
      let type = "arrow";
      let curvature: number | undefined = undefined;

      if (pairEdges.length > 1) {
        type = "curvedArrow";
        
        // 区分同向的连线，使同向多条线左右交替散开，双向线各自向右弯曲形成对称
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
        size: linkWidth,
        hidden: !showLinks,
        // Sigma only renders a subset of edge labels by default.
        // Force relation labels to stay visible without hover.
        forceLabel: showLinks,
        type: type,
        curvature: curvature,
      };

      if (!graph.hasEdge(edgeId)) {
        graph.addEdgeWithKey(edgeId, link.source, link.target, edgeData);
      } else {
        graph.mergeEdgeAttributes(edgeId, edgeData);
      }
    });

    sigmaRef.current?.refresh();
  }, [data, nodeScale, linkWidth, showNodes, showLinks, showLabels, selectedNodeId, labelMaxLength, maxVisibleLabels]);

  const onNodeClickRef = useRef(onNodeClick);
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);
  useEffect(() => {
    onNodeDoubleClickRef.current = onNodeDoubleClick;
  }, [onNodeDoubleClick]);

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
      labelRenderedSizeThreshold: 1,
      renderEdgeLabels: showLinks,
      zIndex: true,
      defaultDrawNodeHover: (context, data, settings) => {
        const nodeId = (data as any).key;
        const originalData = (data as any).originalData || (nodeId && graphRef.current ? graphRef.current.getNodeAttribute(nodeId, "originalData") : null);
        
        if (originalData && originalData.type === "value") {
          const text = `${originalData.relationFromParent || "属性"}: ${originalData.name}`;
          const accentColor = (data as any).customColor || getBranchColor(originalData).fill;
          drawValueNodeTag(context, data.x!, data.y!, String(originalData.name || ""), accentColor);
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
        const nodeId = (data as any).key;
        const originalData = (data as any).originalData || (nodeId && graphRef.current ? graphRef.current.getNodeAttribute(nodeId, "originalData") : null);
        
        if (originalData && originalData.type === "value") {
          const text = `${originalData.relationFromParent || "属性"}: ${originalData.name}`;
          const accentColor = (data as any).customColor || getBranchColor(originalData).fill;
          drawValueNodeTag(context, data.x!, data.y!, String(originalData.name || ""), accentColor);
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
      edgeLabelColor: { color: "#475569" }, // 加深连线上的文字颜色
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
    });
    sigmaRef.current = sigma;

    let draggedNode: string | null = null;
    let movedDuringDrag = false;

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
