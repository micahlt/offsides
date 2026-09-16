import firebase from '@react-native-firebase/app';

const noopCrashlytics = {
  log: () => {},
  recordError: () => {},
  setCrashlyticsCollectionEnabled: () => Promise.resolve(false),
};

export default function crashlytics() {
  try {
    if (!firebase.apps?.length) {
      return noopCrashlytics;
    }

    const nativeCrashlytics = require('@react-native-firebase/crashlytics').default;
    return nativeCrashlytics();
  } catch {
    return noopCrashlytics;
  }
}
