import lscache from 'lscache';
import firebase from 'firebase/app';
import 'firebase/auth';

import config from '../config';

// Setup a new client.
const client = firebase.initializeApp(config.firebase);

const account = {
  state: { ready: false, user: {} },
  reducers: {
    save(state, user) {
      return Object.assign({}, state, { user, ready: true });
    }
  },
  effects: {
    async checkAuth() {
      const accessToken = lscache.get('accessToken');
      const user = await new Promise(resolve =>
        firebase.auth().onAuthStateChanged(resolve)
      );
      if (!user || !accessToken) return this.save({});

      const json = firebase.auth().toJSON();
      return this.save({
        accessToken,
        profile: json.currentUser.providerData[0]
      });
    },

    async signIn() {
      const provider = new firebase.auth.GithubAuthProvider();
      // See https://developer.github.com/v3/oauth/#scopes
      provider.addScope('repo');

      const res = await client.auth().signInWithPopup(provider);
      const { accessToken } = res.credential;
      lscache.set('accessToken', accessToken);
      return this.save({
        accessToken,
        profile: res.user.providerData[0]
      });
    },

    signOut() {
      firebase.auth().signOut();
      lscache.remove('accessToken');
      this.save({});
    }
  }
};

export default account;
