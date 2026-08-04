"use client";

export interface CommunityNetworkCommunity {
  community_id?: string | number;
  nodes?: string[];
  node_ids?: Array<string | number>;
  node_count?: number;
  edge_count?: number;
  internal_density?: number;
  closure?: number;
  topic?: string;
}

export interface CommunityNetworkNode {
  id?: string | number;
  name?: string;
  community_id?: string | number;
  x?: number;
  y?: number;
  is_bridge?: boolean;
}

export interface CommunityNetworkEdge {
  source?: string;
  target?: string;
  source_id?: string | number;
  target_id?: string | number;
  relation?: string;
  weight?: number;
  source_community_id?: string | number;
  target_community_id?: string | number;
  is_cross_community?: boolean;
}

export interface CommunityNetworkData {
  communities?: CommunityNetworkCommunity[];
  nodes?: CommunityNetworkNode[];
  edges?: CommunityNetworkEdge[];
  entity_count?: number;
  relation_count?: number;
}

export interface CommunityNetworkResult {
  success?: boolean;
  data?: CommunityNetworkData;
  error?: unknown;
}
