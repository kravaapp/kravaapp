import { useToast } from "@/components/Toast";
import { useCurrentPlan } from "@/hooks/plans.hooks";

export function useBookingEligibility() {
    const { currentPlan, isLoading, error } = useCurrentPlan();
    const { toast } = useToast();
    const canBook = !isLoading && !error && currentPlan?.status?.trim().toLowerCase() === "ativo";

    // Os botões mantêm o toque disponível para explicar o bloqueio pelo toast.
    const ensureCanBook = () => {
        if (canBook) return true;

        toast({
            title: isLoading
                ? "Aguarde a verificação do seu plano."
                : error
                    ? "Não foi possível verificar seu plano. Tente novamente."
                    : "Você não possui um plano ativo para agendar aulas.",
            variant: "destructive",
        });
        return false;
    };

    return { canBook, ensureCanBook };
}
