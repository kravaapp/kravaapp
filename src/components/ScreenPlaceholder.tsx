import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from './ClientHeader';

type ScreenPlaceholderProps = {
  title: string;
  description: string;
};

export default function ScreenPlaceholder({ title, description }: ScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  description: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: 'center',
  },
});
