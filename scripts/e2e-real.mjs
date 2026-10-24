// E2E de ponta a ponta contra a stack local: sobe Postgres/Redis/RabbitMQ, aplica as migrations do Krava,
// reconstrói a API com o código atual e roda as specs de e2e-real/. Argumentos extras vão para o Playwright.
//   npm run e2e:real                     → todos os cenários
//   npm run e2e:real -- jornada          → só um cenário
//   npm run e2e:real:down                → derruba a stack (o banco é descartado)
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compose = join(frontend, "e2e-real", "docker-compose.yml");
const kravaSql = resolve(process.env.KRAVA_DIR ?? join(frontend, "..", "Krava"), "sql");
const health = "http://localhost:8090/health/ready";

const run = (cmd, args, options = {}) => execFileSync(cmd, args, { stdio: "inherit", ...options });
const dockerCompose = (...args) => run("docker", ["compose", "-f", compose, ...args]);
const psql = (input) => execFileSync(
  "docker", ["exec", "-i", "krava-e2e-postgres", "psql", "-q", "-v", "ON_ERROR_STOP=1", "-U", "krava", "-d", "krava", "-tA"],
  { input, encoding: "utf8" },
).trim();

if (process.argv[2] === "down") {
  dockerCompose("down", "--remove-orphans");
  process.exit(0);
}

if (!existsSync(kravaSql)) {
  console.error(`Migrations do Krava não encontradas em ${kravaSql}. Defina KRAVA_DIR com o caminho do repositório Krava.`);
  process.exit(1);
}

console.log("\n▶ Subindo Postgres, Redis e RabbitMQ...");
dockerCompose("up", "-d", "--wait", "postgres", "redis", "rabbitmq");

// O banco vive em memória: só aplica as migrations quando ele acabou de nascer.
if (psql("SELECT to_regclass('identity.users') IS NULL") === "t") {
  const files = readdirSync(kravaSql).filter((f) => /^0.*\.sql$/.test(f)).sort();
  console.log(`▶ Aplicando ${files.length} migrations...`);
  for (const file of files) {
    try {
      psql(readFileSync(join(kravaSql, file), "utf8"));
    } catch (error) {
      console.error(`Migration ${file} falhou:\n${error.stderr ?? error.message}`);
      process.exit(1);
    }
  }
}

console.log("▶ Construindo e subindo a API com o código atual do Krava...");
dockerCompose("up", "-d", "--build", "api");

const deadline = Date.now() + 120_000;
let ready = false;
while (Date.now() < deadline) {
  const body = await fetch(health).then((r) => r.text()).catch(() => "");
  if (body === "Healthy") { ready = true; break; }
  await new Promise((r) => setTimeout(r, 2_000));
}
if (!ready) {
  console.error(`A API não ficou pronta em ${health}. Veja: docker logs krava-e2e-api`);
  process.exit(1);
}

console.log("▶ Rodando os cenários...\n");
const result = spawnSync(
  "npx", ["playwright", "test", "-c", "e2e-real/playwright.config.ts", ...process.argv.slice(2)],
  { cwd: frontend, stdio: "inherit", shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);
