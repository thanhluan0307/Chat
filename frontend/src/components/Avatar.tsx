import { StyleSheet, Text, View } from 'react-native';

interface AvatarProps {
  name: string;
  color?: string;
  large?: boolean;
}
export function Avatar({
  name,
  color = '#5979E8',
  large = false,
}: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(part => part[0])
    .join('');
  return (
    <View
      style={[styles.avatar, large && styles.large, { backgroundColor: color }]}
    >
      <Text style={[styles.initials, large && styles.largeText]}>
        {initials}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { width: 88, height: 88, borderRadius: 30 },
  initials: { fontSize: 18, color: '#FFFFFF', fontWeight: '600' },
  largeText: { fontSize: 28 },
});
