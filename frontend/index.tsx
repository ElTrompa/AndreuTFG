/**
 * Entry point for Expo web - ensures responder fix loads first
 */
import './responderFix';

// @ts-ignore
import { registerRootComponent } from 'expo';
import App from './App';

// Register the main app component
registerRootComponent(App);
