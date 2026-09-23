const React = require('react');
const {View} = require('react-native');

function icon(name) {
  return function LucideMock(props) {
    return React.createElement(View, {...props, accessibilityLabel: props.accessibilityLabel || name, testID: props.testID || `icon-${name}`});
  };
}

module.exports = {
  Clapperboard: icon('Clapperboard'),
  Headphones: icon('Headphones'),
  Languages: icon('Languages'),
  Moon: icon('Moon'),
  Newspaper: icon('Newspaper'),
  RadioTower: icon('RadioTower'),
  Search: icon('Search'),
  Share2: icon('Share2'),
  Sun: icon('Sun'),
  User: icon('User'),
  Pause: icon('Pause'),
  Play: icon('Play'),
  RotateCcw: icon('RotateCcw'),
  RotateCw: icon('RotateCw'),
  SkipBack: icon('SkipBack'),
  SkipForward: icon('SkipForward'),
  Volume2: icon('Volume2'),
  VolumeX: icon('VolumeX'),
  X: icon('X'),
};
