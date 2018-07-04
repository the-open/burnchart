import React, { Component } from 'react';
import { connect } from "react-redux";
import _ from 'lodash';

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Projects from '../components/Projects';
import Chart from '../components/Chart';

class ProjectsPage extends Component {

  render() {
    const { repos, account, router, chart } = this.props;

    let content;
    if (chart) {
      content = (
        <div>
          <Chart data={chart} style={{ 'marginBottom': '40px' }} />
          <Projects repos={repos} repo={router.params} />
        </div>
      );
    } else {
      content = <Projects repos={repos} repo={router.params} />
    }

    return (
      <div>
        <Notify />
        <Header account={account} repos={repos} />

        <div id="page">
          <div id="title">
            <div className="wrap">
              <h2 className="title">{router.params.owner}/{router.params.name}</h2>
            </div>
          </div>
          <div id="content" className="wrap">{content}</div>
        </div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const { account, repos, router } = state;

  let chart;
  if (!repos.loading) {
    // Create the all projects payload.
    _.find(repos.list, obj => {
      if (obj.owner == router.params.owner && obj.name == router.params.name) {
        if (obj.projects) {
          let createdAt = 'Z',
            closedAt = '0';
          const issues = {
            'closed': { 'list': [], 'size': 0 },
            'open':   { 'list': [], 'size': 0 }
          };
          // Merge all the project issues together.
          _(obj.projects).filter(p => !p.stats.isEmpty).map(p => {
            if (p.createdAt < createdAt) createdAt = p.createdAt;
            if (p.closedAt > closedAt) closedAt = p.closedAt;
            [ 'closed', 'open' ].forEach(k => {
              issues[k].list = issues[k].list.concat(p.issues[k].list);
              issues[k].size += p.issues[k].size;
            });
            return p;
          }).value();

          issues.closed.list = _.sortBy(issues.closed.list, 'closedAt');

          // A meta project.
          chart = { issues, createdAt, 'stats': { 'isEmpty': false } };

          if (closedAt != '0') chart.closedAt = closedAt;
        }
        return true;
      }
    });
  }

  return {
    account,
    repos,
    router,
    chart
  };
};

export default connect(mapState, null)(ProjectsPage);
