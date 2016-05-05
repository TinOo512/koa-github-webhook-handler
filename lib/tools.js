'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.signBlob = signBlob;

var _crypto = require('crypto');

function signBlob(key, blob) {
  return 'sha1=' + (0, _crypto.createHmac)('sha1', key).update(blob).digest('hex');
}