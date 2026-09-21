import { CreateContractType } from "@/types/contracts.types";
import api from "./client";

export class ContractsRoutes {
  async createContract(contract: CreateContractType) {
    return api.post("/membership/contratos", { json: contract }).json<string>();
  }
}
