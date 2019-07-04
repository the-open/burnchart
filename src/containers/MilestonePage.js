import React, {Component} from 'react';
import {connect} from "react-redux";

import format from '../modules/format.js';

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
// import Chart from '../components/Chart';

class ProjectPage extends Component {

  componentDidMount() {
    this.props.getProject(this.props.router.params);
  }

  render() {
    const {root, account, chart} = this.props;

    return (
      <div>
        <Notify />
        <Header account={account} root={root} />

        <div id="page">{!root.loading && chart && (
          <div>
            <div id="title">
              <div className="wrap">
                <h2 className="title">{format.title(chart.name)}</h2>
                <div className="description">{chart.description &&
                    format.markdown(chart.description)}</div>
              </div>
            </div>
            <div id="content" className="wrap">
              {/*<Chart data={chart} />*/}
            </div>
          </div>
        )}</div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const {account, root, router} = state;
  const repo = router.params;

  let chart;
  // Find the project.
  Object.entries(root.repos).find(([key, obj]) => {
    if (obj.owner === repo.owner && obj.name === repo.name) {
      return Object.entries(root.projects).find(([key, p]) =>
        p.repo.owner === repo.owner &&
          p.repo.name === repo.name &&
          p.number === repo.project
      );
    }
  });

  return {
    account,
    root,
    router,
    chart
  };
};

const mapDispatch = dispatch => ({
  getProject: dispatch.root.getAll
});

export default connect(mapState, mapDispatch)(ProjectPage);