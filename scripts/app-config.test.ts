import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('le baseUrl web reste, et un EAS_BUILD le retire sans toucher au bundle', () => {
  const previous = process.env.EAS_BUILD;
  const load = () => require('../app.config.js')() as { expo: { experiments?: { baseUrl?: string; typedRoutes?: boolean }; ios: { bundleIdentifier: string }; android: { package: string } } };
  try {
    delete process.env.EAS_BUILD;
    const web = load();
    assert.equal(web.expo.experiments?.baseUrl, '/onyx-transit');
    assert.equal(web.expo.ios.bundleIdentifier, 'com.vibecode.onyxtransit-mvty5t');
    assert.equal(web.expo.android.package, 'ch.mohamadba.onyxtransit');

    process.env.EAS_BUILD = 'true';
    const eas = load();
    assert.equal(eas.expo.experiments?.baseUrl, undefined);
    assert.equal(eas.expo.experiments?.typedRoutes, false);
    assert.equal(eas.expo.ios.bundleIdentifier, 'com.vibecode.onyxtransit-mvty5t');
    assert.equal(eas.expo.android.package, 'ch.mohamadba.onyxtransit');

    const json = require('../app.json') as { expo: { experiments: { baseUrl: string } } };
    assert.equal(json.expo.experiments.baseUrl, '/onyx-transit');
  } finally {
    if (previous === undefined) delete process.env.EAS_BUILD;
    else process.env.EAS_BUILD = previous;
  }
});
