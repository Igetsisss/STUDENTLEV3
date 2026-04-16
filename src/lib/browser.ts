// Detects in-app browsers (Facebook, Instagram, etc.) without a heavy library.
const IN_APP_BROWSER_PATTERN =
  /FBAN|FBAV|Instagram|MessengerForiOS|\bLine\/|WeChat|Puffin|Twitter\/\d/i

export const isInAppBrowser = () =>
  IN_APP_BROWSER_PATTERN.test(navigator.userAgent)
