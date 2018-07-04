import React from "react";

import ReposPage from './containers/ReposPage';
import AddRepoPage from './containers/AddRepoPage';
import ProjectsPage from './containers/ProjectsPage';
import ProjectPage from './containers/ProjectPage';

const routes = [
  { path: '/', action: () => <ReposPage /> },
  { path: '/new/repo', title: 'Add a repo', action: () => <AddRepoPage /> },
  { path: '/:owner/:name', title: 'Projects', action: () => <ProjectsPage /> },
  { path: '/:owner/:name/:project', title: 'Project', action: () => <ProjectPage /> },
  { path: '/demo', action: () => {
    // TODO emit demos action and redirect to /
  } }
];

export default routes;
