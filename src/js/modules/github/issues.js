import _ from 'lodash';
import async from 'async';

import config from '../../../config.js';
import request from './request.js';

// Convert project boards issues into our internal format.
export default {
  fromBoards: boards => {
    const issues = {
      open: [],
      closed: []
    };

    boards.forEach(board => {
      board.cards.nodes.forEach(node => {
        if (!node.content || !node.content.state) return;
        issues[node.content.state.toLowerCase()].push(node.content);
      });
    });

    // Sort by closed time and add the size.
    return {
      open: calcSize(_.sortBy(issues.open, 'closedAt')),
      closed: calcSize(_.sortBy(issues.closed, 'closedAt'))
    };
  }
};

// Calculate size of either open or closed issues.
//  Modifies issues by ref.
const calcSize = list => {
  let size;

  switch (config.chart.points) {
    case 'ONE_SIZE':
      size = list.length;
      // TODO: check we have an object?
      for (let issue of list) issue.size = 1;
      break;

    case 'LABELS':
      size = 0;
      list = _.filter(list, (issue) => {
        let labels;
        // Skip if no labels exist.
        if (!(labels = issue.labels)) {
          return false;
        }

        // Determine the total issue size from all labels.
        issue.size = _.reduce(labels, (sum, label) => {
          let matches;
          if (!(matches = label.name.match(config.chart.size_label))) {
            return sum;
          }
          // Increase sum.
          return sum += parseInt(matches[1], 10);
        }, 0);

        // Increase the total.
        size += issue.size;

        // Issues without size (no matching labels) are not saved.
        return !!issue.size;
      });
      break;

    default:
      throw 500;
  }

  // Sync return.
  return { list, size };
};
