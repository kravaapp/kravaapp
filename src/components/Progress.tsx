import { StyleSheet, View } from 'react-native';
import { COLORS } from './ClientHeader';

type ProgressProps = {
  value: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
};

export const Progress = ({
  value,
  height = 8,
  trackColor = '#e5e7eb',
  fillColor = COLORS.mainOrange,
}: ProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width: '100%',
  },
});
