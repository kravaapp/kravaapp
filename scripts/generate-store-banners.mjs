import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCRIPT_DIR = path.resolve();
const RAW_DIR = path.join(SCRIPT_DIR, "e2e-screenshots", "raw-store");
const OUTPUT_APP_STORE = path.join(SCRIPT_DIR, "store-assets", "app-store");
const OUTPUT_GOOGLE_PLAY = path.join(SCRIPT_DIR, "store-assets", "google-play");

fs.mkdirSync(OUTPUT_APP_STORE, { recursive: true });
fs.mkdirSync(OUTPUT_GOOGLE_PLAY, { recursive: true });

const CARDS = [
  {
    id: "01_home",
    tag: "EXPERIÊNCIA DO ATLETA",
    title: "Seus treinos e evolução na <span class='accent'>palma da mão.</span>",
    subtitle: "Acompanhe sua próxima aula, assiduidade da semana e horários disponíveis em tempo real.",
    rawFile: "screen_home.png",
    pills: ["⚡ Próxima Aula em 1 Toque", "📅 Grade Semanal", "🔥 100% Personalizado"],
  },
  {
    id: "02_agendamento",
    tag: "AGENDAMENTO INSTANTÂNEO",
    title: "Reserve sua vaga em <span class='accent'>poucos toques.</span>",
    subtitle: "Consulte a grade completa por modalidade, vagas disponíveis e lista de espera inteligente.",
    rawFile: "screen_schedule.png",
    pills: ["🥋 Várias Modalidades", "⏱ Vagas em Tempo Real", "🔔 Fila de Espera Inteligente"],
  },
  {
    id: "03_carteira_planos",
    tag: "CARTEIRA & FINANCEIRO",
    title: "Gestão do seu plano <span class='accent'>sem complicações.</span>",
    subtitle: "Acesso total a faturas, renovações automáticas e pagamento imediato via Pix Copia e Cola.",
    rawFile: "screen_plans.png",
    pills: ["💳 Faturas Transparentes", "🟢 Pix Instantâneo", "🏆 Combat Ilimitado"],
  },
  {
    id: "04_historico",
    tag: "MÉTRICAS & EVOLUÇÃO",
    title: "Acompanhe cada presença e <span class='accent'>conquista.</span>",
    subtitle: "Monitore sua frequência mensal, faltas, saldo de check-ins e evolução física contínua.",
    rawFile: "screen_history.png",
    pills: ["📊 24 Presenças no Mês", "✓ Check-in Confirmado", "📈 Evolução Constante"],
  },
];

function generateHtml(card, screenshotBase64, width, height) {
  const isGooglePlay = width === 1080 && height === 1920;
  
  // Proporções otimizadas para cada loja
  const scale = isGooglePlay ? 1080 / 1290 : 1.0;
  
  const paddingTop = Math.round((isGooglePlay ? 55 : 85) * scale);
  const headlineSize = Math.round((isGooglePlay ? 64 : 78) * scale);
  const subtitleSize = Math.round((isGooglePlay ? 27 : 32) * scale);
  const tagSize = Math.round(18 * scale);
  const pillSize = Math.round((isGooglePlay ? 19 : 22) * scale);
  
  // Proporção física do aparelho: iPhone 16 Pro (393:852 ~= 1:2.168)
  const phoneWidth = Math.round((isGooglePlay ? 780 : 880) * scale);
  const phoneHeight = Math.round(phoneWidth * (852 / 393));
  const phoneBorderRadius = Math.round(62 * scale);
  const bezelThickness = Math.round(12 * scale);
  const islandWidth = Math.round(155 * scale);
  const islandHeight = Math.round(38 * scale);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }

  body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background-color: #06080E;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    position: relative;
    color: #FFFFFF;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Iluminação de Arena Esportiva Krava */
  .arena-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }

  /* Holofote superior laranja vibrante */
  .spotlight-top {
    position: absolute;
    top: -160px;
    left: 50%;
    transform: translateX(-50%);
    width: ${Math.round(1500 * scale)}px;
    height: ${Math.round(1100 * scale)}px;
    background: radial-gradient(ellipse at center, rgba(255, 107, 0, 0.40) 0%, rgba(232, 92, 7, 0.18) 40%, rgba(6, 8, 14, 0) 72%);
    filter: blur(${Math.round(40 * scale)}px);
  }

  /* Glow central sutil */
  .glow-center {
    position: absolute;
    top: 38%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: ${Math.round(1100 * scale)}px;
    height: ${Math.round(1100 * scale)}px;
    background: radial-gradient(circle, rgba(232, 92, 7, 0.16) 0%, rgba(255, 85, 0, 0.05) 50%, transparent 70%);
    filter: blur(${Math.round(50 * scale)}px);
  }

  /* Grid esportivo geométrico */
  .grid-pattern {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: ${Math.round(60 * scale)}px ${Math.round(60 * scale)}px;
    mask-image: radial-gradient(ellipse at 50% 30%, black 45%, transparent 85%);
  }

  /* Feixes de iluminação atlética */
  .beam-left {
    position: absolute;
    top: -150px;
    left: -120px;
    width: ${Math.round(600 * scale)}px;
    height: ${Math.round(1300 * scale)}px;
    background: linear-gradient(135deg, rgba(255, 107, 0, 0.22) 0%, rgba(232, 92, 7, 0.05) 45%, transparent 70%);
    transform: rotate(-18deg);
    filter: blur(${Math.round(45 * scale)}px);
  }

  .beam-right {
    position: absolute;
    top: -150px;
    right: -120px;
    width: ${Math.round(600 * scale)}px;
    height: ${Math.round(1300 * scale)}px;
    background: linear-gradient(-135deg, rgba(255, 107, 0, 0.22) 0%, rgba(232, 92, 7, 0.05) 45%, transparent 70%);
    transform: rotate(18deg);
    filter: blur(${Math.round(45 * scale)}px);
  }

  /* Conteúdo Principal */
  .content {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: ${paddingTop}px;
  }

  /* Badge de Categoria */
  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: ${Math.round(10 * scale)}px;
    padding: ${Math.round(8 * scale)}px ${Math.round(24 * scale)}px;
    border-radius: 9999px;
    background: rgba(232, 92, 7, 0.16);
    border: 1.5px solid rgba(255, 107, 0, 0.45);
    box-shadow: 0 4px 25px rgba(232, 92, 7, 0.28);
    margin-bottom: ${Math.round((isGooglePlay ? 14 : 20) * scale)}px;
  }

  .badge-dot {
    width: ${Math.round(9 * scale)}px;
    height: ${Math.round(9 * scale)}px;
    border-radius: 50%;
    background-color: #FF6B00;
    box-shadow: 0 0 10px #FF6B00;
  }

  .brand-tag {
    font-size: ${tagSize}px;
    font-weight: 800;
    letter-spacing: 2.5px;
    color: #FFA352;
    text-transform: uppercase;
  }

  /* Headline com Tipografia Robusta */
  .headline-container {
    width: 90%;
    text-align: center;
    margin-bottom: ${Math.round((isGooglePlay ? 12 : 16) * scale)}px;
  }

  .headline {
    font-size: ${headlineSize}px;
    font-weight: 900;
    letter-spacing: -2px;
    line-height: 1.12;
    color: #FFFFFF;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.85);
  }

  .headline .accent {
    color: #FF6B00;
    text-shadow: 0 0 45px rgba(255, 107, 0, 0.75), 0 0 18px rgba(232, 92, 7, 0.95);
    display: inline-block;
  }

  /* Subtítulo */
  .subtitle {
    width: 82%;
    text-align: center;
    font-size: ${subtitleSize}px;
    font-weight: 450;
    line-height: 1.35;
    color: #94A3B8;
    margin-bottom: ${Math.round((isGooglePlay ? 20 : 30) * scale)}px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85);
  }

  /* Linha de Pills com Destaques */
  .pills-row {
    display: flex;
    justify-content: center;
    gap: ${Math.round(12 * scale)}px;
    margin-bottom: ${Math.round((isGooglePlay ? 26 : 38) * scale)}px;
    flex-wrap: wrap;
    max-width: 90%;
  }

  .pill {
    background: rgba(18, 23, 34, 0.82);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1.5px solid rgba(255, 255, 255, 0.14);
    border-radius: 9999px;
    padding: ${Math.round(9 * scale)}px ${Math.round(22 * scale)}px;
    font-size: ${pillSize}px;
    font-weight: 650;
    color: #F1F5F9;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    gap: ${Math.round(8 * scale)}px;
    letter-spacing: -0.2px;
  }

  /* Mockup Container */
  .mockup-container {
    position: relative;
    width: ${phoneWidth}px;
    display: flex;
    justify-content: center;
  }

  /* Frame Realista do iPhone 16 Pro */
  .phone-frame {
    position: relative;
    width: ${phoneWidth}px;
    height: ${phoneHeight}px;
    border-radius: ${phoneBorderRadius}px;
    background: linear-gradient(145deg, #424954 0%, #171b23 45%, #2d343f 100%);
    padding: ${bezelThickness}px;
    box-shadow: 
      0 ${Math.round(50 * scale)}px ${Math.round(110 * scale)}px -${Math.round(15 * scale)}px rgba(0, 0, 0, 0.95),
      0 0 ${Math.round(90 * scale)}px rgba(232, 92, 7, 0.35),
      inset 0 0 2px 1.5px rgba(255, 255, 255, 0.4),
      inset 0 0 12px rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .inner-bezel {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: ${phoneBorderRadius - bezelThickness}px;
    background-color: #FFFFFF;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Dynamic Island */
  .dynamic-island {
    position: absolute;
    top: ${Math.round(12 * scale)}px;
    left: 50%;
    transform: translateX(-50%);
    width: ${islandWidth}px;
    height: ${islandHeight}px;
    background-color: #000000;
    border-radius: ${Math.round(20 * scale)}px;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: ${Math.round(14 * scale)}px;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.85);
  }

  .camera-lens {
    width: ${Math.round(11 * scale)}px;
    height: ${Math.round(11 * scale)}px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #1e2638 0%, #0d121c 60%, #05080e 100%);
    box-shadow: inset 0 0 2px #00ffff55;
  }

  /* Captura da Tela do App */
  .screen-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #FFFFFF;
  }

  .screen-img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
  }

  /* Reflexo de Vidro Físico */
  .glass-glare {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      128deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.02) 28%,
      rgba(255, 255, 255, 0) 50%
    );
    pointer-events: none;
    z-index: 70;
  }

  /* Reflexo no chão da arena */
  .phone-reflection {
    position: absolute;
    bottom: -130px;
    left: 50%;
    transform: translateX(-50%);
    width: ${Math.round(phoneWidth * 0.9)}px;
    height: ${Math.round(130 * scale)}px;
    background: radial-gradient(ellipse at center, rgba(232, 92, 7, 0.28) 0%, transparent 70%);
    filter: blur(${Math.round(35 * scale)}px);
    z-index: 5;
  }
</style>
</head>
<body>

<div class="arena-bg">
  <div class="spotlight-top"></div>
  <div class="glow-center"></div>
  <div class="grid-pattern"></div>
  <div class="beam-left"></div>
  <div class="beam-right"></div>
</div>

<div class="content">
  <div class="brand-badge">
    <div class="badge-dot"></div>
    <span class="brand-tag">${card.tag}</span>
  </div>

  <div class="headline-container">
    <h1 class="headline">${card.title}</h1>
  </div>

  <p class="subtitle">${card.subtitle}</p>

  <div class="pills-row">
    ${card.pills.map((p) => `<div class="pill">${p}</div>`).join("")}
  </div>

  <div class="mockup-container">
    <div class="phone-frame">
      <div class="inner-bezel">
        <div class="dynamic-island">
          <div class="camera-lens"></div>
        </div>
        <div class="screen-viewport">
          <img class="screen-img" src="${screenshotBase64}" alt="${card.id}" />
          <div class="glass-glare"></div>
        </div>
      </div>
    </div>
    <div class="phone-reflection"></div>
  </div>
</div>

</body>
</html>`;
}

async function renderBanners() {
  console.log("🚀 Iniciando renderização em alta resolução...");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const card of CARDS) {
    const rawPath = path.join(RAW_DIR, card.rawFile);
    if (!fs.existsSync(rawPath)) {
      console.warn(`⚠️ Arquivo bruto não encontrado: ${rawPath}. Pulando...`);
      continue;
    }

    const imgBuffer = fs.readFileSync(rawPath);
    const base64Data = `data:image/png;base64,${imgBuffer.toString("base64")}`;

    // 1. Apple App Store 6.7" (1290 x 2796)
    console.log(`📱 Renderizando [Apple App Store] ${card.id} (1290x2796)...`);
    await page.setViewportSize({ width: 1290, height: 2796 });
    const htmlAppStore = generateHtml(card, base64Data, 1290, 2796);
    await page.setContent(htmlAppStore, { waitUntil: "networkidle" });
    const outAppStore = path.join(OUTPUT_APP_STORE, `${card.id}.png`);
    await page.screenshot({ path: outAppStore, type: "png" });
    console.log(`   ✅ Salvo em: ${outAppStore}`);

    // 2. Google Play Store (1080 x 1920)
    console.log(`🤖 Renderizando [Google Play] ${card.id} (1080x1920)...`);
    await page.setViewportSize({ width: 1080, height: 1920 });
    const htmlGooglePlay = generateHtml(card, base64Data, 1080, 1920);
    await page.setContent(htmlGooglePlay, { waitUntil: "networkidle" });
    const outGooglePlay = path.join(OUTPUT_GOOGLE_PLAY, `${card.id}.png`);
    await page.screenshot({ path: outGooglePlay, type: "png" });
    console.log(`   ✅ Salvo em: ${outGooglePlay}`);
  }

  await browser.close();
  console.log("🎉 Todas as 8 imagens de vitrine para publicação foram geradas com sucesso!");
}

renderBanners().catch((err) => {
  console.error("❌ Erro ao gerar banners:", err);
  process.exit(1);
});
