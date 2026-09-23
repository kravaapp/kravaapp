import { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, ViewStyle } from "react-native";

/**
 * Empurra o conteúdo para cima quando o teclado abre.
 *
 * É o caso dos modais: o sheet é ancorado no rodapé (`justifyContent:
 * "flex-end"`), então sem isso o teclado cobre justamente os últimos campos do
 * formulário. Com o padding do `KeyboardAvoidingView`, o overlay (flex:1)
 * encolhe e o sheet passa a ficar apoiado no topo do teclado — o `maxHeight`
 * percentual encolhe junto e a ScrollView interna rola.
 *
 * No Android não se define `behavior`: a janela já encolhe sozinha (o Expo usa
 * `softwareKeyboardLayoutMode: resize` e o Modal do RN força `ADJUST_RESIZE`),
 * então um ajuste aqui só somaria espaço. Sem `behavior` o componente vira uma
 * View comum.
 *
 * Aceita `style` porque em alguns modais ele substitui o próprio overlay
 * (`<KeyboardAvoider style={styles.overlay}>`), o que evita um nível a mais de
 * aninhamento sem mudar nada da árvore.
 */
export default function KeyboardAvoider({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.fill, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
