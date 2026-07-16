# Contexto do Frontend — Krava

> Documento gerado a partir da análise do código-fonte em `src/`. Itens não confirmados diretamente no código estão marcados como **Necessita validação**.

## Objetivo da aplicação

Aplicativo móvel/web de **gestão esportiva** (o subtítulo da tela de login é _"Gestão esportiva inteligente"_) voltado ao **agendamento de aulas** em arenas/centros de treino. O usuário autenticado (aluno) pode visualizar sua próxima aula, agendar aulas disponíveis, acompanhar seu histórico de presenças/faltas e consultar/gerenciar seu plano de assinatura.

- Nome do app: `krava` (definido em `app.json` e `package.json`).
- Multi-plataforma: iOS, Android e Web (via Expo / React Native Web).

## Público-alvo

- **Alunos** de centros de treino esportivo (o cabeçalho e boa parte da UI usam o rótulo "Aluno"). Toda a área principal navegável (abas) é orientada ao fluxo do aluno.
- A tela de seleção de tenant também prevê os papéis **"Admin"** (Administrador) e **"Professor"**, mas **não há telas dedicadas a esses papéis** no código analisado — apenas ícones/rótulos na seleção de local. **Necessita validação** (se Admin/Professor devem ter experiência própria ou usam a mesma área do aluno).

## Principais funcionalidades

- **Autenticação por e-mail e senha** (`signIn.tsx` + `auth/login`).
- **Seleção de tenant/local** quando o login retorna múltiplos locais disponíveis (`selectTenant.tsx` + `auth/select-tenant`).
- **Início (Home)** — perfil do aluno com nível, card de "Próxima aula", calendário da semana com aulas e lista de "Aulas disponíveis agora" para agendamento.
- **Agendamento** — filtro por categoria/modalidade, seletor de dia (próximos 10 dias) e lista de ocorrências de aula com regras de elegibilidade (gênero e nível) e liberação por horário (`releaseAt`).
- **Confirmação de agendamento** via modal, com suporte a **fila de espera** quando a turma está lotada (`ConfirmBookingModal.tsx`).
- **Planos** — exibe o plano atual (uso de aulas no mês, datas, renovação automática) e a lista de planos disponíveis para assinatura; inclui fluxo de UI para **solicitar vinculação com parceiros (Gympass / Totalpass)**.
- **Histórico** — resumo mensal (presenças, faltas, aulas restantes) e listagem do histórico de agendamentos, com filtro por modalidade.
- **Logout** através do dropdown de perfil no cabeçalho.

### Funcionalidades presentes na UI, mas sem ação implementada (**Necessita validação**)
- Botão **"Criar conta"** na tela de login não possui handler (`signIn.tsx`).
- Botão **"Cancelar"** no card de próxima aula não possui handler (`index.tsx`).
- Botão **"Assinar Plano"** e **"Enviar solicitação"** (parceiros) apenas fecham/limpam o formulário localmente — não há chamada de API de assinatura/vinculação no código analisado (`paymentPlans.tsx`).

## Principais módulos

Organização em `src/`:

- **`app/`** — telas e navegação (Expo Router, file-based routing).
  - `_layout.tsx` — providers globais (`QueryClientProvider`, `AuthProvider`) e Stack raiz.
  - `signIn.tsx` — login.
  - `(tenant)/` — grupo de seleção de local (`selectTenant.tsx`).
  - `(user)/` — área protegida com navegação por abas: `index` (Início), `schedule` (Agendamento), `paymentPlans` (Planos), `history` (Histórico).
- **`components/`** — UI reutilizável: `ClientHeader` (cabeçalho + dropdown de perfil + paleta `COLORS`), `ConfirmBookingModal`, `StatusBadge`, `KravaLogo`.
- **`contexts/`** — `authContext.tsx` (estado de autenticação, tenant e persistência em AsyncStorage).
- **`hooks/`** — hooks de dados baseados em React Query: `auth.hooks`, `schedule.hooks`, `plans.hooks`, `categories.hooks`.
- **`routes/`** — camada de acesso à API (classes com métodos por endpoint) + `client.ts` (instância `ky` com interceptors).
- **`schemas/`** — validação/tipagem de requisições com Zod (`auth.schemas`, `schedule.schemas`).
- **`types/`** — tipos TypeScript de resposta da API (`auth`, `schedules`, `plans`, `categories`).

### Stack técnica
- **Expo ~56 / React Native 0.85 / React 19**, **Expo Router** (typedRoutes habilitado).
- **@tanstack/react-query** (cache/estado de servidor), **ky** (cliente HTTP), **zod** (validação), **date-fns** (dependência declarada), **lucide-react-native** (ícones), **AsyncStorage** (persistência).

## Fluxo geral de navegação

```
_layout (raiz: QueryClient + Auth)
│
├─ signIn ──login──▶  (a) requer seleção de tenant ──▶ (tenant)/selectTenant ──seleciona──▶ (user)/index
│                     (b) token direto ─────────────────────────────────────────────────▶ (user)/index
│
└─ (user) [Tabs] (protegido: redireciona p/ signIn se não houver `user`)
     ├─ index         (Início)
     ├─ schedule      (Agendamento)
     ├─ paymentPlans  (Planos)
     └─ history       (Histórico)
```

- **Proteção de rotas**: `(user)/_layout.tsx` redireciona para `/signIn` se não houver usuário; `(tenant)/_layout.tsx` e `selectTenant.tsx` redirecionam para `/signIn` se não houver estado de seleção de tenant.
- **Pós-login**: `signIn` (no `authContext`) faz `router.replace("/")`; seleção de tenant faz `router.replace("/selectTenant")`; logout faz `router.replace("/signIn")`.
- **Sessão persistente**: ao iniciar, o `AuthProvider` lê o estado salvo em AsyncStorage (`@krava:auth-state`) e restaura a sessão.

## Integrações com APIs

- **Base URL**: `process.env.EXPO_PUBLIC_API_URL` ou fallback `https://krava-api-latest.onrender.com/api` (`routes/client.ts`).
- **Cliente HTTP**: `ky`, com:
  - `beforeRequest`: injeta header `Authorization: Bearer <accessToken>` a partir do estado salvo em AsyncStorage.
  - `afterResponse`: em `401`, remove o estado de autenticação do AsyncStorage.
  - `timeout: false`.

Endpoints consumidos (por módulo de rotas):

| Módulo | Método | Endpoint | Uso |
|---|---|---|---|
| Auth | POST | `/auth/login` | Login |
| Auth | POST | `/auth/select-tenant` | Selecionar local/tenant |
| Scheduling | GET | `/scheduling/my-next-class` | Próxima aula do aluno |
| Scheduling | GET | `/scheduling/my-week-classes` | Aulas da semana |
| Scheduling | GET | `/scheduling/ocorrencias` | Aulas disponíveis (filtros de data/modalidade/enrollment) |
| Scheduling | POST | `/scheduling/bookings` | Criar agendamento (`source: 'str'`, `isTrial: false`) |
| Scheduling | GET | `/scheduling/my-history` | Histórico de agendamentos (paginado) |
| Scheduling | GET | `/scheduling/modalidades` | Categorias/modalidades |
| Checkin | GET | `/checkin/my-status` | Status mensal (presenças/faltas/restantes) |
| Membership | GET | `/membership/planos` | Planos disponíveis (`activeOnly: true`) |
| Plans | GET | `/plans/current` | Plano atual do aluno |

> **Necessita validação** — inconsistências de prefixo entre endpoints (`/membership/planos` para listar planos vs. `/plans/current` para o plano atual). Confirmar se ambos existem no backend ou se há divergência.
>
> **Necessita validação** — em `getMyMonthlySchedule`, o parâmetro `modalityId` é recebido pelo hook, mas **não é enviado** na chamada a `/checkin/my-status` (o filtro por modalidade no Histórico pode não afetar o resumo mensal).
>
> **Necessita validação** — `createSchedule` envia `source: 'str'` (valor aparentemente placeholder).
>
> **Necessita validação** — divergência de nomes de campo entre `MyMonthlyScheduleType` (`checkInsRemainingThisMonth`) e o consumo na tela de Histórico (`availableForSchedulingThisMonth`, `totalUsedThisMonth`) — confirmar o contrato real da API de `/checkin/my-status`.

## Permissões de usuário

O que é possível confirmar no código frontend:

- **Papéis (`role`)** existem no token/tenant: **"Admin"**, **"Aluno"**, **"Professor"** (usados apenas para ícone e rótulo na tela de seleção de local). O código analisado **não implementa telas ou permissões diferenciadas por papel** além disso. **Necessita validação**.
- **Autenticação** é obrigatória para acessar a área `(user)`; sem `user`, há redirecionamento para login. O token (`accessToken`) é anexado automaticamente às requisições.
- **Elegibilidade de agendamento** (regras de negócio aplicadas no cliente, em `index.tsx` e `schedule.tsx`):
  - **Gênero**: aula é permitida se `publicGender === 'Mixed'` ou igual ao gênero do usuário (`user.gender`). Caso contrário, exibe "Apenas <gênero>".
  - **Nível**: peso `iniciante(1) < intermediario(2) < avancado(3)`; o nível do aluno (`user.studentLevel`) deve ser ≥ o `minLevel` da aula. Caso contrário, exibe "Requer nível X".
  - **Liberação por horário**: quando há `releaseAt` futuro, o botão "Agendar" é substituído por "Libera em ...".
  - **Capacidade**: quando lotada, o agendamento vira **fila de espera** (texto do modal muda para "entrar na fila de espera").
- **Limites de plano**: a UI exibe aulas usadas/restantes/ilimitadas com base no plano atual (`/plans/current` e `/checkin/my-status`), mas **o bloqueio efetivo por limite de plano no ato do agendamento não está implementado no frontend** — depende do backend. **Necessita validação**.

> **Necessita validação** — as regras de gênero/nível/capacidade são aplicadas apenas na camada de apresentação (habilitar/desabilitar botões). A autoridade real sobre o que o usuário pode agendar é do backend; confirmar se o servidor reforça essas mesmas regras.

---

### Observações gerais (**Necessita validação**)
- Alguns textos parecem específicos de um cliente/arena (ex.: menção a **"FitPira Arena"** no modal de parceiros e **"Plano Intermediário"** fixo no dropdown de perfil) — verificar se são dados reais/hardcoded temporários.
- Vários estados (`isCurrent`, `isEnded`) estão fixos em `false` nas telas de Planos/Agenda, sugerindo funcionalidades ainda não finalizadas.
