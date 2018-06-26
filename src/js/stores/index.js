// The app store needs to go last because it loads user.
import reposStore from './reposStore.js';
import appStore from './appStore.js';

export default {
  'app': appStore,
  'repos': reposStore
};
