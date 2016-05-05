'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _events = require('events');

var _tools = require('./tools');

var _rawBody = require('raw-body');

var _rawBody2 = _interopRequireDefault(_rawBody);

var GithubWebhookHandler = (function (_EventEmitter) {
  _inherits(GithubWebhookHandler, _EventEmitter);

  function GithubWebhookHandler(options) {
    _classCallCheck(this, GithubWebhookHandler);

    _get(Object.getPrototypeOf(GithubWebhookHandler.prototype), 'constructor', this).call(this);

    if (typeof options !== 'object') throw new TypeError('must provide an options object');
    if (typeof options.path !== 'string') throw new TypeError('must provide a \'path\' option');
    if (typeof options.secret !== 'string') throw new TypeError('must provide a \'secret\' option');

    this.options = options;
  }

  _createClass(GithubWebhookHandler, [{
    key: 'verify',
    value: function verify() {
      var self = this;

      return function* verify(next) {
        if (this.request.path !== self.options.path) return yield next;

        var sig = this.request.get('x-hub-signature');
        var event = this.request.get('x-github-event');
        var id = this.request.get('x-github-delivery');

        this.assert(sig, 400, 'No X-Hub-Signature found on request');
        this.assert(event, 400, 'No X-Github-Event found on request');
        this.assert(id, 400, 'No X-Github-Delivery found on request');

        var buffer = yield (0, _rawBody2['default'])(this.req, {
          length: this.length,
          limit: '1mb',
          encoding: this.charset
        });

        var isBlobMatchingSig = sig === 'sha1=' + crypto.createHmac('sha1', self.options.secret).update(buffer).digest('hex');
        // this.assert(isBlobMatchingSig, 400, 'X-Hub-Signature does not match blob signature');

        this.response.body = JSON.stringify({ ok: true });
      };
    }
  }, {
    key: 'middleware',
    value: function middleware() {
      var self = this;

      return function* middleware(next) {
        if (this.request.path !== self.options.path) return yield next;

        var emitData = {
          event: event,
          id: id,
          payload: this.request.body,
          protocol: this.request.protocol,
          host: this.request.get('host'),
          url: this.request.url
        };

        self.emit(event, emitData);
        self.emit('*', emitData);
      };
    }
  }]);

  return GithubWebhookHandler;
})(_events.EventEmitter);

exports['default'] = GithubWebhookHandler;
module.exports = exports['default'];