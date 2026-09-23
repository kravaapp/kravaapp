import { PendingJoinRequestType } from "@/types/tenant.types";
import {
  ImageUploadCategoryType,
  PickedImageType,
  UploadImageResponseType,
} from "@/types/upload.types";
import api from "./client";

export class TenantRoutes {
  async getPendingJoinRequests() {
    return api.get("/tenant/join-requests").json<PendingJoinRequestType[]>();
  }

  async uploadImage(file: PickedImageType, category: ImageUploadCategoryType) {
    const body = new FormData();

    if (file.file) {
      // Web: o próprio File do input, com o nome que o usuário escolheu.
      body.append("file", file.file, file.name);
    } else {
      // Nativo: o fetch do React Native aceita este descritor no lugar do Blob.
      body.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);
    }

    // Sem Content-Type explícito: quem define o boundary é o runtime.
    return api
      .post("/tenant/upload-image", { body, searchParams: { category } })
      .json<UploadImageResponseType>();
  }

  async approveJoinRequest(id: string) {
    await api.post(`/tenant/join-requests/${id}/approve`);
  }

  async rejectJoinRequest(id: string) {
    await api.post(`/tenant/join-requests/${id}/reject`);
  }
}
