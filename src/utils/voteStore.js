import React from 'react';

/**
 * Tiny in-memory store so every card showing the same post or comment
 * agrees on the user's vote and the vote total. Without this, the feed card
 * and the comments screen each keep their own copy and drift apart after a
 * vote in one of them.
 */
const votes = new Map(); // id -> { status, total }
const listeners = new Map(); // id -> Set<callback>

export function getVote(id) {
  return votes.get(id);
}

export function publishVote(id, status, total) {
  if (!id) return;
  const entry = { status, total };
  votes.set(id, entry);
  const subs = listeners.get(id);
  if (subs) subs.forEach(cb => cb(entry));
}

export function clearVotes() {
  votes.clear();
}

const weight = s => (s === 'upvote' ? 1 : s === 'downvote' ? -1 : 0);

/**
 * Cast a vote with an optimistic count update, then reconcile with the
 * server. The server's total is only trusted when it agrees with the action:
 * removing a comment vote can come back with the old total, which would
 * otherwise leave the count stuck.
 */
export async function castVote(API, id, prevStatus, prevTotal, action) {
  const delta = weight(action) - weight(prevStatus);
  const optimistic = (prevTotal ?? 0) + delta;
  publishVote(id, action, optimistic);
  try {
    const res = await API.setVote(id, action);
    const st = res?.post?.vote_status;
    const tot = res?.post?.vote_total;
    const serverAgrees = st === action || st == null;
    const totalMoved = tot !== prevTotal;
    if (typeof tot === 'number' && serverAgrees && (delta === 0 || totalMoved)) {
      publishVote(id, action, tot);
    }
  } catch (e) {
    publishVote(id, prevStatus, prevTotal);
  }
}

function subscribe(id, cb) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id).add(cb);
  return () => {
    const subs = listeners.get(id);
    if (!subs) return;
    subs.delete(cb);
    if (subs.size === 0) listeners.delete(id);
  };
}

/**
 * Shared vote state for one post or comment.
 * Returns [status, total, setFromServer(status, total)].
 * Falls back to the values on the item until the user votes somewhere.
 */
export function useSharedVote(id, initialStatus, initialTotal) {
  const compute = () => {
    const stored = votes.get(id);
    return stored
      ? stored
      : { status: initialStatus, total: initialTotal };
  };
  const [state, setState] = React.useState(compute);
  const lastId = React.useRef(id);

  React.useEffect(() => {
    // Item changed under a recycled card, or first mount: resync, then listen.
    lastId.current = id;
    setState(compute());
    return subscribe(id, entry => setState(entry));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Avoid a one-frame flash of the previous item's vote after recycling.
  const current = lastId.current === id ? state : compute();

  const set = React.useCallback(
    (status, total) => publishVote(id, status, total),
    [id],
  );

  return [current.status, current.total, set];
}
