const React = require('react');
module.exports = React.forwardRef((props, ref) => React.createElement('Video', {...props, ref}));
