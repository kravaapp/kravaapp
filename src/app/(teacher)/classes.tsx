import ClientHeader from "@/components/ClientHeader";
import ScreenPlaceholder from "@/components/ScreenPlaceholder";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TeacherClasses() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />
            <ScreenPlaceholder
                title="Aulas"
                description="Em breve a agenda das suas aulas."
            />
        </SafeAreaView>
    );
}
