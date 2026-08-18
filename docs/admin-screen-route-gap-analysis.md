# Cobertura das rotas nas telas administrativas

## Objetivo e fontes

Este documento confronta as três telas administrativas preenchidas com mocks com o contrato real da API:

- Dashboard: `src/app/(admin)/index.tsx`
- Aulas: `src/app/(admin)/classes.tsx`
- Financeiro: `src/app/(admin)/financial.tsx`

Fontes analisadas:

1. `admin_routes_list.md`, inventário funcional das rotas;
2. OpenAPI 3.0.1 da Krava API, usada como fonte de verdade para métodos, parâmetros e respostas;
3. clientes, tipos e hooks atualmente implementados no app.

A tela de Configurações permanece fora deste recorte. Ainda assim, rotas de configuração aparecem quando alimentam elementos das três telas, como os repasses do Financeiro.

## Critérios

- **Coberto:** a OpenAPI possui rota e resposta com todos os dados necessários.
- **Parcial:** existe rota, mas algum campo, agregação ou ação da UI não está disponível diretamente.
- **Ausente:** nenhuma operação da OpenAPI atende à necessidade.
- **Implementado no app:** além de existir na API, já há cliente e tipos utilizáveis no frontend.

## Resumo executivo atualizado

| Tela | Cobertura pela OpenAPI | Situação no app | Lacunas reais |
|---|---|---|---|
| Dashboard | Alta | Parcial; ocorrências de hoje já possuem cliente | Série diária de presenças; quantidade de **alunos** inadimplentes; contagem exata de faltas no churn |
| Aulas | Alta | Parcial; ocorrências e attendance já possuem cliente | Listagem de professores; ação administrativa “chamar próximo”; criação de ocorrência pontual |
| Financeiro | Média/alta | Clientes ainda ausentes | Receita por modalidade; vínculo confiável entre contrato e cobrança; tipo do aluno no contrato |

Correções importantes em relação à análise baseada apenas no inventário:

- solicitações Gympass/Totalpass possuem listagem, aprovação e recusa;
- repasses Gympass/Totalpass são cobertos por `tenant/settings`;
- `publicGender` existe em aulas e ocorrências;
- o detalhe da ocorrência possui bookings e waitlist com posição;
- existe confirmação de vaga da espera pelo próprio booking, mas não uma ação administrativa de “chamar próximo”.

## 1. Dashboard

### 1.1 KPIs

| Elemento da tela | Rota e campo OpenAPI | Cobertura | Adaptação necessária |
|---|---|---|---|
| Alunos ativos (`42`) | `GET /api/analytics/active-students` → `ActiveStudentsDto.activeStudentsCount` | Coberto | Criar cliente, tipo e hook no app. |
| Receita estimada/mês (`R$ 8.360`) | `GET /api/analytics/financial` → `FinancialDashboardDto.mrr` | Coberto | Usar `mrr` se “estimada/mês” significar receita recorrente mensal. Se a intenção for realizado do mês, usar `currentMonthRevenue`. |
| Inadimplentes (`3`) | `FinancialDashboardDto.totalOverdueValue` e `delinquencyPercentage` | Parcial | A resposta informa valor e percentual, não quantidade de alunos. A UI deve mostrar um desses indicadores ou o backend deve fornecer `delinquentStudentsCount`. |
| Taxa de presença (`87%`) | `GET /api/analytics/operational` → `OperationalDashboardDto.noShowRate` | Parcial derivável | Pode ser `100 - noShowRate`, desde que ambos usem a mesma população e período. A API aceita `startDate` e `endDate`. |

`OperationalDashboardDto` também fornece `checkInCount`, `avgCheckInFrequency`, `activeStudentsCount`, `totalStudentsCount`, `topModalidades` e `classOccupancies`, permitindo evoluir os KPIs sem nova rota.

### 1.2 Gráfico “Presenças por dia — últimas 4 semanas”

**Cobertura: ausente no formato necessário.**

`GET /api/analytics/operational` recebe intervalo de datas, mas retorna totais e agregações, não uma série diária. `GET /api/analytics/revenue/monthly` é uma série de receita e não atende presenças.

Opções:

1. adicionar `attendanceByDay` ao `OperationalDashboardDto`;
2. criar `GET /api/analytics/attendance/daily?startDate=&endDate=`;
3. trocar o gráfico por uma visualização já suportada, como `topModalidades` ou `classOccupancies`.

Contrato mínimo sugerido:

```ts
type AttendanceByDayDto = {
  date: string;
  attendanceCount: number;
};
```

Usar `date`, em vez de somente dia da semana, evita somar semanas de maneira ambígua.

### 1.3 Solicitações pendentes de parceiros

**Cobertura: completa na OpenAPI.**

| Necessidade | Operação | Resposta/corpo |
|---|---|---|
| Listar pendentes | `GET /api/membership/partner-requests?status=` | `PartnerRequestDto[]` |
| Aprovar | `PATCH /api/membership/partner-requests/{id}/approve` | Sem conteúdo |
| Recusar | `PATCH /api/membership/partner-requests/{id}/reject` | `{ rejectionReason?: string }` |

`PartnerRequestDto` contém `id`, `alunoId`, `alunoName`, `partner`, `partnerId`, `status`, `rejectionReason` e `createdAtUtc`. Ele preenche todos os campos atuais do card.

Pendência apenas no frontend: criar routes, types e hooks. Na recusa, a UI atual não coleta o motivo; o campo é opcional, mas pode ser interessante abrir uma confirmação com texto.

### 1.4 Aulas de hoje

**Cobertura: completa e já parcialmente implementada no app.**

`GET /api/scheduling/ocorrencias/today` retorna `OcorrenciaTodayDto[]` com:

- `id`, `aulaId` e `aulaName`;
- `modalidadeName` e `professorName`;
- `date`, `startTime`, `endTime` e `status`;
- `maxCapacity`, `confirmedCount` e `waitlistCount`;
- `pendingPayments`, `isSubscribed` e `subscriptionStatus`.

O app já possui `ScheduleRoutes.getTodayOccurrences()` e `TodayOccurrenceType`. É preciso apenas conferir se o tipo local permanece idêntico à OpenAPI e mapear os campos para a UI.

### 1.5 Alunos em risco

| Elemento/ação | Rota e schema | Cobertura |
|---|---|---|
| Lista de risco | `GET /api/analytics/churn` → `StudentAtRiskDto[]` | Coberto |
| Nome e identificador | `alunoName`, `alunoId` | Coberto |
| Motivos do risco | `reasons[]`, `score`, `level` | Coberto |
| Quantidade de faltas não canceladas | Não existe campo específico | Parcial |
| Abrir perfil | `GET /api/membership/alunos/{id}` → `AlunoDto` | Coberto na API |
| Registrar contato | `POST /api/analytics/churn/{alunoId}/contact` | Coberto na API |

`StudentAtRiskDto` também inclui `lastActivityDate`, `contractEndDate`, `contactedAtUtc` e `contactResult`. A solução mais direta é trocar o subtítulo do mock por `reasons`, em vez de buscar uma quantidade de faltas que a rota não promete.

## 2. Aulas

### 2.1 Aba Hoje

| Elemento | Fonte OpenAPI | Cobertura |
|---|---|---|
| Horário, modalidade, professor e status | `OcorrenciaTodayDto` | Coberto |
| Confirmados, capacidade e espera | `confirmedCount`, `maxCapacity`, `waitlistCount` | Coberto |
| Público Mista/Masculina/Feminina | `OcorrenciaDto.publicGender` ou `OcorrenciaDetailDto.publicGender` | Coberto, mas não pelo endpoint `/today` |
| Detalhe completo | `GET /api/scheduling/ocorrencias/{id}` → `OcorrenciaDetailDto` | Coberto |

O endpoint `/today` não possui `publicGender`. Para manter o filtro atual sem uma chamada de detalhe por card, há duas opções melhores:

1. usar `GET /api/scheduling/ocorrencias` com `startDate` e `endDate` iguais ao dia atual; `OcorrenciaDto` já inclui `publicGender`;
2. adicionar `publicGender` a `OcorrenciaTodayDto` no backend.

A primeira opção já é compatível com `ScheduleRoutes.getSchedule()`, embora os schemas locais devam ser revisados.

### 2.2 Confirmados, attendance e lista de espera

Há duas respostas complementares:

#### Detalhe operacional da ocorrência

`GET /api/scheduling/ocorrencias/{id}` retorna:

- `bookings: BookingDto[]`, com booking, aluno, status, origem e timestamps;
- `waitlist: WaitlistDto[]`, com `id`, aluno, `position`, status e criação;
- `publicGender`, `minLevel`, `releaseAt` e `waitlistTimeoutMinutes`.

Esse endpoint preenche diretamente as abas “Confirmados” e “Lista de espera”, inclusive a posição.

#### Lista de chamada

`GET /api/scheduling/ocorrencias/{id}/attendance` aceita `sortBy`, `sortDirection` e `status`, retornando:

- `presentCount`, `absentCount`, `pendingCount`;
- `lista: AttendanceListItemDto[]`;
- em cada item: `bookingId`, `studentId`, `studentName`, `photoUrl`, `status`, `level`, `paymentMethod`, `isExperimental` e `avulsoPending`.

Essa rota é adequada para chamada/presença; o detalhe da ocorrência é mais adequado ao modal atual de inscrições e espera.

### 2.3 “Chamar próximo da espera”

**Cobertura: ausente para a ação administrativa atual.**

Existe `POST /api/scheduling/bookings/{id}/confirm-waitlist`, mas sua descrição é “Confirma a vaga liberada da lista de espera dentro do prazo”. Portanto, ela representa a confirmação pelo aluno/booking após uma vaga já ter sido oferecida; não oferece administrativamente a vaga ao próximo da fila.

Se o backend promove e notifica automaticamente quando uma vaga é liberada, o botão deve ser removido. Caso o processo seja manual, falta uma operação como:

- `POST /api/scheduling/ocorrencias/{id}/waitlist/call-next`.

### 2.4 Grade semanal

**Cobertura: completa na API, ainda não implementada no frontend.**

`GET /api/scheduling/aulas` aceita `activeOnly`, `search`, paginação e ordenação. `AulaDtoPagedResult.items` contém:

- modalidade e professor, com IDs e nomes;
- `name`, `dayOfWeek`, `startTime` e `endTime`;
- `maxCapacity`, `isActive` e `allowTrial`;
- `minLevel`, `publicGender` e `waitlistTimeoutMinutes`.

`GET /api/scheduling/aulas/{id}` adiciona `futureOccurrences` e `activeBookings`. `PUT` e `DELETE` cobrem edição e cancelamento.

A UI mockada mostra confirmados/capacidade em cada célula semanal. `AulaDto` contém capacidade, mas não confirmados. Para exibir ocupação real, usar `futureOccurrences[].bookedCount` ou remover o número de confirmados da grade fixa.

### 2.5 Nova aula

`POST /api/scheduling/aulas` recebe `CreateAulaRequest`:

```ts
type CreateAulaRequest = {
  modalidadeId: string;
  professorId: string;
  name?: string;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  maxCapacity: number;
  allowTrial: boolean;
  minLevel?: string;
  publicGender?: string;
  waitlistTimeoutMinutes?: number;
};
```

Isso confirma que a rota cria uma aula recorrente da grade. O modal deve trocar **Data** por **Dia da semana** e acrescentar, conforme o produto, horário final, aula experimental, nível mínimo, público e timeout da espera.

Para aula pontual, a OpenAPI não oferece `POST /scheduling/ocorrencias`. Ela possui apenas `POST /api/scheduling/ocorrencias/generate`, que gera ocorrências a partir da grade e não substitui uma criação avulsa.

Fontes dos seletores:

- Modalidades: `GET /api/scheduling/modalidades`, já implementado em `CategoriesRoutes`.
- Professores: não existe endpoint de listagem da equipe/professores na OpenAPI. `POST /api/auth/register` apenas cadastra um usuário.

Logo, a listagem de professores continua sendo uma lacuna real.

## 3. Financeiro

### 3.1 Cards de receita

A OpenAPI oferece duas visões complementares.

#### Dashboard financeiro

`GET /api/analytics/financial` → `FinancialDashboardDto`:

- `mrr`;
- `ticketMedio`;
- `currentMonthRevenue` e `previousMonthRevenue`;
- `totalOverdueValue`;
- `delinquencyPercentage`.

#### Resumo operacional segmentado

`GET /api/analytics/financial/summary?month=` → `FinancialSummaryDto`:

- `monthly`, `gympass`, `totalpass`, `avulso` e `partner`;
- cada bloco contém `count`, `avgPrice` e `total`;
- `grandTotal` consolida o mês.

| Card atual | Campo disponível | Cobertura |
|---|---|---|
| Gympass | `gympass.count`, `avgPrice`, `total` | Completa |
| Totalpass | `totalpass.count`, `avgPrice`, `total` | Completa |
| Total estimado | `grandTotal` ou `FinancialDashboardDto.mrr` | Completa após definir semântica |
| Futevôlei | Não há receita segmentada por modalidade | Ausente |
| Funcional | Não há receita segmentada por modalidade | Ausente |

O bloco `monthly` representa a categoria de receita mensal, não uma modalidade. Para manter os cards Futevôlei e Funcional, o backend precisa incluir `byModality`. Alternativamente, a UI pode substituir esses cards por Mensalidades e Avulsos, que já são suportados.

### 3.2 Configuração de repasses Gympass/Totalpass

**Cobertura: completa na OpenAPI.**

`GET /api/tenant/settings` retorna `TenantSettingsDto`, incluindo:

- `gympassRepasse`;
- `totalpassRepasse`;
- outros dados do tenant.

`PUT /api/tenant/settings` aceita esses mesmos valores em `UpdateTenantSettingsCommand`.

A UI deve preservar os demais campos ao salvar ou confirmar se o backend trata propriedades omitidas como inalteradas. Como o método é `PUT`, enviar somente dois campos pode zerar/substituir configurações, dependendo da implementação.

### 3.3 Lista de contratos

`GET /api/membership/contratos` aceita `status`, `search`, `page` e `pageSize`, retornando `ContratoDtoPagedResult`.

| Campo da UI | Campo OpenAPI | Cobertura |
|---|---|---|
| Aluno | `alunoId`, `alunoName` | Coberto |
| Plano | `planoId`, `planoName` | Coberto |
| Valor | `effectivePrice`, `priceOverride`, `discountPct` | Coberto |
| Status contratual | `status` | Coberto |
| Vigência | `startDate`, `endDate` | Coberto |
| Tipo Mensalista/Gympass/Totalpass | Não existe em `ContratoDto` | Parcial |
| Modalidades | Não existem em `ContratoDto` | Parcial |
| Próximo vencimento | Não existe em `ContratoDto` | Parcial |
| Status financeiro Pago/Vencido/Pendente | Não existe em `ContratoDto` | Parcial |

`GET /api/payments` retorna cobranças paginadas com `alunoName`, `description`, `amount`, `dueDate`, `status` e `type`. Contudo, `CobrancaSummaryDto` não contém `alunoId` nem `contratoId`; portanto, não há chave confiável para combinar contratos e cobranças. Associar apenas por nome é inadequado.

Recomendações:

1. separar na UI status do contrato e status da cobrança; ou
2. adicionar `alunoId` e `contratoId` a `CobrancaSummaryDto`; ou
3. criar um DTO agregado específico para a visão de contratos financeiros.

Para modalidades, seria necessário buscar o plano por ID, mas a OpenAPI não possui `GET /api/membership/planos/{id}` — há apenas `PUT` nesse caminho. A lista de planos contém `modalidadeIds`, porém isso exigiria carregar todos os planos e ainda consultar os nomes das modalidades.

O filtro atual por modalidade não é suportado pelo endpoint de contratos. Pode ser aplicado localmente após composição ou adicionado como parâmetro `modalidadeId` no backend.

### 3.4 Ações financeiras disponíveis além da UI

A OpenAPI oferece operações não expostas na tela atual:

- confirmar, cancelar e reembolsar cobranças;
- conciliação de pagamentos;
- criar cobrança e assinatura;
- renovar, suspender e cancelar contratos;
- criar contrato;
- relatórios financeiros e exportação Excel/PDF.

Essas ações não bloqueiam a substituição dos mocks atuais, mas são candidatas à evolução da tela.

## 4. Cobertura implementada no frontend

| Recurso | API | Situação no app |
|---|---|---|
| Ocorrências de hoje | `/scheduling/ocorrencias/today` | Implementado em `ScheduleRoutes.getTodayOccurrences()` |
| Ocorrências por período | `/scheduling/ocorrencias` | Implementado em `ScheduleRoutes.getSchedule()` |
| Lista de chamada | `/scheduling/ocorrencias/{id}/attendance` | Implementado em `ScheduleRoutes.getAttendance()` |
| Presença, ausência e encerramento | endpoints de booking/ocorrência | Implementados em `ScheduleRoutes` |
| Modalidades | `/scheduling/modalidades` | Implementado em `CategoriesRoutes` |
| Alunos básicos | `/membership/alunos` | Implementado em `AlunosRoutes` |
| Planos | `/membership/planos` | Implementado em `PlansRoutes` |

Ainda faltam clientes, tipos e hooks administrativos para:

- analytics financeiro, operacional, alunos ativos e churn;
- partner requests;
- detalhe de ocorrência;
- grade de aulas;
- contratos;
- cobranças;
- tenant settings.

## 5. Plano recomendado para retirar os mocks

### Prioridade 1 — Aulas de hoje e detalhe

- usar `getSchedule()` no dia atual para obter também `publicGender`;
- adicionar `getOccurrenceById()` para bookings e waitlist;
- manter `getAttendance()` para a chamada;
- adaptar o modal de nova aula ao `CreateAulaRequest`.

Bloqueios: listagem de professores e decisão sobre “chamar próximo”.

### Prioridade 2 — Dashboard

- integrar `active-students`, `financial`, `operational`, `churn` e partner requests;
- trocar faltas do card de risco por `reasons`;
- trocar o gráfico por dados já disponíveis ou solicitar série diária;
- decidir se “Inadimplentes” mostrará valor, percentual ou uma nova contagem de alunos.

### Prioridade 3 — Financeiro

- integrar `financial/summary` para Gympass, Totalpass e total;
- usar `tenant/settings` para repasses;
- decidir se Futevôlei/Funcional serão substituídos por Mensalidades/Avulsos;
- redesenhar a lista para separar contratos e cobranças ou solicitar um DTO agregado.

## 6. Lacunas confirmadas na OpenAPI

1. Série diária de presenças para o gráfico do Dashboard.
2. Quantidade distinta de alunos inadimplentes.
3. Quantidade exata de faltas não canceladas em `StudentAtRiskDto`.
4. Ação administrativa para oferecer vaga ao próximo da espera, caso não seja automática.
5. Listagem de professores/equipe.
6. Criação de ocorrência pontual.
7. Receita agrupada por modalidade.
8. Chaves `alunoId`/`contratoId` nas cobranças para composição segura.
9. Modalidades e tipo do aluno no DTO de contratos.
10. Filtro de contratos por modalidade.

## 7. Checklist de alinhamento

- Confirmar os enums reais de status, `publicGender`, parceiro e nível, pois os schemas usam `string` sem enum.
- Confirmar se `noShowRate` pode ser invertido para taxa de presença.
- Definir se o card de receita usa `mrr`, `currentMonthRevenue` ou `grandTotal`.
- Confirmar o comportamento de campos omitidos no `PUT /tenant/settings`.
- Definir se a liberação da espera é automática.
- Definir se “Nova aula” significa grade recorrente ou ocorrência pontual.
- Decidir entre adaptar os cards financeiros ao contrato atual ou ampliar `FinancialSummaryDto`.
- Definir um vínculo explícito entre cobrança, aluno e contrato.

## Conclusão

A OpenAPI cobre mais do produto do que o inventário resumido indicava. Dashboard e Aulas podem sair majoritariamente dos mocks com as rotas existentes; Financeiro já possui resumo por tipo de receita e configuração de repasses, mas não suporta receita por modalidade nem a tabela híbrida de contrato e cobrança sem composição adicional. As lacunas restantes estão agora isoladas em campos e operações específicos, permitindo integrar primeiro o que já tem contrato estável e negociar com o backend apenas os pontos realmente ausentes.
