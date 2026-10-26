import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../theme/navigationTheme';
import { navigationRef } from './navigationRef';
import { RootNavigator } from './RootNavigator';

export function AppNavigator() {
  const dark = useColorScheme() === 'dark';
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={dark ? darkTheme : lightTheme}
    >
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </NavigationContainer>
  );
}
