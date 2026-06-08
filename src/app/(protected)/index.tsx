import { AuthContext } from "@/contexts/authContext";
import { useContext } from "react";
import { Button, View } from "react-native";

export default function Home() {
    const { signOut } = useContext(AuthContext);
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Button title="sair" onPress={signOut} />
        </View>
    );
}