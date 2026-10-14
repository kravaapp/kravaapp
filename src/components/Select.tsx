import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import Modal from "@/components/AppModal";
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from './ClientHeader';

type SelectProps<T extends string> = {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
};

export function Select<T extends string>({ value, options, onChange }: SelectProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>{value}</Text>
        <ChevronDown size={16} color={COLORS.mutedForeground} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.content}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.optionText, option === value && styles.optionTextSelected]}
                >
                  {option}
                </Text>
                {option === value && <Check size={16} color={COLORS.mainOrange} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    paddingVertical: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  optionTextSelected: {
    color: COLORS.mainOrange,
    fontWeight: '600',
  },
});
