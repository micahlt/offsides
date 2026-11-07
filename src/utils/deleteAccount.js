// Yik Yak / Sidechat has no documented account deletion request, and support
// doesn't respond to deletion emails. This tries a short list of likely
// deletion requests, one at a time, and after each one checks whether the
// account is really gone (the login stops working) instead of trusting the
// server's reply. It stops at the first one that actually deletes the account.

const request = async (API, method, path, body) => {
  const res = await fetch(`${API.apiRoot}${path}`, {
    method,
    headers: {
      ...API.defaultHeaders,
      Authorization: `Bearer ${API.userToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // empty or non-JSON body
  }
  return { status: res.status, ok: res.ok, json };
};

/** True if the current login no longer works (account gone) */
const accountIsGone = async API => {
  const r = await request(API, 'GET', '/v1/users/me');
  if (r.status === 401 || r.status === 403 || r.status === 404) return true;
  if (r.ok && r.json && !r.json.error_code && (r.json.id || r.json.user)) {
    return false; // still logged in and the account still exists
  }
  // Unclear response: treat as not deleted, to be safe
  return false;
};

/**
 * Tries to delete the logged-in account.
 * @returns {Promise<{deleted: boolean, via?: string, log: string[]}>}
 */
export const deleteAccount = async (API, userID) => {
  // Make sure we can tell "deleted" apart from "not logged in" first
  if (await accountIsGone(API)) {
    return {
      deleted: false,
      log: ['Your login already seems invalid. Log in again, then retry.'],
    };
  }

  const attempts = [
    ['DELETE', '/v1/users/me'],
    ['POST', '/v1/users/delete'],
    ['POST', '/v1/users/me/delete'],
    ['POST', '/v1/users/delete_account'],
    ['POST', '/v1/delete_account'],
    ['DELETE', `/v1/users/${userID}`],
  ];
  const log = [];
  for (const [method, path] of attempts) {
    const label = `${method} ${path.replace(String(userID), '{id}')}`;
    try {
      const r = await request(API, method, path, method === 'POST' ? {} : undefined);
      log.push(`${label}: ${r.status}${r.json?.message ? ' ' + String(r.json.message).slice(0, 50) : ''}`);
      if (r.ok && (await accountIsGone(API))) {
        return { deleted: true, via: label, log };
      }
    } catch (e) {
      log.push(`${label}: ${e.message}`);
    }
  }
  return { deleted: false, log };
};
