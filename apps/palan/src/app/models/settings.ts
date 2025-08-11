export interface Settings {
  theme: Theme;
  colorScheme: ColorScheme;
  refreshInterval: RefreshInterval;
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

export enum RefreshInterval { // in seconds
  FIFTEEN_SECONDS = 15_000,
  THIRTY_SECONDS = 30_000,
  ONE_MINUTE = 60_000,
}
