/**
 * Sinal "one-shot" de qual ocorrência abrir na tela de chamada.
 *
 * É definido quando o professor clica em "Abrir chamada" na tela inicial e
 * consumido uma única vez ao focar a tela de chamada. Ao voltar para a tela
 * pela navegação do menu (sem clicar no botão), não há sinal novo e a tela
 * volta à regra padrão (primeira ocorrência do dia).
 */
let pendingOcorrenciaId: string | null = null;

export const setPendingOcorrenciaId = (ocorrenciaId: string) => {
    pendingOcorrenciaId = ocorrenciaId;
};

export const consumePendingOcorrenciaId = (): string | null => {
    const ocorrenciaId = pendingOcorrenciaId;
    pendingOcorrenciaId = null;
    return ocorrenciaId;
};
