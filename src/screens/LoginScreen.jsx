import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import {
  Button,
  Card,
  Text,
  Divider,
  TextInput,
  useTheme,
} from 'react-native-paper';
import RNRestart from 'react-native-restart';
import AppContext from '../utils/AppContext';
import DeviceInfo from 'react-native-device-info';
import { sha256 } from 'js-sha256';
import PatternBG from '../assets/bgpattern.png';
import { showPhoneNumberHint } from '@shayrn/react-native-android-phone-number-hint';
import { useSmsUserConsent } from '@eabdullazyanov/react-native-sms-user-consent';
import crashlytics from '@react-native-firebase/crashlytics';
import { storage } from '../utils/mmkv';
import { useMMKVObject } from 'react-native-mmkv';
import { Alert, AlertDescription, AlertTitle } from '@/reusables/ui/alert';
import { Terminal } from 'lucide-react-native';
import { verifyInstallation } from 'nativewind';

function LoginScreen({ }) {
  verifyInstallation();
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [errorMessage, setErrorMessage] = React.useState();
  const [phase, setPhase] = React.useState('sendSMS');
  const [phoneNumber, setPhoneNumber] = React.useState();
  const [smsCode, setSmsCode] = React.useState('');
  const [registrationID, setRegistrationID] = React.useState();
  const [myAge, setMyAge] = React.useState();
  const [email, setEmail] = React.useState();
  const [loading, setLoading] = React.useState(false);
  const retrievedCode = useSmsUserConsent('[A-Z0-9]{6}');
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');

  React.useEffect(() => {
    crashlytics().log('Loading LoginScreen');
  }, []);

  React.useEffect(() => {
    crashlytics().log('Code retrieved from native AndroidSmsUserConsent');
    if (retrievedCode) setSmsCode(retrievedCode);
  }, [retrievedCode]);

  React.useEffect(() => {
    crashlytics().log('Verifying SMS code');
    if (smsCode.length == 6) verifySMS(smsCode);
  }, [smsCode]);

  React.useEffect(() => {
    crashlytics().log(`Phase changed to ${phase}`);
    if (phase == 'sendSMS' && !phoneNumber) {
      crashlytics().log(`Initializing native AndroidPhoneNumberHint`);
      (async () => {
        try {
          let num = await showPhoneNumberHint();
          num = num.replace('+1', '').replace(/\D/g, '');
          setPhoneNumber(num);
          sendSMS(num);
        } catch (e) {
          crashlytics().log(`Error with native AndroidPhoneNumberHint`);
          crashlytics().recordError(e);
          console.error(e);
        }
      })();
    }
  }, [phase]);

  const sendSMS = async num => {
    setLoading(true);
    try {
      crashlytics().log(
        `Sending SMS verification code to ${num ? 'AndroidPhoneNumberHint provided' : 'user provided'
        } number`,
      );
      const res = await API.loginViaSMS(
        num != undefined && num.length == 10 ? num : phoneNumber,
      );
      if (res) {
        if (res.error_code) {
          crashlytics().log(`Error sending SMS code: ${res.error_code}`);
          crashlytics().recordError(new Error(res.message));
          throw new Error(res.message);
        } else {
          setPhase('verifySMS');
          setErrorMessage(null);
        }
      }
    } catch (e) {
      crashlytics().log(`Error sending SMS code`);
      crashlytics().recordError(e);
      setErrorMessage(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  const verifySMS = async codeOverride => {
    setLoading(true);
    try {
      crashlytics().log('Verifying SMS code with API');
      const res = await API.verifySMSCode(
        phoneNumber,
        codeOverride ? codeOverride : smsCode,
      );
      if (res) {
        if (res.error_code) {
          throw new Error(res.message);
        } else {
          if (res.logged_in_user) {
            crashlytics().log(
              'User successfully logged in without age verification',
            );
            storage.set('userToken', res.logged_in_user.token);
            storage.set('userID', res.logged_in_user.user.id);
            if (res.logged_in_user.group) {
              setCurrentGroup(res.logged_in_user.group);
              storage.set(
                'groupID',
                res.logged_in_user.group.id,
              );
              storage.set(
                'groupName',
                res.logged_in_user.group.name,
              );
              storage.set(
                'groupColor',
                res.logged_in_user.group.color,
              );
              storage.set(
                'groupImage',
                res.logged_in_user.group.icon_url || '',
              );
              storage.set(
                'schoolGroupID',
                res.logged_in_user.group.id,
              );
              storage.set(
                'schoolGroupName',
                res.logged_in_user.group.name,
              );
              storage.set(
                'schoolGroupColor',
                res.logged_in_user.group.color,
              );
              storage.set(
                'schoolGroupImage',
                res.logged_in_user.group.icon_url || '',
              );
              RNRestart.restart();
            } else {
              if (res.registration_id) {
                setRegistrationID(res.registration_id);
                setPhase('setAge');
              } else {
                setPhase('registerEmail');
              }
            }
          } else if (res.registration_id) {
            crashlytics().log(
              'SMS successfully verifed, proceeding to age verification',
            );
            setRegistrationID(res.registration_id);
            setPhase('setAge');
          } else {
            crashlytics().log(
              'Unknown authentication error after SMS verification',
            );
            throw new Error(
              'Unknown authentication error after SMS verification.',
            );
          }
        }
      }
    } catch (e) {
      crashlytics().recordError(e);
      setErrorMessage(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  const setAge = async () => {
    setLoading(true);
    try {
      crashlytics().log('Verifying age with API');
      const res = await API.setAge(myAge, registrationID);
      if (res) {
        if (res.error_code) {
          crashlytics().log(`Error setting age: ${res.message}`);
          throw new Error(res.message);
        } else {
          if (res.token) {
            crashlytics().log(
              'Age successfully verified, proceeding to email registration',
            );
            storage.set('userToken', res.token);
            const id = await DeviceInfo.getAndroidId();
            const deviceID = sha256(id);
            await API.setDeviceID(deviceID);
            setPhase('registerEmail');
          } else {
            throw new Error('Failed to set age.');
          }
        }
      }
    } catch (e) {
      setErrorMessage(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  const registerEmail = async () => {
    setLoading(true);
    try {
      crashlytics().log('Registering school email with API');
      const res = await API.registerEmail(email);
      if (res) {
        if (res.error_code) {
          crashlytics().recordError(new Error(res.message));
          throw new Error(res.message);
        } else {
          crashlytics().log(
            'Email successfully registered, proceeding to verification',
          );
          setPhase('verifyEmail');
          setErrorMessage(null);
        }
      }
    } catch (e) {
      crashlytics().recordError(e);
      setErrorMessage(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  const verifyEmail = async () => {
    setLoading(true);
    try {
      crashlytics().log('Verifying email with API');
      const res = await API.checkEmailVerification();
      if (res) {
        if (res.error_code) {
          crashlytics().log(res.message);
          throw new Error(res.message);
        } else {
          if (res.user) {
            storage.set('userToken', res.token);
            storage.set('userID', res.user.id);
            if (res.group) {
              setCurrentGroup(res.group);
              storage.set('groupID', res.group.id);
              storage.set('schoolGroupID', res.group.id);
              storage.set('groupName', res.group.name);
              storage.set('schoolGroupName', res.group.name);
              storage.set('groupColor', res.group.color);
              storage.set('schoolGroupColor', res.group.color);
              storage.set(
                'groupImage',
                res.group.icon_url || '',
              );
              storage.set(
                'schoolGroupImage',
                res.group.icon_url || '',
              );
            }
            if (res.user.has_verified_email) {
              RNRestart.restart();
            }
          } else {
            throw new Error('Try clicking the link in your email again.');
          }
        }
      }
    } catch (e) {
      crashlytics().recordError(e);
      setErrorMessage(e.message);
      console.error(e);
    }
    setLoading(false);
  };
  return (
    <>
      <View style={{ backgroundColor: colors.background, flex: 1 }}>
        <ImageBackground
          source={PatternBG}
          resizeMode="repeat"
          style={{ flex: 1, ...s.container }}
          imageStyle={{ opacity: 0.2 }}>
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
          <Alert variant="destructive" icon={Terminal}>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>Test this</AlertDescription>
          </Alert>
          <Card mode="elevated">
            {phase == 'sendSMS' && (
              <Card.Content style={s.centeredCard}>
                <Text
                  variant="headlineMedium"
                  style={{ color: colors.primary }}>
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
                  maxLength={10}
                  onChangeText={phoneNumber => setPhoneNumber(phoneNumber)}
                />

                <Button mode="contained" loading={loading} onPress={sendSMS}>
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
                <View>
                  <TextInput
                    mode="outlined"
                    placeholder="— — — — — —"
                    style={{
                      marginBottom: 10,
                      textAlign: 'center',
                      width: '100%',
                    }}
                    autoFocus={true}
                    value={smsCode}
                    textContentType="oneTimeCode"
                    maxLength={6}
                    autoComplete="one-time-code"
                    onChangeText={setSmsCode}
                  />
                </View>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    columnGap: 5,
                  }}>
                  <Button
                    mode="contained-tonal"
                    loading={loading}
                    onPress={() => {
                      if (phoneNumber?.length == 10) {
                        setSmsCode('');
                        sendSMS();
                      } else {
                        setPhase('sendSMS');
                      }
                    }}>
                    Resend code
                  </Button>
                </View>
              </Card.Content>
            )}
            {phase == 'setAge' && (
              <Card.Content style={{ ...s.centeredCard, padding: 10 }}>
                <Text variant="headlineSmall" style={{ color: colors.primary }}>
                  Verify Your Age
                </Text>
                <Divider bold={true} />
                <Text variant="labelLarge" style={s.subtitle}>
                  How old are you?
                </Text>
                <TextInput
                  mode="outlined"
                  placeholder="Age"
                  style={{
                    marginBottom: 10,
                    textAlign: 'center',
                    width: 100,
                  }}
                  value={myAge}
                  keyboardType="number-pad"
                  onChangeText={a => setMyAge(a)}
                />
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    columnGap: 5,
                  }}>
                  <Button mode="contained" loading={loading} onPress={setAge}>
                    Verify
                  </Button>
                </View>
              </Card.Content>
            )}
            {phase == 'registerEmail' && (
              <Card.Content style={{ ...s.centeredCard, padding: 10 }}>
                <Text variant="headlineSmall" style={{ color: colors.primary }}>
                  Set Email
                </Text>
                <Divider bold={true} />
                <Text variant="labelLarge" style={s.subtitle}>
                  Use your school (.edu) email address
                </Text>
                <TextInput
                  mode="outlined"
                  label="Your school email"
                  style={{ ...s.fullWidth, marginBottom: 10 }}
                  value={email}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  onChangeText={e => setEmail(e)}
                />
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    columnGap: 5,
                  }}>
                  <Button
                    mode="contained"
                    loading={loading}
                    onPress={registerEmail}>
                    Verify
                  </Button>
                </View>
              </Card.Content>
            )}
            {phase == 'verifyEmail' && (
              <Card.Content style={{ ...s.centeredCard, padding: 10 }}>
                <Text variant="headlineSmall" style={{ color: colors.primary }}>
                  Verify Email
                </Text>
                <Divider bold={true} />
                <Text variant="labelLarge" style={s.subtitle}>
                  Go click the verification link in your email address, then
                  come back here and click continue.
                </Text>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    columnGap: 5,
                  }}>
                  <Button
                    mode="outlined"
                    loading={loading}
                    onPress={() => setPhase('registerEmail')}>
                    Go back
                  </Button>
                  <Button
                    mode="contained"
                    loading={loading}
                    onPress={verifyEmail}>
                    Continue
                  </Button>
                </View>
              </Card.Content>
            )}
          </Card>
        </ImageBackground>
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
