import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
import { MainStackParamList } from '../../navigation/types';

type Route = RouteProp<MainStackParamList, 'AdminChat'>;

interface ChatMessage {
  id: number;
  message: string;
  created_at: string;
  sender_id: number;
  sender_label?: string;
  sender_role?: string;
  sender?: { id: number; name?: string } | null;
}

const POLL_MS = 4000;

const AdminChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();
  const { title, subtitle, bookingId, withId } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastIdRef = useRef(0);

  const load = useCallback(
    async (poll = false) => {
      try {
        const params: Record<string, string | number> = {};
        if (bookingId) params.booking_id = bookingId;
        else if (withId) params.with = withId;
        if (poll && lastIdRef.current > 0) params.lastId = lastIdRef.current;

        const res = await api.get('/messages', { params });
        const newMessages: ChatMessage[] = res.data ?? [];
        if (poll) {
          if (newMessages.length > 0) {
            setMessages(prev => [...prev, ...newMessages]);
            lastIdRef.current = newMessages[newMessages.length - 1].id;
          }
        } else {
          setMessages(newMessages);
          lastIdRef.current =
            newMessages.length > 0 ? newMessages[newMessages.length - 1].id : 0;
        }
      } catch (e) {
        console.warn('chat load failed', e);
      } finally {
        setLoading(false);
      }
    },
    [bookingId, withId],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    try {
      const payload: Record<string, string | number> = { message: msg };
      if (bookingId) payload.booking_id = bookingId;
      else if (withId) payload.receiver_id = withId;
      const res = await api.post('/messages', payload);
      const created = res.data?.message;
      if (created) {
        setMessages(prev => [...prev, created]);
        lastIdRef.current = created.id;
      }
      setText('');
    } catch (e: any) {
      console.warn('send failed', e);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.sender_id === me?.id;
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {!mine && item.sender_label && item.sender_label !== me?.name ? (
            <Text style={styles.senderLabel} numberOfLines={1}>
              {item.sender_label}
            </Text>
          ) : null}
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
            {item.message}
          </Text>
          <Text style={[styles.time, mine && styles.timeMine]}>
            {new Date(item.created_at).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={22} color={COLORS.gray900} />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerSub}>{subtitle ?? 'Support conversation'}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No messages yet. Say hello to start the conversation.
            </Text>
          }
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.gray400}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendDisabled]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          <MaterialIcons name="send" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerBody: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 1,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    padding: SPACING.md,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    ...SHADOW.card,
  },
  bubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary700,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 14,
    color: COLORS.gray900,
    lineHeight: 19,
  },
  bubbleTextMine: {
    color: COLORS.white,
  },
  time: {
    fontSize: 9,
    color: COLORS.gray400,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray400,
    fontSize: 13,
    marginTop: SPACING.xl,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.gray900,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
});

export default AdminChatScreen;
