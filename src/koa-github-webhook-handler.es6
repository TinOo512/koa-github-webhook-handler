'use strict';

import { EventEmitter } from 'events';
import { signBlob } from './tools';
import getRawBody from 'raw-body';

export default class GithubWebhookHandler extends EventEmitter {

  constructor(options) {
    super();

    if (typeof options !== 'object') throw new TypeError(`must provide an options object`);
    if (typeof options.path !== 'string') throw new TypeError(`must provide a 'path' option`);
    if (typeof options.secret !== 'string') throw new TypeError(`must provide a 'secret' option`);

    this.options = options;
  }

  verify() {
    const self = this;

    return function *verify (next) {
      if (this.request.path !== self.options.path) return yield next;

      const sig   = this.request.get('x-hub-signature');
      const event = this.request.get('x-github-event');
      const id    = this.request.get('x-github-delivery');

      this.assert(sig, 400, 'No X-Hub-Signature found on request');
      this.assert(event, 400, 'No X-Github-Event found on request');
      this.assert(id, 400, 'No X-Github-Delivery found on request');

      const buffer = yield getRawBody(this.req, {
        length: this.length,
        limit: '1mb',
        encoding: this.charset
      })

      const isBlobMatchingSig = sig === 'sha1=' + crypto.createHmac('sha1', self.options.secret).update(buffer).digest('hex');
      this.assert(isBlobMatchingSig, 400, 'X-Hub-Signature does not match blob signature');

      this.response.body = JSON.stringify({ok: true});
    }
  }

  middleware() {
    const self = this;

    return function *middleware (next) {
      if (this.request.path !== self.options.path) return yield next;

      const emitData = {
        event,
        id,
        payload: this.request.body,
        protocol: this.request.protocol,
        host: this.request.get('host'),
        url: this.request.url
      };

      self.emit(event, emitData);
      self.emit('*', emitData);
    };
  }

}
