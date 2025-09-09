// Polyfill for web compatibility
if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof require === 'undefined') {
  window.require = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
  });
}