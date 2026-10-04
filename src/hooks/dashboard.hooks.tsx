import { DashboardRoutes } from "@/routes/dashboard.routes";
import { StudentAtRiskType } from "@/types/dashboard.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ApiError = Error & { data?: { detail?: string } };

export function useTeacherDashboard() {
  const query = useQuery({
    queryKey: ["teacher-dashboard"],
    queryFn: async () => {
      const dashboardRoutes = new DashboardRoutes();
      return await dashboardRoutes.getTeacherDashboard();
    },
  });

  return {
    teacherDashboard: query.data,
    isLoading: query.isLoading,
    error: query.error
      ? (query.error as ApiError).data?.detail ||
        query.error.message ||
        "Erro ao buscar o dashboard do professor"
      : null,
    refetch: query.refetch,
  };
}

export function useAdminDashboard(
  startDate: string,
  endDate: string,
  attendanceStartDate = startDate,
  attendanceEndDate = endDate,
) {
  const routes = new DashboardRoutes();
  const activeStudents = useQuery({
    queryKey: ["admin-active-students"],
    queryFn: () => routes.getActiveStudents(),
  });
  const financial = useQuery({
    queryKey: ["admin-financial-dashboard"],
    queryFn: () => routes.getFinancialDashboard(),
  });
  const operational = useQuery({
    queryKey: ["admin-operational-dashboard", startDate, endDate],
    queryFn: () => routes.getOperationalDashboard(startDate, endDate),
  });
  const dailyAttendance = useQuery({
    queryKey: [
      "admin-daily-attendance",
      attendanceStartDate,
      attendanceEndDate,
    ],
    queryFn: () =>
      routes.getDailyAttendance(attendanceStartDate, attendanceEndDate),
  });
  const studentsAtRisk = useQuery({
    queryKey: ["admin-students-at-risk"],
    queryFn: () => routes.getStudentsAtRisk(),
  });
  const partnerRequests = useQuery({
    queryKey: ["admin-partner-requests"],
    queryFn: () => routes.getPartnerRequests(),
  });

  return {
    activeStudents: activeStudents.data,
    financial: financial.data,
    operational: operational.data,
    dailyAttendance: dailyAttendance.data ?? [],
    studentsAtRisk: studentsAtRisk.data ?? [],
    partnerRequests: (partnerRequests.data ?? []).filter((request) => {
      const status = request.status?.toLocaleLowerCase("pt-BR");
      return status === "pending" || status === "pendente";
    }),
    loading: {
      activeStudents: activeStudents.isLoading,
      financial: financial.isLoading,
      operational: operational.isLoading,
      dailyAttendance: dailyAttendance.isLoading,
      studentsAtRisk: studentsAtRisk.isLoading,
      partnerRequests: partnerRequests.isLoading,
    },
    isLoading:
      activeStudents.isLoading ||
      financial.isLoading ||
      operational.isLoading ||
      dailyAttendance.isLoading ||
      studentsAtRisk.isLoading ||
      partnerRequests.isLoading,
    hasError:
      activeStudents.isError ||
      financial.isError ||
      operational.isError ||
      dailyAttendance.isError ||
      studentsAtRisk.isError ||
      partnerRequests.isError,
  };
}

export function usePartnerRequestActions() {
  const queryClient = useQueryClient();
  const routes = new DashboardRoutes();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-partner-requests"] });
  const approve = useMutation({
    mutationFn: (id: string) => routes.approvePartnerRequest(id),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      routes.rejectPartnerRequest(id, reason),
    onSuccess: invalidate,
  });

  return {
    approvePartnerRequest: approve.mutateAsync,
    rejectPartnerRequest: reject.mutateAsync,
    isLoading: approve.isPending || reject.isPending,
  };
}

export function useChurnRiskActions() {
  const queryClient = useQueryClient();
  const routes = new DashboardRoutes();

  const markContacted = useMutation({
    mutationFn: ({ alunoId, result }: { alunoId: string; result: string }) =>
      routes.markStudentContacted(alunoId, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students-at-risk"] });
    },
  });

  return {
    markStudentContacted: markContacted.mutateAsync,
    isLoading: markContacted.isPending,
  };
}

export function useStudentsAtRisk() {
  const routes = new DashboardRoutes();
  const query = useQuery({
    queryKey: ["admin-students-at-risk"],
    queryFn: () => routes.getStudentsAtRisk(),
  });

  return {
    studentsAtRisk: (query.data ?? []) as StudentAtRiskType[],
    isLoading: query.isLoading,
    refetch: query.refetch,
    error: query.error,
  };
}
