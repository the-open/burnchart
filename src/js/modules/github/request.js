import _ from 'lodash';
import superagent from 'superagent';

import actions from '../../actions/appActions.js';

import config from '../../../config.js';
import graphqlQueries from './graphql.js';

// Custom JSON parser.
superagent.parse = {
  'application/json': res => {
    try {
      return JSON.parse(res);
    } catch(err) {
      return {};
    }
  }
};

// Default args.
const defaults = {
  'github': {
    'host': 'api.github.com',
    'protocol': 'https'
  }
};

// Public api.
export default {

  // Get a repo.
  repo: (user, { owner, name }, cb) => {
    const token = (user && user.credential != null) ? user.credential.accessToken : null;
    const data = _.defaults({
      'path': `/repos/${owner}/${name}`,
      'headers': headers(token)
    }, defaults.github);

    request(data, cb);
  },

  // Get repos user has access to or are public to owner.
  repos: (user, ...args) => {
    if (args.length = 2) {
      var [ owner, cb ] = args;
    } else { // assumes 1
      var [ cb ]  = args;
    }

    const token = (user && user.credential != null) ? user.credential.accessToken : null;
    const data = _.defaults({
      'path': owner ? `/users/${owner}/repos` : '/user/repos',
      'headers': headers(token)
    }, defaults.github);

    request(data, cb);
  },

  // Get all open milestones.
  allMilestones: (user, { owner, name }, cb) => {
    const token = (user && user.credential != null) ? user.credential.accessToken : null;
    const data = _.defaults({
      'path': `/repos/${owner}/${name}/milestones`,
      'query': { 'state': 'open', 'sort': 'due_date', 'direction': 'asc' },
      'headers': headers(token)
    }, defaults.github);

    request(data, cb);
  },

  // Get one open milestone.
  oneMilestone: (user, { owner, name, milestone }, cb) => {
    const token = (user && user.credential != null) ? user.credential.accessToken : null;
    const data = _.defaults({
      'path': `/repos/${owner}/${name}/milestones/${milestone}`,
      'query': { 'state': 'open', 'sort': 'due_date', 'direction': 'asc' },
      'headers': headers(token)
    }, defaults.github);

    request(data, cb);
  },

  // Get all issues for a state..
  allIssues: (user, { owner, name, milestone }, query, cb) => {
    const token = (user && user.credential != null) ? user.credential.accessToken : null;
    const data = _.defaults({
      'path': `/repos/${owner}/${name}/issues`,
      'query': _.extend(query, { milestone, 'per_page': '100' }),
      'headers': headers(token)
    }, defaults.github);

    return request(data, cb);
  },

  allProjects: (user, { owner, name }, cb) => {
    const token = (user && user.credential != null) ? user.credential.accessToken : null;

    const data = _.defaults({
      path: '/graphql',
      body: JSON.stringify(name ? {
        query: graphqlQueries.allProjectsForRepo,
        variables: {
          owner,
          name
        }
      } : {
        query: graphqlQueries.allProjectsForOrg,
        variables: {
          login: owner
        }
      }),
      headers: headers(token),
      method: 'POST',
    }, defaults.github);

    request(data, (err, result) => {
      console.warn('graphql response!', err, result);
      cb(err, result);
    });
  },

  oneProject: (user, { owner, name, project }, cb) => {
    const token = (user && user.credential != null) ? user.credential.accessToken : null;

    const data = _.defaults({
      path: '/graphql',
      body: JSON.stringify(name ? {
        query: graphqlQueries.allProjectsForRepo,
        variables: {
          owner,
          name,
          project
        }
      } : {
        query: graphqlQueries.oneOrgProject,
        variables: {
          owner,
          project
        }
      }),
      headers: headers(token),
      method: 'POST',
    }, defaults.github);

    request(data, (err, result) => {
      console.warn('graphql response!', err, result);
      // Filter down to cards that are issues (as opposed to notes) here?
      cb(err, result);
    });
  }
};

// Make a request using SuperAgent.
const request = ({ protocol, host, method, path, query, headers, body }, cb) => {
  let exited = false;

  // Make the query params.
  let q = '';
  if (query) {
    q = '?' + _.map(query, (v, k) => { return `${k}=${v}`; }).join('&');
  }

  // The URI.
  const url = `${protocol}://${host}${path}${q}`;
  const req = superagent[method === 'POST' ? 'post' : 'get'](url);
  // Add headers.
  _.each(headers, (v, k) => req.set(k, v));

  // Timeout for requests that do not finish... see #32.
  let ms = config.request.timeout;
  ms = (_.isString(ms)) ? parseInt(ms, 10) : ms;
  const timeout = setTimeout(() => {
    exited = true;
    cb('Request has timed out');
  }, ms);

  body && req.send(body);

  // Send.
  req.end((err, data) => {
    // Arrived too late.
    if (exited) return;
    // All fine.
    exited = true;
    clearTimeout(timeout);
    // Actually process the response.
    response(err, data, cb);
  });
};

// How do we respond to a response?
const response = (err, data, cb) => {
  if (err) return cb(error(data ? data.body : err));
  // 2xx?
  if (data.statusType !== 2) return cb(error(data.body));
  // All good.
  cb(null, data.body);
};

// Give us headers.
const headers = token => {
  // The defaults.
  const h = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3'
  };
  // Add token?
  if (token) {
    h.Authorization = `bearer ${token}`;
  }

  return h;
};

// Parse an error.
const error = err => {
  let text, type;

  switch (false) {
    case !_.isString(err):
      text = err;
      break;

    case !_.isArray(err):
      text = err[1];
      break;

    case !(_.isObject(err) && _.isString(err.message)):
      text = err.message;
  }

  if (!text) {
    try {
      text = JSON.stringify(err);
    } catch (_err) {
      text = err.toString();
    }
  }

  return text;
};
