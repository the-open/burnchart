import _ from 'lodash';
import lscache from 'lscache';
import opa from 'object-path';
import semver from 'semver';
import sortedIndex from 'sortedindex-compare';

import Store from '../lib/Store.js';

import actions from '../actions/appActions.js';

import stats from '../modules/stats.js';
import request from '../modules/github/request.js';
import issues from '../modules/github/issues.js';

class ReposStore extends Store {

  // Initial payload.
  constructor() {
    // Init the repos from local storage.
    const list = lscache.get('repos') || [];

    super({
      // A stack of repos.
      list,
      // A sorted repos and projects index.
      'index': [],
      // The default sort order.
      'sortBy': 'priority',
      // Sort functions to toggle through.
      'sortFns': [ 'progress', 'priority', 'name' ]
    });

    // Listen to only repos actions.
    actions.on('repos.*', (obj, event) => {
      let fn = `on.${event}`.replace(/[.]+(\w|$)/g, (m, p) => p.toUpperCase());
      // Run?
      (fn in this) && this[fn](obj);
    });

    // Listen to when user is ready and save info on us.
    actions.on('user.ready', user => this.set('user', user));

    // Persist repos in local storage (sans projects and issues).
    this.on('list.*', () => {
      if (process.browser) {
        lscache.set('repos', _.pluckMany(this.get('list'), [ 'owner', 'name' ]));
      }
    });

    // Reset our index and re-sort.
    this.on('sortBy', () => {
      this.set('index', []);
      // Run the sort again.
      this.sort();
    });

    // Debounce.
    if (process.browser) { // easier to test
      this.onReposSearch = _.debounce(this.onReposSearch, 500);
    }
  }

  // Fetch issues for a repo(s).
  onReposLoad(args) {
    let repos = this.get('list');

    // Reset first.
    repos = _.each(repos, r => delete r.errors);

    // Wait for the user to get resolved.
    this.get('user', this.cb(user => { // async
      if (args) {
        if ('project' in args) {
          // For a single project.
          this.getProject(user, {
            'owner': args.owner,
            'name': args.name
          }, args.project, true); // notify as well
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
    }));
  }

  // Push to the stack unless it exists already.
  onReposAdd(repo) {
    if (!_.find(this.get('list'), repo)) {
      this.push('list', repo);
    }
  }

  // Cycle through repos sort order.
  onReposSort() {
    const { sortBy, sortFns } = this.get();

    let idx = 1 + sortFns.indexOf(sortBy);
    if (idx === sortFns.length) idx = 0;

    this.set('sortBy', sortFns[idx]);
  }

  // Demonstration repos.
  onReposDemo() {
    this.set({
      'list': [
        { 'owner': 'd3', 'name': 'd3' },
        { 'owner': 'radekstepan', 'name': 'disposable' },
        { 'owner': 'rails', 'name': 'rails' }
      ],
      'index': []
    });
  }

  // Search for repos.
  onReposSearch(text) {
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
  }

  // Delete a repo.
  onReposDelete(repo) {
    const i = this.findIndex(repo);
    // Delete the repo.
    this.del(`list.${i}`);
    // And the index, sorting again.
    this.set('index', []);
    this.sort();
  }

  // Return a sort order comparator.
  comparator() {
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
          if (semver.valid(bP.title) && semver.valid(aP.title)) {
            return semver.gt(bP.title, aP.title);
          // Back to string compare.
          } else {
            return bP.title.localeCompare(aP.title);
          }
        });

      // The "whatever" sort order...
      default:
        return () => { return 0; }
    }
  }

  // Fetch projects in a repo.
  getProjects(user, r) {
    request.allProjects(user, r, this.cb((err, projects) => { // async
      // Save the error if repo does not exist.
      if (err) return this.saveError(r, err);
      projects.forEach(obj => {
        // Save the projet.
        // TODO do something with obj and projects
        this.addProject(r, obj, say);
      });
    }));
  }

  // Fetch a single project.
  getProject(user, r, p, say) {
    request.oneProject(user, {
      'owner': r.owner,
      'name': r.name,
      'project': p
    }, this.cb((err, obj) => { // async
      // Save the error if repo does not exist.
      if (err) return this.saveError(r, err, say);
      // Save the projet.
      // TODO do something with obj and p
      this.addProject(r, obj, say);
    }));
  }

  // Talk about the stats of a project.
  notify(project) {
    if (project.stats.isEmpty) {
      let left;
      if (left = project.issues.open.size) {
        return actions.emit('system.notify', {
          'text': `No progress has been made, ${left} point${(left > 1) ? 's' : ''} left`,
          'system': true,
          'ttl': null
        });
      } else {
        return actions.emit('system.notify', {
          'text': 'This project has no issues',
          'type': 'warn',
          'system': true,
          'ttl': null
        });
      }
    }

    if (project.stats.isDone) {
      actions.emit('system.notify', {
        'text': 'This project is complete',
        'type': 'success'
      });
    }

    if (project.stats.isOverdue) {
      actions.emit('system.notify', {
        'text': 'This project is overdue',
        'type': 'warn'
      });
    }
  }

  // Add a project for a repo.
  addProject(repo, project, say) {
    // Add in the stats.
    let i, j;
    _.extend(project, { 'stats': stats(project) });

    // Notify?
    if (say) this.notify(project);

    // If repo hasn't been found, add it behind the scenes.
    if ((i = this.findIndex(repo)) < 0) {
      i = this.push('list', repo);
    }

    // Does the project exist already?
    let projects;
    if (projects = this.get(`list.${i}.projects`)) {
      j = _.findIndex(projects, { 'number': project.number });
      // Just make an update then.
      if (j != -1) {
        return this.set(`list.${i}.projects.${j}`, project);
      }
    }

    // Push the project and return the index.
    j = this.push(`list.${i}.projects`, project);

    // Now index this project.
    this.sort([ i, j ], [ repo, project ]);
  }

  // Find index of a repo.
  findIndex({ owner, name }) {
    return _.findIndex(this.get('list'), { owner, name });
  }

  // Save an error from loading projects.
  // TODO: clear these when we fetch all repos anew.
  saveError(repo, err, say=false) {
    var idx;
    if ((idx = this.findIndex(repo)) > -1) {
      this.push(`list.${idx}.errors`, err);
    } else {
      // Create the stub repo behind the scenes.
      this.push('list', _.extend({}, repo, { 'errors': [ err ] }));
    }

    // Notify?
    if (!say) return;
    actions.emit('system.notify', {
      'text': err,
      'type': 'alert',
      'system': true,
      'ttl': null
    });
  }

  // Sort repos (update the index). Can pass reference to the
  //  repo and project index in the stack.
  sort(ref, data) {
    let idx;
    // Get the existing index.
    const index = this.get('index');

    // Index one project in an already sorted index.
    if (ref) {
      idx = sortedIndex(index, data, this.comparator());
      index.splice(idx, 0, ref);
    // Sort them all.
    } else {
      const list = this.get('list');
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        // TODO: need to show repos that failed too...
        if (r.projects == null) continue;
        // Walk the projects.
        for (let j = 0; j < r.projects.length; j++) {
          const p = r.projects[j];
          // Run a comparator here inserting into index.
          idx = sortedIndex(index, [ r, p ], this.comparator());
          index.splice(idx, 0, [ i, j ]);
        }
      }
    }

    this.set('index', index);
  }

  // Do we have this repo? Case-insensitive.
  has(o, n) {
    o = o.toUpperCase() ; n = n.toUpperCase();
    return !!_.find(this.get('list'), ({ owner, name }) => {
      return o == owner.toUpperCase() && n == name.toUpperCase();
    });
  }

}

export default new ReposStore();
