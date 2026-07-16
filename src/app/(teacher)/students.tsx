import ClientHeader from "@/components/ClientHeader";
import ScreenPlaceholder from "@/components/ScreenPlaceholder";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TeacherStudents() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />
            <ScreenPlaceholder
                title="Alunos"
                description="Em breve a lista dos seus alunos."
            />
        </SafeAreaView>
    );
}
