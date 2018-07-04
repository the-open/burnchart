import _ from 'lodash';
import lscache from 'lscache';
import opa from 'object-path';
import semver from 'semver';
import sortedIndex from 'sortedindex-compare';

import stats from '../modules/stats';
import request from '../modules/github/request';
import issues from '../modules/github/issues';

const repos = {
  state: {
    // Init the repos from local storage.
    list: lscache.get('repos') || [],
    // A sorted repos and projects index.
    index: [],
    // The default sort order.
    sortBy: 'priority',
    // Sort functions to toggle through.
    sortFns: [ 'progress', 'priority', 'name' ],
    // Fetching data from GitHub.
    loading: false,
    // App notification.
    notification: null
  },
  reducers: {
    // Push to the stack unless it exists already.
    addRepo(state, repo) {
      if (!_.find(state.list, repo)) {
        state.list.push(Object.assign({}, repo, { projects: [] }));
      }

      return state;
    },

    // Cycle through repos sort order.
    sort(state) {
      const { sortBy, sortFns } = state;

      let idx = 1 + sortFns.indexOf(sortBy);
      if (idx === sortFns.length) idx = 0;

      return Object.assign({}, state, { sortBy: sortFns[idx] });
    },

    // Demonstration repos.
    demo(state) {
      return Object.assign({}, state, {
        list: [
          { owner: 'd3', name: 'd3' },
          { owner: 'radekstepan', name: 'disposable' },
          { owner: 'rails', name: 'rails' },
          { owner: 'twbs', name: 'bootstrap' }
        ],
        index: []
      });
    },

    // Delete a repo.
    delete(state, repo) {
      const i = findIndex(state.list, repo);
      // Delete the repo.
      state.list.splice(i, 1);
      // And the index, sorting again.
      state.index = [];
      return this.sort(state);
    },

    // Talk about the stats of a project.
    notify(state, project) {
      if (project.stats.isEmpty) {
        let left;
        if (left = project.issues.open.size) {
          return Object.assign({}, state, {
            notify: {
              text: `No progress has been made, ${left} point${(left > 1) ? 's' : ''} left`,
              system: true,
              ttl: null
            }
          });
        } else {
          return Object.assign({}, state, {
            notify: {
              text: 'This project has no issues',
              type: 'warn',
              system: true,
              ttl: null
            }
          });
        }
      }

      if (project.stats.isDone) {
        return Object.assign({}, state, {
          notify: {
            text: 'This project is complete',
            type: 'success'
          }
        });
      }

      if (project.stats.isOverdue) {
        return Object.assign({}, state, {
          notify: {
            text: 'This project is overdue',
            type: 'warn'
          }
        });
      }
    },

    // Save an error from loading projects.
    // TODO: clear these when we fetch all repos anew.
    saveError(state, repo, err, say=false) {
      let idx;
      if ((idx = findIndex(state.list, repo)) > -1) {
        state.list[idx].errors.push(err);
      } else {
        // Create the stub repo behind the scenes.
        state.list.push(Object.assign({}, repo, { errors: [ err ] }));
      }

      // Notify?
      if (say) {
        return Object.assign({}, state, {
          notify: {
            text: err,
            type: 'alert',
            system: true,
            ttl: null
          }
        });
      }

      return state;
    },

    // Sort repos (update the index). Can pass reference to the
    //  repo and project index in the stack.
    sort(state, ref, data) {
      let idx;
      // Get the existing index.
      const { index } = state;

      // Index one project in an already sorted index.
      if (ref) {
        idx = sortedIndex(index, data, comparator());
        index.splice(idx, 0, ref);
      // Sort them all.
      } else {
        const { list } = state;
        for (let i of list) {
          const r = list[i];
          // TODO: need to show repos that failed too...
          if (r.projects == null) continue;
          // Walk the projects.
          for (let j of r.projects) {
            const p = r.projects[j];
            // Run a comparator here inserting into index.
            idx = sortedIndex(index, [ r, p ], comparator());
            index.splice(idx, 0, [ i, j ]);
          }
        }
      }

      return Object.assign({}, state, { index })
    }
  },
  effects: {
    // Add a project for a repo.
    addProject({ repo, project }, state) {
      // Parse the issues.
      project.issues = issues.fromBoards(project.columns.nodes);

      // Add in the stats.
      _.extend(project, { stats: stats(project) });

      // Notify?
      // say && this.notify(project);

      // If repo hasn't been found, add it behind the scenes.
      let i;
      if ((i = findIndex(state.repos.list, repo)) < 0) {
        this.addRepo(repo);
        // TODO fix
        i = state.repos.list.length - 1;
      }

      // Does the project exist already?
      let j;
      const { projects } = state.repos.list[i];
      if (projects) {
        j = _.findIndex(projects, { number: project.number });
        // Just make an update then.
        if (j != -1) {
          state.repos.list[i].projects[j] = project;
          return state;
        }
      }

      // Push the project and return the index.
      j = state.repos.list[i].projects.push(project);

      // TODO Now index this project.
      // this.sort([ i, j ], [ repo, project ]);

      return state;
    },

    // Persist repos in local storage (sans projects and issues).
    store(props, state) {
      if (process.browser) {
        lscache.set('repos', _.pluckMany(state.list, [ 'owner', 'name' ]));
      }
    },

    async reposLoad(props, state) {
      let repos = state.list;

      // Reset first.
      repos = _.each(repos, r => delete r.errors);

      // TODO: make sure we have user credentials first

      if (args) {
        if ('project' in args) {
          // For a single project.
          this.getProject(user, {
            'owner': args.owner,
            'name': args.name
          }, { number: parseInt(args.project, 10) }, true); // notify as well
        } else {
          // For a single repo.
          _.find(this.get('list'), obj => {
            if (args.owner == obj.owner && args.name == obj.name) {
              args = obj; // expand by saved properties
              return true;
            };
            return false;
          });
          this.getRepo(user, args);
        }
      } else {
        // For all repos.
        _.each(repos, r => this.getRepo(user, r));
      }
    },

    // Search for repos.
    async reposSearch(props, state) {
      if (!text || !text.length) return;

      // Wait for the user to get resolved.
      this.get('user', this.cb((user) => { // async
        // Can we get the owner (and name) from the text?
        if (/\//.test(text)) {
          var [ owner, name ] = text.split('/');
        } else {
          text = new RegExp(`^${text}`, 'i');
        }

        // No owner and no user means nothing to go by.
        if (!owner && !user) return;

        // Make the request.
        request.repos(user, owner, this.cb((err, res) => {
          if (err) return; // ignore errors

          let list = _(res)
          .filter((repo) => {
            // Remove repos with no issues.
            if (!repo.has_issues) return;

            // Remove repos we have already.
            if (this.has(repo.owner.login, repo.name)) return;

            // Match on owner or name.
            if (owner) {
              if (!new RegExp(`^${owner}`, 'i').test(repo.owner.login)) return;
              if (!name || new RegExp(`^${name}`, 'i').test(repo.name)) return true;
            } else {
              return text.test(repo.owner.login) || text.test(repo.name);
            }
          })
          .map(({ full_name }) => full_name)
          .value();

          this.set('suggestions', list);
        }));
      }));
    },

    // Fetch projects in a repo.
    async getRepo(user, r, say) {
      request.allProjects(user, r, this.cb((err, projects) => { // async
        // Save the error if repo does not exist.
        if (err) return this.saveError(r, err);
        // Get the issues.
        projects.forEach(p => {
          this.getProject(user, r, p, say);
        });
      }));
    },

    // Fetch a single project.
    async getProject(user, r, p, say) {
      request.oneProject(user, {
        'owner': r.owner,
        'name': r.name,
        'project_number': p.number
      }, this.cb((err, project) => { // async
        // Save the error if repo does not exist.
        if (err) return this.saveError(r, err, say);
        // Save the projet.
        this.addProject(r, project, say);
      }));
    }
  }
};

// Return a sort order comparator.
const comparator = () => {
  let { list, sortBy } = this.get();

  // Convert existing index into actual repo project.
  let deIdx = (fn) => {
    return ([ i, j ], ...rest) => {
      return fn.apply(this, [ [ list[i], list[i].projects[j] ] ].concat(rest));
    };
  };

  // Set default fields.
  let defaults = (arr, hash) => {
    for (let item of arr) {
      for (let key in hash) {
        if (!opa.has(item, key)) {
          opa.set(item, key, hash[key]);
        }
      }
    }
  };

  // The actual fn selection.
  switch (sortBy) {
    // From highest progress points.
    case 'progress':
      return deIdx(([ , aP ], [ , bP ]) => {
        defaults([ aP, bP ], { 'stats.progress.points': 0 });
        // Simple points difference.
        return aP.stats.progress.points - bP.stats.progress.points;
      });

    // From most delayed in days.
    case 'priority':
      return deIdx(([ , aP ], [ , bP ]) => {
        // Projects with no deadline are always at the "beginning".
        defaults([ aP, bP ], { 'stats.progress.time': 0, 'stats.days': 1e3 });
        // % difference in progress times the number of days ahead or behind.
        let [ $a, $b ] = _.map([ aP, bP ], ({ stats }) => {
          return (stats.progress.points - stats.progress.time) * stats.days;
        });

        return $b - $a;
      });

    // Based on repo then project name including semver.
    case 'name':
      return deIdx(([ aR, aP ], [ bR, bP ]) => {
        let owner, name;

        if (owner = bR.owner.localeCompare(aR.owner)) {
          return owner;
        }
        if (name = bR.name.localeCompare(aR.name)) {
          return name;
        }

        // Try semver.
        if (semver.valid(bP.name) && semver.valid(aP.name)) {
          return semver.gt(bP.name, aP.name);
        // Back to string compare.
        } else {
          return bP.name.localeCompare(aP.name);
        }
      });

    // The "whatever" sort order...
    default:
      return () => { return 0; }
  }
};

// Find index of a repo.
const findIndex = (list, { owner, name }) => _.findIndex(list, { owner, name });

// Do we have this repo? Case-insensitive.
const has = (o, n) => {
  o = o.toUpperCase() ; n = n.toUpperCase();
  return !!_.find(this.get('list'), ({ owner, name }) => {
    return o == owner.toUpperCase() && n == name.toUpperCase();
  });
}

export default repos;
