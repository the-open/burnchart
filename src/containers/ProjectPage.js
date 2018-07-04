import React, { Component } from 'react';
import { connect } from "react-redux";
import _ from 'lodash';

import format from '../modules/format.js';

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Chart from '../components/Chart';

class ProjectPage extends Component {

  render() {
    const { repos, account, chart } = this.props;

    let content;
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
            <Chart data={chart} />
          </div>
        </div>
      );
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

  let chart;
  if (!repos.loading) {
    // Find the project.
    _.find(repos.list, obj => {
      if (obj.owner === router.params.owner && obj.name === router.params.name) {
        return _.find(obj.projects, p => {
          if (p.number === router.params.project) {
            chart = p;
            return true;
          }
          return false;
        });
      }
      return false;
    });
  }

  return {
    account,
    repos,
    router,
    chart
  };
};

export default connect(mapState, null)(ProjectPage);