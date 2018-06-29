import React from 'react';
import _ from 'lodash';

import Page from '../../lib/PageClass.js';

import Notify from '../Notify.jsx';
import Header from '../Header.jsx';
import Footer from '../Footer.jsx';
import Projects from '../Projects.jsx';
import Chart from '../Chart.jsx';

export default class ProjectsPage extends Page {

  displayName: 'ProjectsPage.jsx'

  constructor(props) {
    super(props);
  }

  render() {
    let content;
    if (!this.state.app.system.loading) {
      const { repos } = this.state;
      // Create the all projects payload.
      let data;
      _.find(repos.list, obj => {
        if (obj.owner == this.props.owner && obj.name == this.props.name) {
          if (obj.projects) {
            let created_at = 'Z',
                due_on = '0',
                issues = {
                  'closed': { 'list': [], 'size': 0 },
                  'open':   { 'list': [], 'size': 0 }
                };
            // Merge all the project issues together.
            _(obj.projects).filter(p => !p.stats.isEmpty).map(p => {
              if (p.created_at < created_at) created_at = p.created_at;
              if (p.due_on > due_on) due_on = p.due_on;
              _.each([ 'closed', 'open' ], (k) => {
                issues[k].list = issues[k].list.concat(p.issues[k].list);
                issues[k].size += p.issues[k].size;
              });
              return p;
            }).value();

            issues.closed.list = _.sortBy(issues.closed.list, 'closed_at');

            // A meta project.
            data = { issues, created_at, 'stats': { 'isEmpty': false } };

            if (due_on != '0') data.due_on = due_on;
          }
          return true;
        }
      });

      if (data) {
        content = (
          <div>
            <Chart data={data} style={{ 'marginBottom': '40px' }} />
            <Projects repos={repos} repo={this.props} />
          </div>
        );
      } else {
        content = <Projects repos={repos} repo={this.props} />
      }
    }

    return (
      <div>
        <Notify />
        <Header {...this.state} />

        <div id="page">
          <div id="title">
            <div className="wrap">
              <h2 className="title">{this.props.owner}/{this.props.name}</h2>
            </div>
          </div>
          <div id="content" className="wrap">{content}</div>
        </div>

        <Footer />
      </div>
    );
  }

}
