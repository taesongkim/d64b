import './src/polyfills';
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('d64b', () => App);
AppRegistry.runApplication('d64b', {
  rootTag: document.getElementById('root'),
});