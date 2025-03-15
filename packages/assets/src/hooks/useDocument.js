import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook để lắng nghe các thay đổi trong thời gian thực từ một document
 * @param {string} collectionName - Tên collection trong Firestore
 * @param {string} documentId - ID của document
 * @returns {Object} - Document, loading state, và error
 */
export const useDocument = (collectionName, documentId) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!documentId) {
      setDocument(null);
      setLoading(false);
      return () => {};
    }
    
    setLoading(true);
    
    // Tạo document reference
    const docRef = doc(db, collectionName, documentId);
    
    // Thiết lập real-time listener
    const unsubscribe = onSnapshot(docRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          setDocument({ id: snapshot.id, ...snapshot.data() });
        } else {
          setDocument(null);
          setError('Document không tồn tại');
        }
        setLoading(false);
      }, 
      (err) => {
        console.error(`Firestore document error (${collectionName}/${documentId}):`, err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    // Clean up function
    return () => unsubscribe();
  }, [collectionName, documentId]);
  
  return { document, loading, error };
}; 