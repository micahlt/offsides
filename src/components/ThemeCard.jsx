import { View } from 'react-native';
import { Card, Icon, TouchableRipple } from 'react-native-paper';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

function ThemeCard({ colors, onPress = null, selected = false, style }) {
  const tap = Gesture.Tap().runOnJS(true).onEnd(onPress);
  return (
    <GestureDetector gesture={tap}>
      <TouchableRipple
        onPress={onPress}
        style={{ borderRadius: 10, ...style }}
        borderless={true}>

        <Card
          style={{
            height: 120,
            width: 100,
            flexDirection: 'column',
            padding: 0,
          }}>
          <Card.Content
            style={{ height: 150, width: 100, margin: 0, padding: 0 }}>
            {selected && (
              <View
                style={{
                  position: 'absolute',
                  zIndex: 10,
                  top: '50%',
                  left: '50%',
                  height: 50,
                  width: 50,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ translateX: -9 }, { translateY: -25 }],
                  borderRadius: 50,
                }}>
                <Icon source="check" color="white" size={24} />
              </View>
            )}
            <View
              style={{
                backgroundColor: colors.primary,
                flex: 1,
                width: '150%',
                marginLeft: -17,
                marginTop: -17,
              }}></View>
            <View
              style={{
                backgroundColor: colors.secondary,
                flex: 1,
                width: '150%',
                marginLeft: -17,
                marginTop: -17,
              }}></View>
          </Card.Content>
        </Card>
      </TouchableRipple>
    </GestureDetector>
  );
}

export default ThemeCard;
