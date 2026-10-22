import { useToast } from "@/components/Toast";
import { useMyPartnerAccesses } from "@/hooks/partners.hooks";
import { useCurrentPlan } from "@/hooks/plans.hooks";

export function useBookingEligibility() {
    const { currentPlan, isLoading: isLoadingPlan, error } = useCurrentPlan();
    // Acesso via parceiro (Gympass/TotalPass) também libera o agendamento; o back-end decide de onde a aula sai.
    const { partnerAccesses, isLoading: isLoadingPartner } = useMyPartnerAccesses();
    const hasPartner = partnerAccesses.length > 0;
    const { toast } = useToast();
    const hasActivePlan = !error && currentPlan?.status?.trim().toLowerCase() === "ativo";
    const isLoading = isLoadingPlan || (!hasActivePlan && isLoadingPartner);
    const canBook = !isLoading && (hasActivePlan || hasPartner);

    // Os botões mantêm o toque disponível para explicar o bloqueio pelo toast.
    const ensureCanBook = () => {
        if (canBook) return true;

        toast({
            title: isLoading
                ? "Aguarde a verificação do seu plano."
                : error && !hasPartner
                    ? "Não foi possível verificar seu plano. Tente novamente."
                    : "Você não possui um plano ativo para agendar aulas.",
            variant: "destructive",
        });
        return false;
    };

    return { canBook, ensureCanBook };
}
