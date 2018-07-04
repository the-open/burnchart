import React, { Component } from 'react';
import { connect } from "react-redux";
import _ from 'lodash';
import cls from 'classnames';

import Icon from './Icon';

class EditRepos extends Component {

  constructor() {
    super();

    this.onDelete = this.onDelete.bind(this);
  }

  onDelete(repo) {
    this.props.deleteRepo(repo);
  }

  render() {
    const { repos, navigate } = this.props;

    let list = _(repos.list)
    .sortBy(({ owner, name }) => `${owner}/${name}`)
    .map(({owner, name}, i) => {
      return (
        <tr key={`${owner}-${name}`}>
          <td colSpan="2">
            <div
              onClick={() => navigate(`/${owner}/${name}`)}
              className="repo"
              >
              {owner}/{name}
            </div>
          </td>
          <td
            className="action"
            onClick={() => this.onDelete({ owner, name })}
          ><Icon name="delete" /> Delete</td>
        </tr>
      );
    }).value();

    // Wait for something to show.
    if (!list.length) return false;

    return (
      <div id="repos">
        <div className="header"><h2>Edit Repos</h2></div>
        <table>
          <tbody>{list}</tbody>
        </table>
        <div className="footer">
          <a onClick={this.props.onToggleMode}>View Repos</a>
        </div>
      </div>
    );
  }
}

const mapState = state => {
  const { repos } = state;

  return {
    repos
  };
};

const mapDispatch = dispatch => ({
  deleteRepo: dispatch.repos.deleteRepo,
  navigate: dispatch.router.navigate
});


export default connect(mapState, mapDispatch)(EditRepos);
