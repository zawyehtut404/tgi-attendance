import defaultTheme from './default';
import thingyanTheme from './thingyan';
import christmasTheme from './christmas';
import cnyTheme from './cny';

export const themes = {
  default: defaultTheme,
  thingyan: thingyanTheme,
  christmas: christmasTheme,
  cny: cnyTheme
};

export const THEME_STORAGE_KEY = 'attendance_theme';

export function getTheme(themeKey) {
  return themes[themeKey] || themes.thingyan || defaultTheme;
}

