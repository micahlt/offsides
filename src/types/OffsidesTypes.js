import { SidechatAuthToken } from 'sidechat.js/src/types';
import { SidechatAPIClient } from 'sidechat.js';

/**
 * The app state as passed via React Context
 * @typedef {Object} OffsidesAppState
 * @prop {SidechatAPIClient} API - a reference to the global API client.  Optionally you can instantiate a local instance with the same user by accessing `API.userToken`
 * @prop {SidechatAuthToken} userToken - the logged-in user's bearer token
 * @prop {String} userID - the logged-in user's alphanumeric ID
 * @prop {String} groupID - the currently selected group ID
 * @prop {String} groupName - the currently selected group name
 * @prop {String} groupImage - the currently selected group image URL
 * @prop {String} groupColor - the currently selected group theme color
 * @prop {String} schoolGroupID - the user's school group ID
 * @prop {String} schoolGroupName - the user's school group name
 * @prop {String} schoolGroupImage - the user's school group image URL
 * @prop {String} schoolGroupColor - the user's school group theme color
 */

export default {};
