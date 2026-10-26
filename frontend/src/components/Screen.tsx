import { useTheme } from '@react-navigation/native';
import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

interface ScreenProps extends PropsWithChildren {
  edges?: Edge[];
}
export function Screen({ children, edges = ['left', 'right'] }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      {children}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ screen: { flex: 1 } });
