import React, { Component } from 'react';
import { connect } from "react-redux";

import Notify from './Notify';
import Icon from './Icon';

class Header extends Component {
  constructor() {
    super();

    this.onSignIn = this.onSignIn.bind(this);
    this.onSignOut = this.onSignOut.bind(this);
    this.onDemo = this.onDemo.bind(this);
  }

  // Sign user in.
  onSignIn() {
    this.props.signIn();
  }

  // Sign user out.
  onSignOut() {
    this.props.signOut();
  }

  // Add example repos.
  onDemo() {
    this.props.demo();
  }

  render() {
    const { repos, account, navigate } = this.props;

    // Sign-in/out.
    let user;
    if (account.user && account.user.github) {
      user = (
        <div className="right">
          <a onClick={this.onSignOut}>
            <Icon name="signout" /> Sign Out {account.user.github.displayName}
          </a>
        </div>
      );
    } else {
      user = (
        <div className="right">
          <a className="button" onClick={this.onSignIn}>
            <Icon name="github"/> Sign In
          </a>
        </div>
      );
    }

    // Switch loading icon with app icon.
    const icon = [ 'fire', 'spinner' ][ +repos.loading ];

    return (
      <div>
        <Notify {...repos.notification} />
        <div id="head">
          {user}

          <div onClick={() => navigate('/')} id="icon">
            <Icon name={icon} />
          </div>

          <ul>
            <li>
              <div onClick={() => navigate('/new/repo')}>
                <Icon name="plus" /> Add a Repo
              </div>
            </li>
            <li>
              <div onClick={() => navigate('/demo')}>
                <Icon name="computer" /> See Examples
              </div>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

const mapDispatch = dispatch => ({
  signIn: dispatch.account.signIn,
  signOut: dispatch.account.signOut,
  demo: dispatch.repos.demo,
  navigate: dispatch.router.navigate
});

export default connect(null, mapDispatch)(Header);
