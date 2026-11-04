import { SidechatPoll } from 'sidechat.js/src/types/SidechatTypes.js';
import * as React from 'react';
import { View, ToastAndroid } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useRecyclingState } from '@shopify/flash-list';
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
  // Post rows are recycled by FlashList, so reset when the poll changes.
  const [localPoll, setLocalPoll] = useRecyclingState(poll, [poll]);

  const setVote = React.useCallback((choiceIndex) => {
    if (localPoll.participated) {
      ToastAndroid.show('You cannot change your vote', ToastAndroid.SHORT);
      return;
    }
    const pollID = localPoll.id;
    API.voteOnPoll(pollID, choiceIndex)
      .then(res => {
        // Rejected votes come back as an error body, not a failed request.
        if (res?.error_code || res?.message) throw new Error(res.message);
        setLocalPoll(current =>
          current?.id !== pollID
            ? current
            : {
                ...current,
                participated: true,
                choices: current.choices.map((choice, index) => ({
                  ...choice,
                  selected: index === choiceIndex,
                  count: index === choiceIndex ? choice.count + 1 : choice.count,
                })),
              },
        );
      })
      .catch(() => {
        ToastAndroid.show("Sorry, your vote didn't go through", ToastAndroid.SHORT);
      });
  }, [localPoll]);

  if (!localPoll) return null;
  return (
    <View>
      {localPoll.choices.map((option, index) => (
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
