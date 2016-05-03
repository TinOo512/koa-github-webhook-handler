# koa-github-webhook-handler
Koa.js middleware for processing GitHub Webhooks

This library is a small **middleware** for Koa.js web servers that handles all the logic of receiving and verifying webhook requests from GitHub. It's based on the awesome job of @rvagg [here](https://github.com/rvagg/github-webhook-handler).

## Dependency

Any **JSON body parser middleware** for Koa.js (see complete list [here](https://github.com/koajs/koa/wiki#body-parsing)).

## Example

```js
import koa from 'koa';
import koaBody from 'koa-body';
import GithubWebhookHandler from 'koa-github-webhook-handler';

let app = koa();

let githubWebhookHandler = new GithubWebhookHandler({
  path: '/webhook',
  secret: 'myhashsecret'
});

githubWebhookHandler.on('push', (event) => {
  console.log('Received a push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref)
});

app.use(githubWebhookHandler.verify());
app.use(koaBody({formidable:{uploadDir: __dirname}}));
app.use(githubWebhookHandler.middleware());

app.listen((process.env.PORT || 3000));
```

## API

koa-github-webhook-handler exports a **class**, you must instantiate it with an *options* object. Your options object should contain:

 * `"path"`: the complete case sensitive path/route to match when looking at `req.url` for incoming requests. Any request not matching this path will `yield` to the "downstream" **middleware**.
 * `"secret"`: this is a hash key used for creating the SHA-1 HMAC signature of the JSON blob sent by GitHub. You should register the same secret key with GitHub. Any request not delivering a `X-Hub-Signature` that matches the signature generated using this key against the blob will throw an HTTP `400` error code.

The **middleware** method return a `GeneratorFunction` wich act like a common **middleware** that you can insert into a processing chain. The next **middleware** is not `yield` if the request is successfully handled.

The **class** inherits form `EventEmitter`, so you can register **handler** to listen to any of the GitHub event types. Note you can be specific in your GitHub configuration about which events you wish to receive, or you can send them all.

See the [GitHub Webhooks documentation](https://developer.github.com/webhooks/) for more details on the events you can receive.

Additionally, there is a special `'*'` event you can listen to in order to receive _everything_.

## License

**koa-github-webhook-handler** is Copyright (c) 2015 TinOo512 [@TinOo512](https://twitter.com/TinOo512) and licensed under the MIT License. All rights not explicitly granted in the MIT License are reserved. See the included [LICENSE.md](./LICENSE.md) file for more details.
