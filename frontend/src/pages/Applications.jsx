import React from 'react';
import { useLocation } from 'react-router-dom';
import ApplicationHistory from '../components/ApplicationHistory';

/**
 * Applications Page
 * Page wrapper for the ApplicationHistory component
 * Requirements: 9.4, 9.5
 */
export default function Applications() {
  const location = useLocation();
  const message = location.state?.message;

  return (
    <div className="applications-page">
      {/* Success message from application submission */}
      {message && (
        <div className="success-notification animate-slide-in-up">
          <div className="success-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="success-content">
            <p className="success-message">{message}</p>
          </div>
        </div>
      )}
      
      <ApplicationHistory />
    </div>
  );
}