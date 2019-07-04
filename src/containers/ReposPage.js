import React, {Component} from 'react';
import {connect} from "react-redux";

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Projects from '../components/Projects';
import EditRepos from '../components/EditRepos';
import Hero from '../components/Hero';

class ReposPage extends Component {

  // Start the page in a view mode.
  state = {edit: false };

  componentDidMount() {
    this.props.getRepos(null);
  }

  // Toggle between edit and view mode.
  onToggleMode = () => {
    this.setState({edit: !this.state.edit });
  }

  render() {
    const {root, account} = this.props;

    console.log(root, account);

    let content;
    if (!root.loading) {
      if (root.repos) {
        if (!this.state.edit) {
          content = (
            <Projects
            root={root}
              onToggleMode={this.onToggleMode}
            />
          );
        } else {
          content = (
            <EditRepos
              root={root}
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
        <Header account={account} root={root} />

        <div id="page">
          <div id="content" className="wrap">{content}</div>
        </div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const {account, root} = state;

  return {
    account,
    root
  };
};

const mapDispatch = dispatch => ({
  getRepos: dispatch.root.getAll
});

export default connect(mapState, mapDispatch)(ReposPage);
