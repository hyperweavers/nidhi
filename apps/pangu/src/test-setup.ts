// @ts-expect-error https://thymikee.github.io/jest-preset-angular/docs/getting-started/test-environment
globalThis.ngJest = {
  testEnvironmentOptions: {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
};
import 'jest-preset-angular/setup-jest';

// Workaround to fix "TypeError: window.matchMedia is not a function" in Jest tests
// Refer: https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Workaround to fix "ReferenceError: Datepicker is not defined" in Jest tests
import { Datepicker } from 'flowbite';
// @ts-expect-error https://stackoverflow.com/questions/72732164/jest-referenceerror-on-globally-defined-js-constants-within-angular-components
global.DatePicker = Datepicker;
