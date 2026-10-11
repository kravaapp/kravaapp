import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';

type ToastOptions = {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
};

const TOAST_DURATION = 3000;

const ToastContext = createContext<ToastContextValue>({} as ToastContextValue);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: PropsWithChildren) {
  // Cada toast recebe um id para que dois toasts com o mesmo texto reiniciem a animação.
  const [current, setCurrent] = useState<(ToastOptions & { id: number }) | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const toast = useCallback((options: ToastOptions) => {
    setCurrent({ ...options, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!current) return;

    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setCurrent(null));
    }, TOAST_DURATION);

    return () => clearTimeout(timeout);
  }, [current, opacity]);

  return (
    <ToastContext.Provider value={{ toast }}>
      <View style={styles.root} pointerEvents="box-none">
        {children}

        {current && (
          <View
            style={[styles.container, { bottom: insets.bottom + 80 }]}
            pointerEvents="none"
          >
            <Animated.View
              style={[
                styles.toast,
                current.variant === 'destructive' && styles.toastDestructive,
                { opacity },
              ]}
            >
              <Text style={styles.title}>{current.title}</Text>
              {current.description && (
                <Text style={styles.description}>{current.description}</Text>
              )}
            </Animated.View>
          </View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  toast: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
    elevation: 999999,
    zIndex: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toastDestructive: {
    backgroundColor: COLORS.destructive,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
});

