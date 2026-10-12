# Guia Completo de Publicação: Apple App Store & Google Play Store

Este documento detalha o passo a passo completo, pré-requisitos, variáveis de ambiente, configurações de build e checklist para publicar o aplicativo mobile do **Krava** nas lojas **Google Play Store** (Android) e **Apple App Store** (iOS) utilizando o **Expo Application Services (EAS)**.

---

## 📋 Sumário
1. [Contas de Desenvolvedor e Pré-requisitos](#1-contas-de-desenvolvedor-e-pré-requisitos)
2. [Variáveis de Ambiente e Configurações](#2-variáveis-de-ambiente-e-configurações)
3. [Configuração do Projeto (`app.json` e `eas.json`)](#3-configuração-do-projeto-appjson-e-easjson)
4. [Publicação na Google Play Store (Android)](#4-publicação-na-google-play-store-android)
5. [Publicação na Apple App Store (iOS)](#5-publicação-na-apple-app-store-ios)
6. [Checklist Anti-Rejeição (Diretrizes das Lojas)](#6-checklist-anti-rejeição-diretrizes-das-lojas)
7. [Comandos de Referência Rápida](#7-comandos-de-referência-rápida)

---

## 1. Contas de Desenvolvedor e Pré-requisitos

### A. Google Play Console (Android)
- **Custo:** Taxa única de **$25 USD**.
- **Tipo de Conta:**
  - **Organização (Recomendado):** Exige CNPJ, D-U-N-S Number e comprovante de endereço. **Vantagem:** Não possui exigência de 14 dias de teste fechado com 20 testadores antes do lançamento em produção.
  - **Pessoa Física (Individual):** Contas criadas após novembro/2023 **são obrigadas** pelo Google a rodar um Teste Fechado (*Closed Testing*) com pelo menos **12 ou 20 testadores voluntários ativos por 14 dias contínuos** antes de poder solicitar acesso à faixa de Produção.
- **Link:** [play.google.com/console](https://play.google.com/console)

### B. Apple Developer Program (iOS)
- **Custo:** Anuidade de **$99 USD/ano**.
- **Tipo de Conta:**
  - **Organização:** Exige D-U-N-S Number (código D&B gratuito obtido junto à Dun & Bradstreet) associado ao CNPJ do Krava ou da empresa titular. Permite adicionar membros na equipe.
  - **Individual:** Cadastrada com o CPF/Apple ID do titular.
- **Link:** [developer.apple.com/programs](https://developer.apple.com/programs)

### C. EAS CLI (Expo Application Services)
- Instale a CLI globalmente:
  ```bash
  npm install -g eas-cli
  ```
- Autentique-se com a conta oficial do projeto:
  ```bash
  eas login
  ```
  *(Verifique a conta ativa a qualquer momento com `eas whoami`)*.

---

## 2. Variáveis de Ambiente e Configurações

O app consome a API do Krava via variável de ambiente. Em produção, **o app não pode usar localhost nem IP local**.

### A. Variáveis Utilizadas no Frontend

| Variável | Descrição | Valor de Produção |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | URL base da API do Krava | `https://api.kravaapp.com.br/api` |

### B. Como Configurar no EAS

Você pode configurar a variável diretamente no painel do Expo ou via CLI:

#### Opção 1: Pelo Painel Web do Expo (Recomendado)
1. Acesse: `https://expo.dev/accounts/[owner]/projects/krava/variables`
2. Clique em **Create variable**.
3. Nome: `EXPO_PUBLIC_API_URL`
4. Valor: `https://api.kravaapp.com.br/api`
5. Environment: Selecione **Production** (e opcionalmente Preview).
6. Type: **Plain text**.

#### Opção 2: Pelo Terminal via EAS CLI
```bash
npx eas-cli env:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.kravaapp.com.br/api" --environment production
```

---

## 3. Configuração do Projeto (`app.json` e `eas.json`)

### A. `app.json` (Validação de Produção)

Certifique-se de que os seguintes campos estão configurados:

```json
{
  "expo": {
    "name": "Krava",
    "slug": "krava",
    "version": "1.0.0",
    "scheme": "krava",
    "icon": "./assets/images/icon.png",
    
    // iOS
    "ios": {
      "bundleIdentifier": "br.com.krava.app",
      "supportsTablet": false,
      "associatedDomains": [
        "applinks:kravaapp.com.br"
      ],
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSCameraUsageDescription": "O Krava precisa acessar a câmera para você tirar foto de perfil ou do centro de treinamento.",
        "NSPhotoLibraryUsageDescription": "O Krava precisa acessar suas fotos para você escolher sua foto de perfil ou do centro de treinamento."
      }
    },

    // Android
    "android": {
      "package": "br.com.krava.app",
      "googleServicesFile": "./google-services.json",
      "adaptiveIcon": {
        "backgroundColor": "#E85C07",
        "foregroundImage": "./assets/images/android-icon-foreground.png"
      }
    },

    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#E85C07"
        }
      ]
    ],

    "extra": {
      "eas": {
        "projectId": "SEU_PROJECT_ID_OFICIAL"
      }
    },
    "owner": "SEU_OWNER_OFICIAL"
  }
}
```

> [!IMPORTANT]
> - `"ITSAppUsesNonExemptEncryption": false`: Isenta o app do questionário de conformidade com as leis de exportação de criptografia dos EUA na Apple.
> - Se o app não tiver suporte otimizado para tablets, deixe `"supportsTablet": false` no iOS para evitar exigências de screenshots de iPad.

### B. `eas.json` (Perfil de Produção)

O arquivo `eas.json` deve ter o perfil de produção com versionamento automático (`autoIncrement: true`):

```json
{
  "cli": {
    "version": ">= 18.4.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.kravaapp.com.br/api"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 4. Publicação na Google Play Store (Android)

### Passo 1: Credenciais do Firebase Cloud Messaging (FCM v1)
* O arquivo `frontend/google-services.json` já deve estar na raiz do frontend.
* A chave privada Service Account do Firebase (`.json`) já deve estar vinculada no painel do Expo:
  - Painel: `https://expo.dev/accounts/[owner]/projects/krava/credentials` ➔ Android ➔ **FCM V1 Service Account Key**.

### Passo 2: Gerar o Pacote de Produção (`.aab`)
A Google Play Store **não aceita `.apk`** para produção; ela exige o formato **Android App Bundle (`.aab`)**.

Execute o comando no terminal do frontend:
```bash
npx eas-cli build --platform android --profile production
```
- No primeiro build, o EAS perguntará: `Generate a new Android Keystore?` ➔ Responda **`yes`**.
- O EAS gerará e armazenará a chave de assinatura na nuvem de forma segura.
- Ao final, o EAS fornecerá o link para baixar o arquivo `.aab`.

### Passo 3: Configurar o App no Google Play Console
1. Acesse o **Google Play Console** e clique em **Criar app**.
   - Nome: `Krava`
   - Idioma padrão: `Português (Brasil)`
   - Tipo: `App` / `Gratuito`.
2. **Preencher a seção "Configurar o app" (Obrigatório):**
   - **Política de Privacidade:** URL pública obrigatória (ex: `https://kravaapp.com.br/privacidade`).
   - **Acesso ao app:** Forneça login e senha de uma conta de teste (ex: aluno de teste) para que os revisores do Google consigam entrar.
   - **Anúncios:** Declarar que o app *Não contém anúncios*.
   - **Classificação de Conteúdo:** Preencha o questionário IARC (classificação indicativa Livre / 10+).
   - **Público-alvo:** 18 anos ou mais (ou 13-17 se aplicável).
   - **Segurança dos Dados (Data Safety):**
     - Coleta de dados: Nome, e-mail, telefone (para autenticação).
     - Informações financeiras: Processadas por gateways terceiros (Mercado Pago / Asaas).
     - Notificações: Token de dispositivo coletado para envio de notificações.
3. **Ficha da Loja Principal:**
   - **Ícone:** Imagem PNG 512x512 px.
   - **Gráfico de Recursos:** Imagem PNG/JPEG 1024x500 px.
   - **Capturas de Tela:** Pelo menos 2 capturas de tela do app em execução no celular (mínimo 1080x1920 ou 1080x2400).
   - **Descrição Curta:** Até 80 caracteres (ex: *Gestão completa de treinos, check-in e pagamentos para o seu CT.*).
   - **Descrição Completa:** Apresentação das funcionalidades do Krava.

### Passo 4: Subir a Versão
- **Opção Manual:** Baixe o arquivo `.aab` gerado pelo EAS e suba na aba **Produção** (ou *Teste Fechado*) do Google Play Console.
- **Opção Automática (EAS Submit):**
  ```bash
  npx eas-cli submit --platform android --profile production
  ```
  *(Exige configurar a chave de API de serviço do Google Play Console na primeira vez)*.

---

## 5. Publicação na Apple App Store (iOS)

### Passo 1: Gerar o Build de Produção iOS
Execute no terminal do frontend:
```bash
npx eas-cli build --platform ios --profile production
```
- O EAS solicitará login com o seu Apple ID de desenvolvedor (ou chave de API do App Store Connect).
- O EAS criará automaticamente:
  - **Distribution Certificate**
  - **Provisioning Profile**
  - **Apple Push Notification Key (`.p8`)**
- O build será compilado na nuvem nos servidores macOS da Expo.

### Passo 2: Configurar o App no App Store Connect
1. Acesse o **[App Store Connect](https://appstoreconnect.apple.com/)** ➔ **Meus Apps** ➔ **+ Novo App**.
   - Plataforma: `iOS`
   - Nome: `Krava`
   - Idioma Principal: `Português (Brasil)`
   - ID do Pacote (Bundle ID): Selecione `br.com.krava.app`.
   - SKU: `krava-mobile-app`
   - Acesso do Usuário: Acesso Total.
2. **Informações do App:**
   - Categoria: `Saúde e fitness` ou `Esportes`.
   - URL de Política de Privacidade: (ex: `https://kravaapp.com.br/privacidade`).
   - URL de Suporte: (ex: `https://kravaapp.com.br/suporte`).
3. **Capturas de Tela Obrigatórias (Screenshots):**
   - iPhone tela de 6.9" / 6.7" (ex: 1290 x 2796 px ou 1320 x 2868 px).
   - iPhone tela de 6.5" / 5.5" (se requisitado).
4. **Informações para Revisão do App (Crucial):**
   - **Credenciais de Demonstração:** Usuário e senha válidos de um aluno/admin para os revisores da Apple poderem navegar no app.
   - **Notas para Revisão:** Explicar claramente:
     > *"Este aplicativo é destinado a alunos e administradores de Centros de Treinamento físicos credenciados. As cobranças e pagamentos de mensalidade referem-se a serviços presenciais do mundo real prestados nas instalações físicas do centro de treinamento, conforme a Diretriz 3.1.3(e) das Apple Review Guidelines (Bens e Serviços Fora do App)."*

### Passo 3: Enviar o Build para o App Store Connect (EAS Submit)
Assim que o build terminar, você pode enviá-lo diretamente com um único comando:
```bash
npx eas-cli submit --platform ios --profile production
```
- Em cerca de 10 a 15 minutos, a versão aparecerá na aba **TestFlight** no App Store Connect.
- Na aba **App Store** do App Store Connect, selecione o build importado do TestFlight e clique em **Enviar para Revisão** (*Submit for Review*).

---

## 6. Checklist Anti-Rejeição (Diretrizes das Lojas)

Antes de submeter a primeira versão para aprovação, certifique-se de cumprir estes itens frequentemente inspecionados pelos revisores da Apple e do Google:

- [ ] **Exclusão de Conta (Account Deletion):**
  - **Exigência Apple (Guideline 5.1.1(v)) e Google:** Se o app permite criar ou gerenciar contas de usuário, deve existir uma opção explícita no app (geralmente em *Perfil / Configurações*) para solicitar ou realizar a **exclusão da conta e dos dados pessoais**.
- [ ] **Usuário e Senha de Teste Funcionando:**
  - O usuário informado para revisão não pode cair em bloqueio de 2FA por SMS nem exigir confirmação de e-mail que o revisor não consiga abrir. Crie um usuário de testes pré-aprovado (`aluno.teste@kravaapp.com.br`).
- [ ] **Política de Privacidade Online:**
  - A URL da política de privacidade informada deve carregar um documento válido e público, mencionando explicitamente os direitos da LGPD e a finalidade da coleta de dados.
- [ ] **Sem Texto "Lorem Ipsum" ou Telas Quebradas:**
  - Todas as telas públicas devem estar com dados reais ou estados vazios bem formatados (*"Nenhum agendamento encontrado"*).
- [ ] **Mensagens de Permissão Claras:**
  - As mensagens de acesso à câmera e galeria em `app.json` devem justificar o motivo com clareza (*"O Krava precisa acessar suas fotos para você escolher a imagem do CT"*).

---

## 7. Comandos de Referência Rápida

```bash
# 1. Login no EAS
npx eas-cli login

# 2. Verificar quem está logado
npx eas-cli whoami

# 3. Configurar variável de ambiente no EAS
npx eas-cli env:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.kravaapp.com.br/api" --environment production

# 4. Gerar build de produção para Android (.aab para Play Store)
npx eas-cli build --platform android --profile production

# 5. Gerar build de produção para iOS (App Store)
npx eas-cli build --platform ios --profile production

# 6. Gerar build para ambas as plataformas simultaneamente
npx eas-cli build --platform all --profile production

# 7. Enviar build pronto diretamente para a Play Store
npx eas-cli submit --platform android --profile production

# 8. Enviar build pronto diretamente para o TestFlight / App Store
npx eas-cli submit --platform ios --profile production
```
