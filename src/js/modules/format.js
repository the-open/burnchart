import _ from 'lodash';
import moment from 'moment';
import marked from 'marked';

export default {

  // Time from now.
  // TODO: Memoize.
  fromNow(jsonDate) {
    return moment(jsonDate, moment.ISO_8601).fromNow();
  },

  // When is a project due?
  due(jsonDate) {
    if (!jsonDate) {
      return '\u00a0'; // for React
    } else {
      return `due ${this.fromNow(jsonDate)}`;
    }
  },

  // Markdown formatting.
  // TODO: works?
  markdown(...args) {
    marked.apply(null, args);
  },

  // Format project title.
  title(text) {
    if (text.toLowerCase().indexOf('project') > -1) {
      return text;
    } else {
      return `Project ${text}`;
    }
  },

  // Hex to decimal.
  hexToDec(hex) {
    return parseInt(hex, 16);
  }

};
