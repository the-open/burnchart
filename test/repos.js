import { assert } from 'chai';
import path from 'path';
import _ from 'lodash';
import { noCallThru } from 'proxyquire'
const proxy = noCallThru();

const request = {};
const lscache = {
  get: () => [],
  set: () => {}
};

// Proxy the request module.
const lib = path.resolve(__dirname, '../src/js/stores/reposStore.js');
const repos = proxy(lib, {
  lscache, '../modules/github/request.js': request
}).default;

describe('repos', () => {
  it('initializes empty', done => {
    assert.deepEqual(repos.get('list'), []);
    done();
  });

  it('sorts on new milestones', done => {
    repos.set({ 'list': [], 'index': [] });

    const repo = {
      'owner': 'radekstepan',
      'name': 'burnchart'
    };
    const milestone = {
      'title': '1.0.0',
      'stats': {}
    };

    repos.push('list', repo);
    repos.addMilestone(repo, milestone);

    assert.deepEqual(repos.get('index'), [[0, 0]]);

    done();
  });

  it('sort by progress', done => {
    repos.set({ 'list': [], 'index': [], 'sortBy': 'progress' });

    const repo = {
      'owner': 'radekstepan',
      'name': 'burnchart'
    };
    const milestone1 = {
      'title': '1.0.0',
      'stats': {
        'progress': {
          'points': 5
        }
      }
    };
    const milestone2 = {
      'title': '2.0.0',
      'stats': {
        'progress': {
          'points': 7
        }
      }
    };

    repos.push('list', repo);
    repos.addMilestone(repo, milestone1);
    repos.addMilestone(repo, milestone2);

    assert.deepEqual(repos.get('index'), [[0, 1], [0, 0]]);

    done();
  });

  it('sort by priority', done => {
    repos.set({ 'list': [], 'index': [], 'sortBy': 'priority' });

    const repo = {
      'owner': 'radekstepan',
      'name': 'burnchart'
    };
    const milestone1 = {
      'title': '1.0.0',
      'stats': {
        'progress': {
          'points': 2,
          'time': 1
        },
        'days': 2
      }
    };
    const milestone2 = {
      'title': '2.0.0',
      'stats': {
        'progress': {
          'points': 2,
          'time': 1
        },
        'days': 3
      }
    };
    const milestone3 = {
      'title': '3.0.0',
      'stats': {
        'progress': {
          'points': 1,
          'time': 2
        },
        'days': 4
      }
    };

    repos.push('list', repo);
    repos.addMilestone(repo, milestone1);
    repos.addMilestone(repo, milestone2);
    repos.addMilestone(repo, milestone3);

    assert.deepEqual(repos.get('index'), [[0, 2], [0, 0], [0, 1]]);

    done();
  });

  it('sort by priority defaults', done => {
    repos.set({ 'list': [], 'index': [], 'sortBy': 'priority' });

    const repo = {
      'owner': 'radekstepan',
      'name': 'burnchart'
    };
    const milestone1 = {
      'title': '1.0.0',
      'stats': {
        'progress': {
          'points': 3
        }
      }
    };
    const milestone2 = {
      'title': '2.0.0',
      'stats': {
        'progress': {
          'points': 2
        }
      }
    };
    const milestone3 = {
      'title': '3.0.0',
      'stats': {
        'progress': {
          'points': 1
        }
      }
    };

    repos.push('list', repo);
    repos.addMilestone(repo, milestone1);
    repos.addMilestone(repo, milestone2);
    repos.addMilestone(repo, milestone3);

    assert.deepEqual(repos.get('index'), [[0, 2], [0, 1], [0, 0]]);

    done();
  });

  it('sort by name', done => {
    repos.set({ 'list': [], 'index': [], 'sortBy': 'name' });

    const repo = {
      'owner': 'radekstepan',
      'name': 'burnchart'
    };
    const milestone1 = {
      'title': 'B',
      'stats': {}
    };
    const milestone2 = {
      'title': 'A',
      'stats': {}
    };

    repos.push('list', repo);
    repos.addMilestone(repo, milestone1);
    repos.addMilestone(repo, milestone2);

    assert.deepEqual(repos.get('index'), [[0, 1], [0, 0]]);

    done();
  });

  it('sort by name semver', done => {
    repos.set({ 'list': [], 'index': [], 'sortBy': 'name' });

    const repo = {
      'owner': 'radekstepan',
      'name': 'burnchart'
    };
    const milestone1 = {
      'title': '1.2.5',
      'stats': {}
    };
    const milestone2 = {
      'title': '1.1.x',
      'stats': {}
    };
    const milestone3 = {
      'title': '1.1.7',
      'stats': {}
    };

    repos.push('list', repo);
    repos.addMilestone(repo, milestone1);
    repos.addMilestone(repo, milestone2);
    repos.addMilestone(repo, milestone3);

    assert.deepEqual(repos.get('index'), [[0, 2], [0, 1], [0, 0]]);

    done();
  });

  it('search', done => {
    repos.set({ 'list': [
      { 'owner': 'radek', 'name': 'A' }
    ], 'index': [], 'sortBy': 'name', 'user': null });

    // Skip search.
    request.repos = (user, owner, cb) => assert(false);
    repos.onReposSearch();

    // Search on text.
    request.repos = (user, owner, cb) => assert(owner == undefined);
    repos.onReposSearch('radek');

    // Search on owner.
    request.repos = (user, owner, cb) => assert(owner == 'radek');
    repos.onReposSearch('radek/repo');

    request.repos = (user, owner, cb) => {
      cb(null, [
        { 'has_issues': true, 'owner': { 'login': 'Radek' }, 'name': 'A', 'full_name': 'Radek/A' }, // exists
        { 'has_issues': true, 'owner': { 'login': 'radek' }, 'name': 'aA', 'full_name': 'radek/aA' }, // ok
        { 'has_issues': true, 'owner': { 'login': 'a' }, 'name': 'A', 'full_name': 'a/A' }, // wrong owner
        { 'has_issues': false, 'owner': { 'login': 'radek' }, 'name': 'aaa', 'full_name': 'radek/aaa' } // no issues
      ]);
    };
    repos.onReposSearch('radek/a');
    assert.deepEqual(repos.get('suggestions'), [ 'radek/aA' ]);

    done();
  });

  it('delete', done => {
    const a = { 'owner': 'company', 'name': 'netflix', 'milestones': [ { 'title': 'A', 'stats': {} } ] };
    const b = { 'owner': 'company', 'name': 'space-x' };
    const c = { 'owner': 'company', 'name': 'tesla-m', 'milestones': [ { 'title': 'C', 'stats': {} } ] };

    repos.set({
      'list': [ a, b, c ],
      'index': [ [ 0, 0 ], [ 1, 0 ], [ 2, 0 ] ],
      'sortBy': 'name',
      'user': null
    });

    repos.onReposDelete(b);

    assert.deepEqual(repos.get('list'), [ a, c ]);
    assert.deepEqual(repos.get('index'), [ [ 0, 0 ], [ 1, 0 ] ]);

    done();
  });

  // Issue #116.
  it('add milestone (repo behind the scenes)', done => {
    repos.set({ 'list': [], 'index': [], 'sortBy': 'progress' });

    const r = { 'name': 'zcash', 'owner': 'zcash' };
    const m = { 'issues': {
      'closed': { 'list': [], 'size': 0 },
      'open':   { 'list': [], 'size': 0 }
    }};

    repos.addMilestone(r, m);

    assert.deepEqual(repos.get('list'), [
      _.extend(r, { 'milestones': [ m ] })
    ]);

    done();
  });
});
