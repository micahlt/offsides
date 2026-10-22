import { storage } from './mmkv';

// Group chat support. The sidechat.js library has partial support for group
// chats (explore + join), and messages/sending use the same endpoints as DMs.
// The exact response shapes aren't documented, so everything here is written
// defensively.

const JOINED_KEY = 'joinedGroupChatIDs';

const getJoinedIDs = () => {
  try {
    return JSON.parse(storage.getString(JOINED_KEY) || '[]');
  } catch (e) {
    return [];
  }
};

export const rememberJoined = id => {
  const ids = getJoinedIDs();
  if (!ids.includes(id)) {
    ids.push(id);
    storage.set(JOINED_KEY, JSON.stringify(ids));
  }
};

/** Unwrap `{ chat: {...} }` wrappers the API sometimes uses */
export const unwrapChat = o => (o && o.chat ? { ...o, ...o.chat } : o);

/** Best guess at whether a chat object is a group chat rather than a DM */
export const isGroupChat = c => {
  if (!c) return false;
  if (getJoinedIDs().includes(c.id)) return true;
  const kind = String(c.type || c.chat_type || c.kind || '').toLowerCase();
  if (kind.includes('group')) return true;
  if (c.is_group || c.is_group_chat || c.group_chat) return true;
  if (Array.isArray(c.participants) && c.participants.length > 2) return true;
  if ((c.name || c.title) && !c.post_id) return true;
  return false;
};

/** Display name for a group chat */
export const groupChatName = c =>
  c?.name || c?.title || c?.display_name || c?.group?.name || 'Group chat';

/** Number of members, if the API tells us */
export const groupChatMemberCount = c =>
  c?.member_count ??
  c?.members_count ??
  c?.participant_count ??
  (Array.isArray(c?.participants) ? c.participants.length : null);

/**
 * Fetches joinable group chats. The library's getGroupChats() builds a broken
 * URL ("/explore&cacheBust=" instead of "?cacheBust="), so call it directly.
 */
export const fetchExploreGroupChats = async API => {
  const res = await fetch(
    `${API.apiRoot}/v1/chats/explore?cacheBust=${Date.now()}`,
    {
      method: 'GET',
      headers: {
        ...API.defaultHeaders,
        Authorization: `Bearer ${API.userToken}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Explore failed (${res.status})`);
  }
  const json = await res.json();
  const list = json?.chats || json?.group_chats || json?.results || [];
  return list.map(unwrapChat).filter(c => c && c.id);
};

/** Readable name from an identity object (shape varies) */
export const identityName = identity =>
  identity?.display_name || identity?.name || identity?.username || null;

/** The current user's username, used as the default join name */
export const getMyUsername = async API => {
  try {
    const u = await API.getUpdates();
    return u?.user?.username || null;
  } catch (e) {
    return null;
  }
};

/** Joins a group chat using the chosen name (or the user's username) and icon */
export const joinGroupChat = async (API, chat, chosenName) => {
  let name = 'Anonymous';
  let icon = { emoji: '💬', color: '#6750A4', secondary_color: '#EADDFF' };
  try {
    const u = await API.getUpdates();
    if (u?.user?.username) name = u.user.username;
    if (u?.user?.conversation_icon) icon = { ...icon, ...u.user.conversation_icon };
  } catch (e) {
    // fall back to defaults
  }
  if (chosenName && chosenName.trim()) name = chosenName.trim();
  const res = await API.joinGroupChat(
    chat.id,
    name,
    icon.emoji,
    icon.color,
    icon.secondary_color,
  );
  if (res?.error_code || (res?.message && !res?.chat)) {
    throw new Error(res.message || res.error_code);
  }
  rememberJoined(chat.id);
  return res;
};
