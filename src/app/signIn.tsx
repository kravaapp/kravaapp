import { Button, View } from "react-native";

import { AuthContext } from "@/contexts/authContext";
import { useContext } from "react";

export default function SignIn() {
  const { signIn } = useContext(AuthContext);
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Button title="entrar" onPress={signIn} />
    </View>
  );
}