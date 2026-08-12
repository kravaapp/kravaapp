import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ClientHeader, { COLORS } from "@/components/ClientHeader";

export default function AdminFinancial() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />
            <View style={styles.content}>
                <Text style={styles.placeholder}>Financeiro</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    placeholder: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
});
