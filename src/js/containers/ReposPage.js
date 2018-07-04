import React, { Component } from 'react';
import { connect } from "react-redux";

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Projects from '../components/Projects';
import EditRepos from '../components/EditRepos';
import Hero from '../components/Hero';

class ReposPage extends Component {

  constructor() {
    super();

    // Start the page in a view mode.
    this.state = { edit: false };

    this.onToggleMode = this.onToggleMode.bind(this);
  }

  // Toggle between edit and view mode.
  onToggleMode() {
    this.setState({ edit: !this.state.edit });
  }

  render() {
    const { repos, account } = this.props;

    let content;
    if (!repos.loading) {
      if (repos.list.length) {
        if (!this.state.edit) {
          content = (
            <Projects
              repos={repos}
              onToggleMode={this.onToggleMode}
            />
          );
        } else {
          content = (
            <EditRepos
              repos={repos}
              onToggleMode={this.onToggleMode}
            />
          );
        }
      } else {
        content = <Hero />;
      }
    }

    return (
      <div>
        <Notify />
        <Header account={account} repos={repos} />

        <div id="page">
          <div id="content" className="wrap">{content}</div>
        </div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const { account, repos } = state;

  return {
    account,
    repos
  };
};

export default connect(mapState, null)(ReposPage);
