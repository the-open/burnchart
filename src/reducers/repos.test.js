import { init } from "@rematch/core";

import repos from './repos';

const request = {};
const lscache = {
  get: () => [],
  set: () => {}
};

test('initializes empty', done => {
  const store = init({ models: { repos } });
  const state = store.getState();

  expect(state.repos.list).toEqual([]);

  done();
});

// it('sorts on new projects', done => {
//   const store = init({ models: { repos } });

//   const repo = {
//     owner: 'radekstepan',
//     name: 'burnchart'
//   };
//   const project = {
//     title: '1.0.0',
//     columns: {
//       nodes: []
//     },
//     stats: {}
//   };

//   await store.dispatch.repos.addProject({ repo, project });

//   const state = store.getState();

//   console.warn(state);

//   assert.deepEqual(state.repos.index, [[0, 0]]);

//   done();
// });

// it('sort by progress', done => {
//   repos.set({ 'list': [], 'index': [], 'sortBy': 'progress' });

//   const repo = {
//     'owner': 'radekstepan',
//     'name': 'burnchart'
//   };
//   const project1 = {
//     'title': '1.0.0',
//     'stats': {
//       'progress': {
//         'points': 5
//       }
//     }
//   };
//   const project2 = {
//     'title': '2.0.0',
//     'stats': {
//       'progress': {
//         'points': 7
//       }
//     }
//   };

//   repos.push('list', repo);
//   repos.addProject(repo, project1);
//   repos.addProject(repo, project2);

//   assert.deepEqual(repos.get('index'), [[0, 1], [0, 0]]);

//   done();
// });

// it('sort by priority', done => {
//   repos.set({ 'list': [], 'index': [], 'sortBy': 'priority' });

//   const repo = {
//     'owner': 'radekstepan',
//     'name': 'burnchart'
//   };
//   const project1 = {
//     'title': '1.0.0',
//     'stats': {
//       'progress': {
//         'points': 2,
//         'time': 1
//       },
//       'days': 2
//     }
//   };
//   const project2 = {
//     'title': '2.0.0',
//     'stats': {
//       'progress': {
//         'points': 2,
//         'time': 1
//       },
//       'days': 3
//     }
//   };
//   const project3 = {
//     'title': '3.0.0',
//     'stats': {
//       'progress': {
//         'points': 1,
//         'time': 2
//       },
//       'days': 4
//     }
//   };

//   repos.push('list', repo);
//   repos.addProject(repo, project1);
//   repos.addProject(repo, project2);
//   repos.addProject(repo, project3);

//   assert.deepEqual(repos.get('index'), [[0, 2], [0, 0], [0, 1]]);

//   done();
// });

// it('sort by priority defaults', done => {
//   repos.set({ 'list': [], 'index': [], 'sortBy': 'priority' });

//   const repo = {
//     'owner': 'radekstepan',
//     'name': 'burnchart'
//   };
//   const projet1 = {
//     'title': '1.0.0',
//     'stats': {
//       'progress': {
//         'points': 3
//       }
//     }
//   };
//   const project2 = {
//     'title': '2.0.0',
//     'stats': {
//       'progress': {
//         'points': 2
//       }
//     }
//   };
//   const project3 = {
//     'title': '3.0.0',
//     'stats': {
//       'progress': {
//         'points': 1
//       }
//     }
//   };

//   repos.push('list', repo);
//   repos.addProject(repo, project1);
//   repos.addProject(repo, project2);
//   repos.addProject(repo, project3);

//   assert.deepEqual(repos.get('index'), [[0, 2], [0, 1], [0, 0]]);

//   done();
// });

// it('sort by name', done => {
//   repos.set({ 'list': [], 'index': [], 'sortBy': 'name' });

//   const repo = {
//     'owner': 'radekstepan',
//     'name': 'burnchart'
//   };
//   const project1 = {
//     'title': 'B',
//     'stats': {}
//   };
//   const project2 = {
//     'title': 'A',
//     'stats': {}
//   };

//   repos.push('list', repo);
//   repos.addProject(repo, project1);
//   repos.addProject(repo, project2);

//   assert.deepEqual(repos.get('index'), [[0, 1], [0, 0]]);

//   done();
// });

// it('sort by name semver', done => {
//   repos.set({ 'list': [], 'index': [], 'sortBy': 'name' });

//   const repo = {
//     'owner': 'radekstepan',
//     'name': 'burnchart'
//   };
//   const project1 = {
//     'title': '1.2.5',
//     'stats': {}
//   };
//   const project2 = {
//     'title': '1.1.x',
//     'stats': {}
//   };
//   const project3 = {
//     'title': '1.1.7',
//     'stats': {}
//   };

//   repos.push('list', repo);
//   repos.addProject(repo, project1);
//   repos.addProject(repo, project2);
//   repos.addProject(repo, project3);

//   assert.deepEqual(repos.get('index'), [[0, 2], [0, 1], [0, 0]]);

//   done();
// });

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

// it('delete', done => {
//   let a = { 'owner': 'company', 'name': 'netflix', 'projects': [ { 'title': 'A', 'stats': {} } ] };
//   let b = { 'owner': 'company', 'name': 'space-x' };
//   let c = { 'owner': 'company', 'name': 'tesla-m', 'projects': [ { 'title': 'C', 'stats': {} } ] };

//   repos.set({
//     'list': [ a, b, c ],
//     'index': [ [ 0, 0 ], [ 1, 0 ], [ 2, 0 ] ],
//     'sortBy': 'name',
//     'user': null
//   });

//   repos.onReposDelete(b);

//   assert.deepEqual(repos.get('list'), [ a, c ]);
//   assert.deepEqual(repos.get('index'), [ [ 0, 0 ], [ 1, 0 ] ]);

//   done();
// });

// // Issue #116.
// it('add project (repo behind the scenes)', done => {
//   repos.set({ 'list': [], 'index': [], 'sortBy': 'progress' });

//   let r = { 'name': 'zcash', 'owner': 'zcash' };
//   let p = { 'issues': {
//     'closed': { 'list': [], 'size': 0 },
//     'open':   { 'list': [], 'size': 0 }
//   }};

//   repos.addProject(r, p);

//   assert.deepEqual(repos.get('list'), [
//     _.extend(r, { 'projects': [ p ] })
//   ]);

//   done();
// });
