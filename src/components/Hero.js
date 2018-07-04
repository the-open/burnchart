import React, { Component } from 'react';
import { connect } from "react-redux";

import Icon from './Icon';

class Hero extends Component {

  render() {
    const { navigate } = this.props;

    return (
      <div id="hero">
        <div className="content">
          <Icon name="direction" />
          <h2>See your repo progress</h2>
          <p>Serious about a repo deadline? Add your GitHub repo
          and we'll tell you if it is running on time or not.</p>
          <div className="cta">
            <div onClick={() => navigate('/new/repo')} className="primary">
              <Icon name="plus" /> Add a Repo
            </div>
            <div onClick={() => navigate('/demo')} className="secondary">
              <Icon name="computer" /> See Examples
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapDispatch = dispatch => ({
  navigate: dispatch.router.navigate
});

export default connect(null, mapDispatch)(Hero);