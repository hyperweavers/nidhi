import { Button, ThemeProvider, ThemeSwitcher } from '@nidhi/ui';

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Button>Hello World</Button>

      <ThemeSwitcher></ThemeSwitcher>
    </ThemeProvider>
  );
}

export default App;
