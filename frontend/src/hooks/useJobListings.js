import { useJobListings } from '../context/JobListingsContext';

/**
 * Custom hook for accessing job listings functionality
 * Provides a convenient interface to the JobListingsContext
 */
export const useJobListingsHook = () => {
  const context = useJobListings();
  
  if (!context) {
    throw new Error('useJobListingsHook must be used within a JobListingsProvider');
  }
  
  return context;
};

export default useJobListingsHook;