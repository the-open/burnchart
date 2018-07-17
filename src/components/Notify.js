import React, { Component } from 'react';
import { connect } from "react-redux";

import Icon from './Icon';

class Notify extends Component {

  constructor() {
    super();

    this.state = {
      // No text.
      text: null,
      // Grey style.
      type: '',
      // Top notification.
      system: false,
      // Just announcing.
      icon: 'megaphone'
    };

    this.onClose = this.onClose.bind(this);
  }

  // Close notification.
  onClose() {
    //this.props.closeNotification();
  }

  render() {
    const { text, system, type, icon } = this.state;

    // No text = no message.
    if (!text) return false;

    if (system) {
      return (
        <div id="notify" className={`system ${type}`}>
          <Icon name={icon} />
          <p>{text}</p>
        </div>
      );
    } else {
      return (
        <div id="notify" className={type}>
          <span className="close" onClick={this.onClose} />
          <Icon name={icon} />
          <p>{text}</p>
        </div>
      );
    }
  }
}

class NotifyWrapper extends Component {

  // TODO: animate in
  render() {
    if (!this.props.id) return false;

    // Top bar or center positioned?
    const name = this.props.system ? 'animCenter' : 'animTop';

    return (
      <div transitionName={name}
        transitionEnterTimeout={2000}
        transitionLeaveTimeout={1000}
        component="div"
      >
        <Notify {...this.props} key={this.props.id} />
      </div>
    );
  }
}

// const mapDispatch = dispatch => ({
//   closeNotification: dispatch.repos.closeNotification
// });

export default connect(null, null)(NotifyWrapper);