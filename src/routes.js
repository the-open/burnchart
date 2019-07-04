import React from "react";

import ReposPage from './containers/ReposPage';
import AddRepoPage from './containers/AddRepoPage';
import MilestonesPage from './containers/MilestonesPage';
import MilestonePage from './containers/MilestonePage';

const routes = [
  {path: '/', action: () => <ReposPage /> },
  {path: '/new/repo', title: 'Add a repo', action: () => <AddRepoPage /> },
  {path: '/:owner/:repo', title: 'Milestones', action: () => <MilestonePage /> },
  {path: '/:owner/:repo/:milestone', title: 'Milestone', action: () => <MilestonePage /> }
];

export default routes;
