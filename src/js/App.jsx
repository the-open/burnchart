import React from 'react';
import { RouterMixin, navigate } from 'react-mini-router';
import _ from 'lodash';
import './modules/lodash.js';

import ReposPage from './components/pages/ReposPage.jsx';
import AddRepoPage from './components/pages/AddRepoPage.jsx';
import MilestonesPage from './components/pages/MilestonesPage.jsx';
import ChartPage from './components/pages/ChartPage.jsx';
import ProjectsPage from './components/pages/ProjectsPage.jsx';
import ProjectChartPage from './components/pages/ProjectChartPage.jsx';
import NotFoundPage from './components/pages/NotFoundPage.jsx';

import actions from './actions/appActions.js';

import appStore from './stores/appStore.js';

// Will fire even if event is prevented from propagating.
delete RouterMixin.handleClick;

// Values are function names below.
const routes = {
  '/': 'repos',
  '/new/repo': 'addRepo',
  '/:owner/:name': 'milestones',
  '/:owner/:name/:milestone': 'chart',
  '/:owner/:name/projects': 'projects',
  '/:owner/:name/projects/:project': 'projectChart',
  '/demo': 'demo'
};

let blank = false;

// Build a link to a page.
const find = ({ to, params, query }) => {
  let $url;
  const re = /:[^\/]+/g;

  // Skip empty objects.
  [ params, query ] = [ _.isObject(params) ? params : {}, query ].map(o => _.pick(o, _.keys(o)));

  // Find among the routes.
  _.find(routes, (name, url) => {
    if (name != to) return;
    const matches = url.match(re);

    // Do not match on the number of params.
    if (_.keys(params).length != (matches || []).length) return;

    // Do not match on the name of params.
    if (!_.every(matches, m => m.slice(1) in params)) return;

    // Fill in the params.
    $url = url.replace(re, m => params[m.slice(1)]);

    // Found it.
    return true;
  });

  if (!$url) throw new Error(`path ${to} ${JSON.stringify(params)} is not recognized`);

  // Append querystring.
  if (_.keys(query).length) {
    $url += "?" + _.map(query, (v, k) => `${k}=${v}`).join("&");
  }

  return $url;
};

export default React.createClass({

  displayName: 'App.jsx',

  mixins: [ RouterMixin ],

  routes: routes,

  statics: {
    // Build a link to a page.
    link: (route) => find(route),
    // Route to a link.
    navigate: (route) => {
      const fn = _.isString(route) ? _.identity : find;
      navigate(fn(route));
    }
  },

  // Show repos.
  repos() {
    document.title = 'Burnchart: GitHub Burndown Chart as a Service';
    process.nextTick(() => actions.emit('repos.load'));
    return <ReposPage />;
  },

  // Add a repo.
  addRepo() {
    document.title = 'Add a repo';
    return <AddRepoPage />;
  },

  // Show repo milestones.
  milestones(owner, name) {
    document.title = `${owner}/${name}`;
    process.nextTick(() => actions.emit('repos.load', { owner, name }));
    return <MilestonesPage owner={owner} name={name} />;
  },

  // Show a repo milestone chart.
  chart(owner, name, milestone) {
    document.title = `${owner}/${name}/${milestone}`;
    process.nextTick(() => actions.emit('repos.load', { owner, name, milestone }));
    return <ChartPage owner={owner} name={name} milestone={milestone} />;
  },

  // Show projects (i.e. boards) for a repo.
  projects(owner, name) {
    document.title = `${owner}/${name} projects`;
    process.nextTick(() => actions.emit('projects.load', { owner, name }));
    return <ProjectsPage owner={owner} name={name} />;
  },

  // Show a GitHub project (i.e. board) chart.
  projectChart(owner, name, project) {
    document.title = `${owner}/${name}/ projects/${project}`;
    process.nextTick(() => actions.emit('projects.load', { owner, name, milestone }));
    return <ProjectChartPage owner={owner} name={name} project={project} />;
  },

  // Demo repos.
  demo() {
    actions.emit('repos.demo');
    navigate(find({ 'to': 'repos' }));
    return <div />;
  },

  // 404.
  notFound(path) {
    return <NotFoundPage path={path} />;
  },

  // Use blank <div /> to always re-mount a Page.
  render() {
    if (blank) {
      process.nextTick(() => this.setState({ tick: true }));
      blank = false;
      return <div />;
    }
    
    blank = true;
    // Clear any notifications.
    process.nextTick(() => actions.emit('system.notify'));
    return this.renderCurrentRoute();
  }

});
