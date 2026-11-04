/**
 * Fetches the user's chats (DMs and joined group chats share one endpoint),
 * following the API's cursor. The API returns 20 chats per page, so reading
 * only the first page silently hides every older thread.
 * @param {SidechatAPIClient} API
 * @param {Number} [maxPages] - most pages to walk; pass 1 for just the newest
 * @returns {Promise<Object[]>} chats, newest first
 */
export default async function getChats(API, maxPages = 10) {
  const chats = [];
  const seen = new Set();
  let cursor = null;
  for (let page = 0; page < maxPages; page++) {
    const res = await API.sendRequest(
      cursor ? `/v1/chats?cursor=${encodeURIComponent(cursor)}` : '/v1/chats',
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch chats (HTTP ${res.status})`);
    }
    const json = await res.json();
    const batch = (json.chats || [])
      .map(o => o.chat)
      .filter(c => c && !seen.has(c.id));
    batch.forEach(c => {
      seen.add(c.id);
      chats.push(c);
    });
    cursor = json.cursor;
    if (!cursor || batch.length == 0) {
      break;
    }
  }
  return chats;
}

/**
 * Folds a freshly fetched first page into an already-loaded list, so polling
 * can pick up new activity without re-walking every page.
 */
export function mergeChats(current, latest) {
  const latestIDs = new Set(latest.map(c => c.id));
  return [...latest, ...current.filter(c => !latestIDs.has(c.id))].sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
  );
}

export const isGroupChat = chat => chat?.type == 'group';

/**
 * Fetches one page of a chat's messages. The API returns the newest 100, and
 * the returned cursor fetches the 100 before those; it's null at the start of
 * the conversation. (getDMThread drops the cursor, so it can't go back.)
 * @param {SidechatAPIClient} API
 * @param {String} chatID
 * @param {String} [cursor]
 * @returns {Promise<{chat: Object, cursor: ?String}>}
 */
export async function getMessages(API, chatID, cursor) {
  const res = await API.sendRequest(
    `/v1/chats/messages?chat_id=${chatID}` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''),
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch messages (HTTP ${res.status})`);
  }
  const json = await res.json();
  // Callers read chat.messages inside setState updaters, where a throw would
  // crash the render instead of reaching their catch - so reject bad shapes here.
  if (!Array.isArray(json?.chat?.messages)) {
    throw new Error('Unexpected messages response');
  }
  return { chat: json.chat, cursor: json.cursor || null };
}

/**
 * Folds a page of messages into those already loaded, newest first, so
 * polling for new messages doesn't throw away older ones scrolled back to.
 */
export function mergeMessages(current, page) {
  const pageIDs = new Set(page.map(m => m.id));
  return [...page, ...current.filter(m => !pageIDs.has(m.id))].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
}
