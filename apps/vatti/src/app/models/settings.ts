export interface Settings {
  theme: Theme;
  colorScheme: ColorScheme;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum ColorScheme {
  LIGHT = 'light',
  DARK = 'dark',
}
