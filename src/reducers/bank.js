import lscache from 'lscache';
import opa from 'object-path';
import semver from 'semver';
import sortedIndex from 'sortedindex-compare';

import stats from '../modules/stats';
import issues from '../modules/github/issues';
import request from '../modules/github/request';

let seqId = 0;

const bank = {
  state: {
    // Init the repos from local storage.
    repos: lscache.get('repos') || {},
    // A set of projects belonging to repos.
    projects: {},
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
    saveRepo(state, { key, repo }) {
      const repos = Object.assign({}, state.repos, { [key]: repo });
      persist(repos);

      return Object.assign({}, state, { repos });
    },

    removeRepo(state, key) {
      const { [key]: _, ...repos } = state.repos;

      return Object.assign({}, state, { repos } );
    },

    saveProject(state, { key, project }) {
      const projects = Object.assign({}, state.projects, { [key]: project });
      return Object.assign({}, state, { projects });
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

    set(state, obj) {
      return Object.assign({}, state, obj);
    }
  },
  effects: {
    addRepo(repo) {
      this.saveRepo({ repo, key: `r${seqId++}` });
    },

    // Sort repos (update the index). Can pass reference to the
    //  repo and project index in the stack.
    sort({ ref, data }, root) {
      const { bank } = root;
      let  { index } = bank;

      // Index one project in an already sorted index.
      if (ref) {
        const idx = sortedIndex(
          index,
          data,
          comparator(bank)
        );
        index.splice(idx, 0, ref);
      // Sort them all.
      } else {
        index = [];
        const { repos, projects } = bank;
        for (let i in repos) {
          const repo = repos[i];
          // Walk the projects of this repo.
          Object.keys(projects).filter(j =>
            projects[j].repo.owner === repo.owner &
            projects[j].repo.name === repo.name
          ).forEach(j => {
            // Run a comparator here inserting into index.
            const idx = sortedIndex(
              index,
              [ repos[i], projects[j] ],
              comparator(bank)
            );
            index.splice(idx, 0, [i, j]);
          });
        }
      }

      this.set({ index });
    },

    // Demonstration repos.
    demo() {
      [
        { owner: 'd3', name: 'd3' },
        { owner: 'radekstepan', name: 'disposable' },
        { owner: 'rails', name: 'rails' },
        { owner: 'twbs', name: 'bootstrap' }
      ].map(async r => await this.getRepo(r));
    },

    // Sort by function or cycle to the next one.
    sortBy(name, root) {
      const { sortBy, sortFns } = root.bank;

      // TODO validate.
      if (name) {
        this.set({ sortBy: name });
      } else {
        let idx = 1 + sortFns.indexOf(sortBy);
        if (idx === sortFns.length) idx = 0;
        this.set({ sortBy: sortFns[idx] });
      }

      this.sort({});
    },

    // Delete a repo.
    deleteRepo(repo, root) {
      const { bank } = root;

      const i = findRepo(bank.repos, repo);
      this.removeRepo(i);

      // And the index, sorting again.
      this.sort({});
    },

    // Add a project for a repo.
    addProject({ repo, project }, root) {
      if (typeof project.number === 'undefined') throw new Error('Project number not provided');

      opa.ensureExists(project, 'columns.nodes', []);

      // Parse the issues.
      project.issues = issues.fromBoards(project.columns.nodes);

      // Add in the stats.
      project.stats = stats(project);

      // Ref back to repo.
      project.repo = repo;

      const { projects, repos } = root.bank;

      // If repo hasn't been found, add it behind the scenes.
      let i = findRepo(repos, repo);
      if (i === undefined) {
        i = `r${seqId++}`;
        this.saveRepo({ repo, key: i });
      }

      // Does the project exist already?
      let j = findProject(projects, repo, project);
      if (j === undefined) {
        j = `p${seqId++}`;
      }
      project.key = j;
      this.saveProject({ project, key: j });

      // Now index this project.
      this.sort({ ref: [ i, j ], data: [ repo, project ] });
    },

    async getAll(props, root) {
      const { repos } = root.bank;

      this.set({ loading: true });

      // Reset first.
      repos.forEach(r => delete r.errors);

      if (props) {
        if ('project' in props) {
          // For a single project.
          const repo = { owner: props.owner, name: props.name };
          const project = { number: parseInt(props.project, 10) };
          await this.getProject({ repo, project });
        } else {
          // For a single repo.
          const repo = repos.find(findRepo(props));
          await this.getRepo(repo);
        }
      } else {
        // For all repos.
        await repos.map(async r => await this.getRepo(r));
      }

      this.set({ loading: false });
    },

    // Fetch a single project.
    async getProject(args, root) {
      const { user } = root.account;

      const project = await request.oneProject(user, {
        owner: args.repo.owner,
        name: args.repo.name,
        project_number: args.project.number
      });
      
      this.addProject({ project, repo: args.repo });
    },

    // Fetch projects in a repo.
    async getRepo(repo, root) {
      const { user } = root.account;

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
    // async searchRepos(text, root) {
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
    //   const res = await request.repos(root.account.user, owner)

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
const comparator = ({ repos, projects, sortBy }) => {
  // Convert existing index into actual repo project.
  const deIdx = fn =>
    ([ i, j ], ...rest) =>
      fn.apply(this, [ [ repos[i], projects[j] ] ].concat(rest));

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

const findRepo = (list, repo) =>
  Object.keys(list).find(
    key => list[key].owner === repo.owner &&
      list[key].name === repo.name
  );

const findProject = (list, repo, project) =>
  Object.keys(list).find(
    key => list[key].number === project.number &&
      list[key].repo.owner === repo.owner &&
      list[key].repo.name === repo.name
  );

// Persist repos in local storage (sans projects and issues).
const persist = repos =>
  process.browser &&
    lscache.set('repos', repos.map(r => ({ owner: r.owner, name: r.name })));

export default bank;
