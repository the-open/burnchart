import moment from 'moment';
import _ from 'lodash';

// Progress in %.
let progress = (a, b) => {
  if (a + b === 0) {
    return 0;
  } else {
    return 100 * (a / (b + a));
  }
};

// Calculate the stats for a project.
//  Is it on time? What is the progress?
export default (project) => {
  // Makes testing easier...
  if (project.stats != null) return project.stats;

  let points = 0, a, b, c, time, days, span;

  let stats = {
    'isDone': false,
    'isOnTime': true,
    'isOverdue': false,
    'isEmpty': true
  };

  // Progress in points.
  let i = project.issues.closed.size,
      j = project.issues.open.size;
  if (i) {
    stats.isEmpty = false;
    if (i + j > 0) {
      points = progress(i, j);
      if (points === 100) stats.isDone = true;
    }
  }

  // Check that project hasn't been created after issue close; #100.
  if (project.issues.closed.size) {
    project.createdAt = _.reduce(project.issues.closed.list
    , (x, { closedAt }) => (x > closedAt) ? closedAt : x
    , project.createdAt);
  }

  // The dates in this project.
  a = moment(project.createdAt, moment.ISO_8601);
  b = moment.utc();
  c = moment(project.closedAt, moment.ISO_8601);

  // No due date = always on track.
  if (!(project.closedAt != null)) {
    // The number of days from start to now.
    span = b.diff(a, 'days');
    return _.extend(stats, { span, 'progress': { points } });
  }

  // Overdue? Regardless of the date, if we have closed all
  //  issues, we are no longer overdue.
  if (b.isAfter(c) && !stats.isDone) stats.isOverdue = true;

  // Progress in time.
  time = progress(b.diff(a), c.diff(b));

  // Number of days between start and due date or today if overdue.
  span = (stats.isOverdue ? b : c).diff(a, 'days');

  // How many days is 1% of the time until now?
  days = (b.diff(a, 'days')) / 100;

  // If we have closed all issues, we are "on time".
  stats.isOnTime = stats.isDone || points > time;

  return _.extend(stats, { days, span, 'progress': { points, time } });
};
