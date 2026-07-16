# Interações do Usuário — Krava

> Documento gerado a partir da análise do código-fonte (`src/app`, `src/components`, `src/hooks`, `src/routes`, `src/schemas`). O app usa **React Native / Expo Router**, então não há "tabelas" HTML tradicionais — as listagens são `FlatList`/`ScrollView` e estão documentadas na seção **Tabelas/Listas**. Itens não confirmados no código estão marcados como **Necessita validação**.

---

# 1. Login — `/signIn` (`app/signIn.tsx`)

## Botões

### Entrar
- **Localização**: dentro do card, abaixo dos campos.
- **Condição de exibição**: sempre visível.
- **Evento disparado**: `onPress → handleLogin()`. Se `email` ou `senha` vazios, retorna sem ação; senão `await login({ email, password: senha })`.
- **API chamada**: `POST /auth/login` (via `useLogin`).
- **Feedback visual**: desabilitado quando `isLoading` (`disabled`), opacidade 0.7, e `ActivityIndicator` no lugar do texto "Entrar".
- **Resultado esperado**: em sucesso, redireciona para `/selectTenant` (se múltiplos tenants) ou `/` (Início). Em erro, exibe mensagem abaixo dos campos.

### Criar conta
- **Localização**: abaixo do botão Entrar.
- **Condição de exibição**: sempre visível.
- **Evento disparado**: **nenhum** (`TouchableOpacity` sem `onPress`). **Necessita validação**.
- **API chamada**: nenhuma.
- **Feedback visual**: nenhum.
- **Resultado esperado**: indefinido (funcionalidade não implementada).

## Campos

### E-mail
- **Tipo**: `TextInput` (texto), `keyboardType="email-address"`, `autoCapitalize="none"`.
- **Obrigatório**: sim (login bloqueado se vazio — validação implícita `if (!email || !senha) return`).
- **Validação**: no schema Zod (`loginSchema`) exige `z.string().email()`. **Necessita validação** — o schema não é aplicado explicitamente na tela antes do envio; a validação de formato depende do backend/schema.
- **Máscara**: nenhuma.
- **Comportamento**: `onChangeText → setEmail`; placeholder "seu@email.com".

### Senha
- **Tipo**: `TextInput`, `secureTextEntry` (oculta caracteres).
- **Obrigatório**: sim (bloqueia login se vazio).
- **Validação**: `z.string()` (apenas string). Sem regra de comprimento.
- **Máscara**: pontos ocultos (nativo do `secureTextEntry`); placeholder "••••••••".
- **Comportamento**: `onChangeText → setSenha`.

## Tabelas/Listas
- Nenhuma.

## Modais
- Nenhum.

## Navegação
| Origem | Destino | Condição |
|---|---|---|
| `/signIn` | `/selectTenant` | Login retorna `preAuthToken` + `availableTenants` |
| `/signIn` | `/` (Início) | Login retorna `token` direto (sem seleção de tenant) |

---

# 2. Seleção de local — `/selectTenant` (`app/(tenant)/selectTenant.tsx`)

## Botões

### Card de tenant (item da lista)
- **Nome**: card do local (nome do tenant + papel).
- **Localização**: itens da `FlatList`.
- **Condição de exibição**: um por item em `selectTenantState.availableTenants`.
- **Evento disparado**: `onPress → selectTenant({ preAuthToken, tenantId: item.tenantId })`.
- **API chamada**: `POST /auth/select-tenant` (via `useSelectTenant`).
- **Feedback visual**: quando `isLoading`, card com opacidade 0.7 e `disabled`.
- **Resultado esperado**: em sucesso, autentica e redireciona para `/` (Início).

## Campos
- Nenhum (seleção por toque).

## Tabelas/Listas

### Lista de tenants (`FlatList`)
- **Colunas/Conteúdo por item**: ícone (por papel), `tenantName`, papel traduzido (`Administrador`/`Aluno`/`Professor`).
- **Ordenação**: ordem original do array (sem ordenação explícita).
- **Paginação**: nenhuma (lista simples).
- **Filtros**: nenhum.
- **`keyExtractor`**: `item.tenantId`.

## Modais
- Nenhum.

## Navegação
| Origem | Destino | Condição |
|---|---|---|
| `/selectTenant` | `/signIn` | `!selectTenantState` (Redirect no layout e na tela) |
| `/selectTenant` | `/` (Início) | Sucesso em `select-tenant` (`signIn` → `router.replace("/")`) |

---

# 3. Início — `/` (`app/(user)/index.tsx`)

## Botões

### Cancelar (card de próxima aula)
- **Localização**: rodapé do `NextClassCard`.
- **Condição de exibição**: só quando há próxima aula (`userNextClass.aulaId` existe) e não está em loading/erro.
- **Evento disparado**: **nenhum** (`TouchableOpacity` sem `onPress`). **Necessita validação**.
- **API chamada**: nenhuma.
- **Feedback visual**: nenhum.
- **Resultado esperado**: indefinido (cancelamento não implementado).

### Dia da semana (`WeekCalendar`)
- **Localização**: linha de dias Seg–Dom.
- **Condição de exibição**: sempre; ação só ocorre se o dia tem aula.
- **Evento disparado**: `onPress` → se `!d.aula` retorna; senão alterna `selectedDate` (seleciona/deseleciona).
- **API chamada**: nenhuma (usa dados já carregados de `my-week-classes`).
- **Feedback visual**: círculo ativo (`mainOrange`), dot indicador (laranja=confirmado, cinza=espera), card de detalhe do dia.
- **Resultado esperado**: exibe/oculta card com modalidade, horário e data.

### Agendar (`AvailableClassItem`)
- **Localização**: canto inferior direito de cada aula disponível.
- **Condição de exibição**: aparece **apenas** se `!subscriptionStatus` **e** gênero permitido **e** nível permitido. Caso contrário exibe texto de status ou de restrição.
- **Evento disparado**: `onPress → onBookPress(aula)` → `setSelectedClass` + abre `ConfirmBookingModal`.
- **API chamada**: nenhuma no clique (a chamada ocorre ao confirmar no modal).
- **Feedback visual**: botão laranja.
- **Resultado esperado**: abre modal de confirmação.

### Confirmar / Cancelar / Fechar (X) — modal
- Ver seção **Modais**.

### Avatar / Sair (via `ClientHeader`)
- Ver componente `ClientHeader` na seção final.

## Campos
- Nenhum campo de entrada (tela de consumo/ação).

## Tabelas/Listas

### Aulas disponíveis agora (`FlatList`)
- **Colunas/Conteúdo por item**: horário, nome da modalidade/aula (truncado > 12 chars), professor, vagas (`confirmedCount/maxCapacity`), `StatusBadge`, status de inscrição ou botão Agendar.
- **Ordenação**: ordem retornada pela API (sem ordenação no cliente).
- **Paginação**: não há UI de paginação; a busca usa janela de datas hoje → hoje+15 com `openForEnrollment: true`.
- **Filtros**: implícito por `openForEnrollment: true` (somente abertas para inscrição).
- **`keyExtractor`**: `item.id`. Estado vazio: "Nenhuma aula disponível no momento".

### Aulas da semana (`WeekCalendar`)
- **Conteúdo**: 7 dias (Seg–Dom) com indicador de aula (primeira aula do dia).
- **Ordenação**: cronológica (segunda a domingo da semana atual).
- **Paginação/Filtros**: nenhum.

## Modais

### ConfirmBookingModal
- **Como abrir**: botão **Agendar** em um item → `handleBookPress` → `setIsModalVisible(true)`.
- **Como fechar**:
  - Botão **Cancelar** (`onClose`);
  - Ícone **X** (`onClose`);
  - Toque no overlay (`onPress={onClose}`, desabilitado durante `isCreatingSchedule`);
  - `onRequestClose` (voltar Android);
  - Automaticamente após confirmar com sucesso.
- **Regras de negócio**:
  - Se `selectedClass` for `null`, o modal não renderiza.
  - Texto muda para "entrar na fila de espera" quando `confirmedCount >= maxCapacity` (turma lotada); senão "agendar".
  - **Confirmar**: `handleConfirmBooking` → `createSchedule({ ocorrenciaId: selectedClass.id })` → `POST /scheduling/bookings` (`source: 'str'`, `isTrial: false`) → invalida `["schedule"]` → fecha modal e limpa seleção.
  - Durante `isCreatingSchedule`, botões desabilitados e spinner no Confirmar.

## Navegação
| Origem | Destino | Condição |
|---|---|---|
| `/` | `/signIn` | `!user` (Redirect no layout de abas) / logout |
| `/` | `/schedule`, `/paymentPlans`, `/history` | Toque nas abas inferiores |

> Não há navegação programática direta entre telas dentro da Home além das abas.

---

# 4. Agendamento — `/schedule` (`app/(user)/schedule.tsx`)

## Botões

### Pill de categoria (`CategoryFilter`)
- **Localização**: faixa horizontal superior.
- **Condição de exibição**: uma por categoria carregada; skeleton em loading; mensagem de erro se falhar.
- **Evento disparado**: `onPress → onSelect(cat.id)` → `setSelectedCategory`.
- **API chamada**: indiretamente redispara `GET /scheduling/ocorrencias` (queryKey muda).
- **Feedback visual**: pill selecionada em `mainOrange` com texto branco.
- **Resultado esperado**: recarrega a lista filtrando por modalidade.

### Card de dia (`DayCalendar`)
- **Localização**: faixa horizontal de 10 dias.
- **Condição de exibição**: sempre (próximos 10 dias).
- **Evento disparado**: `onPress → onSelect(day.id)` → `setSelectedDay`.
- **API chamada**: redispara `GET /scheduling/ocorrencias` (`startDate=endDate=selectedDay`).
- **Feedback visual**: card selecionado em `mainOrange`, textos brancos.
- **Resultado esperado**: recarrega a lista para o dia selecionado.

### Agendar (`ClassCard`)
- **Localização**: rodapé de cada card de aula.
- **Condição de exibição**: apenas se sem `subscriptionStatus`, gênero permitido, nível permitido **e** aula liberada (`isReleased`). Caso contrário: texto de restrição, status de inscrição, ou badge "Libera em ...".
- **Evento disparado**: `onPress → onBookPress(item)` abre `ConfirmBookingModal`.
- **API chamada**: nenhuma no clique (confirmação no modal).
- **Feedback visual**: botão laranja.
- **Resultado esperado**: abre modal de confirmação.

## Campos
- Nenhum input de texto. Filtros por seleção: **categoria** (`selectedCategory`) e **dia** (`selectedDay`).

## Tabelas/Listas

### Lista de aulas (`FlatList`)
- **Colunas/Conteúdo por item**: horário início/fim, nome da aula/modalidade, tags de nível e gênero, professor, barra de progresso de vagas (`confirmedCount/maxCapacity`), ação (Agendar / status / restrição / "Libera em").
- **Ordenação**: ordem da API.
- **Paginação**: sem UI de paginação (filtra por dia único).
- **Filtros**: por **modalidade** (`modalityId`) e **dia** (`startDate`/`endDate`).
- **`keyExtractor`**: `item.id`. Estado vazio: "Nenhuma aula encontrada para este dia".

## Modais

### ConfirmBookingModal
- **Como abrir / fechar / regras**: idênticos ao descrito na tela Início (mesmo componente e handlers `handleBookPress`/`handleConfirmBooking`).

## Navegação
| Origem | Destino | Condição |
|---|---|---|
| `/schedule` | `/signIn` | `!user` (layout) / logout |
| `/schedule` | demais abas | Toque nas abas inferiores |

---

# 5. Planos — `/paymentPlans` (`app/(user)/paymentPlans.tsx`)

## Botões

### Tentar novamente (erro do plano atual)
- **Localização**: dentro do card "SEU PLANO ATUAL" em estado de erro.
- **Condição de exibição**: `currentError` verdadeiro.
- **Evento disparado**: `onPress → refetchCurrent()`.
- **API chamada**: `GET /plans/current` (refetch).
- **Feedback visual**: troca para skeleton durante o recarregamento.
- **Resultado esperado**: recarrega o plano atual.

### Assinar Plano (`PlanCard`)
- **Localização**: rodapé de cada card de plano.
- **Condição de exibição**: quando `!isCurrent` (atualmente `isCurrent` é fixo `false`, então sempre aparece). **Necessita validação**.
- **Evento disparado**: **nenhum** (`TouchableOpacity` sem `onPress`). **Necessita validação**.
- **API chamada**: nenhuma.
- **Feedback visual**: botão laranja.
- **Resultado esperado**: indefinido (assinatura não implementada).

### Plano atual (desabilitado)
- **Condição de exibição**: quando `isCurrent` (fixo `false` — nunca aparece atualmente). **Necessita validação**.
- **Evento**: `disabled`; nenhuma ação.

### Solicitar vinculação
- **Localização**: card "Utilizo Gympass ou Totalpass".
- **Condição de exibição**: sempre visível.
- **Evento disparado**: `onPress → setPartnerModal(true)`.
- **API chamada**: nenhuma (apenas abre modal).
- **Feedback visual**: botão laranja.
- **Resultado esperado**: abre o modal de vinculação.

### Enviar solicitação (dentro do modal)
- **Localização**: rodapé do modal de parceiros.
- **Condição de exibição**: modal aberto.
- **Evento disparado**: `onPress → handleSendRequest()` — apenas fecha o modal e limpa `selectedPartner`/`partnerId`.
- **API chamada**: **nenhuma**. **Necessita validação**.
- **Feedback visual**: nenhum (fecha o modal).
- **Resultado esperado**: no código atual, apenas limpa o formulário localmente.

## Campos

### Parceiro (dropdown no modal)
- **Tipo**: seletor custom (`TouchableOpacity` + lista); opções: "Gympass (Wellhub)", "Totalpass".
- **Obrigatório**: não há validação de obrigatoriedade no código.
- **Validação**: nenhuma.
- **Máscara**: n/a.
- **Comportamento**: `setSelectedPartner`; abre/fecha via `isDropdownOpen`; placeholder "Selecione o parceiro".

### ID no parceiro
- **Tipo**: `TextInput` (texto).
- **Obrigatório**: não (placeholder "Seu ID no parceiro (opcional)").
- **Validação**: nenhuma.
- **Máscara**: nenhuma.
- **Comportamento**: `onChangeText → setPartnerId`.

## Tabelas/Listas

### Lista de planos (`plans.map`)
- **Colunas/Conteúdo por item**: nome, preço (`R$ x,xx/mês`), frequência (`Nx na semana` ou "Ilimitado") + duração em dias, features (sessões/duração/descrição), badge "Mais popular".
- **Ordenação**: ordem da API (`GET /membership/planos?activeOnly=true` → `items`).
- **Paginação**: sem UI (embora a resposta seja paginada, só `items` é usado).
- **Filtros**: `activeOnly: true` (fixo na chamada).

### Plano atual (`CurrentPlanCard`)
- **Conteúdo**: nome, status, modalidades permitidas (chips), progresso de aulas, grade Início/Término/Restantes/Renovação.

## Modais

### Modal de vinculação com parceiro
- **Como abrir**: botão **Solicitar vinculação** → `setPartnerModal(true)`.
- **Como fechar**: botão **Enviar solicitação** (`handleSendRequest` → `setPartnerModal(false)`). **Necessita validação** — não há botão explícito de cancelar/fechar (X) nem fechamento por toque no overlay.
- **Regras de negócio**:
  - Seleção de parceiro entre Gympass/Totalpass e campo de ID opcional.
  - Aviso fixo: "A solicitação será analisada pelo FitPira Arena em até 24h" (**texto hardcoded — Necessita validação**).
  - `handleSendRequest` limpa estado, **sem persistir no backend**.

## Navegação
| Origem | Destino | Condição |
|---|---|---|
| `/paymentPlans` | `/signIn` | `!user` (layout) / logout |
| `/paymentPlans` | demais abas | Toque nas abas inferiores |

---

# 6. Histórico — `/history` (`app/(user)/history.tsx`)

## Botões

### Pill de filtro (`CategoryFilter`)
- **Localização**: faixa horizontal abaixo do resumo mensal.
- **Condição de exibição**: pill "Todas" + uma por categoria; `ActivityIndicator` em loading.
- **Evento disparado**: `onPress → onSelect(id)`:
  - `id === 'Todas'` → `filtroId='Todas'`, `filtroName='Todas'`;
  - senão → busca categoria e define `filtroId=id`, `filtroName=cat.name`.
- **API chamada**: redispara `GET /scheduling/my-history` (queryKey muda). O resumo `GET /checkin/my-status` também é re-executado, mas **sem** enviar `modalityId`. **Necessita validação**.
- **Feedback visual**: pill selecionada em `mainOrange`, texto branco.
- **Resultado esperado**: filtra a lista de histórico por modalidade.

## Campos
- Nenhum input de texto. Filtro por seleção (`filtroId`/`filtroName`).

## Tabelas/Listas

### Resumo mensal (`HistorySummary`)
- **Conteúdo**: caixas Presenças, Faltas, Restantes (ou ∞ quando ilimitado) + barra de progresso de check-ins.
- **Ordenação/Paginação/Filtros**: n/a (dados agregados de `/checkin/my-status`).

### Lista de histórico (`HistoryCard`)
- **Colunas/Conteúdo por item**: data (dia da semana + dd/mm), modalidade/aula + horário, professor, badge de status.
- **Ordenação**: ordem da API.
- **Paginação**: chamada fixa `page: 1`, `pageSize: 50` — **sem UI de "carregar mais"**. **Necessita validação** (registros além de 50 não são exibidos).
- **Filtros**: por modalidade via API (`modalityId`) **e** filtro local adicional por `p.modalityName === filtroName`.
- **Estados**: 5 skeletons em loading; "Nenhum histórico encontrado" quando vazio.
- **`key`**: `p.bookingId`.

## Modais
- Nenhum.

## Navegação
| Origem | Destino | Condição |
|---|---|---|
| `/history` | `/signIn` | `!user` (layout) / logout |
| `/history` | demais abas | Toque nas abas inferiores |

---

# Componentes transversais

## ClientHeader (`AlunoHeader`) — presente em Início, Agendamento, Planos, Histórico

### Botão: Avatar (abre dropdown)
- **Localização**: canto superior direito do cabeçalho.
- **Condição de exibição**: sempre nas telas autenticadas.
- **Evento disparado**: `onPress → setDropdownVisible(true)`.
- **Feedback visual**: avatar com iniciais do usuário.
- **Resultado esperado**: abre o dropdown de perfil.

### Botão: Sair (dentro do dropdown)
- **Evento disparado**: `onPress → onClose()` + `handleLogout()` → `signOut()`.
- **API chamada**: nenhuma (limpa AsyncStorage localmente).
- **Resultado esperado**: `router.replace("/signIn")` e limpeza do estado de autenticação.

### Dropdown de perfil (modal)
- **Como abrir**: toque no avatar.
- **Como fechar**: toque no backdrop (`onPress={onClose}`), `onRequestClose`, ou ao selecionar "Sair".
- **Regras**: exibe `userName`, `tenantName` e "Plano Intermediário" (**hardcoded — Necessita validação**).

---

# Regras de elegibilidade de agendamento (aplicadas em Início e Agendamento)

Aplicadas **na camada de apresentação** (habilitam/desabilitam o botão Agendar). A autoridade final é do backend. **Necessita validação**.

- **Gênero**: permitido se `publicGender === 'Mixed'` ou igual a `user.gender`; senão exibe "Apenas <gênero>".
- **Nível**: pesos `iniciante(1) < intermediario(2) < avancado(3)`; permitido se nível do usuário ≥ `minLevel` da aula; senão "Requer nível X".
- **Liberação por horário** (Agendamento): se `releaseAt` for futuro, mostra "Libera em ..." em vez do botão.
- **Capacidade**: quando `confirmedCount >= maxCapacity`, o modal alterna para "entrar na fila de espera".
- **`subscriptionStatus`**: se já inscrito, mostra o status (Confirmado/ListaEspera/WaitlistPending/CheckedIn/Faltou) em vez do botão.

---

# Resumo de tratamento de erros e feedback (React Query)

- Todos os hooks (`useLogin`, `useSchedule`, `usePlans`, etc.) expõem `isLoading`/`isPending` e `error` derivado de `error.data?.detail || error.message || "<mensagem padrão>"`.
- **401**: o interceptor `afterResponse` (em `routes/client.ts`) remove o estado de autenticação do AsyncStorage. **Necessita validação** — não há redirecionamento automático para `/signIn` disparado pelo interceptor.
- `useCreateSchedule` invalida a query `["schedule"]` em sucesso e loga o erro no console.

---

## Observações finais (**Necessita validação**)

- **Botões sem ação/API**: "Criar conta" (Login), "Cancelar" próxima aula (Início), "Assinar Plano" e "Enviar solicitação" (Planos).
- **Validações de formulário**: os schemas Zod existem, mas **não há validação explícita aplicada na UI** antes do envio (apenas checagem de campos vazios no Login).
- **Paginação**: nenhuma tela expõe controles de paginação, apesar de várias APIs retornarem dados paginados (Histórico usa `pageSize: 50` fixo).
- **Máscaras de entrada**: nenhuma máscara é aplicada em nenhum campo.
