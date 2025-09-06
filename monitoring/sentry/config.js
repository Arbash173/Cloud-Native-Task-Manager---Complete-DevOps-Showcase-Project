// Sentry Configuration for Task Manager Frontend
// This file provides Sentry integration for error tracking and performance monitoring

import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

// Initialize Sentry
export const initSentry = () => {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new BrowserTracing({
        // Set sampling rate for performance monitoring
        tracingOrigins: [
          "localhost",
          "127.0.0.1",
          /^https:\/\/.*\.railway\.app/,
          /^https:\/\/.*\.vercel\.app/,
        ],
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error Sampling
    sampleRate: 1.0,
    
    // Release tracking
    release: process.env.REACT_APP_VERSION || '1.0.0',
    
    // User context
    beforeSend(event) {
      // Filter out non-critical errors in production
      if (process.env.NODE_ENV === 'production') {
        // Filter out network errors that are not critical
        if (event.exception) {
          const error = event.exception.values[0];
          if (error.type === 'NetworkError' && error.value.includes('Failed to fetch')) {
            return null; // Don't send network errors
          }
        }
      }
      return event;
    },
    
    // Additional context
    initialScope: {
      tags: {
        component: 'frontend',
        service: 'task-manager-frontend',
      },
    },
  });

  console.log('Sentry initialized successfully');
};

// Helper functions for manual error reporting
export const captureError = (error, context = {}) => {
  Sentry.captureException(error, {
    tags: {
      ...context,
    },
  });
};

export const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.captureMessage(message, level, {
    tags: {
      ...context,
    },
  });
};

// Performance monitoring helpers
export const startTransaction = (name, op = 'navigation') => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

export const addBreadcrumb = (message, category = 'custom', level = 'info') => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
};

// User context helpers
export const setUserContext = (user) => {
  Sentry.setUser({
    id: user.id?.toString(),
    username: user.username,
    email: user.email,
  });
};

export const clearUserContext = () => {
  Sentry.setUser(null);
};

// Service context helpers
export const setServiceContext = (service, version) => {
  Sentry.setContext('service', {
    name: service,
    version: version,
  });
};

// Error boundary component
export const SentryErrorBoundary = Sentry.withErrorBoundary;

// Performance monitoring for API calls
export const monitorApiCall = async (apiCall, operation) => {
  const transaction = startTransaction(`API ${operation}`, 'http.client');
  
  try {
    const result = await apiCall();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureError(error, { operation });
    throw error;
  } finally {
    transaction.finish();
  }
};

// Default export
export default Sentry;
