import React, { Component } from 'react';
import { connect } from "react-redux";
import _ from 'lodash';
import cls from 'classnames';

import format from '../modules/format.js';

import Icon from './Icon';

class Projects extends Component {

  constructor() {
    super();

    this.onSort = this.onSort.bind(this);
    this.onRefresh = this.onRefresh.bind(this);
  }

  // Cycle through projects sort order.
  onSort() {
    this.props.sortRepos();
  }

  onRefresh() {
    this.props.loadRepos();
  }

  render() {
    const { repos, repo, navigate } = this.props;

    // Show the repos with errors first.
    const errors = _(repos.list)
    .filter('errors')
    .map((repo, i) => {
      const text = repo.errors.join('\n');
      return (
        <tr key={`err-${i}`}>
          <td colSpan="3">
            <div className="repo">{repo.owner}/{repo.name}
              <span className="error" title={text}><Icon name="warning"/></span>
            </div>
          </td>
        </tr>
      );
    }).value();

    // Now for the list of projects, index sorted.
    const list = [];
    repos.index.forEach(([ rI, pI ]) => {
      const { owner, name, projects } = repos.list[rI];
      const project = projects[pI];

      // Filter down?
      if (!(!repo || (repo.owner == owner && repo.name == name))) return;

      list.push(
        <tr className={cls({ done: project.stats.isDone })} key={`${rI}-${pI}`}>
          <td>
            <div
              onClick={() => navigate(`/${owner}/${name}`)}
              className="repo"
            >
              {owner}/{name}
            </div>
          </td>
          <td>
            <div
              onClick={() => navigate(`/${owner}/${name}/${project.number}`)}
              className="project"
            >
              {project.name}
            </div>
          </td>
          <td style={{ width: '1%' }}>
            <div className="progress">
              <span className="percent">{Math.floor(project.stats.progress.points)}%</span>
              <span className={cls('due', { red: project.stats.isOverdue })}>
                {format.due(project.closedAt)}
              </span>
              <div className="outer bar">
                <div
                  className={cls('inner', 'bar', { green: project.stats.isOnTime, 'red': !project.stats.isOnTime })}
                  style={{ width: `${project.stats.progress.points}%` }}
                />
              </div>
            </div>
          </td>
        </tr>
      );
    });

    // Wait for something to show.
    if (!errors.length && !list.length) return false;

    if (repo) {
      // Repo-specific projects.
      return (
        <div id="repos">
          <div className="header">
            <a className="sort" onClick={this.onSort}><Icon name="sort"/> Sorted by {repos.sortBy}</a>
            <h2>Projects</h2>
          </div>
          <table>
            <tbody>{list}</tbody>
          </table>
          <div className="footer" />
        </div>
      );
    } else {
      // List of repos and their projects.
      return (
        <div id="repos">
          <div className="header">
            <a className="sort" onClick={this.onSort}><Icon name="sort"/> Sorted by {repos.sortBy}</a>
            <h2>Repos</h2>
          </div>
          <table>
            <tbody>
              {errors}
              {list}
            </tbody>
          </table>
          <div className="footer">
            <div onClick={this.props.onToggleMode}>Edit Repos</div>
            <div onClick={this.onRefresh}>Refresh Repos</div>
          </div>
        </div>
      );
    }
  }
}

const mapDispatch = dispatch => ({
  sortRepos: dispatch.repos.sortRepos,
  loadRepos: dispatch.repos.loadRepos,
  navigate: dispatch.router.navigate
});

export default connect(null, mapDispatch)(Projects);
