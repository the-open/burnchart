import React from 'react';

import actions from '../actions/appActions.js';

import Icon from './Icon.jsx';
import Link from './Link.jsx';

export default class Hero extends React.Component {

  displayName: 'Hero.jsx'

  constructor(props) {
    super(props);
  }

  // Add example repos.
  _onDemo() {
    actions.emit('repos.demo');
  }

  render() {
    return (
      <div id="hero">
        <div className="content">
          <Icon name="direction" />
          <h2>See your repo progress</h2>
          <p>Serious about a repo deadline? Add your GitHub repo
          and we'll tell you if it is running on time or not.</p>
          <div className="cta">
            <Link route={{ to: 'addRepo' }} className="primary">
              <Icon name="plus" /> Add a Repo
            </Link>
            <Link route={{ to: 'demo' }} className="secondary">
              <Icon name="computer" /> See Examples
            </Link>
          </div>
        </div>
      </div>
    );
  }

}
