/** Parceiro pelo qual a aula foi reservada; null para reservas do plano, avulsas e experimentais. */
export const partnerBookingLabel = (source?: string | null) => {
  switch (source?.toLowerCase()) {
    case "gympass":
      return "Gympass";
    case "totalpass":
      return "TotalPass";
    case "partner":
      return "Convênio";
    default:
      return null;
  }
};
