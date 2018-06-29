import React from 'react';

import actions from '../../actions/appActions.js';

import Page from '../../lib/PageClass.js';

import Notify from '../Notify.jsx';
import Header from '../Header.jsx';
import Footer from '../Footer.jsx';
import AddRepoForm from '../AddRepoForm.jsx';

export default class AddRepoPage extends Page {

  displayName: 'AddRepoPage.jsx'

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <Notify />
        <Header {...this.state} />

        <div id="page">
          <div id="content" className="wrap">
            <AddRepoForm
              user={this.state.app.user}
              suggestions={this.state.repos.suggestions}
            />
          </div>
        </div>

        <Footer />
      </div>
    );
  }

}
