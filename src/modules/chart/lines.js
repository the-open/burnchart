import _ from 'lodash';
import d3 from 'd3';
import moment from 'moment';

import config from 'src/config';

export default {

  // A graph of closed issues.
  // `issues`:     closed issues list
  // `createdAt`:  project start date
  // `total`:      total number of points (open & closed issues)
  actual(issues, createdAt, total) {
    const head = [{
      date: moment(createdAt, moment.ISO_8601).toJSON(),
      points: total
    }];

    let min = +Infinity,
        max = -Infinity;

    // Generate the actual closes.
    let rest = _.map(issues, (issue) => {
      const {size, closedAt} = issue;
      // Determine the range.
      if (size < min) min = size;
      if (size > max) max = size;

      // Dropping points remaining.
      issue.date = moment(closedAt, moment.ISO_8601).toJSON();
      issue.points = total -= size;
      return issue;
    });

    // Now add a radius in a range (will be used for a circle).
    let range = d3.scale.linear().domain([ min, max ]).range([ 5, 8 ]);

    rest = rest.map(issue => {
      issue.radius = range(issue.size);
      return issue;
    });

    return [].concat(head, rest);
  },

  // A graph of an ideal progression..
  // `a`:     project start date
  // `b`:     project end date
  // `total`: total number of points (open & closed issues)
  ideal(a, b, total) {
    // Swap if end is before the start...
    if (b < a) [ b, a ] = [ a, b ];

    // Make sure off days are numbers.
    const off_days = config.chart.off_days.map(n => parseInt(n, 10));

    a = moment(a, moment.ISO_8601);
    // Do we have a due date?
    b = b != null ? moment(b, moment.ISO_8601) : moment.utc();

    // Go through the beginning to the end skipping off days.
    let days = [], length = 0, once;
    (once = inc => {
      // A new day. TODO: deal with hours and minutes!
      let day = a.add(1, 'days');

      // Does this day count?
      const day_of = day.weekday() || 7;

      if (off_days.indexOf(day_of) !== -1) {
        days.push({'date': day.toJSON(), 'off_day': true });
      } else {
        length += 1;
        days.push({'date': day.toJSON() });
      }

      // Go again?
      !(day > b) && once(inc + 1);
    })(0);

    // Map points on the array of days now.
    const velocity = total / (length - 1);

    days = days.map((day, i) => {
      day.points = total;
      if (days[i] && !days[i].off_day) total -= velocity;
      return day;
    });

    // Do we need to make a link to right now?
    const now = moment.utc();
    now > b && days.push({'date': now.toJSON(), 'points': 0 });

    return days;
  },

  // Graph representing a trendling of actual issues.
  trend(actual, createdAt, closedAt) {
    if (!actual.length) return [];

    let first = actual[0], last = actual[actual.length - 1];

    let start = moment(first.date, moment.ISO_8601);

    // Values is a list of time from the start and points remaining.
    let values = _.map(actual, ({date, points }) => {
      return [ moment(date, moment.ISO_8601).diff(start), points ];
    });

    // Now is an actual point too.
    let now = moment.utc();
    values.push([ now.diff(start), last.points ]);

    // http://classroom.synonym.com/calculate-trendline-2709.html
    let b1 = 0, e = 0, c1 = 0, l = values.length;
    let a = l * _.reduce(values, (sum, [ a, b ]) => {
      b1 += a; e += b;
      c1 += Math.pow(a, 2);
      return sum + (a * b);
    }, 0);

    let slope = (a - (b1 * e)) / ((l * c1) - (Math.pow(b1, 2)));
    let intercept = (e - (slope * b1)) / l;

    let fn = (x) => slope * x + intercept;

    // Projects always have a creation date.
    createdAt = moment(createdAt, moment.ISO_8601);

    // Due date specified.
    if (closedAt) {
      closedAt = moment(closedAt, moment.ISO_8601);
      // In the past?
      if (now > closedAt) closedAt = now;
    // No due date
    } else {
      closedAt = now;
    }

    a = createdAt.diff(start);
    let b = closedAt.diff(start);

    return [
      {'date': createdAt.toJSON(), 'points': fn(a) },
      {'date': closedAt.toJSON(), 'points': fn(b) }
    ];
  }

};
