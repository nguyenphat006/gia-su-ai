"use client";

import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { customerService } from "../services/customer.service";

export const CUSTOMERS_QUERY_KEY = ["customers"] as const;

const hooks = createCrudHooks(CUSTOMERS_QUERY_KEY, customerService);

export const customerQueryKeys = hooks.keys;
export const useCustomersList = hooks.useList;
export const useCustomerDetail = hooks.useDetail;
export const useCreateCustomerMutation = hooks.useCreate;
export const useUpdateCustomerMutation = hooks.useUpdate;
export const useDeleteCustomerMutation = hooks.useDelete;
export const useBatchDeleteCustomersMutation = hooks.useBatchDelete;
export const useBatchStatusCustomersMutation = hooks.useBatchStatus;
