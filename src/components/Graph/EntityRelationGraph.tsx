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
import { createEdgeArrowProgram, drawStraightEdgeLabel } from "sigma/rendering";
import { createEdgeCurveProgram, createDrawCurvedEdgeLabel, DEFAULT_EDGE_CURVE_PROGRAM_OPTIONS } from "@sigma/edge-curve";

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

function getBranchColor(node: EntityGraphNode) {
  if (node.type === "center") {
    return {
      fill: "#3b82f6",
      medium: "#60a5fa",
      stroke: "#1d4ed8",
      text: "#ffffff",
    };
  }

  const seed = stableHash(node.branchId || node.id);
  const palette = branchPalette[seed % branchPalette.length];
  return {
    fill: node.type === "entity" ? palette.strong : palette.medium,
    stroke: palette.stroke,
    text: "#ffffff",
  };
}

function truncateLabel(name: string, maxLength: number) {
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
}

function buildGroupedLayout(nodes: EntityGraphNode[], centerId: string) {
  const positionMap = new Map<
    string,
    { x: number; y: number; angle: number; sectorStart: number; sectorEnd: number; radius: number }
  >();
  positionMap.set(centerId, {
    x: 0,
    y: 0,
    angle: -Math.PI / 2,
    sectorStart: -Math.PI,
    sectorEnd: Math.PI,
    radius: 0,
  });

  const childrenByParent = new Map<string, EntityGraphNode[]>();
  nodes.forEach((node) => {
    if (!node.parentId || node.id === centerId) return;
    const current = childrenByParent.get(node.parentId) || [];
    current.push(node);
    childrenByParent.set(node.parentId, current);
  });

  childrenByParent.forEach((children) => {
    children.sort((a, b) => {
      const relationCompare = (a.relationFromParent || "").localeCompare(
        b.relationFromParent || "",
        "zh-CN",
      );
      if (relationCompare !== 0) return relationCompare;
      return a.name.localeCompare(b.name, "zh-CN");
    });
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
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

  const rootChildren = childrenByParent.get(centerId) || [];
  const rootGap = Math.PI / 32;
  const rootPadding = Math.PI / 36;
  const totalRootWeight = rootChildren.reduce(
    (sum, child) => sum + getSubtreeWeight(child.id),
    0,
  );
  const fullAngle = Math.PI * 2 - Math.max(0, rootChildren.length - 1) * rootGap;
  let cursor = -Math.PI / 2;

  function resolveRadius(depth: number) {
    if (depth <= 1) return 220;
    return 220 + (depth - 1) * 138;
  }

  function placeChildren(
    parentId: string,
    sectorStart: number,
    sectorEnd: number,
    parentAngle: number,
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
      const childAngle =
        depth === 1 ? (childStart + childEnd) / 2 : Math.max(childStart, Math.min((childStart + childEnd) / 2, childEnd));
      const radius = resolveRadius(depth);
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

      placeChildren(child.id, childStart, childEnd, childAngle, depth + 1);
      localCursor = childEnd + gap;
    });
  }

  rootChildren.forEach((child) => {
    const weight = getSubtreeWeight(child.id);
    const span = fullAngle * (weight / Math.max(totalRootWeight, 1));
    const childStart = cursor;
    const childEnd = childStart + span;
    const childAngle = (childStart + childEnd) / 2;
    const radius = resolveRadius(1);

    positionMap.set(child.id, {
      x: Math.cos(childAngle) * radius,
      y: Math.sin(childAngle) * radius,
      angle: childAngle,
      sectorStart: childStart,
      sectorEnd: childEnd,
      radius,
    });

    placeChildren(child.id, childStart, childEnd, childAngle, 2);
    cursor = childEnd + rootGap;
  });

  nodes.forEach((node) => {
    if (!positionMap.has(node.id)) {
      const fallbackDepth = node.depth ?? 1;
      const fallbackAngle = stableHash(node.id) % 360;
      const radius = resolveRadius(fallbackDepth);
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

    const targetPositions = buildGroupedLayout(data.nodes, data.centerId);

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
      const colors = getBranchColor(node);
      const isSelected = node.id === selectedNodeId;
      const maxLength = labelMaxLength || (node.type === "center" ? 6 : node.type === "entity" ? 5 : 4);
      const label = visibleLabelNodeIds.has(node.id)
        ? truncateLabel(node.name, maxLength)
        : "";

      const nodeData = {
        x: pos.x,
        y: pos.y,
        size: radius,
        label: (showNodes && showLabels !== false) ? label : "",
        color: showNodes ? colors.fill : "rgba(0, 0, 0, 0)",
        borderColor: showNodes ? (isSelected ? "#d8b15d" : colors.stroke) : "rgba(0, 0, 0, 0)",
        borderSize: isSelected ? 4 : (node.type === "center" ? 2 : 1.2),
        hidden: false,
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
      const color = targetNode ? getBranchColor(targetNode).medium : "#64748b";

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
        type: type,
        curvature: curvature,
      };

      if (!graph.hasEdge(edgeId)) {
        graph.addEdgeWithKey(edgeId, link.source, link.target, edgeData);
      } else {
        graph.mergeEdgeAttributes(edgeId, edgeData);
      }
    });
  }, [data, nodeScale, linkWidth, showNodes, showLinks, showLabels, selectedNodeId, labelMaxLength, maxVisibleLabels]);

  const onNodeClickRef = useRef(onNodeClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  useEffect(() => {
    const container = containerRef.current;
    const graph = graphRef.current;
    if (!container || !graph || size.width === 0 || size.height === 0) return;

    sigmaRef.current?.kill();
    sigmaRef.current = null;

    const drawCurved = createDrawCurvedEdgeLabel(DEFAULT_EDGE_CURVE_PROGRAM_OPTIONS);
    const sigma = new Sigma(graph, container, {
      renderEdgeLabels: true,
      defaultDrawEdgeLabel: (context, edgeData, sourceData, targetData, settings) => {
        if (edgeData.type === "curvedArrow") {
          drawCurved(context, edgeData, sourceData, targetData, settings);
        } else {
          drawStraightEdgeLabel(context, edgeData, sourceData, targetData, settings);
        }
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

    sigma.on("clickNode", (e) => {
      const originalData = graph.getNodeAttribute(e.node, "originalData");
      if (originalData && onNodeClickRef.current) {
        onNodeClickRef.current(originalData);
      }
    });

    // 节点拖拽逻辑
    let draggedNode: string | null = null;
    
    sigma.on("downNode", (e) => {
      draggedNode = e.node;
      sigma.getCamera().disable();
    });
    
    sigma.getMouseCaptor().on("mousemovebody", (e) => {
      if (!draggedNode) return;
      const pos = sigma.viewportToGraph(e);
      graph.setNodeAttribute(draggedNode, "x", pos.x);
      graph.setNodeAttribute(draggedNode, "y", pos.y);
    });
    
    const handleUp = () => {
      if (draggedNode) {
        draggedNode = null;
        sigma.getCamera().enable();
      }
    };
    
    sigma.getMouseCaptor().on("mouseup", handleUp);
    
    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
    sigma.resize();
    sigma.refresh();
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
