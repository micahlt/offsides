import React from 'react';
import { View, ImageBackground, ActivityIndicator } from 'react-native';
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
import { verifyInstallation } from 'nativewind';
import { Terminal } from 'lucide-react-native';

import { Button } from '@/reusables/ui/button';
import { Card, CardContent } from '@/reusables/ui/card';
import { Text } from '@/reusables/ui/text';
import { Input } from '@/reusables/ui/input';
import { Separator } from '@/reusables/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/reusables/ui/alert';

function LoginScreen({ }) {
  verifyInstallation();
  const { appState } = React.useContext(AppContext);
  const API = appState.API;

  // State
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

  // Effects
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

  // Methods
  const sendSMS = async num => {
    setLoading(true);
    try {
      crashlytics().log(
        `Sending SMS verification code to ${num ? 'AndroidPhoneNumberHint provided' : 'user provided'} number`,
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
            crashlytics().log('User successfully logged in without age verification');
            storage.set('userToken', res.logged_in_user.token);
            storage.set('userID', res.logged_in_user.user.id);
            if (res.logged_in_user.group) {
              setCurrentGroup(res.logged_in_user.group);
              storage.set('groupID', res.logged_in_user.group.id);
              storage.set('groupName', res.logged_in_user.group.name);
              storage.set('groupColor', res.logged_in_user.group.color);
              storage.set('groupImage', res.logged_in_user.group.icon_url || '');
              storage.set('schoolGroupID', res.logged_in_user.group.id);
              storage.set('schoolGroupName', res.logged_in_user.group.name);
              storage.set('schoolGroupColor', res.logged_in_user.group.color);
              storage.set('schoolGroupImage', res.logged_in_user.group.icon_url || '');
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
            crashlytics().log('SMS successfully verifed, proceeding to age verification');
            setRegistrationID(res.registration_id);
            setPhase('setAge');
          } else {
            crashlytics().log('Unknown authentication error after SMS verification');
            throw new Error('Unknown authentication error after SMS verification.');
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
            crashlytics().log('Age successfully verified, proceeding to email registration');
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
          crashlytics().log('Email successfully registered, proceeding to verification');
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
              storage.set('groupImage', res.group.icon_url || '');
              storage.set('schoolGroupImage', res.group.icon_url || '');
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
    <View className="flex-1 bg-background">
      <ImageBackground
        source={PatternBG}
        resizeMode="repeat"
        style={{ flex: 1, justifyContent: 'center', padding: 20 }}
        imageStyle={{ opacity: 0.2 }}>

        {errorMessage && (
          <Alert variant="destructive" icon={Terminal} className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <Card className="w-full">
          {phase == 'sendSMS' && (
            <CardContent className="flex flex-col items-center px-6 gap-4 text-center">
              <Text variant="h3" className="text-primary font-bold">
                Hi there
              </Text>
              <Text variant="small" className="text-center w-3/4">
                Welcome to{' '}
                <Text variant="small" className="text-primary font-bold">
                  Offsides
                </Text>
                , a third-party client for Sidechat/YikYak
              </Text>
              <Separator />
              <Text className="text-center w-11/12 text-muted-foreground leading-5">
                Enter your phone number and Sidechat will send you a text message with a code.
              </Text>

              <Input
                placeholder="Your phone number"
                className="w-full text-center"
                value={phoneNumber}
                textContentType="telephoneNumber"
                maxLength={10}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />

              <Button disabled={loading} onPress={() => sendSMS()} className="w-full">
                {loading ? <ActivityIndicator color="#fff" size="small" className="mr-2" /> : null}
                <Text>Send code</Text>
              </Button>
            </CardContent>
          )}

          {phase == 'verifySMS' && (
            <CardContent className="flex flex-col items-center p-6 gap-4">
              <Text variant="h3" className="text-primary">
                SMS Verification
              </Text>
              <Separator />
              <Text className="text-center w-3/4">
                Enter the code that you recieved at{' '}
                <Text className="font-bold">{phoneNumber || 'your phone number.'}</Text>
              </Text>

              <Input
                placeholder="— — — — — —"
                className="w-full text-center tracking-widest text-lg"
                autoFocus={true}
                value={smsCode}
                textContentType="oneTimeCode"
                maxLength={6}
                autoComplete="one-time-code" // or "sms-otp"
                onChangeText={setSmsCode}
                keyboardType="number-pad"
              />

              <Button
                variant="secondary"
                disabled={loading}
                className="w-full"
                onPress={() => {
                  if (phoneNumber?.length == 10) {
                    setSmsCode('');
                    sendSMS();
                  } else {
                    setPhase('sendSMS');
                  }
                }}>
                {loading ? <ActivityIndicator color="#000" size="small" className="mr-2" /> : null}
                <Text>Resend code</Text>
              </Button>
            </CardContent>
          )}

          {phase == 'setAge' && (
            <CardContent className="flex flex-col items-center p-6 gap-4">
              <Text variant="h3" className="text-primary">
                Verify Your Age
              </Text>
              <Separator />
              <Text className="text-center w-3/4">
                How old are you?
              </Text>

              <Input
                placeholder="Age"
                className="w-24 text-center"
                value={myAge}
                keyboardType="number-pad"
                onChangeText={setMyAge}
              />

              <Button disabled={loading} onPress={setAge} className="w-full">
                {loading ? <ActivityIndicator color="#fff" size="small" className="mr-2" /> : null}
                <Text>Verify</Text>
              </Button>
            </CardContent>
          )}

          {phase == 'registerEmail' && (
            <CardContent className="flex flex-col items-center p-6 gap-4">
              <Text variant="h3" className="text-primary">
                Set Email
              </Text>
              <Separator />
              <Text className="text-center w-full">
                Use your school (.edu) email address
              </Text>

              <Input
                placeholder="Your school email"
                className="w-full"
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                onChangeText={setEmail}
              />

              <Button disabled={loading} onPress={registerEmail} className="w-full">
                {loading ? <ActivityIndicator color="#fff" size="small" className="mr-2" /> : null}
                <Text>Verify</Text>
              </Button>
            </CardContent>
          )}

          {phase == 'verifyEmail' && (
            <CardContent className="flex flex-col items-center p-6 gap-4">
              <Text variant="h3" className="text-primary">
                Verify Email
              </Text>
              <Separator />
              <Text className="text-center w-3/4">
                Go click the verification link in your email address, then come back here and click continue.
              </Text>

              <View className="flex-row gap-2 w-full">
                <Button
                  variant="outline"
                  disabled={loading}
                  onPress={() => setPhase('registerEmail')}
                  className="flex-1">
                  <Text>Go back</Text>
                </Button>

                <Button
                  disabled={loading}
                  onPress={verifyEmail}
                  className="flex-1">
                  {loading ? <ActivityIndicator color="#fff" size="small" className="mr-2" /> : null}
                  <Text>Continue</Text>
                </Button>
              </View>
            </CardContent>
          )}
        </Card>
      </ImageBackground>
    </View>
  );
}

export default LoginScreen;
