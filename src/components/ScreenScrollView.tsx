import { ScrollView, ScrollViewProps } from "react-native";

/**
 * ScrollView das telas que têm formulário.
 *
 * `automaticallyAdjustKeyboardInsets` é iOS-only: o nativo reserva o espaço do
 * teclado no `contentInset` e rola sozinho até o campo focado, que é o "subir a
 * tela" que queremos. No Android a janela já encolhe com o teclado
 * (`softwareKeyboardLayoutMode: resize`, default do Expo), então a prop não faz
 * falta lá — e não faz mal, porque é ignorada.
 *
 * `keyboardShouldPersistTaps="handled"` evita o toque duplo: sem ele, com o
 * teclado aberto o primeiro toque só fecha o teclado e não chega no botão.
 */
export default function ScreenScrollView({
  keyboardShouldPersistTaps = "handled",
  ...props
}: ScrollViewProps) {
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    />
  );
}
