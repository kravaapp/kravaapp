# E2E de ponta a ponta (stack local)

Testa o fluxo da aula contra o backend de verdade: API, Postgres, RabbitMQ, jobs e consumers. As specs de
`e2e/` continuam simulando a API com `page.route` e não passam pelo backend.

## Como rodar

Pré-requisitos: Docker rodando e o repositório `Krava` ao lado do `frontend` (ou `KRAVA_DIR` apontando para ele).

```bash
npm run e2e:real
```

O comando:

1. sobe Postgres, Redis e RabbitMQ (`e2e-real/docker-compose.yml`, projeto `krava-e2e`);
2. aplica as migrations `Krava/sql/0*.sql` quando o banco acabou de nascer (ele roda em memória);
3. reconstrói a API com o código atual do Krava e espera `http://localhost:8090/health/ready`;
4. sobe o Expo web na porta 8099 apontando para a API local e roda as specs.

Rodar um cenário só: `npm run e2e:real -- jornada`. Derrubar a stack (descarta o banco): `npm run e2e:real:down`.
Relatório HTML com trace e screenshot das falhas: `npx playwright show-report e2e-real/report`.

## Cenários

| Spec | O que cobre |
|---|---|
| `jornada.spec.ts` | Dono cria a aula → aluno recebe o aviso e reserva → recebe o aviso de check-in (StudentCheckInJob, até 1 min) e faz o check-in → professor marca presença de quem veio sem check-in e encerra a chamada. |
| `jornada.spec.ts` (2º teste) | Professor busca um aluno do CT que chegou sem reserva, adiciona à aula (reserva presencial) e marca a presença, que continua lá depois de recarregar. |
| `fila.spec.ts` | Aula lotada → aluno entra na fila → professor marca falta → o da fila entra na chamada e é avisado. |
| `cancelamento.spec.ts` | Dono cancela a aula com uma reserva em `Faltou` (regressão de 23/10/2026) → aluno é avisado e o saldo do plano volta. |

Cada cenário cria o próprio CT pelo seed (`support/seed.ts`): dono, professor, alunos com plano e contrato ativos.
A aula é marcada a partir do horário atual no fuso do CT; perto da meia-noite o cenário é pulado.

Fica fora daqui, nos testes de integração do Krava: o AntiGhostJob (falta 1h depois do fim da aula) e os
timeouts da fila de espera.

## Travas de segurança

- O `Program.cs` do Krava carrega `appsettings.prod.local.json` por cima das variáveis de ambiente, e o build
  copia esse arquivo para a imagem. O compose troca esse arquivo por `appsettings.neutral.json` (vazio).
- O teste reprova se o app fizer qualquer requisição para `api.kravaapp.com.br` ou se a API local responder 5xx.
- O Expo sobe numa porta própria (8099), para não reaproveitar o Metro de desenvolvimento, que aponta para produção.
- A API roda em `Production`, como na VPS: em `Development` as minimal APIs respondem 500 onde prod responde 400.
