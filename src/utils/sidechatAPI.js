const defaultHeaders = { 'Content-Type': 'application/json' };
const root = 'https://api.sidechat.lol/v1';

/**
 * Initiate the login process with a phone number.  Should be followed up with verifySMSCode().
 * @param {Number} phoneNumber - US phone number (WITHOUT +1) to send verification code to
 */
const loginViaSMS = async phoneNumber => {
  try {
    const res = await fetch(`${root}/login_register`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: `+1${phoneNumber}`,
        version: 3,
      }),
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.err(error);
    throw new Error('Failed to request SMS verification.');
  }
};

/**
 * Verify the code sent via SMS with loginViaSMS().
 * @param {Number} phoneNumber - US phone number (WITHOUT +1) that verification code was sent to
 * @param {String} code  - the verification code
 */
const verifySMSCode = async (phoneNumber, code) => {
  try {
    const res = await fetch(`${root}/verify_phone_number`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: `+1${phoneNumber}`,
        code: code.toUpperCase(),
      }),
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.err(err);
    throw new Error('Failed verify this code.');
  }
};

/**
 * Fetches posts from the specified category
 * @param {String} groupID
 * @param {String} token
 * @param {"hot"|"recent"|"top"} category
 * @param {String} [cursor]
 * @returns List of posts
 */
const getGroupPosts = async (groupID, token, category = 'hot', cursor) => {
  try {
    const res = await fetch(
      `${root}/posts?group_id=${groupID}&type=${category}${
        cursor ? '&cursor=' + cursor : ''
      }`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const json = await res.json();
    return json;
  } catch (err) {
    console.error(err);
    throw new Error(`Failed to get posts from group.`);
  }
};

/**
 * Upvote or downvote, or unvote a post
 * @param {String} postID - post ID to vote on
 * @param {String} token - user bearer token
 * @param {"upvote"|"downvote"|"none"} action - whether to upvote, downvote, or reset vote
 * @returns
 */
const setVote = async (postID, token, action) => {
  try {
    const res = await fetch(`${root}/posts/set_vote`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        post_id: postID,
        vote_status: action,
      }),
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.error(err);
    throw new Error(`Failed to change the vote on post.`);
  }
};

export { loginViaSMS, verifySMSCode, getGroupPosts, setVote };
