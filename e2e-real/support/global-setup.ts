import { API_URL } from "./env";

/** Falha cedo, com instrução, se a stack local não estiver de pé. */
export default async function globalSetup() {
  const health = API_URL.replace(/\/api$/, "/health/ready");
  const response = await fetch(health).catch(() => null);
  const body = response ? await response.text() : "";
  if (body !== "Healthy") {
    throw new Error(`A API local não está pronta em ${health} (${body || "sem resposta"}). Rode \`npm run e2e:real\`.`);
  }
}
