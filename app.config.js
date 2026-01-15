module.exports = {
    name: "Offsides",
    slug: "offsides",
    version: "0.9.4",
    platforms: ["android"],
    githubUrl: "https://github.com/micahlt/offsides",
    icon: "./src/assets/icon.png",
    newArchEnabled: true,
    ios: {
        bundleIdentifier: "com.micahlindley.offsides"
    },
    android: {
        package: "com.micahlindley.offsides",
        versionCode: 59,
        adaptiveIcon: {
            foregroundImage: "./src/assets/Offsides.png",
            monochromeImage: "./src/assets/Offsides.png",
            backgroundColor: "#3DDC84",
        },
        googleServicesFile: "./google-services.json",
        splash: {
            backgroundColor: "#3DDC84",
            image: "./src/assets/Offsides.png"
        },
        predictiveBackGestureEnabled: true
    },
    "plugins": [
        "expo-font",
        "expo-asset",
        "@react-native-firebase/app",
        "@react-native-firebase/crashlytics"
    ]
}