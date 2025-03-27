import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Hook tùy chỉnh để tương tác với Firestore
 * @param {string} collectionName - Tên collection trong Firestore
 * @returns {Object} - Các hàm để thực hiện CRUD operations
 */
export const useFirestore = (collectionName) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const collectionRef = collection(db, collectionName);
  
  /**
   * Thêm một document mới vào collection
   * @param {Object} data - Dữ liệu cần thêm
   * @param {string} [customId] - ID tùy chỉnh (tùy chọn)
   * @returns {Promise<Object>} - Document đã thêm
   */
  const addDocument = async (data, customId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Thêm các field tự động
      const dataWithTimestamp = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      let docRef;
      
      if (customId) {
        // Sử dụng ID tùy chỉnh
        docRef = doc(db, collectionName, customId);
        await setDoc(docRef, dataWithTimestamp);
      } else {
        // Để Firestore tạo ID tự động
        docRef = await addDoc(collectionRef, dataWithTimestamp);
      }
      
      // Lấy dữ liệu đã thêm
      const docSnap = await getDoc(docRef);
      
      setLoading(false);
      return { id: docRef.id, ...docSnap.data() };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Cập nhật một document
   * @param {string} id - ID của document cần cập nhật
   * @param {Object} data - Dữ liệu cần cập nhật
   * @returns {Promise<void>}
   */
  const updateDocument = async (id, data) => {
    setLoading(true);
    setError(null);
    
    try {
      const docRef = doc(db, collectionName, id);
      
      // Thêm updatedAt timestamp
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Xóa một document
   * @param {string} id - ID của document cần xóa
   * @returns {Promise<void>}
   */
  const deleteDocument = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Lấy một document theo ID
   * @param {string} id - ID của document cần lấy
   * @returns {Promise<Object|null>} - Document hoặc null nếu không tìm thấy
   */
  const getDocument = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      setLoading(false);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Lấy tất cả document trong collection
   * @returns {Promise<Array>} - Mảng các document
   */
  const getDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const querySnapshot = await getDocs(collectionRef);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLoading(false);
      return documents;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Tạo query để lấy dữ liệu theo điều kiện
   * @param {Array} conditions - Mảng các điều kiện, mỗi điều kiện là một mảng [field, operator, value]
   * @param {Array} [sortBy] - Mảng các field cần sắp xếp, mỗi field là một mảng [field, direction]
   * @param {number} [documentLimit] - Giới hạn số lượng document trả về
   * @returns {Promise<Array>} - Mảng các document
   */
  const queryDocuments = async (conditions = [], sortBy = [], documentLimit = null) => {
    setLoading(true);
    setError(null);
    
    try {
      let q = collectionRef;
      
      // Thêm các điều kiện where
      conditions.forEach(condition => {
        const [field, operator, value] = condition;
        q = query(q, where(field, operator, value));
      });
      
      // Thêm các điều kiện sắp xếp
      sortBy.forEach(sort => {
        const [field, direction] = sort;
        q = query(q, orderBy(field, direction));
      });
      
      // Thêm giới hạn số lượng document
      if (documentLimit) {
        q = query(q, limit(documentLimit));
      }
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLoading(false);
      return documents;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };
  
  return {
    loading,
    error,
    addDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    getDocuments,
    queryDocuments
  };
}; 