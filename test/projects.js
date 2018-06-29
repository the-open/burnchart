import { assert } from 'chai';
import moment from 'moment';

// import json from './fixtures/milestones.json';

// TODO expand on payload from GraphQL.

describe('projects', () => {
  it('time format', done => {
    // ISO 8601 dates are in UTC timezone.
    const utc = moment(json[0].created_at).toDate().toUTCString();
    assert(utc, 'Sun, 10 Apr 2011 20:09:31 GMT');
    done();
  });
});
