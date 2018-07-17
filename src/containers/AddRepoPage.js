import React, { Component } from 'react';
import { connect } from "react-redux";

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AddRepoForm from '../components/AddRepoForm';

class AddRepoPage extends Component {

  render() {
    const { account, bank } = this.props;

    return (
      <div>
        <Notify />
        <Header account={account} bank={bank} />

        <div id="page">
          <div id="content" className="wrap">
            <AddRepoForm
              user={account.user}
              suggestions={bank.suggestions}
            />
          </div>
        </div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const { account, bank } = state;

  return {
    account,
    bank
  };
};

export default connect(mapState, null)(AddRepoPage);
