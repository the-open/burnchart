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
    const { bank, account, chart } = this.props;

    let content;
    if (!bank.loading) {
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
        <Header account={account} bank={bank} />

        <div id="page">{content}</div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const { account, bank, router } = state;
  const repo = router.params;

  let chart;
  // Find the project.
  Object.entries(bank.repos).find(([key, obj]) => {
    if (obj.owner === repo.owner && obj.name === repo.name) {
      return Object.entries(bank.projects).find(([key, p]) =>
        p.repo.owner === repo.owner &&
          p.repo.name === repo.name &&
          p.number === repo.project
      );
    }
    return false;
  });

  return {
    account,
    bank,
    router,
    chart
  };
};

const mapDispatch = dispatch => ({
  getProject: dispatch.bank.getAll
});

export default connect(mapState, mapDispatch)(ProjectPage);