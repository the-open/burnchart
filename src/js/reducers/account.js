import firebase from 'firebase/app';
import 'firebase/auth';

import config from '../../config.js';

// Setup a new client.
const client = firebase.initializeApp(config.firebase);

const account = {
  state: { ready: false, user: {} },
  reducers: {
    save(state, user) {
      return Object.assign({}, state, { user, ready: true });
    },
    signOut(props, state) {
      this.save({});
    }
  },
  effects: {
    get(props, state) {
      // const user = await db.account.get();
      this.save({ username: 'radek' });
    },
    async signIn(props, state) {
      const provider = new firebase.auth.GithubAuthProvider();
      // See https://developer.github.com/v3/oauth/#scopes
      provider.addScope('repo');

      try {
        const res = await client.auth().signInWithPopup(provider)

        // actions.emit('user.ready', {
        //   'github': res.user.providerData[0],
        //   'credential': res.credential,
        // });
      } catch(err) {
        // actions.emit('system.notify', {
        //   'text': 'message' in err ? err.message : err.toString(),
        //   'type': 'alert',
        //   'system': true
        // });
      }
    }
  }
};

export default account;
