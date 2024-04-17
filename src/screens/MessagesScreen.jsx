import React from 'react';
import { View } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';

function MessageScreen({ navigation }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Your DMs" />
      </Appbar.Header>
    </View>
  );
}

export default MessageScreen;
