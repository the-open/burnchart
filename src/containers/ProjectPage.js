import React, { Component } from 'react';
import { connect } from "react-redux";

import format from '../modules/format.js';

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Chart from '../components/Chart';

class ProjectPage extends Component {

  componentDidMount() {
    this.props.getProject(this.props.router.params);
  }

  render() {
    const { repos, account, chart } = this.props;

    let content;
    if (!repos.loading) {
      if (chart) {
        let description;
        if (chart.description) {
          description = format.markdown(chart.description);
        }
  
        content = (
          <div>
            <div id="title">
              <div className="wrap">
                <h2 className="title">{format.title(chart.name)}</h2>
                <div className="description">{description}</div>
              </div>
            </div>
            <div id="content" className="wrap">
              {/*<Chart data={chart} />*/}
            </div>
          </div>
        );
      }
    }

    return (
      <div>
        <Notify />
        <Header account={account} repos={repos} />

        <div id="page">{content}</div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const { account, repos, router } = state;
  const repo = router.params;

  let chart;
  // Find the project.
  repos.list.find(obj => {
    if (obj.owner === repo.owner && obj.name === repo.name) {
      return obj.projects.find(p => {
        if (p.number === router.params.project) {
          chart = p;
          return true;
        }
        return false;
      });
    }
    return false;
  });

  return {
    account,
    repos,
    router,
    chart
  };
};

const mapDispatch = dispatch => ({
  getProject: dispatch.repos.getAll
});

export default connect(mapState, mapDispatch)(ProjectPage);