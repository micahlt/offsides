import semver from 'semver';

/**
 * Finds out if the user is running the latest version of Offsides
 * @param {String} currentVersion - semver current version
 * @returns {Boolean|String} if app is up to date, false; if app needs an update, the semver of the latest version
 */
const needsUpdate = async currentVersion => {
  try {
    const res = await fetch(`https://offsides.micahlindley.com/latest.json`);
    if (res.ok) {
      const json = await res.json();
      if (semver.gt(json.latestVersion, currentVersion)) {
        return json.latestVersion;
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

export { needsUpdate };
