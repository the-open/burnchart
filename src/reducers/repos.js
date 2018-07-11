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
    // Push to the stack.
    addRepo(state, repo) {
      // TODO ensure not a dupe?
      opa.ensureExists(repo, 'projects', []);
      state.list.push(repo);
      return state;
    },

    // // Demonstration repos.
    // demo(state) {
    //   return Object.assign(state, {
    //     list: [
    //       { owner: 'd3', name: 'd3' },
    //       { owner: 'radekstepan', name: 'disposable' },
    //       { owner: 'rails', name: 'rails' },
    //       { owner: 'twbs', name: 'bootstrap' }
    //     ],
    //     index: []
    //   });
    // },

    // // Talk about the stats of a project.
    // notify(state, project) {
    //   if (project.stats.isEmpty) {
    //     const left = project.issues.open.size;
    //     if (left) {
    //       return Object.assign({}, state, {
    //         notify: {
    //           text: `No progress has been made, ${left} point${(left > 1) ? 's' : ''} left`,
    //           system: true,
    //           ttl: null
    //         }
    //       });
    //     } else {
    //       return Object.assign({}, state, {
    //         notify: {
    //           text: 'This project has no issues',
    //           type: 'warn',
    //           system: true,
    //           ttl: null
    //         }
    //       });
    //     }
    //   }

    //   if (project.stats.isDone) {
    //     return Object.assign({}, state, {
    //       notify: {
    //         text: 'This project is complete',
    //         type: 'success'
    //       }
    //     });
    //   }

    //   if (project.stats.isOverdue) {
    //     return Object.assign({}, state, {
    //       notify: {
    //         text: 'This project is overdue',
    //         type: 'warn'
    //       }
    //     });
    //   }
    // },

    // // Save an error from loading projects.
    // // TODO: clear these when we fetch all repos anew.
    // saveError(state, repo, err, say=false) {
    //   const idx = findIdx(state.list, repo);
    //   if (idx >= 0) {
    //     state.list[idx].errors.push(err);
    //   } else {
    //     // Create the stub repo behind the scenes.
    //     state.list.push(Object.assign({}, repo, { errors: [ err ] }));
    //   }

    //   // Notify?
    //   if (say) {
    //     return Object.assign({}, state, {
    //       notify: {
    //         text: err,
    //         type: 'alert',
    //         system: true,
    //         ttl: null
    //       }
    //     });
    //   }

    //   return state;
    // },

    // Sort repos (update the index). Can pass reference to the
    //  repo and project index in the stack.
    sort(state, ref, data) {
      let idx;
      // Get the existing index.
      let { index } = state;

      // Index one project in an already sorted index.
      if (ref) {
        idx = sortedIndex(index, data, comparator(state));
        index.splice(idx, 0, ref);
      // Sort them all.
      } else {
        const { list } = state;
        index = [];
        for (let i = 0; i < list.length; i++) {
          const repo = list[i];
          // TODO: need to show repos that failed too...
          if (!repo.projects.length) continue;
          // Walk the projects.
          for (let j = 0; j < repo.projects.length; j++) {
            const project = repo.projects[j];
            // Run a comparator here inserting into index.
            idx = sortedIndex(index, [ repo, project ], comparator(state));
            index.splice(idx, 0, [ i, j ]);
          }
        }
      }

      return Object.assign(state, { index });
    }
  },
  effects: {
    // Sort by function or cycle to the next one.
    sortBy(name, state) {
      const { repos } = state;
      const { sortBy, sortFns } = repos;

      // TODO validate.
      if (name) {
        repos.sortBy = name;
      } else {
        let idx = 1 + sortFns.indexOf(sortBy);
        if (idx === sortFns.length) idx = 0;
  
        repos.sortBy = sortFns[idx];  
      }

      return this.sort();
    },

    // Delete a repo.
    deleteRepo(repo, state) {
      const { repos } = state;

      const i = repos.list.findIndex(findRepo(repo));
      // Delete the repo.
      repos.list.splice(i, 1);
      // And the index, sorting again.
      return this.sort();
    },

    // Add a project for a repo.
    addProject({ repo, project }, state) {
      if (typeof project.number === 'undefined') throw new Error('Project number not provided');

      opa.ensureExists(project, 'columns.nodes', []);

      // Parse the issues.
      project.issues = issues.fromBoards(project.columns.nodes);

      // Add in the stats.
      project.stats = stats(project);

      // If repo hasn't been found, add it behind the scenes.
      let i = state.repos.list.findIndex(findRepo(repo));
      if (i === -1) {
        this.addRepo(repo);
        i = state.repos.list.length - 1;
      }

      // Does the project exist already?
      const { projects } = state.repos.list[i];
      let j = projects.findIndex(findProject(project));
      if (j === -1) {
        projects.push(project);
        j = projects.length - 1;
      } else {
        projects[j] = project;
      }

      // Now index this project.
      return this.sort([ i, j ], [ repo, project ]);
    },

    // // Persist repos in local storage (sans projects and issues).
    // store(props, state) {
    //   if (process.browser) {
    //     lscache.set('repos', _.pluckMany(state.list, [ 'owner', 'name' ]));
    //   }
    // },

    // async reposLoad(props, user, state) {
    //   let repos = state.list;

    //   // Reset first.
    //   repos = _.each(repos, r => delete r.errors);

    //   // TODO: make sure we have user credentials first

    //   if (props) {
    //     if ('project' in props) {
    //       // For a single project.
    //       this.getProject(user, {
    //         owner: props.owner,
    //         name: props.name
    //       }, { number: parseInt(props.project, 10) }, true); // notify as well
    //     } else {
    //       // For a single repo.
    //       _.find(state.list, obj => {
    //         if (props.owner === obj.owner && props.name === obj.name) {
    //           props = obj; // expand by saved properties
    //           return true;
    //         };
    //         return false;
    //       });
    //       this.getRepo(user, props);
    //     }
    //   } else {
    //     // For all repos.
    //     _.each(repos, r => this.getRepo(user, r));
    //   }
    // },

    // // Search for repos.
    // async searchRepos(text, state) {
    //   if (!text || !text.length) return;

    //   // Can we get the owner (and name) from the text?
    //   let owner, name;
    //   if (/\//.test(text)) {
    //     [ owner, name ] = text.split('/');
    //   } else {
    //     text = new RegExp(`^${text}`, 'i');
    //   }

    //   // No owner means nothing to go on.
    //   if (!owner) return;

    //   // Make the request.
    //   const res = await request.repos(state.account.user, owner)

    //   const suggestions = (res.filter(repo => {
    //     // Remove repos with no issues.
    //     if (!repo.has_issues) return;

    //     // Remove repos we have already.
    //     if (this.has(repo.owner.login, repo.name)) return;

    //     // Match on owner or name.
    //     if (owner) {
    //       if (!new RegExp(`^${owner}`, 'i').test(repo.owner.login)) return;
    //       if (!name || new RegExp(`^${name}`, 'i').test(repo.name)) return true;
    //     }
    //     return text.test(repo.owner.login) || text.test(repo.name);
    //   }))
    //   .map(({ full_name }) => full_name);

    //   return Object.assign({}, state, { suggestions });
    // },

    // // Fetch projects in a repo.
    // async getRepo(user, r, say) {
    //   request.allProjects(user, r, this.cb((err, projects) => { // async
    //     // Save the error if repo does not exist.
    //     if (err) return this.saveError(r, err);
    //     // Get the issues.
    //     projects.forEach(p => {
    //       this.getProject(user, r, p, say);
    //     });
    //   }));
    // },

    // // Fetch a single project.
    // async getProject(user, r, p, say) {
    //   request.oneProject(user, {
    //     'owner': r.owner,
    //     'name': r.name,
    //     'project_number': p.number
    //   }, this.cb((err, project) => { // async
    //     // Save the error if repo does not exist.
    //     if (err) return this.saveError(r, err, say);
    //     // Save the projet.
    //     this.addProject(r, project, say);
    //   }));
    // }
  }
};

// Return a sort order comparator.
const comparator = ({ list, sortBy }) => {
  // Convert existing index into actual repo project.
  const deIdx = fn =>
    ([ i, j ], ...rest) =>
      fn.apply(this, [ [ list[i], list[i].projects[j] ] ].concat(rest));

  // Set default fields.
  const defaults = (arr, obj) => {
    for (let item of arr) {
      for (let key in obj) {
        opa.ensureExists(item, key, obj[key]);
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
        const [ $a, $b ] = [ aP, bP ].map(({ stats }) =>
          (stats.progress.points - stats.progress.time) * stats.days
        );

        return $b - $a;
      });

    // Based on repo then project name including semver.
    case 'name':
      return deIdx(([ aR, aP ], [ bR, bP ]) => {
        const owner = bR.owner.localeCompare(aR.owner);
        if (owner) return owner;

        const name = bR.name.localeCompare(aR.name);
        if (name) return name;

        // Try semver.
        if (semver.valid(bP.name) && semver.valid(aP.name)) {
          return semver.gt(bP.name, aP.name);
        }
        
        // Back to string compare.
        return bP.name.localeCompare(aP.name);
      });

    // The "whatever" sort order...
    default:
      return () => 0;
  }
};

const findRepo = a => b => a.owner === b.owner && a.name === b.name;
const findProject = a => b => a.number === b.number;

export default repos;
