const { contextBridge } = require('electron');

// Renderer talks to the NestJS API over HTTP; nothing from Node.js is
// exposed beyond app metadata. Extend carefully — everything here is
// reachable from web content.
contextBridge.exposeInMainWorld('blackhorse', {
  platform: process.platform,
  appVersion: process.env.npm_package_version ?? '0.1.0',
});
