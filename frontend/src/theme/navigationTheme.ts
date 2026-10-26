import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';

export const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0064FF',
    background: '#F6F8FC',
    card: '#FFFFFF',
    text: '#152238',
    border: '#E5EAF2',
    notification: '#F35D7A',
  },
};
export const darkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#6B9FFF',
    background: '#0C1422',
    card: '#162235',
    text: '#F2F5FB',
    border: '#29374C',
    notification: '#FF8199',
  },
};
