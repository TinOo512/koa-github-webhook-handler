import { createServer } from 'http';
import { parse } from 'url';
import test from 'tape';
import cotape from 'co-tape';
import superagent from 'superagent';
import superagentPromisePlugin from 'superagent-promise-plugin';
import koa from 'koa';
import koaBody from 'koa-body';
import GithubWebhookHandler from './../src/koa-github-webhook-handler';
import { signBlob } from './../src/tools.es6';

const localhost = 'http://localhost:3000';
const request =  superagentPromisePlugin.patch(superagent);

const setup = (opts = {}) => {
  opts.path = opts.path || '/webhook';
  opts.secret = opts.secret || 'myhashsecret';
  const app = koa();

  const handler = new GithubWebhookHandler(opts);

  app.use(koaBody({formidable:{uploadDir: __dirname}}));
  app.use(handler.middleware());

  const server = createServer(app.callback()).listen(3000);

  return { server, handler };
};

const teardown = server => {
  server.close();
};

test('constructor without full options throws', ({ throws, end }) => {
  const actual = (...args) => new GithubWebhookHandler(...args);
  throws(actual, /must provide an options object/, 'throws if no options');
  throws(actual.bind(null, {}), /must provide a 'path' option/, 'throws if no path option');
  throws(actual.bind(null, { path: '/' }), /must provide a 'secret' option/, 'throws if no secret option');
  end()
});

test('middleware ignores invalid url', cotape(function *({ equal, fail, end }) {
  const { server } = setup();

  try {
    yield request.get(localhost);
    fail("request was handled");
  } catch (err) {
    const { status: actual } = err;
    equal(actual, 404, 'request was ignored');
  }

  teardown(server);
  end();
}));

test('middleware accepts valid urls', cotape(function *({ pass, notEqual, end }) {
  const { server } = setup();

  try {
    yield request.get(`${localhost}/webhook`);
    pass("request was handled");
  } catch (err) {
    const { status: actual } = err;
    notEqual(actual, 404, 'request was ignored');
  }

  try {
    yield request.get(`${localhost}/webhook?test=param`);
    pass("request with param was handled");
  } catch (err) {
    const { status: actual } = err;
    notEqual(actual, 404, 'request was ignored');
  }

  teardown(server);
  end();
}));

test('middleware responds with a 400 for missing headers', cotape(function *({ equal, end }) {
  const { server } = setup();
  const payload = { some: 'github', object: 'with', properties: true };

  try {
    yield request.post(`${localhost}/webhook`)
      .send(payload)
      .set('x-github-event', 'push')
      .set('x-github-delivery', 'bogus');
  } catch (err) {
    const { status: actual } = err;
    equal(actual, 400, 'correct status code');
  }

  try {
    yield request.post(`${localhost}/webhook`)
        .send(payload)
        .set('x-hub-signature', signBlob('myhashsecret', JSON.stringify(payload)))
        .set('x-github-delivery', 'bogus');
  } catch (err) {
    const { status: actual } = err;
    equal(actual, 400, 'correct status code');
  }

  try {
    yield request.post(`${localhost}/webhook`)
        .send(payload)
        .set('x-hub-signature', signBlob('myhashsecret', JSON.stringify(payload)))
        .set('x-github-event', 'push')
  } catch (err) {
    const { status: actual } = err;
    equal(actual, 400, 'correct status code');
  }

  end();
  teardown(server);
}));

test('middleware accepts a signed blob', cotape(function *({ plan, equal, deepEqual, error, fail }) {
  const { server, handler } = setup();
  const { protocol, host } = parse(localhost);
  const url = '/webhook';
  const payload = { some: 'github', object: 'with', properties: true };

  plan(3);

  handler.on('push', event => {
    deepEqual(event, { event: 'push', id: 'bogus', payload, protocol: protocol.slice(0, -1), host, url });
  });

  try {
    const res = yield request.post(localhost + url)
      .send(payload)
      .set('x-hub-signature', signBlob('myhashsecret', JSON.stringify(payload)))
      .set('x-github-event', 'push')
      .set('x-github-delivery', 'bogus');

    equal(res.status, 200, 'correct status code');
    equal(res.res.text, '{"ok":true}', 'got correct content');
  } catch (err) {
    error(err);
    fail('should not get here!');
  }

  teardown(server);
}));


test('middleware accepts a signed blob with alt event', cotape(function *({ plan, equal, deepEqual, error, fail }) {
  const { server, handler } = setup();
  const { protocol, host } = parse(localhost);
  const url = '/webhook';
  const payload = { some: 'github', object: 'with', properties: true };

  plan(3);

  handler.on('push', () => fail('should not get here!'));
  handler.on('issue', function (event) {
    deepEqual(event, { event: 'issue', id: 'bogus', payload, protocol: protocol.slice(0, -1), host, url });
  });

  try {
    const res = yield request.post(localhost + url)
      .send(payload)
      .set('x-hub-signature', signBlob('myhashsecret', JSON.stringify(payload)))
      .set('x-github-event', 'issue')
      .set('x-github-delivery', 'bogus');

    equal(res.status, 200, 'correct status code');
    equal(res.res.text, '{"ok":true}', 'got correct content');
  } catch (err) {
    error(err);
    fail('should not get here!');
  }

  teardown(server);
}));

test('middleware rejects a badly signed blob', cotape(function *({ equal, fail, end }) {
  const { server, handler } = setup();
  const payload = { some: 'github', object: 'with', properties: true };
  const sig = signBlob('myhashsecret', JSON.stringify(payload));

  handler.on('push', () => fail('should not get here!'));

  try {
    yield request.post(`${localhost}/webhook`)
      .send(payload)
      .set('x-hub-signature', `0${sig.slice(1)}`) // break signage by a tiny bit
      .set('x-github-event', 'issue')
      .set('x-github-delivery', 'bogus');
  } catch (err) {
    const { status: actual } = err;
    equal(actual, 400, 'correct status code');
  }

  teardown(server);
  end();
}));