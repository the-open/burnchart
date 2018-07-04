import toRegex from "path-to-regexp";

import routes from "../routes";

const ROOT_TITLE = 'Burnchart';

const matchURI = (path, uri) => {
  const keys = [];
  const pattern = toRegex(path, keys);
  const match = pattern.exec(uri);
  if (!match) return null;

  const params = Object.create(null);
  for (let i = 1; i < match.length; i++) {
    params[keys[i - 1].name] = match[i] !== undefined ? match[i] : undefined;
  }
  return params;
};

const resolve = pathname => {
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const params = matchURI(route.path, pathname);
    if (!params) continue;
    return [i, params, route.title];
  }
  // TODO handle 404.
  const error = new Error("Not found");
  error.status = 404;
  throw error;
};

const router = {
  state: { route: '' },
  reducers: {
    route(state, pathname) {
      // TODO: clear any existing notifications
      const [route, params, title] = resolve(pathname);
      document.title = title ? [ROOT_TITLE, title].join(' - ') : ROOT_TITLE;
      return Object.assign({}, state, { route, params });
    }
  },
  effects: {
    navigate(pathname, state) {
      history.push(pathname);
    }
  }
};

export default router;
