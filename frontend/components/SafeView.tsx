/**
 * Web-safe View component that filters out mobile-specific responder handlers
 * Used to prevent React Native web warnings about unsupported event handlers
 */
import React from 'react';
import { View as RNView, Platform, ViewProps } from 'react-native';

const RESPONDER_PROPS = new Set([
  'onStartShouldSetResponder',
  'onResponderTerminationRequest',
  'onResponderGrant',
  'onResponderMove',
  'onResponderRelease',
  'onResponderTerminate',
  'onStartShouldSetResponderCapture',
  'onResponderReject'
]);

/**
 * Filters out mobile-specific responder props before passing to React Native
 * On web, these props are not supported and cause warnings
 */
function filterResponderProps(props: any): ViewProps {
  if (Platform.OS !== 'web') {
    return props;
  }

  const filtered: any = { ...props };
  RESPONDER_PROPS.forEach(prop => {
    delete filtered[prop];
  });
  return filtered;
}

/**
 * Drop-in replacement for View that removes responder handlers on web
 */
export const SafeView = React.forwardRef<any, ViewProps>((props, ref) => {
  return <RNView {...filterResponderProps(props)} ref={ref} />;
});

SafeView.displayName = 'SafeView';

export default SafeView;
