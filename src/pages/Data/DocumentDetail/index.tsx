"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { history, useLocation, useParams } from "@umijs/max";
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudDownloadOutlined,
  ClusterOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  KeyOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  TagOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  message,
  Modal,
  Spin,
  Progress,
  Row,
  Slider,
  Space,
  Tag,
  Tooltip,
} from "antd";
import { statusConfig } from "@/config/status";
import {
  entityTypeMeta,
  getDocumentParseDetail,
  type DocumentParseDetail,
  type EntityType,
  type KnowledgeGraphData,
  type ParseStep,
} from "@/data/documentGraph";
import type { EntityGraphData } from "@/data/entityGraphMock";
import EntityRelationGraph from "@/components/Graph/EntityRelationGraph";
import { getDocumentHtmlChunkPage, viewDocument } from "@/services/biz/document-query";
import {
  getDocumentKnowledgeGraph,
  type DocumentKnowledgeGraphResult,
} from "@/services/biz/graph";

type PreviewBlockType = "meta" | "heading" | "paragraph" | "bullet";

const CARD_STACK_GAP = 12;
const META_CARD_HEIGHT = 340;
const KEYWORD_CARD_HEIGHT = 220;
const ENTITY_CARD_HEIGHT = 280;
const TAG_CARD_HEIGHT = 220;
const PREVIEW_PAGE_SIZE = 10;
const PREVIEW_CARD_HEIGHT =
  META_CARD_HEIGHT +
  KEYWORD_CARD_HEIGHT +
  ENTITY_CARD_HEIGHT +
  TAG_CARD_HEIGHT +
  CARD_STACK_GAP * 3;

const formatFileSize = (bytes: any) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) {
    return "-";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const formatDateTime = (value: any) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const date = new Date(Number(value));
    if (!Number.isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, "0");
      const day = `${date.getDate()}`.padStart(2, "0");
      const hours = `${date.getHours()}`.padStart(2, "0");
      const minutes = `${date.getMinutes()}`.padStart(2, "0");
      const seconds = `${date.getSeconds()}`.padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }
  return String(value);
};

const ensureArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined || value === "") {
    return [];
  }
  return [value];
};

const extractDetailData = (response: any) => response?.data?.data ?? response?.data ?? response ?? {};

const extractPageList = <T,>(response: any): T[] => {
  if (Array.isArray(response?.data?.list)) {
    return response.data.list;
  }
  if (Array.isArray(response?.data?.rows)) {
    return response.data.rows;
  }
  if (Array.isArray(response?.rows)) {
    return response.rows;
  }
  if (Array.isArray(response?.list)) {
    return response.list;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
};

const extractPageTotal = (response: any) => {
  const total =
    response?.data?.total ??
    response?.total ??
    response?.data?.data?.total ??
    response?.data?.page?.total;
  const resolvedTotal = Number(total);
  return Number.isFinite(resolvedTotal) && resolvedTotal >= 0 ? resolvedTotal : 0;
};

const toTextList = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        if (typeof item?.name === "string") {
          return item.name.trim();
        }
        if (typeof item?.label === "string") {
          return item.label.trim();
        }
        if (typeof item?.value === "string") {
          return item.value.trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,，;；]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const sanitizePreviewHtml = (value: string) =>
  String(value ?? "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+=(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "");

const normalizePreviewHtml = (value: string) => {
  const sanitizedHtml = sanitizePreviewHtml(value);
  const styleBlocks = sanitizedHtml.match(/<style[\s\S]*?>[\s\S]*?<\/style>/gi)?.join("") ?? "";
  const bodyContent = sanitizedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];

  if (bodyContent) {
    return `${styleBlocks}${bodyContent}`.trim();
  }

  return sanitizedHtml
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?(html|head|body|meta|title)[^>]*>/gi, "")
    .trim();
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderHighlightedText = (text: string, keyword: string) => {
  const plainText = stripHtml(String(text ?? ""));
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    return plainText;
  }

  const matcher = new RegExp(`(${escapeRegExp(normalizedKeyword)})`, "gi");
  const parts = plainText.split(matcher);

  return parts.map((part, index) =>
    part.toLowerCase() === normalizedKeyword.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        style={{
          background: "linear-gradient(180deg, #fff1b8 0%, #ffe58f 100%)",
          color: "#7c2d12",
          padding: "0 2px",
          borderRadius: 4,
        }}
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
};

const mapEntityType = (value: any): EntityType => {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("person") || text.includes("人物") || text.includes("人名")) {
    return "person";
  }
  if (
    text.includes("organization") ||
    text.includes("company") ||
    text.includes("组织") ||
    text.includes("公司")
  ) {
    return "organization";
  }
  if (text.includes("time") || text.includes("date") || text.includes("时间")) {
    return "time";
  }
  if (text.includes("product") || text.includes("产品")) {
    return "product";
  }
  if (text.includes("project") || text.includes("项目")) {
    return "project";
  }
  return "term";
};

const mapIntelligentStatus = (value: any): DocumentParseDetail["status"] => {
  switch (Number(value)) {
    case 2:
      return "completed";
    case 1:
      return "running";
    case 3:
      return "failed";
    default:
      return "pending";
  }
};

const formatKnowledgeBase = (detail: any, fallback: string) => {
  const names = toTextList(
    detail?.knowledgeBaseNames ?? detail?.knowledgeBaseName ?? detail?.kbName ?? detail?.knowledgeName,
  );
  if (names.length > 0) {
    return names.join("、");
  }
  if (Array.isArray(detail?.knowledgeBaseId) && detail.knowledgeBaseId.length > 0) {
    return `已关联 ${detail.knowledgeBaseId.length} 个知识库`;
  }
  return fallback;
};

const hasProcessedValue = (value: any) => {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (typeof value === "string") {
    return true;
  }
  return true;
};

const buildParseSteps = (detail: any): ParseStep[] => {
  const baseSteps = [
    { name: "文件上传", status: "completed" as const },
    { name: "文本提取", status: "completed" as const },
    { name: "关键词提取", status: "pending" as const },
    { name: "标签提取", status: "pending" as const },
    { name: "实体抽取", status: "pending" as const },
  ];

  const intelligentStatus = Number(detail?.intelligentStatus);

  if (intelligentStatus === 0) {
    return baseSteps.map((step, index) => ({
      ...step,
      status: index < 2 ? "completed" : "pending",
      completed: index < 2,
      duration: "--",
    }));
  }

  if (intelligentStatus === 2) {
    return baseSteps.map((step) => ({
      ...step,
      status: "completed",
      completed: true,
      duration: "--",
    }));
  }

  if (intelligentStatus === 3) {
    return baseSteps.map((step, index) => ({
      ...step,
      status: index < 2 ? "completed" : "failed",
      completed: index < 2,
      duration: "--",
    }));
  }

  const keywordDone = hasProcessedValue(detail?.keywordsList);
  const tagDone = hasProcessedValue(detail?.fileTagIdList);
  const entityDone = hasProcessedValue(detail?.entities);

  return [
    { name: "文件上传", status: "completed", completed: true, duration: "--" },
    { name: "文本提取", status: "completed", completed: true, duration: "--" },
    { name: "关键词提取", status: keywordDone ? "completed" : "pending", completed: keywordDone, duration: "--" },
    { name: "标签提取", status: tagDone ? "completed" : "pending", completed: tagDone, duration: "--" },
    { name: "实体抽取", status: entityDone ? "completed" : "pending", completed: entityDone, duration: "--" },
  ];
};

const normalizeEntities = (
  detail: any,
): DocumentParseDetail["entities"] => {
  const initial: DocumentParseDetail["entities"] = {
    person: [],
    organization: [],
    time: [],
    term: [],
    product: [],
    project: [],
  };

  const entitySource =
    detail?.entities ??
    detail?.entityMap ??
    detail?.entityResult ??
    detail?.entityResults ??
    detail?.entityList ??
    detail?.extractEntities;

  if (!entitySource) {
    return initial;
  }

  if (Array.isArray(entitySource)) {
    entitySource.forEach((item: any, index: number) => {
      const type = mapEntityType(item?.type ?? item?.entityType ?? item?.category);
      const names = Array.isArray(item?.entityName)
        ? item.entityName
        : [item?.name ?? item?.entityName ?? item?.value ?? ""];
      names
        .map((name: any) => String(name ?? "").trim())
        .filter(Boolean)
        .forEach((name: string, nameIndex: number) => {
          initial[type].push({
            id: String(item?.id ?? item?.entityId ?? `${type}-${index}-${nameIndex}`),
            name,
            type,
          });
        });
    });
  } else if (typeof entitySource === "object") {
    Object.entries(entitySource).forEach(([rawType, rawEntities]) => {
      const type = mapEntityType(rawType);
      ensureArray<any>(rawEntities).forEach((item: any, index: number) => {
        const names = Array.isArray(item?.entityName)
          ? item.entityName
          : [typeof item === "string" ? item : item?.name ?? item?.entityName ?? item?.value ?? ""];
        names
          .map((name: any) => String(name ?? "").trim())
          .filter(Boolean)
          .forEach((name: string, nameIndex: number) => {
            initial[type].push({
              id: String(item?.id ?? item?.entityId ?? `${type}-${index}-${nameIndex}`),
              name,
              type,
            });
          });
      });
    });
  }

  const totalCount = Object.values(initial).reduce((sum, items) => sum + items.length, 0);
  return totalCount > 0 ? initial : initial;
};

const normalizeContent = (detail: any, fallback: string[]) => {
  const contentCandidates = [
    detail?.content,
    detail?.contentList,
    detail?.contentPreview,
    detail?.oriContent,
    detail?.transContent,
    detail?.summary,
    detail?.snippet,
  ];

  for (const candidate of contentCandidates) {
    const list = toTextList(candidate);
    if (list.length > 0) {
      return list;
    }
  }

  return fallback;
};

const normalizeGraph = (detail: any, fallback: KnowledgeGraphData) => {
  const graph = detail?.graph ?? detail?.graphData ?? detail?.knowledgeGraph;
  if (graph?.nodes && graph?.links) {
    return graph as KnowledgeGraphData;
  }
  return fallback;
};

const extractResultData = <T,>(response: any): T =>
  (response?.data?.data ?? response?.data ?? response ?? {}) as T;

const buildEntityGraphData = (graphData: DocumentKnowledgeGraphResult | null | undefined): EntityGraphData => {
  const rawNodes = Array.isArray(graphData?.nodes) ? graphData?.nodes : [];
  const rawLinks = Array.isArray(graphData?.links) ? graphData?.links : [];
  const degreeMap = new Map<string, number>();

  rawLinks.forEach((link) => {
    const sourceId = String(link?.sourceId ?? "");
    const targetId = String(link?.targetId ?? "");
    if (sourceId) {
      degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
    }
    if (targetId) {
      degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
    }
  });

  const centerNodeId =
    rawNodes
      .map((node) => ({
        id: String(node?.id ?? ""),
        degree: degreeMap.get(String(node?.id ?? "")) || 0,
      }))
      .sort((left, right) => right.degree - left.degree)[0]?.id ||
    String(rawNodes[0]?.id ?? "center");

  return {
    centerId: centerNodeId,
    nodes: rawNodes
      .map((node) => {
        const nodeId = String(node?.id ?? "");
        const nodeName = String(node?.name ?? "").trim();
        if (!nodeId || !nodeName) {
          return null;
        }
        return {
          id: nodeId,
          name: nodeName,
          type: nodeId === centerNodeId ? ("center" as const) : ("entity" as const),
          desc: node?.description,
          depth: nodeId === centerNodeId ? 0 : 1,
        };
      })
      .filter(Boolean) as EntityGraphData["nodes"],
    links: rawLinks
      .map((link) => {
        const source = String(link?.sourceId ?? "");
        const target = String(link?.targetId ?? "");
        const relation = String(link?.relation ?? "").trim();
        if (!source || !target || !relation) {
          return null;
        }
        return {
          source,
          target,
          relation,
        };
      })
      .filter(Boolean) as EntityGraphData["links"],
  };
};

const buildDocumentDetail = (
  baseDocument: DocumentParseDetail,
  detail: any,
  sourceTitle: string | null,
  sourceType: string | null,
): DocumentParseDetail => {
  const normalizedKeywords = toTextList(
    detail?.keywordsList ?? detail?.keywords ?? detail?.keywordList ?? detail?.keywordNames,
  );
  const normalizedTags = toTextList(
    detail?.fileTagNames ?? detail?.tags ?? detail?.tagList ?? detail?.fileTags ?? detail?.tagNames,
  );
  const normalizedSize = formatFileSize(detail?.fileSizeBytes ?? detail?.fileSize);

  return {
    ...baseDocument,
    id: String(detail?.id ?? detail?.documentId ?? baseDocument.id),
    title:
      sourceTitle ??
      detail?.name ??
      detail?.fileName ??
      detail?.documentName ??
      detail?.title ??
      baseDocument.title,
    type: String(sourceType ?? detail?.fileType ?? detail?.type ?? baseDocument.type).toUpperCase(),
    size: normalizedSize !== "-" ? normalizedSize : baseDocument.size,
    uploader:
      detail?.creatorName ??
      detail?.creator ??
      detail?.uploader ??
      detail?.createBy ??
      baseDocument.uploader,
    uploadedAt: formatDateTime(detail?.createTime ?? detail?.uploadTime ?? baseDocument.uploadedAt),
    knowledgeBase: formatKnowledgeBase(detail, baseDocument.knowledgeBase),
    keywords: normalizedKeywords.length > 0 ? normalizedKeywords : baseDocument.keywords,
    tags: normalizedTags.length > 0 ? normalizedTags : baseDocument.tags,
    entities: normalizeEntities(detail),
    content: [],
    graph: normalizeGraph(detail, baseDocument.graph),
    parseSteps: buildParseSteps(detail),
    status:
      detail?.intelligentStatus !== undefined
        ? mapIntelligentStatus(detail.intelligentStatus)
        : baseDocument.status,
  };
};

export default function DataDetailPage() {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphData, setGraphData] = useState<DocumentKnowledgeGraphResult | null>(null);
  const [previewKeyword, setPreviewKeyword] = useState(searchParams.get("keyword") || "");
  const [labelMaxLength, setLabelMaxLength] = useState(6);
  const [detailData, setDetailData] = useState<any>(null);
  const [previewPageNo, setPreviewPageNo] = useState(1);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewInitialized, setPreviewInitialized] = useState(false);
  const [previewReachedEnd, setPreviewReachedEnd] = useState(false);
  const [previewChunks, setPreviewChunks] = useState<Array<{ seq: string; value: string; hit?: boolean }>>([]);
  const previewLoadingRef = useRef(false);
  const previewScrollLockRef = useRef(false);

  const baseDocument = getDocumentParseDetail(params.id || "");
  const sourceTitle = searchParams.get("title");
  const sourceType = searchParams.get("type");
  const fromEntity = searchParams.get("fromEntity");
  const sourceEsId = searchParams.get("esId");
  const sourceKeyword = searchParams.get("keyword");

  useEffect(() => {
    let active = true;

    const fetchDetail = async () => {
      try {
        const response = await viewDocument({
          id: params.id || 0,
          esId: sourceEsId || "",
          keyword: sourceKeyword || "",
        });

        if (!active) {
          return;
        }

        setDetailData(extractDetailData(response));
      } catch (error) {
        console.error(error);
        if (active) {
          message.error("获取文档详情失败");
        }
      }
    };

    fetchDetail();

    return () => {
      active = false;
    };
  }, [params.id, sourceEsId, sourceKeyword]);

  useEffect(() => {
    setPreviewPageNo(1);
    setPreviewTotal(0);
    setPreviewInitialized(false);
    setPreviewReachedEnd(false);
    setPreviewChunks([]);
    previewLoadingRef.current = false;
    previewScrollLockRef.current = false;
  }, [params.id, detailData?.id, previewKeyword]);

  useEffect(() => {
    setGraphOpen(false);
    setGraphLoading(false);
    setGraphData(null);
  }, [params.id, detailData?.id]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        previewLoadingRef.current = true;
        const response = await getDocumentHtmlChunkPage({
          pageNo: previewPageNo,
          pageSize: PREVIEW_PAGE_SIZE,
          docId: params.id || detailData?.id || 0,
          keyword: previewKeyword.trim(),
          contextSize: 1,
        });

        if (!active) {
          return;
        }

        const chunks = extractPageList<any>(response)
          .map((item, index) => ({
            seq: String(item?.seq ?? `${previewPageNo}-${index}`),
            hit: Boolean(item?.hit),
            value: String(
              item?.oriHtml ??
                item?.transHtml ??
                item?.transContent ??
                item?.oriContent ??
                item?.content ??
                item?.text ??
                item?.html ??
                "",
            ),
          }))
          .filter((item) => item.value);

        const pageTotal = extractPageTotal(response);
        let mergedChunkCount = chunks.length;
        setPreviewChunks((previousChunks) => {
          if (previewPageNo === 1) {
            mergedChunkCount = chunks.length;
            return chunks;
          }

          const existingSeqSet = new Set(previousChunks.map((item) => item.seq));
          const mergedChunks = [...previousChunks];
          chunks.forEach((item) => {
            if (!existingSeqSet.has(item.seq)) {
              mergedChunks.push(item);
            }
          });
          mergedChunkCount = mergedChunks.length;
          return mergedChunks;
        });
        setPreviewTotal(pageTotal);
        setPreviewReachedEnd(chunks.length < PREVIEW_PAGE_SIZE || mergedChunkCount >= pageTotal);
        setPreviewInitialized(true);
        previewScrollLockRef.current = false;
      } catch (error) {
        console.error(error);
        if (active) {
          if (previewPageNo === 1) {
            setPreviewChunks([]);
            setPreviewTotal(0);
          }
          setPreviewReachedEnd(true);
          setPreviewInitialized(true);
          previewScrollLockRef.current = false;
        }
      } finally {
        if (active) {
          setPreviewLoading(false);
          previewLoadingRef.current = false;
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [params.id, detailData?.id, previewKeyword, previewPageNo]);

  const document = useMemo(
    () => buildDocumentDetail(baseDocument, detailData, sourceTitle, sourceType),
    [baseDocument, detailData, sourceTitle, sourceType],
  );

  const detailSummary = useMemo(
    () => ({
      source: detailData?.channelName || "-",
      catalog: detailData?.catalogName || "-",
      directory: detailData?.directoryName || "-",
      knowledgeBase: document.knowledgeBase || "-",
      createdAt: formatDateTime(detailData?.createTime ?? detailData?.fileCreateTime),
      updatedAt: formatDateTime(detailData?.updateTime),
      relationCount: Number(detailData?.relationCount ?? 0),
      viewCount: Number(detailData?.viewCount ?? 0),
    }),
    [detailData, document.knowledgeBase],
  );

  const currentStatus = statusConfig[document.status];
  const entityCount = Object.values(document.entities).flat().length;
  const completedStepCount = document.parseSteps.filter((step) => step.status === "completed").length;
  const parseProgress = Math.round((completedStepCount / Math.max(document.parseSteps.length, 1)) * 100);
  const entityEntries = useMemo(
    () => Object.entries(document.entities).filter(([, entities]) => entities.length > 0),
    [document.entities],
  );

  const previewBlocks = useMemo(
    () =>
      (previewChunks.length > 0
        ? previewChunks
        : [{ seq: "empty", value: "暂无正文内容", hit: false }]).map((item) => ({
        type: "paragraph",
        value: item.value,
        seq: item.seq,
        hit: item.hit,
      })) as Array<{
        type: PreviewBlockType;
        value: string;
        seq: string;
        hit?: boolean;
      }>,
    [previewChunks],
  );

  const filteredPreviewBlocks = useMemo(() => {
    if (previewChunks.length > 0) {
      return previewBlocks;
    }
    const keyword = previewKeyword.trim().toLowerCase();
    if (!keyword) return previewBlocks;
    return previewBlocks.filter((block) => stripHtml(block.value).toLowerCase().includes(keyword));
  }, [previewBlocks, previewChunks.length, previewKeyword]);

  const previewHasMore = !previewReachedEnd && previewTotal > 0 && previewChunks.length < previewTotal;

  const handlePreviewScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (previewLoadingRef.current || previewScrollLockRef.current || !previewHasMore) {
      return;
    }

    const remainingDistance = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remainingDistance <= 120) {
      previewScrollLockRef.current = true;
      previewLoadingRef.current = true;
      setPreviewPageNo((currentPageNo) => currentPageNo + 1);
    }
  };

  const entityGraphData = useMemo<EntityGraphData>(() => buildEntityGraphData(graphData), [graphData]);

  const handleOpenDocumentGraph = async () => {
    if (!params.id && !document.id) {
      message.warning("未获取到文档ID");
      return;
    }

    setGraphOpen(true);
    setGraphLoading(true);
    try {
      const response = await getDocumentKnowledgeGraph(params.id || document.id);
      setGraphData(extractResultData<DocumentKnowledgeGraphResult>(response));
    } catch (error) {
      console.error(error);
      setGraphData({ nodes: [], links: [] });
      message.error("获取文档知识图谱失败");
    } finally {
      setGraphLoading(false);
    }
  };

  const handleGraphNodeClick = (nodeName: string) => {
    const query = new URLSearchParams({
      entity: nodeName,
      docId: document.id,
    });
    setGraphOpen(false);
    history.push(`/graph?${query.toString()}`);
  };

  return (
    <>
      <div style={{ minHeight: "100%", background: "#f5f7fb", paddingBottom: 12 }}>
        <div style={{ marginBottom: 10, color: "#8a94a6", fontSize: 13 }}>
          <Breadcrumb
            items={[
              { title: "首页" },
              { title: "知识库" },
              { title: <span style={{ color: "#1f2937", fontWeight: 600 }}>文件解析详情</span> },
            ]}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 12, minWidth: 0, flex: 1 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => history.go(-1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderColor: "#dbe3ef",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Space align="center" size={10} wrap>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1f2a44", wordBreak: "break-word" }}>
                  {renderHighlightedText(document.title, previewKeyword)}
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#16a34a",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#22c55e",
                    }}
                  />
                  {currentStatus.text}
                </span>
              </Space>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                  marginTop: 8,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                <InlineMeta icon={<FilePdfOutlined style={{ color: "#ef4444" }} />} text={`${document.type} 文件`} />
                <InlineMeta icon={<AppstoreOutlined />} text={document.size} />
                <InlineMeta icon={<ClockCircleOutlined />} text={`上传时间：${document.uploadedAt}`} />
                <InlineMeta icon={<UserOutlined />} text={`上传人：${document.uploader}`} />
                <InlineMeta icon={<TagOutlined />} text={`来源：${detailSummary.source}`} />
              </div>
              {fromEntity && (
                <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
                  {fromEntity ? `来源实体：${fromEntity}` : ""}
                </div>
              )}
            </div>
          </div>

          <Space wrap size={[8, 8]}>
            <Button icon={<CloudDownloadOutlined />} style={actionButtonStyle}>
              下载解析结果
            </Button>
            <Button icon={<ReloadOutlined />} style={actionButtonStyle}>
              重新解析
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              style={{
                ...actionButtonStyle,
                color: "#fff",
                borderColor: "#2563eb",
                background: "#2563eb",
                boxShadow: "0 10px 18px rgba(37, 99, 235, 0.16)",
              }}
            >
              保存到知识库
            </Button>
          </Space>
        </div>

        <Row gutter={[12, 12]} align="stretch" style={{ marginBottom: 12 }}>
          <Col xs={24} xl={10} style={{ display: "flex" }}>
            <Card
              bordered={false}
              title="解析进度"
              style={{ ...surfaceCardStyle, width: "100%", height: "100%" }}
              styles={{ header: { minHeight: 44, padding: "0 14px" }, body: { padding: 12 } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#334155", fontWeight: 600 }}>整体进度</span>
                <span
                  style={{
                    color: document.status === "failed" ? "#ef4444" : "#16a34a",
                    fontWeight: 700,
                  }}
                >
                  {parseProgress}%
                </span>
              </div>
              <Progress
                percent={parseProgress}
                showInfo={false}
                strokeColor={document.status === "failed" ? "#ef4444" : "#16a34a"}
                trailColor={document.status === "failed" ? "#fee2e2" : "#ebf7ef"}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 10,
                  overflowX: "auto",
                  flexWrap: "nowrap",
                  paddingBottom: 2,
                }}
              >
                {document.parseSteps.map((step) => (
                  <div
                    key={step.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background:
                        step.status === "completed"
                          ? "#f0fdf4"
                          : step.status === "failed"
                            ? "#fff1f2"
                            : "#f8fafc",
                      border: `1px solid ${
                        step.status === "completed"
                          ? "#bbf7d0"
                          : step.status === "failed"
                            ? "#fecdd3"
                            : "#e2e8f0"
                      }`,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircleFilled
                      style={{
                        color:
                          step.status === "completed"
                            ? "#22c55e"
                            : step.status === "failed"
                              ? "#ef4444"
                              : "#cbd5e1",
                        fontSize: 13,
                      }}
                    />
                    <span
                      style={{
                        color: step.status === "failed" ? "#b91c1c" : "#64748b",
                        fontSize: 12,
                      }}
                    >
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={14} style={{ display: "flex" }}>
            <Card
              bordered={false}
              title="文档统计"
              style={{ ...surfaceCardStyle, width: "100%", height: "100%" }}
              styles={{ header: { minHeight: 44, padding: "0 14px" }, body: { padding: 14, height: "100%" } }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                <StatPanel icon={<KeyOutlined />} color="#ef4444" label="关键词" value={document.keywords.length} />
                <StatPanel icon={<ClusterOutlined />} color="#0891b2" label="实体数量" value={entityCount} />
                <StatPanel icon={<TagOutlined />} color="#0ea5e9" label="标签数量" value={document.tags.length} />
                <StatPanel icon={<SearchOutlined />} color="#6366f1" label="查看次数" value={detailSummary.viewCount} />
                <StatPanel icon={<AppstoreOutlined />} color="#0f766e" label="关系数量" value={detailSummary.relationCount} />
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]} align="stretch">
          <Col xs={24} xl={16} style={{ display: "flex" }}>
            <Card
              bordered={false}
              title="内容预览"
              extra={
                <Space size={8}>
                  <Button icon={<FileTextOutlined />} style={toolbarIconButtonStyle} />
                  <Button icon={<AppstoreOutlined />} style={toolbarIconButtonStyle} />
                  <Input
                    allowClear
                    value={previewKeyword}
                    onChange={(event) => setPreviewKeyword(event.target.value)}
                    placeholder="搜索内容"
                    prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                    style={{ width: 220 }}
                  />
                </Space>
              }
              style={{ ...surfaceCardStyle, width: "100%", height: PREVIEW_CARD_HEIGHT }}
              styles={{ body: { padding: 14, height: PREVIEW_CARD_HEIGHT - 57 } }}
            >
              <div
                onScroll={handlePreviewScroll}
                style={{
                  border: "1px solid #dfe7f2",
                  borderRadius: 12,
                  background: "#fbfcff",
                  padding: "16px 20px",
                  height: "100%",
                  overflowY: "auto",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1f2a44", marginBottom: 12 }}>
                  {renderHighlightedText(document.title.replace(/\.(pdf|docx|txt)$/i, ""), previewKeyword)}
                </div>
                <div style={{ display: "grid", gap: 4, color: "#64748b", marginBottom: 18, fontSize: 13 }}>
                  <div>来源：{detailSummary.source}</div>
                  <div>更新时间：{detailSummary.updatedAt}</div>
                  <div>上传人：{document.uploader}</div>
                </div>

                <style>{`
                  .document-preview-html {
                    color: #334155;
                    font-size: 15px;
                    line-height: 1.9;
                    overflow-x: auto;
                  }

                  .document-preview-html table {
                    width: 100%;
                    max-width: 100%;
                    border-collapse: collapse;
                    border-spacing: 0;
                    table-layout: auto;
                    border: 1px solid #e2e8f0;
                  }

                  .document-preview-html colgroup,
                  .document-preview-html col,
                  .document-preview-html thead,
                  .document-preview-html tbody,
                  .document-preview-html tfoot,
                  .document-preview-html tr {
                    display: revert;
                  }

                  .document-preview-html tr {
                    border: 1px solid #e2e8f0;
                  }

                  .document-preview-html td,
                  .document-preview-html th {
                    padding: 6px 8px;
                    vertical-align: top;
                    white-space: pre-wrap;
                    word-break: break-word;
                    border: 1px solid #e2e8f0;
                    box-sizing: border-box;
                  }

                  .document-preview-html img {
                    max-width: 100%;
                    height: auto;
                  }

                  .document-preview-html br {
                    display: block;
                    content: "";
                    margin-top: 0.35em;
                  }
                `}</style>

                {filteredPreviewBlocks.length > 0 ? (
                  <>
                    {filteredPreviewBlocks.map((block, index) => (
                      <div key={`${block.seq}-${index}`} style={{ marginBottom: index === filteredPreviewBlocks.length - 1 ? 0 : 18 }}>
                        {block.hit && (
                          <div style={{ marginBottom: 8 }}>
                            <Tag color="processing" style={{ margin: 0 }}>
                              命中片段
                            </Tag>
                          </div>
                        )}
                        <PreviewBlock type={block.type} keyword={previewKeyword}>
                          {block.value}
                        </PreviewBlock>
                      </div>
                    ))}
                    <div style={{ display: "grid", gap: 8, marginTop: 20, paddingBottom: 4 }}>
                      {previewLoading && (
                        <div style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>
                          正在加载更多内容...
                        </div>
                      )}
                      {!previewHasMore && previewInitialized && previewChunks.length > 0 && (
                        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                          已加载全部内容
                        </div>
                      )}
                      {!previewLoading && previewHasMore && (
                        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                          下滑继续加载更多内容
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  !previewLoading && previewInitialized ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配内容" style={{ marginTop: 48 }} />
                  ) : (
                    <div style={{ textAlign: "center", color: "#64748b", paddingTop: 48 }}>内容加载中...</div>
                  )
                )}
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={8} style={{ display: "flex" }}>
            <div style={{ display: "grid", gap: 12, width: "100%" }}>
              <Card
                bordered={false}
                title="元数据信息"
                style={{ ...surfaceCardStyle, height: META_CARD_HEIGHT }}
                styles={{ body: { padding: 14, height: META_CARD_HEIGHT - 57, overflowY: "auto" } }}
              >
                <InfoList
                  items={[
                    ["文档标题", document.title.replace(/\.(pdf|docx|txt)$/i, "")],
                    ["来源", detailSummary.source],
                    ["上传人", document.uploader],
                    ["创建时间", detailSummary.createdAt],
                    ["更新时间", detailSummary.updatedAt],
                    ["文件格式", document.type],
                    ["文件大小", document.size],
                    ["知识库", detailSummary.knowledgeBase],
                    ["编目", detailSummary.catalog],
                    ["目录", detailSummary.directory],
                  ]}
                />
              </Card>

              <Card
                bordered={false}
                title="提取关键词"
                extra={<span style={{ color: "#94a3b8" }}>共 {document.keywords.length} 个</span>}
                style={{ ...surfaceCardStyle, height: KEYWORD_CARD_HEIGHT }}
                styles={{ body: { padding: 14, height: KEYWORD_CARD_HEIGHT - 57, overflowY: "auto" } }}
              >
                {document.keywords.length > 0 ? (
                  <Space wrap size={[8, 10]}>
                    {document.keywords.map((item, index) => (
                      <ColorTag key={item} palette={keywordPalettes[index % keywordPalettes.length]}>
                        {item}
                      </ColorTag>
                    ))}
                  </Space>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关键词" />
                )}
              </Card>

              <Card
                bordered={false}
                title="实体抽取"
                extra={
                  <Space size={8}>
                    <span style={{ color: "#94a3b8" }}>共 {entityCount} 个</span>
                    <Tooltip title={entityCount > 0 ? "查看本文档知识图谱" : "暂无实体可查看"}>
                      <Button
                        type="text"
                        shape="circle"
                        icon={<ClusterOutlined />}
                        disabled={entityCount === 0}
                        onClick={handleOpenDocumentGraph}
                      />
                    </Tooltip>
                  </Space>
                }
                style={{ ...surfaceCardStyle, height: ENTITY_CARD_HEIGHT }}
                styles={{ body: { padding: 14, height: ENTITY_CARD_HEIGHT - 57, overflowY: "auto" } }}
              >
                {entityEntries.length > 0 ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {entityEntries.map(([type, entities], index) => {
                      const meta = entityTypeMeta[type as keyof typeof entityTypeMeta];
                      return (
                        <div
                          key={type}
                          style={{
                            paddingBottom: 12,
                            borderBottom: index === entityEntries.length - 1 ? "none" : "1px dashed #edf2f7",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 8,
                              color: "#334155",
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: meta.color,
                                flexShrink: 0,
                              }}
                            />
                            <span>{meta.label}</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {entities.map((entity) => (
                              <ColorTag
                                key={entity.id}
                                palette={{ bg: meta.bg, border: `${meta.color}22`, text: meta.color }}
                              >
                                {entity.name}
                              </ColorTag>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无实体" />
                )}
              </Card>

              <Card
                bordered={false}
                title="标签分类结果"
                extra={<span style={{ color: "#94a3b8" }}>共 {document.tags.length} 个</span>}
                style={{ ...surfaceCardStyle, height: TAG_CARD_HEIGHT }}
                styles={{ body: { padding: 14, height: TAG_CARD_HEIGHT - 57, overflowY: "auto" } }}
              >
                {document.tags.length > 0 ? (
                  <Space wrap size={[8, 10]}>
                    {document.tags.map((item, index) => (
                      <ColorTag key={item} palette={tagPalettes[index % tagPalettes.length]}>
                        {item}
                      </ColorTag>
                    ))}
                  </Space>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无标签分类结果" />
                )}
              </Card>
            </div>
          </Col>
        </Row>

        <Modal
          title="文档知识图谱"
          open={graphOpen}
          width={1400}
          style={{ top: 40 }}
          footer={null}
          destroyOnClose
          onCancel={() => setGraphOpen(false)}
        >
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#64748b" }}>
              点击任意节点会跳转到“图谱检索”，并自动带入节点名称发起查询。
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, width: 250 }}>
              <span style={{ color: "#334155", fontSize: 14 }}>节点字数</span>
              <Slider
                style={{ flex: 1, margin: 0 }}
                min={2}
                max={20}
                step={1}
                value={labelMaxLength}
                onChange={setLabelMaxLength}
              />
            </div>
          </div>
          {graphLoading ? (
            <div
              style={{
                height: 750,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8fafc",
                borderRadius: 16,
              }}
            >
              <Spin tip="知识图谱加载中..." size="large" />
            </div>
          ) : entityGraphData.nodes.length > 0 ? (
            <EntityRelationGraph
              data={entityGraphData}
              height={750}
              labelMaxLength={labelMaxLength}
              onNodeClick={(node) => handleGraphNodeClick(node.name)}
            />
          ) : (
            <div
              style={{
                height: 750,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8fafc",
                borderRadius: 16,
              }}
            >
              <Empty description="当前文档暂无实体关系图谱" />
            </div>
          )}
          <Divider style={{ margin: "16px 0 0" }} />
        </Modal>
      </div>
    </>
  );
}

const surfaceCardStyle = {
  borderRadius: 18,
  boxShadow: "0 8px 28px rgba(15, 23, 42, 0.05)",
};

const actionButtonStyle = {
  height: 34,
  borderRadius: 10,
  borderColor: "#d9e3ef",
  paddingInline: 12,
};

const toolbarIconButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  borderColor: "#dbe3ef",
  color: "#64748b",
};

const keywordPalettes = [
  { bg: "#eef4ff", border: "#dbe7ff", text: "#2563eb" },
  { bg: "#f3ecff", border: "#eadcff", text: "#7c3aed" },
  { bg: "#ecfdf5", border: "#d1fae5", text: "#059669" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" },
  { bg: "#fff1f2", border: "#fecdd3", text: "#ef4444" },
  { bg: "#f8fafc", border: "#e2e8f0", text: "#475569" },
];

const tagPalettes = [
  { bg: "#eef4ff", border: "#dbe7ff", text: "#2563eb" },
  { bg: "#f5f3ff", border: "#e9d5ff", text: "#7c3aed" },
  { bg: "#ecfdf5", border: "#d1fae5", text: "#059669" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" },
  { bg: "#fff1f2", border: "#fecdd3", text: "#ef4444" },
  { bg: "#ecfeff", border: "#bae6fd", text: "#0284c7" },
];

function InlineMeta({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {icon}
      <span>{text}</span>
    </span>
  );
}

function StatPanel({
  icon,
  color,
  label,
  value,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #edf2f7",
        borderRadius: 12,
        padding: 10,
        minHeight: 68,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color, fontWeight: 600 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 13 }}>{label}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: "#1f2937", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function InfoList({ items }: { items: Array<[string, string]> }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "flex-start",
          }}
        >
          <span style={{ color: "#64748b", flexShrink: 0 }}>{label}</span>
          <span style={{ color: "#1f2937", fontWeight: 600, textAlign: "right", whiteSpace: "normal", wordBreak: "break-word" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function ColorTag({
  children,
  palette,
}: {
  children: ReactNode;
  palette: { bg: string; border: string; text: string };
}) {
  return (
    <Tag
      style={{
        margin: 0,
        borderRadius: 999,
        padding: "4px 10px",
        background: palette.bg,
        borderColor: palette.border,
        color: palette.text,
      }}
    >
      {children}
    </Tag>
  );
}

function PreviewBlock({
  type,
  children,
  keyword,
}: {
  type: PreviewBlockType;
  children: ReactNode;
  keyword?: string;
}) {
  const isHtmlContent = typeof children === "string" && /<\/?[a-z][\s\S]*>/i.test(children);
  const htmlChildren =
    typeof children === "string" && isHtmlContent ? normalizePreviewHtml(children) : "";
  const resolvedChildren =
    typeof children === "string"
      ? isHtmlContent
        ? (
          <div
            className="document-preview-html"
            dangerouslySetInnerHTML={{ __html: htmlChildren }}
          />
        )
        : renderHighlightedText(children, keyword || "")
      : children;

  if (type === "heading") {
    return (
      <h3 style={{ margin: "20px 0 12px", fontSize: 18, color: "#1f2937", fontWeight: 700 }}>
        {resolvedChildren}
      </h3>
    );
  }

  if (type === "meta") {
    return <div style={{ color: "#64748b", marginBottom: 4, fontSize: 13 }}>{resolvedChildren}</div>;
  }

  if (type === "bullet") {
    return (
      <div style={{ color: "#334155", lineHeight: 1.9, marginBottom: 8 }}>
        - {resolvedChildren}
      </div>
    );
  }

  return (
    <div style={{ color: "#334155", lineHeight: 1.9, margin: 0, fontSize: 15 }}>
      {resolvedChildren}
    </div>
  );
}

