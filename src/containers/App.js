import { Component } from "react";
import { connect } from "react-redux";

import history from "../history";
import routes from "../routes";

class App extends Component {
  componentDidMount() {
    // Watch route changes (allows back-button etc.).
    history.listen(location => this.props.route(location.pathname));
    // Get currently signed-in user.
    this.props.checkAuth();
  }

  render() {
    return this.props.ready && this.props.render.call(null);
  }
}

const mapState = state => ({
  ready: state.account.ready,
  render: routes[state.router.route].action
});

const mapDispatch = dispatch => ({
  route: dispatch.router.route,
  checkAuth: dispatch.account.checkAuth
});

export default connect(mapState, mapDispatch)(App);
