require('whatwg-fetch');
const { TextDecoder, TextEncoder } = require('util');

globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

let webStreams = {};
try {
  webStreams = require('stream/web');
} catch {
  // Ignore in environments where the web streams API is unavailable.
}

const { TransformStream, ReadableStream, WritableStream } = webStreams;

globalThis.TransformStream ??= TransformStream;
globalThis.ReadableStream ??= ReadableStream;
globalThis.WritableStream ??= WritableStream;

// Dexie cross-tab sync and msw's websocket layer use BroadcastChannel,
// which jsdom does not implement. Defined here (setupFiles) so it exists
// before any test module - including static import chains through
// src/app/mocks/test-utils -> msw - is evaluated.
/* eslint-disable @typescript-eslint/no-empty-function */
globalThis.BroadcastChannel ??= class BroadcastChannel {
  constructor() {}
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};
/* eslint-enable @typescript-eslint/no-empty-function */

// jsdom does not implement Element.scrollTo, but AppComponent calls
// mainContent.nativeElement.scrollTo on router navigation. Provide a no-op
// so unit tests exercise the navigation handlers instead of throwing.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function () {};
}
