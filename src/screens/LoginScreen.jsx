import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Button,
  Card,
  Text,
  Divider,
  TextInput,
  useTheme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as API from '../utils/sidechatAPI';

function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [errorMessage, setErrorMessage] = React.useState();
  const [phase, setPhase] = React.useState('sendSMS');
  const [phoneNumber, setPhoneNumber] = React.useState();
  const [smsCode, setSmsCode] = React.useState();
  const [registrationID, setRegistrationID] = React.useState();
  const [loading, setLoading] = React.useState(false);
  const sendSMS = async () => {
    setLoading(true);
    try {
      const res = await API.loginViaSMS(phoneNumber);
      if (res) {
        if (res.error_code) {
          setErrorMessage(res.message);
        } else {
          setPhase('verifySMS');
          setErrorMessage(null);
        }
      }
    } catch (e) {
      setErrorMessage(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  const verifySMS = async () => {
    setLoading(true);
    try {
      const res = await API.verifySMSCode(phoneNumber, smsCode);
      if (res) {
        if (res.error_code) {
          setErrorMessage(res.message);
        } else {
          if (res.logged_in_user) {
            await AsyncStorage.setItem('userToken', res.logged_in_user.token);
            await AsyncStorage.setItem('userID', res.logged_in_user.user.id);
            if (res.logged_in_user.group) {
              await AsyncStorage.setItem(
                'groupID',
                res.logged_in_user.group.id,
              );
              await AsyncStorage.setItem(
                'groupName',
                res.logged_in_user.group.name,
              );
              await AsyncStorage.setItem(
                'groupColor',
                res.logged_in_user.group.color,
              );
              navigation.push('Home');
            } else {
              setPhase('sendEmail');
            }
          } else if (res.registration_id) {
            setRegistrationID(res.registration_id);
            setPhase('setAge');
          }
          setErrorMessage(null);
        }
      }
    } catch (e) {
      setErrorMessage(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  return (
    <>
      <View style={{ ...s.container, backgroundColor: colors.background }}>
        {errorMessage && (
          <Card
            style={{
              backgroundColor: colors.errorContainer,
              marginBottom: 10,
            }}>
            <Card.Content>
              <Text style={{ color: colors.onErrorContainer }}>
                {errorMessage}
              </Text>
            </Card.Content>
          </Card>
        )}
        <Card mode="elevated">
          {phase == 'sendSMS' && (
            <Card.Content style={s.centeredCard}>
              <Text variant="headlineMedium" style={{ color: colors.primary }}>
                Hi there
              </Text>
              <Text variant="labelLarge" style={s.subtitle}>
                Welcome to{' '}
                <Text variant="labelLarge" style={{ color: colors.primary }}>
                  Offsides
                </Text>
                , a third-party client for Sidechat/YikYak
              </Text>
              <Divider
                bold={true}
                style={{ width: '100%', marginBottom: 10 }}
              />
              <Text
                variant="bodyMedium"
                style={{ ...s.subtitle, width: '90%' }}>
                Enter your phone number and Sidechat will send you a text
                message with a code.
              </Text>
              <TextInput
                mode="outlined"
                label="Your phone number"
                style={{ ...s.fullWidth, marginBottom: 10 }}
                value={phoneNumber}
                textContentType="telephoneNumber"
                onChangeText={phoneNumber => setPhoneNumber(phoneNumber)}
              />
              <Button
                mode="contained-tonal"
                loading={loading}
                onPress={sendSMS}>
                Send code
              </Button>
            </Card.Content>
          )}
          {phase == 'verifySMS' && (
            <Card.Content style={{ ...s.centeredCard, padding: 10 }}>
              <Text variant="headlineSmall" style={{ color: colors.primary }}>
                SMS Verification
              </Text>
              <Divider bold={true} />
              <Text variant="labelLarge" style={s.subtitle}>
                Enter the code that you recieved at{' '}
                {phoneNumber || 'your phone number.'}
              </Text>
              <TextInput
                mode="outlined"
                placeholder="— — — — — —"
                style={{
                  marginBottom: 10,
                  textAlign: 'center',
                }}
                value={smsCode}
                textContentType="oneTimeCode"
                onChangeText={smsCode => setSmsCode(smsCode)}
              />
              <View
                style={{ display: 'flex', flexDirection: 'row', columnGap: 5 }}>
                <Button mode="contained" loading={loading} onPress={verifySMS}>
                  Verify
                </Button>
                <Button
                  mode="contained-tonal"
                  loading={loading}
                  onPress={sendSMS}>
                  Resend
                </Button>
              </View>
            </Card.Content>
          )}
        </Card>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  centeredCard: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    textAlign: 'center',
    paddingBottom: 15,
  },
  subtitle: {
    textAlign: 'center',
    width: '70%',
    marginBottom: 10,
  },
  fullWidth: {
    width: '100%',
  },
});

export default LoginScreen;
