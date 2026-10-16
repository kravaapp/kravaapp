import { TRANSPARENCY_HTML } from "./transparencyHtml";

export const COMPANY_INFO = {
  razaoSocial: "LUCAS FERNANDES DOS SANTOS COELHO CONSULTORIA EM TECNOLOGIA DA INFORMACAO - ME",
  nomeFantasia: "FCOELHO SOLUTIONS",
  cnpj: "41.043.564/0001-99",
  sede: "Rio de Janeiro, RJ",
  emailSuporte: "suporte@kravaapp.com.br",
  emailPrivacidade: "suporte@kravaapp.com.br",
};

export const TRANSPARENCY_URL = "/transparencia.html";

export function getTransparencyHtml(initialSection: string = "inicio"): string {
  const safeSection = initialSection.replace(/[^a-zA-Z0-9_-]/g, "") || "inicio";
  const injection = `<script>try { window.location.hash = "${safeSection}"; if (typeof openSection === "function") { openSection(); } } catch (e) {}</script>`;
  return TRANSPARENCY_HTML.replace("</body>", `${injection}</body>`);
}
