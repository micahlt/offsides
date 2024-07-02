import semver from 'semver';
import { version as currentVersion } from '../../package.json';
/**
 * Finds out if the user is running the latest version of Offsides
 * @returns {Boolean|String} if app is up to date, false; if app needs an update, the semver of the latest version
 */
export default needsUpdate = async () => {
  try {
    const res = await fetch(`https://offsides.micahlindley.com/latest.json`);
    if (res.ok) {
      const json = await res.json();
      if (semver.gt(json.latestVersion, currentVersion)) {
        return json;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } catch {
    return false;
  }
};
