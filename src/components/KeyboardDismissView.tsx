import { PropsWithChildren } from "react";
import {
  GestureResponderEvent,
  Keyboard,
  Platform,
  TextInput,
  View,
} from "react-native";

/** Fecha o teclado ao tocar fora do campo de texto focado em dispositivos móveis. */
export default function KeyboardDismissView({ children }: PropsWithChildren) {
  const handleTouchEnd = (event: GestureResponderEvent) => {
    if (Platform.OS === "web") return;

    const focusedInput = TextInput.State.currentlyFocusedInput();

    if (focusedInput && event.target !== focusedInput) {
      Keyboard.dismiss();
    }
  };

  return (
    <View style={{ flex: 1 }} onTouchEnd={handleTouchEnd}>
      {children}
    </View>
  );
}
