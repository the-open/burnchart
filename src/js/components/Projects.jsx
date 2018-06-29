import React from 'react';
import _ from 'lodash';
import cls from 'classnames';

import format from '../modules/format.js';

import actions from '../actions/appActions.js';

import Icon from './Icon.jsx';
import Link from './Link.jsx';

export default class Projects extends React.Component {

  displayName: 'Projects.jsx'

  constructor(props) {
    super(props);
  }

  // Cycle through projects sort order.
  _onSort() {
    actions.emit('repos.sort');
  }

  _onRefresh() {
    actions.emit('repos.load');
  }

  render() {
    let { repos, repo } = this.props;

    // Show the repos with errors first.
    let errors = _(repos.list).filter('errors').map((repo, i) => {
      let text = repo.errors.join('\n');
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
    let list = [];
    _.each(repos.index, ([ pI, mI ]) => {
      let { owner, name, projects } = repos.list[pI];
      let project = projects[mI];

      // Filter down?
      if (!(!repo || (repo.owner == owner && repo.name == name))) return;

      list.push(
        <tr className={cls({ 'done': milestone.stats.isDone })} key={`${pI}-${mI}`}>
          <td>
            <Link
              route={{ 'to': 'projects', 'params': { owner, name } }}
              className="repo"
            >
              {owner}/{name}
            </Link>
          </td>
          <td>
            <Link
              route={{ 'to': 'project', 'params': { owner, name, 'project': project.number } }}
              className="project"
            >
              {project.title}
            </Link>
          </td>
          <td style={{ 'width': '1%' }}>
            <div className="progress">
              <span className="percent">{Math.floor(project.stats.progress.points)}%</span>
              <span className={cls('due', { 'red': project.stats.isOverdue })}>
                {format.due(project.due_on)}
              </span>
              <div className="outer bar">
                <div
                  className={cls('inner', 'bar', { 'green': project.stats.isOnTime, 'red': !project.stats.isOnTime })}
                  style={{ 'width': `${project.stats.progress.points}%` }}
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
            <a className="sort" onClick={this._onSort}><Icon name="sort"/> Sorted by {repos.sortBy}</a>
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
            <a className="sort" onClick={this._onSort}><Icon name="sort"/> Sorted by {repos.sortBy}</a>
            <h2>Repos</h2>
          </div>
          <table>
            <tbody>
              {errors}
              {list}
            </tbody>
          </table>
          <div className="footer">
            <a onClick={this.props.onToggleMode}>Edit Repos</a>
            <a onClick={this._onRefresh}>Refresh Repos</a>
          </div>
        </div>
      );
    }
  }

}
