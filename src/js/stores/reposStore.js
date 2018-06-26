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
    let list = lscache.get('repos') || [];

    super({
      // A stack of repos.
      list: list,
      // A sorted repo and milestones index.
      'index': [],
      // The default sort order.
      'sortBy': 'priority',
      // Sort functions to toggle through.
      'sortFns': [ 'progress', 'priority', 'name' ]
    });

    // Listen to only repos actions.
    actions.on('repos.*', (obj, event) => {
      const fn = `on.${event}`.replace(/[.]+(\w|$)/g, (m, p) => p.toUpperCase());
      // Run?
      (fn in this) && this[fn](obj);
    });

    // Listen to when user is ready and save info on us.
    actions.on('user.ready', (user) => this.set('user', user));

    // Persist repos in local storage (sans milestones and issues).
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

  // Fetch milestone(s) and issues for a repo(s).
  onReposLoad(args) {
    const repos = this.get('list');

    // Reset first.
    _.each(repos, r => delete r.errors);

    // Wait for the user to get resolved.
    this.get('user', this.cb((user) => { // async
      if (args) {
        if ('milestone' in args) {
          // For a single milestone.
          this.getMilestone(user, {
            'owner': args.owner,
            'name': args.name
          }, args.milestone, true); // notify as well
        } else if ('project' in args) {
          // TODO
        } else {
          // For a single repo.
          _.find(this.get('list'), (obj) => {
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
      let owner, name;
      // Can we get the owner (and name) from the text?
      if (/\//.test(text)) {
        [ owner, name ] = text.split('/');
      } else {
        text = new RegExp(`^${text}`, 'i');
      }

      // No owner and no user means nothing to go by.
      if (!owner && !user) return;

      // Make the request.
      request.repos(user, owner, this.cb((err, res) => {
        if (err) return; // ignore errors

        const list = _(res)
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
    const { list, sortBy } = this.get();

    // Convert existing index into actual repo milestone.
    const deIdx = fn =>
      ([ i, j ], ...rest) =>
        fn.apply(this, [ [ list[i], list[i].milestones[j] ] ].concat(rest));

    // Set default fields.
    const defaults = (arr, hash) => {
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
        return deIdx(([ , aM ], [ , bM ]) => {
          defaults([ aM, bM ], { 'stats.progress.points': 0 });
          // Simple points difference.
          return aM.stats.progress.points - bM.stats.progress.points;
        });

      // From most delayed in days.
      case 'priority':
        return deIdx(([ , aM ], [ , bM ]) => {
          // Milestones with no deadline are always at the "beginning".
          defaults([ aM, bM ], { 'stats.progress.time': 0, 'stats.days': 1e3 });
          // % difference in progress times the number of days ahead or behind.
          let [ $a, $b ] = _.map([ aM, bM ], ({ stats }) => {
            return (stats.progress.points - stats.progress.time) * stats.days;
          });

          return $b - $a;
        });

      // Based on repo then milestone name including semver.
      case 'name':
        return deIdx(([ aP, aM ], [ bP, bM ]) => {
          let owner, name;

          if (owner = bP.owner.localeCompare(aP.owner)) {
            return owner;
          }
          if (name = bP.name.localeCompare(aP.name)) {
            return name;
          }

          // Try semver.
          if (semver.valid(bM.title) && semver.valid(aM.title)) {
            return semver.gt(bM.title, aM.title);
          // Back to string compare.
          } else {
            return bM.title.localeCompare(aM.title);
          }
        });

      // The "whatever" sort order...
      default:
        return () => 0;
    }
  }

  // Fetch milestones and issues for a repo.
  getRepo(user, r) {
    // Fetch their milestones.
    request.allMilestones(user, r, this.cb((err, milestones) => { // async
      // Save the error if repo does not exist.
      if (err) return this.saveError(r, err);
      // Now add in the issues.
      milestones.forEach(milestone => {
        // Do we have this milestone already? Skip fetching issues then.
        if (!_.find(r.milestones, ({ number }) => {
          return milestone.number === number;
        })) {
          // Fetch all the issues for this milestone.
          this.getIssues(user, r, milestone);
        }
      });
    }));
  }

  // Fetch a single milestone.
  getMilestone(user, r, m, say) {
    // Fetch the single milestone.
    request.oneMilestone(user, {
      'owner': r.owner,
      'name': r.name,
      'milestone': m
    }, this.cb((err, milestone) => { // async
      // Save the error if repo does not exist.
      if (err) return this.saveError(r, err, say);
      // Now add in the issues.
      this.getIssues(user, r, milestone, say);
    }));
  }

  // Fetch all issues for a milestone.
  getIssues(user, r, m, say) {
    issues.fetchAll(user, {
      'owner': r.owner,
      'name': r.name,
      'milestone': m.number
    }, this.cb((err, obj) => { // async
      // Save any errors on the repo.
      if (err) return this.saveError(r, err, say);
      // Add in the issues to the milestone.
      _.extend(m, { 'issues': obj });
      // Save the milestone.
      this.addMilestone(r, m, say);
    }));
  }

  // Talk about the stats of a milestone.
  notify(milestone) {
    if (milestone.stats.isEmpty) {
      let left;
      if (left = milestone.issues.open.size) {
        return actions.emit('system.notify', {
          'text': `No progress has been made, ${left} point${(left > 1) ? 's' : ''} left`,
          'system': true,
          'ttl': null
        });
      } else {
        return actions.emit('system.notify', {
          'text': 'This milestone has no issues',
          'type': 'warn',
          'system': true,
          'ttl': null
        });
      }
    }

    if (milestone.stats.isDone) {
      actions.emit('system.notify', {
        'text': 'This milestone is complete',
        'type': 'success'
      });
    }

    if (milestone.stats.isOverdue) {
      actions.emit('system.notify', {
        'text': 'This milestone is overdue',
        'type': 'warn'
      });
    }
  }

  // Add a milestone for a repo.
  addMilestone(repo, milestone, say) {
    // Add in the stats.
    let i, j;
    _.extend(milestone, { 'stats': stats(milestone) });

    // Notify?
    say && this.notify(milestone);

    // If repo hasn't been found, add it behind the scenes.
    if ((i = this.findIndex(repo)) < 0) {
      i = this.push('list', repo);
    }

    // Does the milestone exist already?
    let milestones;
    if (milestones = this.get(`list.${i}.milestones`)) {
      j = _.findIndex(milestones, { 'number': milestone.number });
      // Just make an update then.
      if (j != -1) {
        return this.set(`list.${i}.milestones.${j}`, milestone);
      }
    }

    // Push the milestone and return the index.
    j = this.push(`list.${i}.milestones`, milestone);

    // Now index this milestone.
    this.sort([ i, j ], [ repo, milestone ]);
  }

  // Find index of a repo.
  findIndex({ owner, name }) {
    return _.findIndex(this.get('list'), { owner, name });
  }

  // Save an error from loading milestones or issues.
  // TODO: clear these when we fetch all repos anew.
  saveError(repo, err, say=false) {
    let idx;
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
  //  repo and milestone index in the stack.
  sort(ref, data) {
    let idx;
    // Get the existing index.
    const index = this.get('index');

    // Index one milestone in an already sorted index.
    if (ref) {
      idx = sortedIndex(index, data, this.comparator());
      index.splice(idx, 0, ref);
    // Sort them all.
    } else {
      const list = this.get('list');
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        // TODO: need to show repos that failed too...
        if (r.milestones == null) continue;
        // Walk the milestones.
        for (let j = 0; j < r.milestones.length; j++) {
          const m = r.milestones[j];
          // Run a comparator here inserting into index.
          idx = sortedIndex(index, [ r, m ], this.comparator());
          index.splice(idx, 0, [ i, j ]);
        }
      }
    }

    this.set('index', index);
  }

  // Do we have this repo? Case-insensitive.
  has(o, n) {
    o = o.toUpperCase() ; n = n.toUpperCase();
    return !!_.find(this.get('list'), ({ owner, name }) =>
      o == owner.toUpperCase() && n == name.toUpperCase()
    );
  }

}

export default new ReposStore();
