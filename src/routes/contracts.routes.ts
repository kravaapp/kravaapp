import { CreateContractType, SubscribeContractType } from "@/types/contracts.types";
import api from "./client";

export class ContractsRoutes {
  async subscribe(contract: SubscribeContractType) {
    await api.post("/membership/contratos/subscribe", { json: contract });
  }

  async createContract(contract: CreateContractType) {
    return api.post("/membership/contratos", { json: contract }).json<string>();
  }
}
