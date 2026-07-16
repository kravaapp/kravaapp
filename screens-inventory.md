# Inventário de Telas — Krava

> Documento gerado a partir da análise do código-fonte (`src/app`, `src/components`, `src/hooks`, `src/routes`). Baseado em roteamento por arquivos do **Expo Router**. Itens não confirmados no código estão marcados como **Necessita validação**.

## Mapa de rotas

| # | Tela | Rota | Grupo | Tipo |
|---|---|---|---|---|
| — | Layout raiz | — | `app/_layout.tsx` | Layout (Stack) |
| 1 | Login | `/signIn` | `app/` | Tela |
| — | Layout de tenant | — | `app/(tenant)/_layout.tsx` | Layout (Stack) |
| 2 | Seleção de local | `/selectTenant` | `(tenant)` | Tela |
| — | Layout do aluno | — | `app/(user)/_layout.tsx` | Layout (Tabs) |
| 3 | Início | `/` (`index`) | `(user)` | Tela / Aba |
| 4 | Agendamento | `/schedule` | `(user)` | Tela / Aba |
| 5 | Planos | `/paymentPlans` | `(user)` | Tela / Aba |
| 6 | Histórico | `/history` | `(user)` | Tela / Aba |

> Os grupos `(tenant)` e `(user)` são "route groups" do Expo Router — os parênteses **não** aparecem na URL.

---

## Layouts (não são telas navegáveis)

### Layout raiz — `app/_layout.tsx`
- **Objetivo**: prover contexto global e definir o Stack de nível superior.
- **Providers**: `QueryClientProvider` (React Query) → `AuthProvider` (autenticação).
- **Stack.Screen**: `(user)`, `signIn`, `(tenant)` — todos com `headerShown: false` e `animation: "none"`.

### Layout de tenant — `app/(tenant)/_layout.tsx`
- **Objetivo**: proteger o grupo de seleção de local.
- **Regra de visibilidade**: se `!selectTenantState` → `<Redirect href="/signIn" />`.
- Renderiza um Stack apenas com `selectTenant`.

### Layout do aluno — `app/(user)/_layout.tsx`
- **Objetivo**: navegação por abas (Tabs) da área autenticada.
- **Regra de visibilidade**: se `!user` → `<Redirect href="/signIn" />`.
- **Abas** (cor ativa `mainOrange`, inativa `grayLabels`):
  - `index` → "Início" (ícone `HomeIcon`)
  - `schedule` → "Agendamento" (ícone `CalendarIcon`)
  - `paymentPlans` → "Planos" (ícone `CreditCardIcon`)
  - `history` → "Histórico" (ícone `Clock`)

---

## 1. Login

- **Nome da tela**: Login (`Login`)
- **URL/Rota**: `/signIn` — arquivo `app/signIn.tsx`
- **Objetivo**: autenticar o usuário por e-mail e senha.
- **Componentes exibidos**:
  - `KravaLogo` (size 64) + título "krava" + subtítulo "Gestão esportiva inteligente".
  - Formulário (grupo E-mail, grupo Senha).
  - `ActivityIndicator` durante o carregamento.
  - Mensagem de erro (condicional).
- **Campos**:
  - **E-mail** — `TextInput`, `keyboardType="email-address"`, `autoCapitalize="none"` (estado `email`).
  - **Senha** — `TextInput`, `secureTextEntry` (estado `senha`).
- **Botões**:
  - **Entrar** — dispara `handleLogin`; desabilitado enquanto `isLoading`; mostra spinner.
  - **Criar conta** — **sem handler** (nenhuma ação). **Necessita validação**.
- **Ações disponíveis**:
  - Login: valida presença de e-mail e senha (retorna se vazios) e chama `login({ email, password })`.
- **APIs consumidas** (via `useLogin`):
  - `POST /auth/login`.
- **Regras de visibilidade**:
  - A mensagem de erro só aparece quando `error` está presente.
  - O botão Entrar fica com opacidade reduzida e desabilitado durante `isLoading`.
- **Navegação para outras telas** (definida em `authContext`, no sucesso do login):
  - Se a resposta traz `preAuthToken` + `availableTenants` → `setSelectTenant` → `router.replace("/selectTenant")`.
  - Caso contrário → `signIn(token)` → `router.replace("/")` (Início).

---

## 2. Seleção de local (Tenant)

- **Nome da tela**: Seleção de local (`SelectTenant`)
- **URL/Rota**: `/selectTenant` — arquivo `app/(tenant)/selectTenant.tsx`
- **Objetivo**: quando o usuário tem acesso a múltiplos locais/tenants, escolher em qual entrar.
- **Componentes exibidos**:
  - Header: logo "K", título "Selecione o local", subtítulo explicativo.
  - `FlatList` de tenants disponíveis; cada item é um card com ícone (por papel), nome do local e papel.
- **Campos**: nenhum (apenas seleção via toque).
- **Botões / itens acionáveis**:
  - **Card de tenant** (`TouchableOpacity`) — chama `selectTenant({ preAuthToken, tenantId })`; desabilitado e com opacidade reduzida enquanto `isLoading`.
- **Ações disponíveis**:
  - Selecionar tenant, enviando o `preAuthToken` (do estado) + `tenantId` do item.
- **APIs consumidas** (via `useSelectTenant`):
  - `POST /auth/select-tenant`.
- **Regras de visibilidade**:
  - Se `!selectTenantState` → `<Redirect href="/signIn" />`.
  - Ícone e rótulo do papel variam por `role`: `Admin` → LayoutGrid/"Administrador"; `Aluno` → GraduationCap/"Aluno"; demais → Users/"Professor".
- **Navegação para outras telas**:
  - No sucesso → `signIn(data)` → `router.replace("/")` (Início).
  - Redireciona para `/signIn` se não houver estado de seleção.

---

## 3. Início (Home)

- **Nome da tela**: Início (`Home`)
- **URL/Rota**: `/` (`index`) — arquivo `app/(user)/index.tsx`
- **Objetivo**: painel inicial do aluno — perfil, próxima aula, aulas da semana e aulas disponíveis para agendamento imediato.
- **Componentes exibidos**:
  - `ClientHeader` (cabeçalho com logo + avatar/dropdown de perfil).
  - `UserProfile` — avatar com iniciais, saudação "Olá, {nome}", badge de nível (Iniciante/Intermediário/Avançado), nome do local.
  - `NextClassCard` — card "PRÓXIMA AULA" (com estados de skeleton, erro e vazio).
  - `WeekCalendar` — calendário semanal (Seg–Dom) com indicador (dot) de aula; ao tocar num dia com aula, exibe card com modalidade/horário.
  - Seções "AULAS DA SEMANA" e "AULAS DISPONÍVEIS AGORA" (+ subtítulo "Abertas para agendamento").
  - `FlatList` de `AvailableClassItem` (aulas disponíveis nos próximos 15 dias, abertas para inscrição).
  - `ConfirmBookingModal` (modal de confirmação de agendamento).
  - `ActivityIndicator` e `ListEmptyComponent` ("Nenhuma aula disponível no momento").
- **Campos**: nenhum campo de entrada (tela de consumo/ação).
- **Botões / itens acionáveis**:
  - **Cancelar** (no card de próxima aula) — **sem handler**. **Necessita validação**.
  - **Agendar** (por item de aula) — chama `handleBookPress(item)` e abre o modal.
  - **Dia da semana** (`WeekCalendar`) — seleciona/deseleciona o dia (somente se houver aula).
  - Modal: **Confirmar** (`handleConfirmBooking`) / **Cancelar** / fechar (X).
  - `ClientHeader`: avatar → dropdown com **Sair** (logout).
- **Ações disponíveis**:
  - Visualizar próxima aula, aulas da semana e aulas disponíveis.
  - Agendar aula (ou entrar em fila de espera, se lotada) via modal.
- **APIs consumidas**:
  - `GET /scheduling/my-next-class` (`useUserNextClass`).
  - `GET /scheduling/my-week-classes` (`useUserWeekClasses`).
  - `GET /scheduling/ocorrencias` (`useSchedule`, com `startDate`=hoje, `endDate`=hoje+15, `openForEnrollment: true`).
  - `POST /scheduling/bookings` (`useCreateSchedule`).
- **Regras de visibilidade / negócio**:
  - `NextClassCard`: skeleton em loading; card de erro em falha; retorna `null` se não há `aulaId`.
  - Badge de nível derivado de `user.studentLevel` (avancado/intermediario/iniciante).
  - Status da próxima aula: "Confirmado ✓" ou "Na Fila" (`FilaEspera`).
  - `AvailableClassItem`: opacidade reduzida se `status === "Bloqueada"`; regras de elegibilidade:
    - **Gênero**: permitido se `Mixed` ou igual a `user.gender`; senão "Apenas <gênero>".
    - **Nível**: peso iniciante(1)/intermediario(2)/avancado(3); permitido se nível do usuário ≥ `minLevel`; senão "Requer nível X".
    - Se já há `subscriptionStatus`, exibe o status (Confirmado/ListaEspera/WaitlistPending/CheckedIn/Faltou) em vez do botão Agendar.
- **Navegação para outras telas**:
  - Não há navegação explícita para outras rotas a partir desta tela (interações abrem modais/dropdown).
  - Abas na parte inferior permitem ir a Agendamento, Planos e Histórico.
  - Logout (dropdown) → `router.replace("/signIn")`.

---

## 4. Agendamento

- **Nome da tela**: Agendamento (`Schedule`)
- **URL/Rota**: `/schedule` — arquivo `app/(user)/schedule.tsx`
- **Objetivo**: listar e agendar aulas filtrando por modalidade e por dia (próximos 10 dias).
- **Componentes exibidos**:
  - `ClientHeader`.
  - `CategoryFilter` — pills horizontais de categorias/modalidades (com skeleton e estado de erro).
  - `DayCalendar` — cards horizontais dos próximos 10 dias.
  - `FlatList` de `ClassCard` (cada aula com horário, tags de nível/gênero, professor, barra de progresso de vagas e ação).
  - `ConfirmBookingModal`.
  - `ActivityIndicator`, mensagens de erro e `ListEmptyComponent` ("Nenhuma aula encontrada para este dia").
- **Campos** (estado de filtro, não são inputs de texto):
  - **Categoria selecionada** (`selectedCategory`) — via pills.
  - **Dia selecionado** (`selectedDay`) — via cards de dia.
- **Botões / itens acionáveis**:
  - **Pill de categoria** — `onSelect(cat.id)`.
  - **Card de dia** — `onSelect(day.id)`.
  - **Agendar** (por aula, quando elegível e liberada) — `onBookPress(item)` abre o modal.
  - Modal: **Confirmar** / **Cancelar** / fechar (X).
- **Ações disponíveis**:
  - Filtrar aulas por modalidade e dia.
  - Agendar aula (ou entrar na fila de espera) via modal.
- **APIs consumidas**:
  - `GET /scheduling/modalidades` (`useCategories`).
  - `GET /scheduling/ocorrencias` (`useSchedule`, com `startDate=endDate=selectedDay` e `modalityId=selectedCategory`).
  - `POST /scheduling/bookings` (`useCreateSchedule`).
- **Regras de visibilidade / negócio**:
  - `useEffect` seleciona a primeira categoria automaticamente quando as categorias carregam.
  - `ClassCard`: desabilitado visualmente (opacidade) se gênero ou nível não permitidos.
  - Barra de progresso = `confirmedCount / maxCapacity`.
  - **Liberação por horário**: se `releaseAt` for futuro, mostra "Libera em ..." em vez de "Agendar".
  - Se há `subscriptionStatus`, exibe o status em vez do botão.
  - Elegibilidade de gênero/nível idêntica à da Home.
- **Navegação para outras telas**:
  - Sem navegação explícita para outras rotas (ações abrem modal). Abas inferiores para as demais telas.

---

## 5. Planos

- **Nome da tela**: Planos (`PaymentPlans`)
- **URL/Rota**: `/paymentPlans` — arquivo `app/(user)/paymentPlans.tsx`
- **Objetivo**: exibir o plano atual do aluno, listar planos disponíveis para assinatura e permitir solicitar vinculação com parceiros (Gympass/Totalpass).
- **Componentes exibidos**:
  - `ClientHeader`.
  - `ScrollView` com:
    - Card "SEU PLANO ATUAL" (`CurrentPlanCard`) — nome, status (`StatusBadge`), modalidades permitidas, progresso de aulas usadas/limite, grade com Início/Término/Aulas restantes/Renovação automática. Também há `CurrentPlanSkeleton` (loading) e estados de erro / sem plano.
    - Lista de `PlanCard` — nome, preço, frequência/duração, features, badge "Mais popular" (planos com "trimestral" no nome) e botão.
    - Card "Utilizo Gympass ou Totalpass" (parceiros).
  - `Modal` de solicitação de vinculação com parceiro (dropdown de parceiro + campo de ID + aviso).
- **Campos**:
  - **Parceiro selecionado** (`selectedPartner`) — dropdown (Gympass / Totalpass).
  - **ID no parceiro** (`partnerId`) — `TextInput`, placeholder "Seu ID no parceiro (opcional)".
- **Botões / itens acionáveis**:
  - **Tentar novamente** (no erro do plano atual) — `refetchCurrent()`.
  - **Assinar Plano** (por `PlanCard`) — **sem chamada de API** (apenas UI). **Necessita validação**.
  - **Plano atual** (desabilitado) — aparece quando `isCurrent` (atualmente fixo em `false`). **Necessita validação**.
  - **Solicitar vinculação** — abre o modal de parceiros.
  - No modal: seletor de parceiro (dropdown), **Enviar solicitação** — apenas fecha/limpa o formulário (`handleSendRequest`), **sem API**. **Necessita validação**.
- **Ações disponíveis**:
  - Consultar plano atual e planos disponíveis.
  - Recarregar plano atual em caso de erro.
  - Abrir/preencher fluxo de vinculação com parceiro (não persiste no backend no código atual).
- **APIs consumidas**:
  - `GET /membership/planos?activeOnly=true` (`usePlans`).
  - `GET /plans/current` (`useCurrentPlan`).
- **Regras de visibilidade / negócio**:
  - Plano atual: skeleton em loading; card de erro com "Tentar novamente"; se sem plano, "Você ainda não possui um plano ativo".
  - `isActive` = `status` (lowercase) === "ativo" → `StatusBadge confirmado`; senão `encerrada`.
  - Progresso de aulas só aparece se `maxClassesPerMonth` não nulo e > 0; caso contrário "Aulas ilimitadas".
  - "Aulas restantes" só aparece quando há limite e valor não nulo.
  - Badge "Mais popular" quando o nome do plano contém "trimestral".
  - Dropdown de parceiros abre/fecha via `isDropdownOpen`.
- **Navegação para outras telas**:
  - Sem navegação para outras rotas; interações abrem modal. Abas inferiores para as demais telas.

---

## 6. Histórico

- **Nome da tela**: Histórico (`History`)
- **URL/Rota**: `/history` — arquivo `app/(user)/history.tsx`
- **Objetivo**: exibir o resumo mensal (presenças/faltas/restantes) e o histórico de agendamentos, com filtro por modalidade.
- **Componentes exibidos**:
  - `ClientHeader`.
  - `ScrollView` com:
    - `HistorySummary` — "Mês Atual": caixas de Presenças, Faltas, Restantes (ou ícone de infinito quando ilimitado) e barra de progresso de check-ins do plano.
    - `CategoryFilter` — pills incluindo "Todas" + categorias.
    - Lista de `HistoryCard` — data (dia da semana + dd/mm), modalidade + horário, professor e badge de status.
    - Skeletons durante loading e estado vazio ("Nenhum histórico encontrado").
- **Campos** (estado de filtro):
  - **Filtro por modalidade** (`filtroId` / `filtroName`) — via pills ("Todas" ou uma categoria).
- **Botões / itens acionáveis**:
  - **Pill de filtro** — atualiza `filtroId`/`filtroName`.
  - (Cards de histórico são informativos; sem ação implementada.)
- **Ações disponíveis**:
  - Consultar resumo do mês e histórico de aulas.
  - Filtrar histórico por modalidade.
- **APIs consumidas**:
  - `GET /scheduling/modalidades` (`useCategories`).
  - `GET /scheduling/my-history` (`useBookingUserHistory`, `page: 1`, `pageSize: 50`, `modalityId` conforme filtro).
  - `GET /checkin/my-status` (`useMyMonthlySchedule`).
    - **Necessita validação**: o `modalityId` é passado ao hook, mas **não é enviado** na chamada a `/checkin/my-status`.
- **Regras de visibilidade / negócio**:
  - Resumo: `isUnlimited` quando `availableForSchedulingThisMonth === null` → exibe ícone de infinito e "check-ins no plano ilimitado"; senão calcula percentual `totalUsed/totalPlan`.
  - Status por item (`statusConfig`): `Confirmado` (aguardando), `CheckedIn` (Presente ✓), `Faltou` (Falta não cancelada ⚠), default (Desconhecido).
  - Card com borda esquerda vermelha quando `bookingStatus === 'Faltou'`.
  - Filtro local adicional por `modalityName` além do filtro enviado à API.
- **Navegação para outras telas**:
  - Sem navegação para outras rotas. Abas inferiores para as demais telas.

---

## Componentes reutilizáveis (transversais)

| Componente | Arquivo | Uso / Objetivo |
|---|---|---|
| `ClientHeader` (`AlunoHeader`) | `components/ClientHeader.tsx` | Cabeçalho com `KravaLogo` + avatar; dropdown de perfil com nome, local, plano e ação **Sair** (logout). Exporta a paleta `COLORS` e `getInitials`. |
| `ConfirmBookingModal` | `components/ConfirmBookingModal.tsx` | Modal de confirmação de agendamento; alterna texto para "fila de espera" quando `confirmedCount >= maxCapacity`; botões Cancelar/Confirmar (spinner em `isCreatingSchedule`). Usado em Início e Agendamento. |
| `StatusBadge` | `components/StatusBadge.tsx` | Badge de status: `lotada`/`encerrada`/`confirmado`/`bloqueada`. Usado em Planos e nas listas de aulas. |
| `KravaLogo` | `components/KravaLogo.tsx` | Logo do app (opção `showWordmark`). |

> **Necessita validação** — no dropdown de perfil (`ClientHeader`) o texto "Plano Intermediário" está fixo (hardcoded).

---

## Observações gerais (**Necessita validação**)

- **Botões sem ação/API**: "Criar conta" (Login), "Cancelar" (card de próxima aula), "Assinar Plano" e "Enviar solicitação" (Planos).
- **Flags fixas**: `isCurrent`/`isEnded` fixos em `false` em Planos/Agendamento sugerem funcionalidades ainda não finalizadas.
- **Sem telas dedicadas para Admin/Professor**: os papéis existem na seleção de local, mas toda a área `(user)` é orientada ao aluno.
- As regras de elegibilidade (gênero/nível/capacidade/liberação) são aplicadas **na camada de apresentação**; a autoridade final é do backend.
