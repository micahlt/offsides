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

// ---------------------------------------------------------------------------
// Experimental: starting a private "group DM" from a group chat message, and
// leaving a group chat. Neither request is documented, so each tries a short
// list of likely formats once (only when the user taps the button) and stops
// at the first the server accepts. The result says which format worked so
// the others can be removed later.

const postJSON = async (API, path, body) => {
  const res = await fetch(`${API.apiRoot}${path}`, {
    method: 'POST',
    headers: {
      ...API.defaultHeaders,
      Authorization: `Bearer ${API.userToken}`,
    },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // empty or non-JSON body
  }
  return { status: res.status, ok: res.ok, json };
};

const looksLikeError = r =>
  !r.ok || !!r.json?.error_code || r.json?.success === false;

const shortReason = r =>
  `${r.status}${r.json?.message ? ' ' + String(r.json.message).slice(0, 40) : ''}`;

/**
 * Starts a private chat with the author of a group chat message.
 * @returns {Promise<{chatID: String, via: String}>}
 */
export const startGroupDM = async (
  API,
  { groupChatID, messageID, text, clientID, identity },
) => {
  const base = { text, client_id: clientID };
  const attempts = [
    ['groups/dm', '/v1/chats/groups/dm', { ...base, chat_id: groupChatID, message_id: messageID, identity }],
    ['groups/start_dm', '/v1/chats/groups/start_dm', { ...base, chat_id: groupChatID, message_id: messageID, identity }],
    ['start+source_message_id', '/v1/chats/start', { ...base, source_message_id: messageID, source_chat_id: groupChatID, identity }],
    ['start+message_id', '/v1/chats/start', { ...base, message_id: messageID, chat_id: groupChatID, identity }],
    ['groups/start', '/v1/chats/groups/start', { ...base, chat_id: groupChatID, message_id: messageID, identity }],
  ];
  const failures = [];
  for (const [label, path, body] of attempts) {
    try {
      const r = await postJSON(API, path, body);
      const chat = r.json?.chat || r.json;
      if (!looksLikeError(r) && chat?.id && chat.id !== groupChatID) {
        return { chatID: chat.id, via: label };
      }
      failures.push(`${label}: ${shortReason(r)}`);
    } catch (e) {
      failures.push(`${label}: ${e.message}`);
    }
  }
  const err = new Error('None of the request formats worked');
  err.details = failures;
  throw err;
};

/**
 * Leaves a group chat (or group DM).
 * @returns {Promise<String>} which request format worked
 */
export const leaveGroupChat = async (API, chatID) => {
  const attempts = [
    ['groups/leave', '/v1/chats/groups/leave', { chat_id: chatID }],
    ['chats/leave', '/v1/chats/leave', { chat_id: chatID }],
  ];
  const failures = [];
  for (const [label, path, body] of attempts) {
    try {
      const r = await postJSON(API, path, body);
      if (!looksLikeError(r)) {
        const ids = getJoinedIDs().filter(id => id !== chatID);
        storage.set(JOINED_KEY, JSON.stringify(ids));
        return label;
      }
      failures.push(`${label}: ${shortReason(r)}`);
    } catch (e) {
      failures.push(`${label}: ${e.message}`);
    }
  }
  const err = new Error('None of the request formats worked');
  err.details = failures;
  throw err;
};
