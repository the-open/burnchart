import React, { Component } from 'react';
import { connect } from "react-redux";

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Projects from '../components/Projects';
import Chart from '../components/Chart';

class ProjectsPage extends Component {
  
  componentDidMount() {
    this.props.getProjects(this.props.router.params);
  }

  render() {
    const { bank, account, router, chart } = this.props;
    const repo = router.params;

    let content;
    if (!bank.loading) {
      if (chart) {
        content = (
          <div>
            {/*<Chart data={chart} style={{ marginBottom: '40px' }} />*/}
            <Projects bank={bank} repo={repo} />
          </div>
        );
      } else {
        content = <Projects bank={bank} repo={repo} />
      }
    }

    return (
      <div>
        <Notify />
        <Header account={account} bank={bank} />

        <div id="page">
          <div id="title">
            <div className="wrap">
              <h2 className="title">{repo.owner}/{repo.name}</h2>
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
  const { account, bank, router } = state;
  const repo = router.params;

  let chart;
  // Create the all projects payload.
  Object.entries(bank.repos).find(([key, obj]) => {
    if (obj.owner === repo.owner && obj.name === repo.name) {
      if (obj.projects) {
        let createdAt = 'Z', closedAt = '0';
        const issues = {
          closed: { list: [], size: 0 },
          open:   { list: [], size: 0 }
        };
        // Merge all the project issues together.
        Object.entries(bank.projects).filter(([key, p]) =>
          p.repo.owner === repo.owner &&
            p.repo.name === repo.name &&
            !p.stats.isEmpty
        ).forEach(([key, p]) => {
          if (p.createdAt < createdAt) createdAt = p.createdAt;
          if (p.closedAt > closedAt) closedAt = p.closedAt;
          [ 'closed', 'open' ].forEach(k => {
            issues[k].list = issues[k].list.concat(p.issues[k].list);
            issues[k].size += p.issues[k].size;
          });
          return p;
        });

        issues.closed.list = issues.closed.list.sort((a, b) =>
          a.closedAt.localeCompare(b.closedAt)
        );

        // A meta project.
        chart = { issues, createdAt, stats: { isEmpty: false } };

        if (closedAt !== '0') chart.closedAt = closedAt;
      }
      return true;
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
  getProjects: dispatch.bank.getAll
});

export default connect(mapState, mapDispatch)(ProjectsPage);
