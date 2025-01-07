import * as React from 'react';
import { ImageBackground, useWindowDimensions, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { AppContext } from '../App';
import Group from './Group';
import { useNavigation } from '@react-navigation/native';
import PatternBG from '../assets/bgpattern.png';
import { useMMKVObject } from 'react-native-mmkv';

function Onboarding() {
    const { colors } = useTheme();
    const { width, height } = useWindowDimensions();
    const { appState } = React.useContext(AppContext);
    const nav = useNavigation();
    const API = appState.API;
    const suggestedGroupIDs = ["41c8298a-6131-48f6-a56a-28ca0a30c1bf", "5d61d48a-8721-42d2-941e-8b92d0176a67", "94f560ff-c353-40c1-af47-0a398a57e5ba"];
    const [suggestedGroups, setSuggestedGroups] = React.useState([]);
    const [currentGroup, setCurrentGroup] = useMMKVObject("currentGroup");

    React.useEffect(() => {
        let s = [];
        for (let id of suggestedGroupIDs) {
            API.getGroupMetadata(id).then((group) => s.push(group));
        }
        setSuggestedGroups(s);
    }, [])

    return <View style={{ height: height, backgroundColor: colors.background }}>
        <ImageBackground
            source={PatternBG}
            resizeMode="repeat"
            style={{ flex: 1, width: width, alignItems: 'center', justifyContent: 'center' }}
            imageStyle={{ opacity: 0.2 }}>
            <Text variant="displaySmall" style={{ textAlign: 'center', color: colors.primary }}>Welcome to Offsides</Text>
            <Text variant="titleMedium" style={{ fontStyle: "italic", marginBottom: 50, color: colors.secondary }}>The Sidechat/Yikyak app for Android</Text>
            <Text>Get started by finding a group.</Text>
            <Text style={{ marginBottom: 15 }}>Maybe try one of these?</Text>
            {suggestedGroups.map((group) => <Group group={group} key={group.id} style={{ width: width - 100, marginBottom: 10 }} exploreMode={true} onPress={() => {
                setCurrentGroup(group);
            }} />)}
            <Button
                icon="earth"
                mode="contained"
                onPress={() => nav.navigate('ExploreGroups')}
                style={{ marginTop: 15, marginLeft: 'auto', marginRight: "auto" }}>
                Explore more
            </Button>
        </ImageBackground>
    </View>
}

export default Onboarding;