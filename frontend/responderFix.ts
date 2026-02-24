/**
 * Fix for React Native responder system warnings on web
 * Suppresses console warnings about unsupported event handlers
 */

if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = function(...args: any[]) {
    const message = String(args[0] || '');
    
    // Suppress responder and TouchableMixin warnings only
    if (message.includes('Unknown event handler property') || 
        message.includes('TouchableMixin is deprecated')) {
      return;
    }
    
    originalWarn.apply(console, args);
  };

  console.error = function(...args: any[]) {
    const message = String(args[0] || '');
    if (message.includes('Unknown event handler property')) {
      return;
    }
    originalError.apply(console, args);
  };
}

export {};

