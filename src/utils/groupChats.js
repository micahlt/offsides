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
// Starting a private "group DM" from a group chat message (confirmed working
// via /v1/chats/groups/start_dm), and leaving a group chat (experimental: not
// documented, so it tries a couple of likely formats and reports which worked).

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
 * Starts a private chat with the author of a group chat message, then sends
 * the first message (the start request creates the chat but ignores its text).
 * @returns {Promise<{chatID: String}>}
 */
export const startGroupDM = async (
  API,
  { groupChatID, messageID, text, clientID, firstMessageClientID, identity },
) => {
  const r = await postJSON(API, '/v1/chats/groups/start_dm', {
    text,
    client_id: clientID,
    chat_id: groupChatID,
    message_id: messageID,
    identity,
  });
  const chat = r.json?.chat || r.json;
  if (looksLikeError(r) || !chat?.id || chat.id === groupChatID) {
    const err = new Error('Could not start chat');
    err.details = [`start_dm: ${shortReason(r)}`];
    throw err;
  }
  // Send the first message into the new chat
  const sent = await API.sendDM(chat.id, text, firstMessageClientID);
  if (sent?.error_code || (sent?.message && !sent?.chat && !sent?.id)) {
    const err = new Error('Chat started, but the first message failed');
    err.chatID = chat.id;
    err.details = [`send: ${sent.message || sent.error_code}`];
    throw err;
  }
  return { chatID: chat.id };
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
