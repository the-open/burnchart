import React from 'react';

import format from '../modules/format.js';

// Fontello icon hex codes.
const codes = {
  delete:    '800', // Font Awesome - trash-empty
  settings:  '801', // Font Awesome - cog
  pencil:    '802', // Font Awesome - pencil
  menu:      '803', // Font Awesome - menu
  wrench:    '804', // Font Awesome - wrench
  protip:    '805', // Font Awesome - graduation-cap
  plus:      '806', // Font Awesome - plus-circled
  rocket:    '807', // Font Awesome - rocket
  computer:  '808', // Font Awesome - desktop
  signout:   '809', // Font Awesome - logout
  github:    '80a', // Font Awesome - github
  warning:   '80b', // Entypo - attention
  direction: '80c', // Entypo - address
  megaphone: '80d', // Entypo - megaphone
  sort:      '80e', // Typicons - sort-alphabet
  spinner:   '80f', // MFG Labs - spinner1
  fire:      '810'  // Maki - fire-station
};

const Icon = props => {
  if (props.name && props.name in codes) {
    const code = format.hexToDec(codes[props.name]);
    return (
      <span
        className={`icon ${props.name}`}
        dangerouslySetInnerHTML={{ '__html': `&#${code};` }}
      />
    );
  }

  return false;
};

export default Icon;