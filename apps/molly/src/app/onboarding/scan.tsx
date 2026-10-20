import { loginFromQr } from '@molly/core';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text, Title } from '@/components/ui';
import { useConnect } from '@/features/onboarding/use-connect';

export default function Scan() {
  const { connect, checking } = useConnect();
  const [permission, requestPermission] = useCameraPermissions();
  const [wrongCode, setWrongCode] = useState(false);
  // The camera reports the same code many times a second; accept only the first good one.
  const done = useRef(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Screen>
        <Title>Scan the login QR code</Title>
        <Text className="mb-6 text-base font-semibold">
          {"Molly needs the camera to read the code on Baby Buddy's Add a device page."}
        </Text>
        {permission.canAskAgain ? (
          <Button label="Allow the camera" onPress={requestPermission} />
        ) : (
          <Text className="mb-6 text-base font-semibold text-danger">
            {"Camera access is off for Molly. Turn it on in Android's settings, or enter the address and key instead."}
          </Text>
        )}
        <View className="mt-4">
          <Button label="Back" variant="outline" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (done.current) return;
          const login = loginFromQr(data);
          if (!login) return setWrongCode(true);
          done.current = true;
          connect(login.baseUrl, login.token, { replace: true }).then((ok) => {
            // On failure the connect screen shows the error with both fields filled in.
            if (!ok) router.back();
          });
        }}
      />
      <View className="absolute bottom-0 left-0 right-0 gap-3 bg-black/70 p-6 pb-12">
        <Text className="text-center text-base font-bold text-white">
          {checking
            ? 'Checking…'
            : wrongCode
              ? "That's not a Baby Buddy login code. Use the one under Add a device."
              : "Point the camera at the Login QR code on Baby Buddy's Add a device page."}
        </Text>
        <Button label="Cancel" variant="outline" onPress={() => router.back()} />
      </View>
    </View>
  );
}
