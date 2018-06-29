import { assert } from 'chai';
import path from 'path';
import moment from 'moment';

import stats from '../src/js/modules/stats.js';

export default {
  'stats - is project empty, on time and overdue? no due date': (done) => {
    const project = {
      'issues': {
        'open': {
          'size': 0
        },
        'closed': {
          'size': 0
        }
      }
    };

    let { isEmpty, isOverdue, isOnTime } = stats(project);

    assert.isTrue(isEmpty);
    assert.isFalse(isOverdue);
    assert.isTrue(isOnTime);

    done();
  },

  'stats - has no progress been made?': (done) => {
    const project = {
      'issues': {
        'open': {
          'size': 1
        },
        'closed': {
          'size': 0
        }
      }
    };

    assert.isTrue(stats(project).isEmpty);

    done();
  },

  'stats - is project done?': (done) => {
    const project = {
      'issues': {
        'open': {
          'size': 0
        },
        'closed': {
          'size': 5
        }
      }
    };

    let { isDone } = stats(project);
    assert.isTrue(isDone);

    done();
  },

  'stats - is project overdue? has due date, yes': (done) => {
    const project = {
      'created_at': '2011-04-02T00:00:00.000Z',
      'due_on': '2011-04-03T00:00:00.000Z',
      'issues': {
        'open': {
          'size': 0
        },
        'closed': {
          'size': 0
        }
      }
    };

    let { isOverdue } = stats(project);
    assert.isTrue(isOverdue);

    done();
  },

  'stats - is project on time? has due date, yes': (done) => {
    let now = moment.utc();
    const project = {
      'created_at': now.subtract(1, 'week').toISOString(),
      'due_on': now.add(1, 'month').toISOString(),
      'issues': {
        'open': {
          'size': 1
        },
        'closed': {
          'size': 1
        }
      }
    };

    let { isOnTime } = stats(project);
    assert.isTrue(isOnTime);

    done();
  },

  'stats - is project on time? has due date, no': (done) => {
    let now = moment.utc();
    const project = {
      'created_at': now.subtract(2, 'week').toISOString(),
      'due_on': now.add(1, 'day').toISOString(),
      'issues': {
        'open': {
          'size': 2
        },
        'closed': {
          'size': 2
        }
      }
    };

    let { isOnTime } = stats(project);
    assert.isFalse(isOnTime);

    done();
  },

  'stats - is prokect on time? has due date, all issues closed': (done) => {
    let now = moment.utc();
    const project = {
      'created_at': now.subtract(2, 'week').toISOString(),
      'due_on': now.subtract(1, 'week').toISOString(),
      'issues': {
        'open': {
          'size': 0
        },
        'closed': {
          'size': 5
        }
      }
    };

    let { isOnTime } = stats(project);
    assert.isTrue(isOnTime);

    done();
  },

  // Make sure project hasn't been created after closing an issue; #100.
  'stats - project created_at': (done) => {
    let now = moment.utc();
    let a = now.clone().subtract(1, 'week').toISOString(),
        b = now.clone().subtract(1, 'day').toISOString()

    const project = {
      'created_at': b,
      'issues': {
        'open': {
          'size': 0
        },
        'closed': {
          'size': 1,
          'list': [ { 'closed_at': a } ]
        }
      }
    };

    // By ref.
    stats(project);

    assert.equal(project.created_at, a);

    done();
  }
};
