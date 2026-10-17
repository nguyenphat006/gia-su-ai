"use client";

import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { knowledgeChunkService } from "../services/knowledgeChunk.service";

export const KNOWLEDGE_CHUNKS_QUERY_KEY = ["knowledge-chunks"] as const;

const hooks = createCrudHooks(KNOWLEDGE_CHUNKS_QUERY_KEY, knowledgeChunkService);

export const knowledgeChunkQueryKeys = hooks.keys;
export const useKnowledgeChunksList = hooks.useList;
export const useKnowledgeChunkDetail = hooks.useDetail;
export const useCreateKnowledgeChunkMutation = hooks.useCreate;
export const useUpdateKnowledgeChunkMutation = hooks.useUpdate;
export const useDeleteKnowledgeChunkMutation = hooks.useDelete;
export const useBatchDeleteKnowledgeChunksMutation = hooks.useBatchDelete;
export const useBatchStatusKnowledgeChunksMutation = hooks.useBatchStatus;
