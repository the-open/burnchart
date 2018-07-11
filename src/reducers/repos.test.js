import { init } from "@rematch/core";

const request = {};
const lscache = {
  get: () => [],
  set: () => {}
};

describe('repos model', () => {
  beforeEach(() => {
    jest.resetModules();
  });


  it('initializes empty', () => {
    const repos = require('./repos').default;
    const store = init({ models: { repos } });

    expect(store.getState().repos.list).toEqual([]);
  });

  it('sorts on new projects', () => {
    const repos = require('./repos').default;
    const store = init({ models: { repos } });

    const repo = {
      owner: 'radekstepan',
      name: 'burnchart'
    };
    const project = {
      number: 1,
      stats: {}
    };

    store.dispatch.repos.addProject({ repo, project });

    expect(store.getState().repos.index).toEqual([[0, 0]]);
  });

  it('sort by priority', () => {
    const repos = require('./repos').default;
    const store = init({ models: { repos } });

    // Check models get reset.
    expect(store.getState().repos.index).toEqual([]);

    const repo = {
      owner: 'radekstepan',
      name: 'burnchart'
    };
    const project1 = {
      number: 1,
      stats: {
        progress: {
          points: 2,
          time: 1
        },
        days: 2
      }
    };
    const project2 = {
      number: 2,
      stats: {
        progress: {
          points: 2,
          time: 1
        },
        days: 3
      }
    };
    const project3 = {
      number: 3,
      stats: {
        progress: {
          points: 1,
          time: 2
        },
        days: 4
      }
    };

    store.dispatch.repos.addProject({ repo, project: project1 });
    store.dispatch.repos.addProject({ repo, project: project2 });
    store.dispatch.repos.addProject({ repo, project: project3 });

    expect(store.getState().repos.index).toEqual([[0, 2], [0, 0], [0, 1]]);
  });

  it('sort by progress', () => {
    const repos = require('./repos').default;
    const store = init({ models: { repos } });

    const repo = {
      owner: 'radekstepan',
      name: 'burnchart'
    };
    const project1 = {
      number: 1,
      stats: {
        progress: {
          points: 5
        }
      }
    };
    const project2 = {
      number: 2,
      stats: {
        progress: {
          points: 7
        }
      }
    };

    store.dispatch.repos.addProject({ repo, project: project1 });
    store.dispatch.repos.addProject({ repo, project: project2 });

    store.dispatch.repos.sortBy('progress');

    expect(store.getState().repos.index).toEqual([[0, 1], [0, 0]]);
  });

  it('sort by priority defaults', () => {
    const repos = require('./repos').default;
    const store = init({ models: { repos } });

    const repo = {
      owner: 'radekstepan',
      name: 'burnchart'
    };
    const project1 = {
      number: 1,
      stats: {
        progress: {
          points: 3
        }
      }
    };
    const project2 = {
      number: 2,
      stats: {
        progress: {
          points: 2
        }
      }
    };
    const project3 = {
      number: 3,
      stats: {
        progress: {
          points: 1
        }
      }
    };

    store.dispatch.repos.addProject({ repo, project: project1 });
    store.dispatch.repos.addProject({ repo, project: project2 });
    store.dispatch.repos.addProject({ repo, project: project3 });

    expect(store.getState().repos.index).toEqual([[0, 2], [0, 1], [0, 0]]);
  });

  it('sort by name', () => {
    const repos = require('./repos').default;
    const store = init({ models: { repos } });

    const repo = {
      owner: 'radekstepan',
      name: 'burnchart'
    };
    const project1 = {
      number: 1,
      name: 'B'
    };
    const project2 = {
      number: 2,
      name: 'A'
    };

    store.dispatch.repos.sortBy('name');

    store.dispatch.repos.addProject({ repo, project: project1 });
    store.dispatch.repos.addProject({ repo, project: project2 });

    expect(store.getState().repos.index).toEqual([[0, 1], [0, 0]]);
  });

  it('sort by name semver', () => {
    const repos = require('./repos').default;
    const store = init({ models: { repos } });

    const repo = {
      owner: 'radekstepan',
      name: 'burnchart'
    };
    const project1 = {
      number: 1,
      name: '1.2.5'
    };
    const project2 = {
      number: 2,
      name: '1.1.x'
    };
    const project3 = {
      number: 3,
      name: '1.1.7'
    };

    store.dispatch.repos.sortBy('name');

    store.dispatch.repos.addProject({ repo, project: project1 });
    store.dispatch.repos.addProject({ repo, project: project2 });
    store.dispatch.repos.addProject({ repo, project: project3 });

    expect(store.getState().repos.index).toEqual([[0, 2], [0, 1], [0, 0]]);
  });

  // it('search', done => {
  //   repos.set({ 'list': [
  //     { 'owner': 'radek', 'name': 'A' }
  //   ], 'index': [], 'sortBy': 'name', 'user': null });

  //   // Skip search.
  //   request.repos = (user, owner, cb) => assert(false);
  //   repos.onReposSearch();

  //   // Search on text.
  //   request.repos = (user, owner, cb) => assert(owner == undefined);
  //   repos.onReposSearch('radek');

  //   // Search on owner.
  //   request.repos = (user, owner, cb) => assert(owner == 'radek');
  //   repos.onReposSearch('radek/project');

  //   request.repos = (user, owner, cb) => {
  //     cb(null, [
  //       { 'has_issues': true, 'owner': { 'login': 'Radek' }, 'name': 'A', 'full_name': 'Radek/A' }, // exists
  //       { 'has_issues': true, 'owner': { 'login': 'radek' }, 'name': 'aA', 'full_name': 'radek/aA' }, // ok
  //       { 'has_issues': true, 'owner': { 'login': 'a' }, 'name': 'A', 'full_name': 'a/A' }, // wrong owner
  //       { 'has_issues': false, 'owner': { 'login': 'radek' }, 'name': 'aaa', 'full_name': 'radek/aaa' } // no issues
  //     ]);
  //   };
  //   projects.onReposSearch('radek/a');
  //   assert.deepEqual(repos.get('suggestions'), [ 'radek/aA' ]);

  //   done();
  // });

  it('delete', () => {
    const repos = require('./repos').default;
    const store = init({ models: { repos } });

    const repo1 = {
      owner: 'inc',
      name: 'A'
    };
    const repo2 = {
      owner: 'inc',
      name: 'B'
    };
    const repo3 = {
      owner: 'inc',
      name: 'C'
    };
    const project1 = {
      number: 1,
      name: 'A'
    };
    const project2 = {
      number: 2,
      name: 'C'
    };

    store.dispatch.repos.sortBy('name');

    store.dispatch.repos.addProject({ repo: repo1, project: project1 });
    store.dispatch.repos.addRepo(repo2);
    store.dispatch.repos.addProject({ repo: repo3, project: project2 });

    // repo2 doesn't have any projects.
    expect(store.getState().repos.index).toEqual([[0, 0], [2, 0]]);

    store.dispatch.repos.deleteRepo(repo2);

    expect(store.getState().repos.list).toEqual([repo1, repo3]);
    expect(store.getState().repos.index).toEqual([[0, 0], [1, 0]]);
  });
});