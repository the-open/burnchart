import React from 'react';
import ReactDOM from 'react-dom';
import { init } from "@rematch/core";
import { Provider } from "react-redux";
import qs from 'qs';

import history from "./history";
import reducers from "./reducers";

import App from './containers/App';

// Get the config.
import config from './config';

import "./styles/main.css";

// Parse the query string params overriding the config.
// e.g. &chart[off_days][0]=0&chart[off_days][1]=6
window.location.search && Object.assign(config, qs.parse(window.location.search.substring(1)));

const el = document.getElementById('app');
// Set the theme.
el.className = `theme--${config.theme}`;

// Init reducers.
const store = init({
  models: reducers
});

// Initial route.
store.dispatch.router.route(history.location.pathname);
// Render the app.
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  el
);
