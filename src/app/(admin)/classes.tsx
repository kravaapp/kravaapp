import {
  ActionButton,
  AdminCard,
  AdminScreen,
  Pill,
  ProgressBar,
  SectionTitle,
  initials,
} from "@/components/admin/AdminUi";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import {
  AdminAudience,
  adminClasses,
  confirmedStudents,
  waitlistStudents,
} from "@/data/adminMockData";
import { Check, Plus, X } from "lucide-react-native";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ClassItem = (typeof adminClasses)[number];
const filters: ("Todos" | AdminAudience)[] = [
  "Todos",
  "Mista",
  "Masculina",
  "Feminina",
];

export default function AdminClasses() {
  const { toast } = useToast();
  const [view, setView] = useState<"today" | "week">("today");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [selected, setSelected] = useState<ClassItem | null>(null);
  const [newClass, setNewClass] = useState(false);
  const visibleClasses = adminClasses.filter(
    (item) => filter === "Todos" || item.audience === filter,
  );
  return (
    <SafeAreaView style={styles.safeArea}>
      <ClientHeader />
      <ScrollView>
        <AdminScreen>
          <View style={styles.segment}>
            <TouchableOpacity
              onPress={() => setView("today")}
              style={[
                styles.segmentButton,
                view === "today" && styles.segmentActive,
              ]}
            >
              <Text style={styles.segmentText}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setView("week")}
              style={[
                styles.segmentButton,
                view === "week" && styles.segmentActive,
              ]}
            >
              <Text style={styles.segmentText}>Grade semanal</Text>
            </TouchableOpacity>
          </View>
          {view === "today" ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
              >
                {filters.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setFilter(item)}
                    style={[
                      styles.filter,
                      filter === item && styles.filterActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filter === item && styles.filterTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {visibleClasses.map((item) => {
                const pct = (item.confirmed / item.capacity) * 100;
                return (
                  <AdminCard key={item.id}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.time}>{item.time}</Text>
                      <Pill
                        label={item.status}
                        tone={
                          item.status === "Em andamento"
                            ? "success"
                            : item.status === "Encerrada"
                              ? "neutral"
                              : "info"
                        }
                      />
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.title}>{item.modality}</Text>
                      <Pill label={item.audience} tone="primary" />
                    </View>
                    <Text style={styles.muted}>{item.teacher}</Text>
                    <View style={styles.row}>
                      <ProgressBar value={pct} />
                      <Text style={styles.count}>
                        {item.confirmed}/{item.capacity}
                      </Text>
                    </View>
                    <View style={styles.rowBetween}>
                      {item.waitlist ? (
                        <Pill
                          label={`${item.waitlist} na espera`}
                          tone="warning"
                        />
                      ) : (
                        <Text style={styles.muted}>Sem lista de espera</Text>
                      )}
                      <ActionButton
                        outline
                        label="Ver lista"
                        onPress={() => setSelected(item)}
                      />
                    </View>
                  </AdminCard>
                );
              })}
            </>
          ) : (
            <AdminCard>
              <SectionTitle>Grade semanal</SectionTitle>
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, index) => (
                <View key={day} style={styles.weekRow}>
                  <Text style={styles.day}>{day}</Text>
                  <View style={styles.grow}>
                    {adminClasses
                      .slice(index % 3, (index % 3) + 2)
                      .map((item) => (
                        <View key={`${day}-${item.id}`} style={styles.slot}>
                          <Text style={styles.slotTitle}>
                            {item.time} · {item.modality}
                          </Text>
                          <Text style={styles.muted}>
                            {item.teacher} · {item.confirmed}/{item.capacity}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              ))}
            </AdminCard>
          )}
        </AdminScreen>
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => setNewClass(true)}>
        <Plus size={25} color="#fff" />
      </TouchableOpacity>
      <ClassModal
        item={selected}
        onClose={() => setSelected(null)}
        onToast={(title) => toast({ title })}
      />
      <Modal
        transparent
        animationType="slide"
        visible={newClass}
        onRequestClose={() => setNewClass(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.rowBetween}>
              <SectionTitle>Nova aula</SectionTitle>
              <TouchableOpacity onPress={() => setNewClass(false)}>
                <X color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            {["Modalidade", "Professor", "Data", "Horário", "Capacidade"].map(
              (label) => (
                <View key={label}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    placeholder={`Informe ${label.toLowerCase()}`}
                    style={styles.input}
                  />
                </View>
              ),
            )}
            <ActionButton
              label="Criar aula"
              onPress={() => {
                setNewClass(false);
                toast({ title: "Aula criada no mock!" });
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ClassModal({
  item,
  onClose,
  onToast,
}: {
  item: ClassItem | null;
  onClose: () => void;
  onToast: (title: string) => void;
}) {
  const [tab, setTab] = useState<"confirmed" | "waitlist">("confirmed");
  if (!item) return null;
  const names =
    tab === "confirmed"
      ? confirmedStudents.slice(0, item.confirmed)
      : waitlistStudents.slice(0, item.waitlist);
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.rowBetween}>
            <SectionTitle>
              {item.time} · {item.modality}
            </SectionTitle>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                tab === "confirmed" && styles.segmentActive,
              ]}
              onPress={() => setTab("confirmed")}
            >
              <Text style={styles.segmentText}>
                Confirmados ({item.confirmed})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                tab === "waitlist" && styles.segmentActive,
              ]}
              onPress={() => setTab("waitlist")}
            >
              <Text style={styles.segmentText}>Espera ({item.waitlist})</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 320 }}>
            {names.length ? (
              names.map((name, i) => (
                <View key={name} style={styles.person}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(name)}</Text>
                  </View>
                  <Text style={[styles.title, styles.grow]}>{name}</Text>
                  {tab === "confirmed" ? (
                    <Check size={16} color={COLORS.success} />
                  ) : (
                    <Pill label={`#${i + 1}`} tone="warning" />
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Nenhum aluno na lista de espera</Text>
            )}
          </ScrollView>
          {tab === "waitlist" && names.length > 0 && (
            <ActionButton
              label="Chamar próximo"
              onPress={() => onToast("Próximo da espera chamado!")}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  segment: {
    flexDirection: "row",
    backgroundColor: "#eef0f3",
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: COLORS.white },
  segmentText: { fontSize: 12, fontWeight: "700", color: COLORS.foreground },
  filters: { gap: 8 },
  filter: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: COLORS.white,
  },
  filterActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  filterText: {
    color: COLORS.mutedForeground,
    fontWeight: "600",
    fontSize: 12,
  },
  filterTextActive: { color: COLORS.white },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  time: { color: COLORS.mainOrange, fontSize: 24, fontWeight: "800" },
  title: { color: COLORS.foreground, fontSize: 14, fontWeight: "700" },
  muted: { color: COLORS.mutedForeground, fontSize: 12 },
  count: { fontSize: 12, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.mainOrange,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  weekRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  day: { width: 34, fontWeight: "800", color: COLORS.foreground },
  grow: { flex: 1 },
  slot: {
    backgroundColor: COLORS.subOrange,
    borderRadius: 10,
    padding: 9,
    marginBottom: 6,
  },
  slotTitle: { color: COLORS.mainOrange, fontSize: 12, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
    maxHeight: "88%",
  },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 9,
    marginBottom: 5,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.successSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#15803d", fontSize: 10, fontWeight: "800" },
  empty: { textAlign: "center", color: COLORS.mutedForeground, padding: 24 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: COLORS.foreground,
  },
});
