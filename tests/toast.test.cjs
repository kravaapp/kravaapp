const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const React = require("react");
const ts = require("typescript");

function load(file, mocks, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => mocks[name] ?? require(name), ...globals });
  return exports;
}

function harness(platform, current = { id: 1, title: "Aviso", description: "Informação" }) {
  let state = current;
  let effect;
  let timeout;
  let fadeOut;
  let stopped = false;
  let cleared = false;
  const native = {
    View: "View", Text: "Text", Modal: "NativeModal", Platform: { OS: platform },
    StyleSheet: { create: (styles) => styles },
    Animated: {
      View: "AnimatedView",
      Value: class {
        setValue() {}
        stopAnimation() {
          stopped = true;
          fadeOut?.({ finished: false });
        }
      },
      timing: (_value, options) => ({ start: (callback) => { if (options.toValue === 0) fadeOut = callback; } }),
    },
  };
  const toast = load("src/components/Toast.tsx", {
    react: {
      ...React,
      useState: () => [state, (next) => { state = next; }],
      useRef: (value) => ({ current: value }),
      useCallback: (callback) => callback,
      useEffect: (callback) => { effect = callback; },
      useContext: (context) => context._currentValue,
    },
    "react-native": native,
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 12 }) },
    "@/constants/colors": { COLORS: { navy: "navy", destructive: "red" } },
  }, {
    setTimeout: (callback, delay) => { assert.equal(delay, 3000); timeout = callback; return 1; },
    clearTimeout: () => { cleared = true; },
  });

  const provider = toast.ToastProvider({ children: "screen" });
  provider.type._currentValue = provider.props.value;
  const display = provider.props.children;
  display.type._currentValue = display.props.value;
  return {
    toast, native, root: display.props.children,
    state: () => state, effect: () => effect(), timeout: () => timeout(),
    finish: (finished) => fadeOut({ finished }), stopped: () => stopped, cleared: () => cleared,
  };
}

for (const platform of ["android", "ios", "web"]) {
  test(`${platform}: toast is a noninteractive overlay instead of a native modal`, () => {
    const app = harness(platform);
    assert.equal(app.root.type, "View");
    assert.equal(app.root.props.children[0], "screen");
    assert.equal(app.root.props.children[1].type, app.toast.ToastViewport);
    const viewport = app.toast.ToastViewport();
    assert.equal(viewport.type, "View");
    assert.equal(viewport.props.pointerEvents, "none");
    assert.equal(viewport.props.children.props.pointerEvents, "none");
    assert.equal(viewport.props.style[0].position, platform === "web" ? "fixed" : "absolute");
    assert.equal(viewport.props.style[1].bottom, 92);
    assert.ok(viewport.props.style[0].zIndex > 0);
  });

  test(`${platform}: an app modal preserves callbacks and shows the native toast inside its own window`, () => {
    const app = harness(platform);
    const { default: AppModal } = load("src/components/AppModal.tsx", {
      "react-native": app.native, "./Toast": app.toast,
    });
    const onRequestClose = () => {};
    const onDismiss = () => {};
    const modal = AppModal({ visible: true, transparent: true, onRequestClose, onDismiss, children: "form" });
    assert.equal(modal.type, "NativeModal");
    assert.equal(modal.props.onRequestClose, onRequestClose);
    assert.equal(modal.props.onDismiss, onDismiss);
    assert.equal(modal.props.children.props.children[0], "form");
    const viewport = modal.props.children.props.children[1];
    if (platform === "web") assert.equal(viewport, false);
    else assert.equal(viewport.type, app.toast.ToastViewport);
  });
}

test("replacing a toast during its fade-out cancels the old animation without clearing the message", () => {
  const app = harness("android");
  const cleanup = app.effect();
  app.timeout();
  cleanup();
  assert.equal(app.stopped(), true);
  assert.equal(app.cleared(), true);
  assert.equal(app.state().title, "Aviso");
});

test("toast disappears only when its fade-out finishes", () => {
  const app = harness("android");
  app.effect();
  app.timeout();
  app.finish(true);
  assert.equal(app.state(), null);
});
