import React, {Component} from 'react';
import {connect} from "react-redux";

import Notify from '../components/Notify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AddRepoForm from '../components/AddRepoForm';

class AddRepoPage extends Component {

  render() {
    const {account, root} = this.props;

    return (
      <div>
        <Notify />
        <Header account={account} root={root} />

        <div id="page">
          <div id="content" className="wrap">
            <AddRepoForm
              user={account.user}
              suggestions={root.suggestions}
            />
          </div>
        </div>

        <Footer />
      </div>
    );
  }
}

const mapState = state => {
  const {account, root} = state;

  return {
    account,
    root
  };
};

export default connect(mapState)(AddRepoPage);
