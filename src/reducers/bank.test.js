import { init } from "@rematch/core";

describe('bank model', () => {
  beforeEach(() => {
    jest.resetModules();
  });


  it('initializes empty', () => {
    const bank = require('./bank').default;
    const store = init({ models: { bank } });

    expect(store.getState().bank.repos).toEqual({});
  });

  it('sorts on new projects', () => {
    const bank = require('./bank').default;
    const store = init({ models: { bank } });

    const repo = {
      owner: 'radekstepan',
      name: 'burnchart'
    };
    const project = {
      number: 1,
      stats: {}
    };

    store.dispatch.bank.addProject({ repo, project });

    expect(store.getState().bank.repos).toEqual({ 'r0': repo });
    expect(store.getState().bank.projects).toEqual({ 'p1': project });

    expect(store.getState().bank.index).toEqual([['r0', 'p1']]);
  });

  it('sort by priority', () => {
    const bank = require('./bank').default;
    const store = init({ models: { bank } });

    // Check models get reset.
    expect(store.getState().bank.index).toEqual([]);

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

    store.dispatch.bank.addProject({ repo, project: project1 });
    store.dispatch.bank.addProject({ repo, project: project2 });
    store.dispatch.bank.addProject({ repo, project: project3 });

    expect(store.getState().bank.index).toEqual([['r0', 'p3'], ['r0', 'p1'], ['r0', 'p2']]);
  });

  it('sort by progress', () => {
    const bank = require('./bank').default;
    const store = init({ models: { bank } });

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

    store.dispatch.bank.addProject({ repo, project: project1 });
    store.dispatch.bank.addProject({ repo, project: project2 });

    store.dispatch.bank.sortBy('progress');

    expect(store.getState().bank.index).toEqual([['r0', 'p2'], ['r0', 'p1']]);
  });

  it('sort by priority defaults', () => {
    const bank = require('./bank').default;
    const store = init({ models: { bank } });

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

    store.dispatch.bank.addProject({ repo, project: project1 });
    store.dispatch.bank.addProject({ repo, project: project2 });
    store.dispatch.bank.addProject({ repo, project: project3 });

    expect(store.getState().bank.index).toEqual([['r0', 'p3'], ['r0', 'p2'], ['r0', 'p1']]);
  });

  it('sort by name', () => {
    const bank = require('./bank').default;
    const store = init({ models: { bank } });

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

    store.dispatch.bank.sortBy('name');

    store.dispatch.bank.addProject({ repo, project: project1 });
    store.dispatch.bank.addProject({ repo, project: project2 });

    expect(store.getState().bank.index).toEqual([['r0', 'p2'], ['r0', 'p1']]);
  });

  it('sort by name semver', () => {
    const bank = require('./bank').default;
    const store = init({ models: { bank } });

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

    store.dispatch.bank.sortBy('name');

    store.dispatch.bank.addProject({ repo, project: project1 });
    store.dispatch.bank.addProject({ repo, project: project2 });
    store.dispatch.bank.addProject({ repo, project: project3 });

    expect(store.getState().bank.index).toEqual([['r0', 'p3'], ['r0', 'p2'], ['r0', 'p1']]);
  });

  it('delete', () => {
    const bank = require('./bank').default;
    const store = init({ models: { bank } });

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

    store.dispatch.bank.sortBy('name');

    store.dispatch.bank.addProject({ repo: repo1, project: project1 });
    store.dispatch.bank.addRepo(repo2);
    store.dispatch.bank.addProject({ repo: repo3, project: project2 });

    // repo2 doesn't have any projects.
    expect(store.getState().bank.index).toEqual([['r0', 'p1'], ['r3', 'p4']]);

    store.dispatch.bank.deleteRepo(repo2);

    expect(store.getState().bank.repos).toEqual({ 'r0': repo1, 'r3': repo3 });
    expect(store.getState().bank.index).toEqual([['r0', 'p1'], ['r3', 'p4']]);
  });
});