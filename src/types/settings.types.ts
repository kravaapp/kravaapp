export type SchedulingRuleType = {
  id: string;
  releaseTime: string | null;
  daysOfWeek: number[] | null;
  targetHours: string[] | null;
  targetOffset: number;
};
export type CreateSchedulingRuleType = Omit<SchedulingRuleType, "id">;
export type AvulsoConfigType = {
  modalidadeId: string;
  modalidadeName: string | null;
  price: number;
  active: boolean;
};
export type UpdateAvulsoConfigType = { price: number; active: boolean };

export type CatalogProfileType = {
  showInCatalog: boolean;
  description: string | null;
  bannerUrl: string | null;
  modalities: string[] | null;
};

export type UpdateCatalogProfileType = {
  showInCatalog: boolean;
  description: string | null;
  bannerUrl: string | null;
  modalities: string[];
};
