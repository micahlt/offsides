import { SidechatPoll } from 'sidechat.js/src/types';
import * as React from 'react';
import { View, ToastAndroid } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { AppContext } from '../App';

/**
 * @typedef {Object} PollComponentProps
 * @property {SidechatPoll} poll
 */

/**
 * @param {PollComponentProps}
 */
function Poll({ poll }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();

  const setVote = choiceIndex => {
    if (poll.participated) {
      ToastAndroid.show('You cannot change your vote', ToastAndroid.SHORT);
    }
    API.voteOnPoll(poll.id, choiceIndex);
  };

  console.log(poll);

  if (!poll) return null;
  return (
    <View>
      {poll.choices.map((option, index) => (
        <TouchableRipple
          key={index}
          onPress={() => setVote(index)}
          borderless={true}
          style={{
            marginBottom: 5,
            borderRadius: 10,
          }}>
          <View
            style={{
              backgroundColor: option.selected
                ? colors.primaryContainer
                : colors.onSecondary,
              padding: 10,
              borderRadius: 10,
            }}>
            {!!option?.text ? (
              <Text
                style={{ color: colors.onSecondaryContainer }}
                variant="labelLarge">
                {option.text}
              </Text>
            ) : (
              <></>
            )}
            {!!option?.count ? (
              <Text variant="bodySmall">{option.count} votes</Text>
            ) : (
              <></>
            )}
          </View>
        </TouchableRipple>
      ))}
    </View>
  );
}

export default Poll;
