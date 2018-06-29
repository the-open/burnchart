import { assert } from 'chai';
import path from 'path';
import opa from 'object-path';
import { noCallThru } from 'proxyquire'
let proxy = noCallThru();

import config from '../src/config.js';

class Sa {
  constructor() {
    // How soon do we call back?
    this.timeout = 1;
  }

  // Save the uri.
  get(uri) {
    this.params = { uri };
    return this;
  }

  // Save the key-value pair.
  set(key, value) {
    this.params[key] = value;
    return this;
  }

  // Call back with the response, async.
  end(cb) {
    setTimeout(() => cb(null, this.response), this.timeout);
  }
}

let superagent = new Sa();

// Proxy the superagent lib.
let lib = path.resolve(__dirname, '../src/js/modules/github/request.js');
let request = proxy(lib, { superagent }).default;

describe('request', () => {
  it('use tokens', done => {
    superagent.response = {};

    let user = { 'credential': { 'accessToken': 'ABC' }};
    let owner = 'radekstepan';
    let name = 'burnchart';

    request.repo(user, { owner, name }, () => {
      assert(superagent.params.Authorization, 'token ABC');
      done();
    });
  });
});
