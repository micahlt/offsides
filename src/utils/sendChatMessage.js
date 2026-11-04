/**
 * Sends a chat message (DM or group chat), optionally as a reply to an
 * earlier message. Only group chats have replies - DMs run on an older chat
 * system whose messages never carry `reply_to`.
 *
 * Replies are an experiment: the API returns them with a `reply_to` object,
 * but how a client asks for one isn't documented anywhere - sidechat.js
 * doesn't support it, and neither does the official Android beta. So a reply
 * carries every plausible field name, and the response shows whether the
 * server took one. Release builds don't log, so the outcome is returned for
 * the UI to show.
 */
import { getMessages } from './getChats';

const REPLY_FIELDS = [
  'reply_to_id',
  'reply_to_message_id',
  'reply_message_id',
  'parent_message_id',
];

// Finds a reply_to anywhere in the response, since its shape isn't known.
const findReply = (value, depth = 0) => {
  if (!value || typeof value != 'object' || depth > 3) {
    return null;
  }
  if (value.reply_to) {
    return value.reply_to;
  }
  for (const v of Object.values(value)) {
    const found = findReply(v, depth + 1);
    if (found) {
      return found;
    }
  }
  return null;
};

// What the response looks like, without anyone's message text.
const describe = json =>
  json && typeof json == 'object'
    ? Object.fromEntries(
        Object.entries(json).map(([k, v]) => [
          k,
          v && typeof v == 'object' && !Array.isArray(v)
            ? Object.keys(v)
            : typeof v,
        ]),
      )
    : json;

/**
 * @param {SidechatAPIClient} API
 * @param {String} chatID
 * @param {String} text
 * @param {String} clientID - must be unique per message
 * @param {Object} [replyTo] - the message being replied to
 * @returns {Promise<{outcome: ?('linked'|'ignored'|'rejected'), status: Number}>}
 *   for a reply, whether the server linked it, ignored the fields, or
 *   rejected them (and it was resent as a plain message)
 */
export default async function sendChatMessage(
  API,
  chatID,
  text,
  clientID,
  replyTo,
) {
  const message = {
    chat_id: chatID,
    text: text,
    client_id: clientID,
    anonymous: false,
    assets: [],
  };
  let rejectedStatus = null;
  const send = body =>
    API.sendRequest('/v1/chats/send', 'POST', JSON.stringify(body));

  if (replyTo) {
    const fields = Object.fromEntries(REPLY_FIELDS.map(f => [f, replyTo.id]));
    const res = await send({ ...message, ...fields });
    const body = await res.text();
    let json = null;
    try {
      json = JSON.parse(body);
    } catch (e) {
      // Empty or not JSON - the chats service's way of rejecting a request.
    }
    if (res.ok && json) {
      let reply = findReply(json);
      let checkedThread = false;
      if (!reply) {
        // The response may just not echo it - look at the message itself.
        try {
          const { chat } = await getMessages(API, chatID);
          const sent = chat.messages.find(m => m.client_id == clientID);
          reply = sent?.reply_to || null;
          checkedThread = !!sent;
        } catch (e) {
          // Can't tell - report it as not linked.
        }
      }
      console.log(
        '[reply-test]',
        JSON.stringify({
          status: res.status,
          sent: REPLY_FIELDS,
          replied: !!reply,
          checkedThread: checkedThread,
          reply: reply && { ...reply, text: undefined },
          response: json ? describe(json) : body.slice(0, 200),
        }),
      );
      return { outcome: reply ? 'linked' : 'ignored', status: res.status };
    }
    console.log('[reply-test] rejected', res.status, body.slice(0, 300));
    // Rejected, so nothing was posted - send it as a plain message instead.
    rejectedStatus = res.status;
  }

  const res = await send(message);
  // An empty 200 means the chats service rejected it, so it wasn't sent.
  const sent = res.ok && (await res.text().catch(() => '')).trim();
  if (!sent) {
    throw new Error(`Failed to send message (HTTP ${res.status})`);
  }
  return {
    outcome: rejectedStatus ? 'rejected' : null,
    status: rejectedStatus ?? res.status,
  };
}
