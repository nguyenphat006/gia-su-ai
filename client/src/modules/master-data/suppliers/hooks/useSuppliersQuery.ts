"use client";

import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { supplierService } from "../services/supplier.service";

export const SUPPLIERS_QUERY_KEY = ["suppliers"] as const;

const hooks = createCrudHooks(SUPPLIERS_QUERY_KEY, supplierService);

export const supplierQueryKeys = hooks.keys;
export const useSuppliersList = hooks.useList;
export const useSupplierDetail = hooks.useDetail;
export const useCreateSupplierMutation = hooks.useCreate;
export const useUpdateSupplierMutation = hooks.useUpdate;
export const useDeleteSupplierMutation = hooks.useDelete;
export const useBatchDeleteSuppliersMutation = hooks.useBatchDelete;
export const useBatchStatusSuppliersMutation = hooks.useBatchStatus;
