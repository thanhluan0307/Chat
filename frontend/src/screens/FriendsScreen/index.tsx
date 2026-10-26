import { useTheme } from '@react-navigation/native';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { PersonRow } from '../../components/PersonRow';
import { Screen } from '../../components/Screen';
import { conversations } from '../../data/conversations';
import type { Conversation } from '../../data/conversations';
import { RouteName } from '../../navigation/routes';
import type { TabScreenProps } from '../../navigation/types';

export function FriendsScreen({ navigation }: TabScreenProps<'Friends'>) {
  const { colors } = useTheme();
  const renderItem = useCallback<ListRenderItem<Conversation>>(
    ({ item }) => (
      <PersonRow
        name={item.name}
        subtitle="Nhấn để bắt đầu trò chuyện"
        avatarColor={item.avatarColor}
        onPress={() =>
          navigation.navigate(RouteName.Conversation, {
            conversationId: item.id,
          })
        }
      />
    ),
    [navigation],
  );
  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>
          Bạn bè của bạn
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {conversations.length} người bạn, thật nhiều câu chuyện.
        </Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, opacity: 0.6 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});
