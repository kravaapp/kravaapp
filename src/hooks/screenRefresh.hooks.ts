import { useToast } from "@/components/Toast";
import { normalizeApiError } from "@/routes/apiError";
import { matchQuery, QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

type RefreshTask = () => Promise<unknown>;
type RefreshOptions = { enabled?: boolean; refetch?: RefreshTask[] };

/** Atualiza as consultas da tela sem repetir mutations ou mudar filtros. */
export function useScreenRefresh(queryKeys: QueryKey[], options: RefreshOptions = {}) {
  const client = useQueryClient();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  const current = useRef({ queryKeys, options });
  current.current = { queryKeys, options };

  const onRefresh = useCallback(async () => {
    if (inFlight.current || current.current.options.enabled === false) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const { queryKeys: keys, options: config } = current.current;
      const queries = client.getQueryCache().findAll({ type: "active" })
        .filter((query) => keys.some((queryKey) => matchQuery({ queryKey }, query))
          || matchQuery({ queryKey: ["notifications", "unread-count"] }, query));
      const results = await Promise.allSettled([
        ...queries.map((query) => client.refetchQueries(
          { queryKey: query.queryKey, exact: true, type: "active" },
          { throwOnError: true, cancelRefetch: false },
        )),
        ...(config.refetch ?? []).map(async (refetch) => {
          const result = await refetch();
          if (result && typeof result === "object" && "error" in result && result.error) throw result.error;
        }),
      ]);
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    } catch (error) {
      toast({
        title: normalizeApiError(error, "Não foi possível atualizar os dados. Tente novamente.").description,
        variant: "destructive",
      });
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [client, toast]);

  return { refreshing, onRefresh, enabled: options.enabled !== false };
}
