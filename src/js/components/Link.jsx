import React from 'react';

import App from '../App.jsx';

export default class Link extends React.Component {

  displayName: 'Link.jsx'

  constructor(props) {
    super(props);
  }

  // Navigate to a route.
  _navigate(link, evt) {
    App.navigate(link);
    evt.preventDefault();
  }

  render() {
    const { route } = this.props;
    const link = App.link(route);

    return (
      <a
        {...this.props}
        href={`#!${link}`}
        onClick={this._navigate.bind(this, link)}
      >
        {this.props.children}
      </a>
    );
  }

}
