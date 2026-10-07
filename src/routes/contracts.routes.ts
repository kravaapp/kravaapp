import { CreateContractType, SubscribeContractType, SubscriptionInvoice } from "@/types/contracts.types";
import api from "./client";

export class ContractsRoutes {
  async subscribe(contract: SubscribeContractType): Promise<SubscriptionInvoice> {
    return api.post("/membership/contratos/subscribe", {
      json: { cancelExistingActive: true, ...contract, immediate: true },
      retry: 0,
    }).json<SubscriptionInvoice>();
  }

  async createContract(contract: CreateContractType) {
    return api.post("/membership/contratos", { json: contract }).json<string>();
  }
}
