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

  componentDidMount() {
    this.props.getRepos(null);
  }

  // Toggle between edit and view mode.
  onToggleMode() {
    this.setState({ edit: !this.state.edit });
  }

  render() {
    const { bank, account } = this.props;

    let content;
    if (!bank.loading) {
      if (bank.repos) {
        if (!this.state.edit) {
          content = (
            <Projects
            bank={bank}
              onToggleMode={this.onToggleMode}
            />
          );
        } else {
          content = (
            <EditRepos
              bank={bank}
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
        <Header account={account} bank={bank} />

        <div id="page">
          <div id="content" className="wrap">{content}</div>
        </div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const { account, bank } = state;

  return {
    account,
    bank
  };
};

const mapDispatch = dispatch => ({
  getRepos: dispatch.bank.getAll
});

export default connect(mapState, mapDispatch)(ReposPage);
