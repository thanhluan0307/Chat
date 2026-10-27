import { useTheme } from '@react-navigation/native';
import { Search } from '../../components/icons';
import { useCallback } from 'react';
import { Controller } from 'react-hook-form';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { PersonRow } from '../../components/PersonRow';
import { Screen } from '../../components/Screen';
import { RouteName } from '../../navigation/routes';
import type { TabScreenProps } from '../../navigation/types';
import { ChatListState } from './items/ChatListState';
import { useChats } from './modules/useChats';
import type { ChatListItem } from './modules/Chats.helpers';

export function ChatsScreen({ navigation }: TabScreenProps<'Chats'>) {
  const { colors } = useTheme();
  const {
    control,
    items,
    filtered,
    status,
    error,
    refreshing,
    retry,
    refresh,
  } = useChats();
  const renderItem = useCallback<ListRenderItem<ChatListItem>>(
    ({ item }) => (
      <PersonRow
        name={item.name}
        subtitle={item.preview}
        avatarColor={item.avatarColor}
        time={item.time}
        unread={item.unread}
        onPress={() =>
          navigation.navigate(RouteName.Conversation, {
            conversationId: item.id,
            title: item.name,
            type: item.type,
            recipientId: item.recipientId,
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
          Cuộc trò chuyện
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Một lời chào, thêm một kết nối.
        </Text>
        <View style={[styles.search, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.text} opacity={0.45} />
          <Controller
            control={control}
            name="search"
            render={({ field }) => (
              <TextInput
                ref={field.ref}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Tìm cuộc trò chuyện"
                placeholderTextColor={colors.text + '80'}
                style={[styles.input, { color: colors.text }]}
                accessibilityLabel="Tìm cuộc trò chuyện"
                returnKeyType="search"
              />
            )}
          />
        </View>
      </View>
      {status === 'loading' ? (
        <ChatListState kind="loading" />
      ) : status === 'error' ? (
        <ChatListState kind="error" error={error} onRetry={retry} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={refresh}
          alwaysBounceVertical
          ListEmptyComponent={
            <ChatListState kind={items.length === 0 ? 'empty' : 'search'} />
          }
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, opacity: 0.6 },
  search: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, minHeight: 48, fontSize: 14 },
  list: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
});
