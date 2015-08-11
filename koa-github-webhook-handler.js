var EventEmitter = require('events').EventEmitter;
var crypto       = require('crypto');

function signBlob (key, blob) {
  return 'sha1=' + crypto.createHmac('sha1', key).update(blob).digest('hex');
}

var githubWebhookHandler = {
  __proto__: EventEmitter.prototype,
  middleware: function middleware (options) {
    var self = this;

    if (typeof options !== 'object')
      throw new TypeError('must provide an options object');

    if (typeof options.path !== 'string')
      throw new TypeError('must provide a \'path\' option');

    if (typeof options.secret !== 'string')
      throw new TypeError('must provide a \'secret\' option');

    return function *middleware (next) {
      if (this.request.path !== options.path)
        return yield next;

      var sig   = this.request.get('x-hub-signature');
      var event = this.request.get('x-github-event');
      var id    = this.request.get('x-github-delivery');

      this.assert(sig, 400, 'No X-Hub-Signature found on request');
      this.assert(event, 400, 'No X-Github-Event found on request');
      this.assert(id, 400, 'No X-Github-Delivery found on request');

      var isBlobMatchingSig = sig === signBlob(options.secret, JSON.stringify(this.request.body));
      this.assert(isBlobMatchingSig, 400, 'X-Hub-Signature does not match blob signature');

      this.response.body = JSON.stringify({ok: true});

      var emitData = {
        event   : event,
        id      : id,
        payload : this.request.body,
        protocol: this.request.protocol,
        host    : this.request.get('host'),
        url     : this.request.url
      };

      self.emit(event, emitData);
      self.emit('*', emitData);
    }
  }
};

EventEmitter.call(githubWebhookHandler);

module.exports = githubWebhookHandler;
