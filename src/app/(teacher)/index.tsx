import ClientHeader from "@/components/ClientHeader";
import ScreenPlaceholder from "@/components/ScreenPlaceholder";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TeacherHome() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />
            <ScreenPlaceholder
                title="Início"
                description="Em breve o resumo do seu dia como professor."
            />
        </SafeAreaView>
    );
}
