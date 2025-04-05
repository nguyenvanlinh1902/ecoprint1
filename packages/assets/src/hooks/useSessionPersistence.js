import { useCallback } from 'react';
import { useAuth } from './useAuth';
import useHistory from './useHistory';

/**
 * Hook quản lý lưu trữ các thông tin phiên làm việc
 * @returns {Object} Các hàm quản lý phiên làm việc
 */
const useSessionPersistence = () => {
  const { currentUser, loading } = useAuth();
  const history = useHistory();

  /**
   * Lưu đường dẫn cuối cùng người dùng truy cập
   * @param {string} path - Đường dẫn cần lưu
   */
  const saveLastVisitedPath = useCallback((path) => {
    if (path && !path.startsWith('/auth/')) {
      sessionStorage.setItem('lastVisitedPath', path);
    }
  }, []);

  /**
   * Lấy đường dẫn cuối cùng người dùng truy cập
   * @returns {string} Đường dẫn đã lưu hoặc đường dẫn mặc định
   */
  const getLastVisitedPath = useCallback(() => {
    return sessionStorage.getItem('lastVisitedPath') || '/dashboard';
  }, []);

  /**
   * Chuyển hướng về đường dẫn đã lưu trước đó
   */
  const redirectToLastVisitedPath = useCallback(() => {
    const lastPath = getLastVisitedPath();
    history.replace(lastPath);
  }, [getLastVisitedPath, history]);

  /**
   * Lưu dữ liệu liên quan đến người dùng vào sessionStorage
   * @param {string} key - Khóa lưu trữ
   * @param {any} value - Giá trị cần lưu
   * @param {boolean} useUID - Có thêm UID của người dùng vào khóa hay không
   */
  const saveUserData = useCallback((key, value, useUID = true) => {
    if (!key) return;
    
    let storageKey = key;
    
    // Thêm UID vào khóa nếu có yêu cầu và người dùng đã đăng nhập
    if (useUID && currentUser?.uid) {
      storageKey = `${currentUser.uid}_${key}`;
    }
    
    if (typeof value === 'object') {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } else {
      sessionStorage.setItem(storageKey, value);
    }
  }, [currentUser]);

  /**
   * Lấy dữ liệu người dùng từ sessionStorage
   * @param {string} key - Khóa lưu trữ
   * @param {boolean} useUID - Có thêm UID của người dùng vào khóa hay không
   * @returns {any} Giá trị đã lưu
   */
  const getUserData = useCallback((key, useUID = true) => {
    if (!key) return null;
    
    let storageKey = key;
    
    // Thêm UID vào khóa nếu có yêu cầu và người dùng đã đăng nhập
    if (useUID && currentUser?.uid) {
      storageKey = `${currentUser.uid}_${key}`;
    }
    
    const value = sessionStorage.getItem(storageKey);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }, [currentUser]);

  /**
   * Xóa dữ liệu người dùng từ sessionStorage
   * @param {string} key - Khóa lưu trữ
   * @param {boolean} useUID - Có thêm UID của người dùng vào khóa hay không
   */
  const removeUserData = useCallback((key, useUID = true) => {
    if (!key) return;
    
    let storageKey = key;
    
    // Thêm UID vào khóa nếu có yêu cầu và người dùng đã đăng nhập
    if (useUID && currentUser?.uid) {
      storageKey = `${currentUser.uid}_${key}`;
    }
    
    sessionStorage.removeItem(storageKey);
  }, [currentUser]);

  /**
   * Lưu trạng thái giỏ hàng
   * @param {Array} cartItems - Các mặt hàng trong giỏ hàng
   */
  const saveCart = useCallback((cartItems) => {
    saveUserData('cart', cartItems);
  }, [saveUserData]);

  /**
   * Lấy trạng thái giỏ hàng
   * @returns {Array} Các mặt hàng trong giỏ hàng
   */
  const getCart = useCallback(() => {
    return getUserData('cart') || [];
  }, [getUserData]);

  /**
   * Xóa tất cả dữ liệu phiên làm việc
   */
  const clearAllSessionData = useCallback(() => {
    sessionStorage.clear();
  }, []);

  return {
    saveLastVisitedPath,
    getLastVisitedPath,
    redirectToLastVisitedPath,
    saveUserData,
    getUserData,
    removeUserData,
    saveCart,
    getCart,
    clearAllSessionData
  };
};

export default useSessionPersistence; 