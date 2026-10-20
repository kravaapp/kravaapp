const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(relativePath, mocks = {}, extraExports = "") {
  const exports = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  vm.runInNewContext(source + extraExports, {
    exports,
    require: (name) => name in mocks ? mocks[name] : require(name),
  });
  return exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const helpers = load("src/utils/paymentGateways.ts");
const { gatewayConfigurationSchema, gatewayUpdateConfigurationSchema } = load("src/schemas/payments.schemas.ts");
const initial = [
  { gateway: "mercadopago", isActive: true, createdAtUtc: "2026-09-25T01:00:00Z" },
  { gateway: "abacatepay", isActive: false, createdAtUtc: "2026-09-20T10:00:00Z" },
];

test("activating a gateway replaces the active gateway without mutating the source", () => {
  const result = plain(helpers.updateGatewayStatuses(initial, "abacatepay", true));
  assert.equal(result.filter((item) => item.isActive).length, 1);
  assert.equal(result.find((item) => item.isActive).gateway, "abacatepay");
  assert.equal(result.find((item) => item.gateway === "abacatepay").createdAtUtc, initial[1].createdAtUtc);
  assert.equal(initial[0].isActive, true);
  assert.equal(initial[1].isActive, false);
});

test("saving an inactive gateway preserves the other active gateway", () => {
  const result = helpers.updateGatewayStatuses(initial, "abacatepay", false);
  assert.equal(result.find((item) => item.isActive).gateway, "mercadopago");
});

test("deactivating the active gateway leaves no active gateway", () => {
  assert.equal(helpers.updateGatewayStatuses(initial, "mercadopago", false).some((item) => item.isActive), false);
});

test("a newly configured gateway does not invent a configuration date", () => {
  assert.deepEqual(plain(helpers.updateGatewayStatuses([], "abacatepay", true)), [
    { gateway: "abacatepay", isActive: true, createdAtUtc: null },
  ]);
  assert.equal(helpers.gatewayConfigurationDate(null), null);
  assert.equal(helpers.gatewayConfigurationDate("invalid"), null);
});

test("validates required credentials, trims input and allows an omitted webhook secret", () => {
  assert.equal(gatewayConfigurationSchema.safeParse({ apiKey: "  ", isActive: true }).success, false);
  assert.equal(gatewayConfigurationSchema.safeParse({ apiKey: "key", isActive: "true" }).success, false);
  assert.deepEqual(gatewayConfigurationSchema.parse({ apiKey: " key ", isActive: false }), { apiKey: "key", isActive: false });

  assert.equal(gatewayUpdateConfigurationSchema.safeParse({ isActive: false }).success, true);
  assert.deepEqual(gatewayUpdateConfigurationSchema.parse({ apiKey: "  ", isActive: false }), { apiKey: undefined, isActive: false });
  assert.deepEqual(gatewayUpdateConfigurationSchema.parse({ apiKey: " key ", isActive: true }), { apiKey: "key", isActive: true });
});

function routesWith(api) {
  return load("src/routes/payments.routes.ts", {
    "./client": { __esModule: true, default: api },
    "@/utils/paymentGateways": helpers,
    "@/schemas/payments.schemas": load("src/schemas/payments.schemas.ts"),
  }).PaymentsRoutes;
}

test("GET uses the API client and removes credentials and unsupported gateways", async () => {
  const Routes = routesWith({
    get: (url) => {
      assert.equal(url, "/payments/gateways");
      return { json: async () => [
        { ...initial[0], apiKey: "should-never-be-cached", webhookSecret: "hidden" },
        { gateway: "abacatepay", isActive: false },
        { gateway: "unsupported", isActive: false },
      ] };
    },
  });
  assert.deepEqual(plain(await new Routes().getGateways()), [
    initial[0], { gateway: "abacatepay", isActive: false, createdAtUtc: null },
  ]);
});

test("PUT sends the requested status and credentials once and accepts an empty response", async () => {
  let calls = 0;
  const payload = { apiKey: "new-key", webhookSecret: "new-secret", isActive: true };
  const Routes = routesWith({
    put: async (url, options) => {
      calls++;
      assert.equal(url, "/payments/gateways/abacatepay");
      assert.deepEqual(plain(options.json), plain(payload));
      assert.equal(options.retry, 0);
    },
  });
  await new Routes().updateGateway("abacatepay", payload);
  assert.equal(calls, 1);
});

function hookHarness(fails = false) {
  let cached = initial;
  let resets = 0;
  let invalidations = 0;
  const Routes = routesWith({ put: async () => { if (fails) throw new Error("Request failed"); } });
  const queryClient = {
    setQueryData: (key, update) => {
      assert.deepEqual(plain(key), ["payment-gateways", "tenant-a"]);
      cached = update(cached);
    },
    invalidateQueries: () => { invalidations++; return Promise.resolve(); },
  };
  const hooks = load("src/hooks/payments.hooks.ts", {
    "@/hooks/auth.hooks": { useAuth: () => ({ user: { tenantId: "tenant-a" } }) },
    "@/routes/payments.routes": { PaymentsRoutes: Routes },
    "@/utils/paymentGateways": helpers,
    "@tanstack/react-query": {
      useQueryClient: () => queryClient,
      useQuery: (options) => {
        assert.deepEqual(plain(options.queryKey), ["payment-gateways", "tenant-a"]);
        return { data: cached, isLoading: false, isFetching: false };
      },
      useMutation: (options) => {
        assert.equal(options.gcTime, 0);
        assert.equal(options.retry, false);
        return {
          isPending: false,
          reset: () => { resets++; },
          mutateAsync: async (variables) => {
            await options.mutationFn(variables);
            options.onSuccess(undefined, variables);
          },
        };
      },
    },
  });
  return { hook: hooks.usePaymentGateways(), cache: () => cached, resets: () => resets, invalidations: () => invalidations };
}

test("successful PUT immediately updates tenant statuses, refetches and clears mutation state", async () => {
  const harness = hookHarness();
  await harness.hook.saveGateway("abacatepay", { apiKey: "key", webhookSecret: "secret", isActive: true });
  assert.equal(harness.cache().find((item) => item.isActive).gateway, "abacatepay");
  assert.doesNotMatch(JSON.stringify(harness.cache()), /apiKey|webhookSecret|secret/);
  assert.equal(harness.invalidations(), 2);
  assert.equal(harness.resets(), 1);
});

test("failed PUT keeps existing statuses and clears mutation state", async () => {
  const harness = hookHarness(true);
  await assert.rejects(harness.hook.saveGateway("abacatepay", { apiKey: "key", isActive: true }), /Request failed/);
  assert.deepEqual(harness.cache(), initial);
  assert.equal(harness.invalidations(), 0);
  assert.equal(harness.resets(), 1);
});

function formHarness(props) {
  const state = [];
  let cursor = 0;
  const react = {
    useState: (initial) => {
      const slot = cursor++;
      if (!(slot in state)) state[slot] = initial;
      return [state[slot], (value) => { state[slot] = typeof value === "function" ? value(state[slot]) : value; }];
    },
    useRef: (initial) => {
      const slot = cursor++;
      return state[slot] ??= { current: initial };
    },
  };
  const native = Object.fromEntries(["ActivityIndicator", "Modal", "Switch", "Text", "TextInput", "TouchableOpacity", "View"].map((name) => [name, name]));
  const exported = load("src/app/(admin)/financial/gateways.tsx", {
    react,
    "react-native": { ...native, StyleSheet: { create: (styles) => styles } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "lucide-react-native": Object.fromEntries(["Check", "Eye", "EyeOff", "ShieldCheck", "X"].map((name) => [name, name])),
    "@/components/ClientHeader": { COLORS: {} },
    "@/components/KeyboardAvoider": { __esModule: true, default: "KeyboardAvoider" },
    "@/components/ScreenScrollView": { __esModule: true, default: "ScreenScrollView" },
    "@/components/RefreshableScrollView": { __esModule: true, default: "RefreshableScrollView" },
    "@/hooks/screenRefresh.hooks": { useScreenRefresh: () => ({ refreshing: false, onRefresh: () => {} }) },
    "@/components/Toast": {},
    "@/components/AppModal": { __esModule: true, default: native.Modal },
    "@/components/admin/AdminUi": { ActionButton: "ActionButton" },
    "@/hooks/payments.hooks": {},
    "@/routes/apiError": { normalizeApiError: (_, fallback) => ({ description: fallback }) },
    "@/schemas/payments.schemas": load("src/schemas/payments.schemas.ts"),
    "@/utils/paymentGateways": helpers,
  }, "\nexports.GatewayModal = GatewayModal;\nexports.DeactivateConfirmModal = DeactivateConfirmModal;\nexports.SwitchGatewayModal = SwitchGatewayModal;");
  const render = () => { cursor = 0; return exported.GatewayModal(props); };
  function findAll(tree, predicate) {
    if (!tree || typeof tree !== "object") return [];
    if (Array.isArray(tree)) return tree.flatMap((item) => findAll(item, predicate));
    return [...(predicate(tree) ? [tree] : []), ...findAll(tree.props?.children, predicate)];
  }
  return {
    render,
    renderDeactivate: (deactivateProps) => { cursor = 0; return exported.DeactivateConfirmModal(deactivateProps); },
    renderSwitch: (switchProps) => { cursor = 0; return exported.SwitchGatewayModal(switchProps); },
    buttons: (tree) => findAll(tree, (node) => node.type === "ActionButton"),
    fields: (tree) => findAll(tree, (node) => typeof node.type === "function" && node.type.name === "SecretField"),
  };
}

const editor = { gateway: "abacatepay", configured: true, isActive: true, previousActive: false, intent: "activate" };
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("switching gateways requires confirmation and repeated confirm taps send only one PUT", async () => {
  let saves = 0;
  let saved = 0;
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const form = formHarness({
    editor, activeOther: "Mercado Pago", refreshing: false, onClose: () => {},
    onSave: async (payload) => { saves++; assert.equal(payload.apiKey, "new-key"); assert.equal(payload.isActive, true); await pending; },
    onSaved: () => { saved++; },
  });
  form.fields(form.render())[0].props.onChange("new-key");
  form.buttons(form.render())[0].props.onPress();
  assert.equal(saves, 0);
  let confirm = form.buttons(form.render()).find((button) => button.props.label === "Confirmar troca");
  assert.ok(confirm);
  confirm.props.onPress();
  confirm.props.onPress();
  assert.equal(saves, 1);
  assert.ok(form.buttons(form.render()).every((button) => button.props.disabled));
  finish();
  await tick();
  assert.equal(saved, 1);
});

test("missing credentials on new gateway and canceling a replacement never send a PUT", () => {
  let saves = 0;
  const newGatewayEditor = { gateway: "abacatepay", configured: false, isActive: true, previousActive: false, intent: "activate" };
  const form = formHarness({ editor: newGatewayEditor, activeOther: "Mercado Pago", refreshing: false, onClose: () => {}, onSaved: () => {}, onSave: async () => { saves++; } });
  form.buttons(form.render())[0].props.onPress();
  assert.equal(saves, 0);
  assert.ok(form.fields(form.render()).length);
  form.fields(form.render())[0].props.onChange("new-key");
  form.buttons(form.render())[0].props.onPress();
  form.buttons(form.render()).find((button) => button.props.label === "Voltar à configuração").props.onPress();
  assert.equal(saves, 0);
  assert.equal(form.fields(form.render())[0].props.value, "new-key");
});

test("saving a configured gateway without typing credentials keeps credentials omitted", async () => {
  let savedPayload = null;
  const configuredEditor = { gateway: "abacatepay", configured: true, isActive: false, previousActive: true, intent: "configure" };
  const form = formHarness({
    editor: configuredEditor, refreshing: false, onClose: () => {}, onSaved: () => {},
    onSave: async (payload) => { savedPayload = payload; },
  });
  form.buttons(form.render())[0].props.onPress();
  await tick();
  assert.deepEqual(plain(savedPayload), { isActive: false });
});

test("deactivate confirmation modal renders impact warning and triggers deactivation on confirm", async () => {
  let confirmed = false;
  const harness = formHarness({});
  const modal = harness.renderDeactivate({
    gateway: "mercadopago",
    onClose: () => {},
    onConfirm: async () => { confirmed = true; },
    busy: false,
  });
  const confirmButton = harness.buttons(modal).find((btn) => btn.props.label === "Confirmar desativação");
  assert.ok(confirmButton);
  await confirmButton.props.onPress();
  assert.equal(confirmed, true);
});

test("switch gateway modal renders current active name and triggers switch on confirm", async () => {
  let switched = false;
  const harness = formHarness({});
  const modal = harness.renderSwitch({
    targetGateway: "abacatepay",
    currentActiveName: "Mercado Pago",
    onClose: () => {},
    onConfirm: async () => { switched = true; },
    busy: false,
  });
  const confirmButton = harness.buttons(modal).find((btn) => btn.props.label === "Confirmar troca");
  assert.ok(confirmButton);
  await confirmButton.props.onPress();
  assert.equal(switched, true);
});
