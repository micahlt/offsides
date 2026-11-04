import React from 'react';
import { Snackbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const APPBAR_HEIGHT = 64;

/**
 * Shows a DM push that arrived while the app was open, which Android doesn't
 * display itself. It sits below the app bar, since a normal bottom Snackbar
 * would cover the message box in a thread.
 * @param {Object} message - the latest FCM message, or null if there's been none
 * @param {Function} onOpen - called when "Open" is pressed
 */
function IncomingMessageBanner({ message, onOpen }) {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (message) {
      setVisible(true);
    }
  }, [message]);

  // Keyed by message so a new DM restarts the timer. The message itself stays
  // set after hiding, so the text doesn't change while it fades out.
  return (
    <Snackbar
      key={message?.messageId}
      visible={visible}
      duration={Snackbar.DURATION_SHORT}
      onDismiss={() => setVisible(false)}
      action={{ label: 'Open', onPress: onOpen }}
      wrapperStyle={{
        top: top + APPBAR_HEIGHT,
        bottom: 'auto',
        paddingBottom: 0,
      }}>
      <Text numberOfLines={2} style={{ color: colors.inverseOnSurface }}>
        {message?.notification?.body || 'New message'}
      </Text>
    </Snackbar>
  );
}

export default IncomingMessageBanner;
