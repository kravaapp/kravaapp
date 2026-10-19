const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const React = require("react");
const ts = require("typescript");

function load(file, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => mocks[name] ?? require(name) });
  return exports;
}

async function renderBookingScreen(file, failure) {
  const ky = await import("ky");
  const apiErrors = load("src/routes/apiError.ts", {
    ky,
    "@/utils/mercadoPagoErrors": load("src/utils/mercadoPagoErrors.ts"),
  });
  const selected = { id: "class-1" };
  const states = [selected, true];
  const updates = [];
  const toasts = [];
  const requests = [];
  let stateIndex = 0;
  const ConfirmBookingModal = () => null;
  const screen = load(file, {
    react: {
      ...React,
      useState: (initial) => {
        const index = stateIndex++;
        return [index < states.length ? states[index] : initial, (value) => updates.push({ index, value })];
      },
      useMemo: (callback) => callback(),
      useEffect: () => {},
    },
    "react-native": {
      View: "View", Text: "Text", ScrollView: "ScrollView", TouchableOpacity: "TouchableOpacity",
      ActivityIndicator: "ActivityIndicator", StyleSheet: { create: (styles) => styles },
    },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "lucide-react-native": {},
    "expo-router": {},
    ".": {},
    "@/components/RefreshableFlatList": { __esModule: true, default: "List" },
    "@/components/ClientHeader": { __esModule: true, default: "Header", COLORS: {} },
    "@/components/ConfirmBookingModal": { ConfirmBookingModal },
    "@/components/ConfirmModal": {},
    "@/components/StatusBadge": {},
    "@/components/Toast": { useToast: () => ({ toast: (options) => toasts.push(options) }) },
    "@/hooks/screenRefresh.hooks": { useScreenRefresh: () => ({}) },
    "@/hooks/auth.hooks": { useAuth: () => ({ user: {} }) },
    "@/hooks/bookingEligibility.hooks": { useBookingEligibility: () => ({ canBook: true, ensureCanBook: () => true }) },
    "@/hooks/categories.hooks": { useCategories: () => ({ categories: [] }) },
    "@/hooks/schedule.hooks": {
      useSchedule: () => ({}),
      useCreateSchedule: () => ({
        createSchedule: async (params) => {
          requests.push(params.ocorrenciaId);
          if (failure) throw failure;
        },
      }),
    },
    "@/routes/apiError": apiErrors,
  }).default();
  const modal = React.Children.toArray(screen.props.children).find((child) => child.type === ConfirmBookingModal);
  await modal.props.onConfirm();
  assert.deepEqual(requests, [selected.id]);
  assert.ok(updates.some(({ index, value }) => index === 0 && value === null));
  assert.ok(updates.some(({ index, value }) => index === 1 && value === false));
  return toasts;
}

for (const file of ["src/app/(user)/index.tsx", "src/app/(user)/schedule.tsx"]) {
  test(`${file}: shows the API booking error in a destructive toast`, async () => {
    const { default: ky } = await import("ky");
    const description = "Esta aula já foi iniciada e não aceita novos agendamentos.";
    const failure = await ky.post("https://api.example.test/scheduling/bookings", {
      retry: 0,
      fetch: async () => new Response(JSON.stringify({
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        title: "Bad Request", status: 400, detail: description,
        errors: [{ code: "Scheduling.ClassAlreadyStarted", description }],
      }), { status: 400, headers: { "Content-Type": "application/problem+json" } }),
    }).catch((error) => error);
    assert.equal(failure.response.bodyUsed, true);
    const toasts = await renderBookingScreen(file, failure);
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0].description, description);
    assert.equal(toasts[0].variant, "destructive");
  });

  test(`${file}: falls back to a readable error for unexpected failures`, async () => {
    const toasts = await renderBookingScreen(file, new Error("Unexpected internal failure"));
    assert.equal(toasts[0].description, "Não foi possível realizar o agendamento.");
    assert.equal(toasts[0].variant, "destructive");
  });

  test(`${file}: closes the modal without an error toast after booking succeeds`, async () => {
    assert.deepEqual(await renderBookingScreen(file), []);
  });
}
