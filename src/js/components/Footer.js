import React from 'react';

import Space from './Space';

const Footer = props => (
  <div id="footer">
    <div className="wrap">
      &copy; 2012-2018 <a href="https:/radekstepan.com" target="_blank">Radek Stepan</a>
      <Space />
      &amp; <a href="https://github.com/radekstepan/burnchart/graphs/contributors" target="_blank">Contributors</a>
    </div>
  </div>
);

export default Footer;