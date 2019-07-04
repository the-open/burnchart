import _ from 'lodash';
import superagent from 'superagent';
import opa from 'object-path';

import config from 'src/config';
import graphqlQueries from './graphql';

// Custom JSON parser.
superagent.parse = {
  'application/json': res => {
    try {
      return JSON.parse(res);
    } catch (err) {
      return {};
    }
  }
};

// Default args.
const defaults = {
  github: {
    host: 'api.github.com',
    protocol: 'https'
  }
};

// Public api.
export default {

  // Get a repo.
  repo: (user, {owner, name }) => {
    const token = (user && user.accessToken != null) ? user.accessToken : null;
    const data = _.defaults({
      path: `/repos/${owner}/${name}`,
      headers: headers(token)
    }, defaults.github);

    return request(data);
  },

  // Get repos user has access to or are public to owner.
  repos: (user, ...args) => {
    const owner = args.length ? args[0] : null; // assumes 1

    const token = (user && user.accessToken != null) ? user.accessToken : null;
    const data = _.defaults({
      path: owner ? `/users/${owner}/repos` : '/user/repos',
      headers: headers(token)
    }, defaults.github);

    return request(data);
  },

  async allProjects(user, {owner, name }) {
    const token = (user && user.accessToken != null) ? user.accessToken : null;
    let data = _.defaults({
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
      headers: {
        'Authorization': `bearer ${token}`,
      },
      method: 'POST',
    }, defaults.github);

    const res = await request(data);
    return opa.get(res, 'data.repository.projects.nodes');
  },

  async oneProject(user, {owner, name, project_number }) {
    const token = (user && user.accessToken != null) ? user.accessToken : null;

    let data = _.defaults({
      path: '/graphql',
      body: JSON.stringify(name ? {
        query: graphqlQueries.oneProject,
        variables: {
          owner,
          name,
          project_number
        }
      } : {
        query: graphqlQueries.oneOrgProject,
        variables: {
          owner,
          project_number
        }
      }),
      headers: {
        'Authorization': `bearer ${token}`,
      },
      method: 'POST',
    }, defaults.github);

    const res = await request(data);
    return opa.get(res, 'data.repository.project');
  }
};

// Make a request using SuperAgent.
const request = ({protocol, host, method, path, query, headers, body }) => {
  // Make the query params.
  let q = '';
  if (query) {
    q = '?' + query.map((v, k) => `${k}=${v}`).join('&');
  }

  // The URI.
  const url = `${protocol}://${host}${path}${q}`;
  const req = method === 'POST' ? superagent.post(url) : superagent.get(url);
  // Add headers.
  _.each(headers, (v, k) => req.set(k, v));

  // Timeout for requests that do not finish... see #32.
  let ms = config.request.timeout;
  ms = (_.isString(ms)) ? parseInt(ms, 10) : ms;
  
  return new Promise((resolve, reject) => {
    let exited = false;
    const timeout = setTimeout(() => {
      exited = true;
      reject('Request has timed out');
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
      if (err) return reject(error(data ? data.body : err));
      // 2xx?
      if (data.statusType !== 2) return reject(error(data.body));
      // All good.
      resolve(data.body);
    });
  });
};

// Give us headers.
const headers = (token) => {
  // The defaults.
  let h = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3'
  };
  // Add token?
  if (token) {
    h.Authorization = `token ${token}`;
  }

  return h;
};

// Parse an error.
const error = err => {
  let text;
  switch (false) {
    case !_.isString(err):
      text = err;
      break;

    case !_.isArray(err):
      text = err[1];
      break;

    case !(_.isObject(err) && _.isString(err.message)):
      text = err.message;
      break;
    
    default:
      text = 'Error, cannot parse an error';
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
