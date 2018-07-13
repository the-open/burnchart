import React, { Component } from 'react';
import { connect } from "react-redux";
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
    this.props.getRepos(null);
  }

  render() {
    const { repos, repo, navigate } = this.props;

    // Show the repos with errors first.
    const errors = (repos.list.filter(r => r.errors)).map((repo, i) =>
      (
        <tr key={`err-${i}`}>
          <td colSpan="3">
            <div className="repo">{repo.owner}/{repo.name}
              <span className="error" title={repo.errors.join('\n')}><Icon name="warning"/></span>
            </div>
          </td>
        </tr>
      )
    );

    // Now for the list of projects, index sorted.
    const list = [];
    repos.index.forEach(([ rI, pI ]) => {
      const { owner, name, projects } = repos.list[rI];
      const project = projects[pI];

      // Filter down?
      if (!(!repo || (repo.owner === owner && repo.name === name))) return;

      list.push(
        <tr className={cls({ done: project.stats.isDone })} key={project.key}>
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
            <div className="sort" onClick={this.onSort}><Icon name="sort"/> Sorted by {repos.sortBy}</div>
            <h2>Projects</h2>
          </div>
          <table>
            <tbody>{list}</tbody>
          </table>
          <div className="footer" />
        </div>
      );
    }

    // List of repos and their projects.
    return (
      <div id="repos">
        <div className="header">
          <div className="sort" onClick={this.onSort}><Icon name="sort"/> Sorted by {repos.sortBy}</div>
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

const mapDispatch = dispatch => ({
  sortRepos: dispatch.repos.sortRepos,
  getRepos: dispatch.repos.getAll,
  navigate: dispatch.router.navigate
});

export default connect(null, mapDispatch)(Projects);
