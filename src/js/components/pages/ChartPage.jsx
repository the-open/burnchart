import React from 'react';
import _ from 'lodash';

import Page from '../../lib/PageClass.js';

import format from '../../modules/format.js';

import Notify from '../Notify.jsx';
import Header from '../Header.jsx';
import Footer from '../Footer.jsx';
import Chart from '../Chart.jsx';

export default class ChartPage extends Page {

  displayName: 'ChartPage.jsx'

  constructor(props) {
    super(props);
  }

  render() {
    let content;
    if (!this.state.app.system.loading) {
      const { repos } = this.state;
      // Find the project.
      let project;
      _.find(repos.list, obj => {
        if (obj.owner == this.props.owner && obj.name == this.props.name) {
          return _.find(obj.projects, p => {
            if (p.number == this.props.project) {
              project = p;
              return true;
            }
            return false;
          });
        }
        return false;
      });

      if (project) {
        let description;
        if (project.description) {
          description = format.markdown(project.description);
        }

        content = (
          <div>
            <div id="title">
              <div className="wrap">
                <h2 className="title">{format.title(project.title)}</h2>
                <span className="sub">{format.due(project.due_on)}</span>
                <div className="description">{description}</div>
              </div>
            </div>
            <div id="content" className="wrap">
              <Chart data={project} />
            </div>
          </div>
        );
      }
    }

    return (
      <div>
        <Notify />
        <Header {...this.state} />

        <div id="page">{content}</div>

        <Footer />
      </div>
    );
  }

}
