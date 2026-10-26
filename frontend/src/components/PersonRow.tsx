import { useTheme } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';

interface PersonRowProps {
  name: string;
  subtitle: string;
  avatarColor: string;
  onPress: () => void;
  time?: string;
  unread?: number;
}
export function PersonRow({
  name,
  subtitle,
  avatarColor,
  onPress,
  time,
  unread = 0,
}: PersonRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mở trò chuyện với ${name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Avatar name={name} color={avatarColor} />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      <View style={styles.meta}>
        {time ? (
          <Text style={[styles.time, { color: colors.text }]}>{time}</Text>
        ) : null}
        {unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: 88,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  content: { flex: 1, gap: 6 },
  name: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, opacity: 0.6 },
  meta: { alignItems: 'flex-end', gap: 8 },
  time: { fontSize: 11, opacity: 0.5 },
  badge: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
