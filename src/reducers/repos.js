import lscache from 'lscache';
import opa from 'object-path';
import semver from 'semver';
import sortedIndex from 'sortedindex-compare';

import stats from '../modules/stats';
import request from '../modules/github/request';
import issues from '../modules/github/issues';

let seqId = 0;

const repos = {
  state: {
    // Init the repos from local storage.
    list: lscache.get('repos').map(r => Object.assign(r, { projects: [] })) || [],
    // A sorted repos and projects index.
    index: [],
    // The default sort order.
    sortBy: 'priority',
    // Sort functions to toggle through.
    sortFns: [ 'progress', 'priority', 'name' ],
    // Request in progress?
    loading: false,
    // App notification.
    notification: null
  },
  reducers: {
    // Push to the stack if it doesn't exist already.
    saveRepo(state, repo) {
      opa.ensureExists(repo, 'projects', []);

      if (state.list.findIndex(findRepo(repo)) === -1) {
        state.list.push(repo);
        store(state.list);
      }
      return state;
    },

    // TODO flatten and ES6.
    saveProject(state, { project, repo, index }) {
      if (index) {
        state.list[repo].projects[index] = project;
      } else {
        state.list[repo].projects.push(project);
      }

      return state;
    },

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

      return Object.assign({}, state, { index });
    },

    loading(state, loading) {
      return Object.assign({}, state, loading);
    }
  },
  effects: {
    // Demonstration repos.
    async demo() {
      await [
        { owner: 'd3', name: 'd3' },
        { owner: 'radekstepan', name: 'disposable' },
        { owner: 'rails', name: 'rails' },
        { owner: 'twbs', name: 'bootstrap' }
      ].map(async r => await this.getRepo(r));
    },

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

      this.sort();
    },

    // Delete a repo.
    deleteRepo(repo, state) {
      const { repos } = state;

      const i = repos.list.findIndex(findRepo(repo));
      // Delete the repo.
      repos.list.splice(i, 1);
      
      store(repos.list);

      // And the index, sorting again.
      this.sort();
    },

    // Add a project for a repo.
    addProject({ repo, project }, state) {
      if (typeof project.number === 'undefined') throw new Error('Project number not provided');

      opa.ensureExists(project, 'columns.nodes', []);

      // Parse the issues.
      project.issues = issues.fromBoards(project.columns.nodes);

      // Add in the stats.
      project.stats = stats(project);

      // Generate a new unique key (underlying data may have changed);
      project.key = seqId++;

      // If repo hasn't been found, add it behind the scenes.
      let i = state.repos.list.findIndex(findRepo(repo));
      if (i === -1) {
        this.saveRepo(repo);
        i = state.repos.list.length - 1;
      }

      // Does the project exist already?
      const { projects } = state.repos.list[i];
      let j = projects.findIndex(findProject(project));
      if (j === -1) {
        this.saveProject({ project, repo: i });
        j = projects.length - 1;
      } else {
        this.saveProject({ project, repo: i, index: j });
      }

      store(state.repos.list);

      // Now index this project.
      this.sort([ i, j ], [ repo, project ]);
    },

    async getAll(props, state) {
      const { list } = state.repos;

      this.loading(true);

      // Reset first.
      list.forEach(r => delete r.errors);

      if (props) {
        if ('project' in props) {
          // For a single project.
          const repo = { owner: props.owner, name: props.name };
          const project = { number: parseInt(props.project, 10) };
          await this.getProject({ repo, project });
        } else {
          // For a single repo.
          const repo = list.find(r => {
            if (props.owner === r.owner && props.name === r.name) {
              return r;
            };
            return false;
          });
          await this.getRepo(repo);
        }
      } else {
        // For all repos.
        await list.map(async r => await this.getRepo(r));
      }

      this.loading(false);
    },

    // Fetch a single project.
    async getProject(args, state) {
      const { user } = state.account;

      const project = await request.oneProject(user, {
        owner: args.repo.owner,
        name: args.repo.name,
        project_number: args.project.number
      });
      
      this.addProject({ project, repo: args.repo });
    },

    // Fetch projects in a repo.
    async getRepo(repo, state) {
      const { user } = state.account;

      let projects;
      try {
        projects = await request.allProjects(user, repo);
      } catch(err) {
        console.warn(err);
      }
      
      projects.map(project =>
        this.addProject({ repo, project })
      );
    },

    // Search repos.
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
    //     if (!repo.has_issues) return false;

    //     // Remove repos we have already.
    //     if (this.has(repo.owner.login, repo.name)) return false;

    //     // Match on owner or name.
    //     if (owner) {
    //       if (!new RegExp(`^${owner}`, 'i').test(repo.owner.login)) return false;
    //       if (!name || new RegExp(`^${name}`, 'i').test(repo.name)) return true;
    //     }
    //     return text.test(repo.owner.login) || text.test(repo.name);
    //   }))
    //   .map(({ full_name }) => full_name);

    //   Object.assign({}, state, { suggestions });
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

// Persist repos in local storage (sans projects and issues).
const store = repos =>
  process.browser &&
    lscache.set('repos', repos.map(r => ({ owner: r.owner, name: r.name })));

export default repos;
