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
const masks = load("src/utils/masks.ts");

function harness() {
  const state = [], requests = [], toasts = [];
  let cursor = 0, effect;
  const settings = { memberBookingWindowMinutes: 90, partnerBookingWindowMinutes: 2880, cancellationTimeoutMinutes: 60, noShowPenaltyFee: 10 };
  const Screen = load("src/app/(admin)/settings.tsx", {
    react: { ...React,
      useState: (initial) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
      },
      useEffect: (callback) => { effect = callback; },
    },
    "react-native": { StyleSheet: { create: (styles) => styles }, TextInput: "TextInput", View: "View", Text: "Text" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ bottom: 0 }) },
    "expo-router": {}, "lucide-react-native": {},
    "@/components/AppModal": { __esModule: true, default: "Modal" },
    "@/components/KeyboardAvoider": { __esModule: true, default: "KeyboardAvoider" },
    "@/components/ChangePasswordModal": { __esModule: true, default: "PasswordModal" },
    "@/components/RefreshableScrollView": { __esModule: true, default: "ScrollView" },
    "@/components/ClientHeader": { __esModule: true, default: "Header", COLORS: {} },
    "@/components/admin/AdminUi": {},
    "@/components/Toast": { useToast: () => ({ toast: (value) => toasts.push(value) }) },
    "@/hooks/screenRefresh.hooks": { useScreenRefresh: () => ({}) },
    "@/hooks/settings.hooks": {
      useAdminSettings: () => ({ rules: [], tenantSettings: settings, loading: {} }),
      useSettingsActions: () => ({ updateTenant: async (value) => requests.push(value) }),
    },
    "@/hooks/partners.hooks": { useTenantPartners: () => ({ partners: [] }), usePartnerActions: () => ({}) },
    "@/routes/apiError": {}, "@/utils/masks": masks,
  }).default;
  function render() { cursor = 0; return Screen(); }
  function find(node, predicate) {
    if (!node || typeof node !== "object") return;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const found = find(child, predicate);
      if (found) return found;
    }
  }
  render(); effect();
  const modal = () => find(render(), (node) => node.type?.name === "EditSettingModal");
  return {
    requests, toasts,
    row: (label) => find(render(), (node) => node.props?.label === label).props,
    modal,
    input: () => { const element = modal(); return find(element.type(element.props), (node) => node.type === "TextInput").props; },
  };
}

test("loads minutes as HH:MM, including durations above 24 hours", () => {
  const app = harness();
  assert.equal(app.row("Antecedência para Mensalistas").value, "01:30");
  assert.equal(app.row("Antecedência para Parceiros (Gympass/TotalPass)").value, "48:00");
  assert.equal(masks.toDurationInput(null), "");
  assert.equal(masks.toDurationInput(0), "00:00");
});

for (const label of ["Antecedência para Mensalistas", "Antecedência para Parceiros (Gympass/TotalPass)"]) {
  test(`${label}: masks input as HH:MM and sends minutes`, async () => {
    const app = harness();
    app.row(label).onPress();
    assert.equal(app.input().placeholder, "00:00");
    app.input().onChangeText("0230");
    assert.equal(app.input().value, "02:30");
    await app.modal().props.onSave();
    const key = label.includes("Mensalistas") ? "memberBookingWindowMinutes" : "partnerBookingWindowMinutes";
    assert.equal(app.requests[0][key], 150);
    assert.equal(app.requests[0].cancellationTimeoutMinutes, 60);
    assert.equal(app.requests[0].noShowPenaltyFee, 10);
  });
}

test("cancel restores the saved HH:MM value", () => {
  const app = harness();
  app.row("Antecedência para Mensalistas").onPress();
  app.input().onChangeText("1000");
  app.modal().props.onClose();
  assert.equal(app.row("Antecedência para Mensalistas").value, "01:30");
  assert.equal(app.requests.length, 0);
});

test("empty and zero durations keep the unrestricted API values", async () => {
  const app = harness();
  app.row("Antecedência para Mensalistas").onPress();
  app.input().onChangeText("");
  app.row("Antecedência para Parceiros (Gympass/TotalPass)").onPress();
  app.input().onChangeText("0000");
  await app.modal().props.onSave();
  assert.equal(app.requests[0].memberBookingWindowMinutes, null);
  assert.equal(app.requests[0].partnerBookingWindowMinutes, 0);
});

test("incomplete durations and invalid minute components cannot be saved", async () => {
  const app = harness();
  app.row("Antecedência para Mensalistas").onPress();
  for (const input of ["01", "0190", "123"]) {
    app.input().onChangeText(input);
    await app.modal().props.onSave();
  }
  assert.equal(app.requests.length, 0);
  assert.equal(app.toasts.length, 3);
  assert.ok(app.toasts.every((toast) => toast.variant === "destructive"));
});
