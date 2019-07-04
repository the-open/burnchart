import React, {Component} from 'react';
import {connect} from "react-redux";

import Icon from './Icon';

class Hero extends Component {

  render() {
    const {navigate} = this.props;

    return (
      <div id="hero" style={{backgroundImage: `url('${process.env.PUBLIC_URL}/img/highway.jpg')` }}>
        <div className="content">
          <Icon name="direction" />
          <h2>See your repo progress</h2>
          <p>Serious about a repo deadline? Add your GitHub repo
          and we'll tell you if it is running on time or not.</p>
          <div className="cta">
            <div onClick={() => navigate('/new/repo')} className="link primary">
              <Icon name="plus" /> Add a Repo
            </div>
            <div onClick={this.props.demo} className="link secondary">
              <Icon name="computer" /> See Examples
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapDispatch = dispatch => ({
  demo: dispatch.root.demo
});

export default connect(null, mapDispatch)(Hero);