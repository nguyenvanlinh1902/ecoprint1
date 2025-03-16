import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook để lắng nghe các thay đổi trong thời gian thực từ một collection
 * @param {string} collectionName - Tên collection trong Firestore
 * @param {Array} [queryConstraints] - Mảng các ràng buộc query (where, orderBy, limit)
 * @returns {Object} - Các documents, loading state, và error
 */
export const useCollection = (collectionName, queryConstraints = []) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    setLoading(true);
    
    // Tạo query từ collection và các ràng buộc
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...queryConstraints);
    
    // Thiết lập real-time listener
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDocuments(results);
        setLoading(false);
      }, 
      (err) => {
        /* error removed */
        setError(err.message);
        setLoading(false);
      }
    );
    
    // Clean up function
    return () => unsubscribe();
  }, [collectionName, JSON.stringify(queryConstraints)]);
  
  return { documents, loading, error };
};

/**
 * Helper function to create query constraints
 * @param {string} field - Field to filter
 * @param {string} operator - Operator (==, !=, >, <, >=, <=)
 * @param {any} value - Value to compare
 * @returns {Object} - where constraint
 */
export const createWhereConstraint = (field, operator, value) => {
  return where(field, operator, value);
};

/**
 * Helper function to create order constraints
 * @param {string} field - Field to order by
 * @param {string} direction - Direction ('asc' or 'desc')
 * @returns {Object} - orderBy constraint
 */
export const createOrderConstraint = (field, direction = 'asc') => {
  return orderBy(field, direction);
};

/**
 * Helper function to create limit constraint
 * @param {number} value - Number of documents to limit
 * @returns {Object} - limit constraint
 */
export const createLimitConstraint = (value) => {
  return limit(value);
}; 