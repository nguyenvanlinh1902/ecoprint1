import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Lưu trữ hình ảnh vào LocalStorage với base64
 * @param {string} key - Key để lưu trữ
 * @param {string} dataUrl - Base64 data URL
 */
export const storeImageLocally = (dataUrl, prefix = 'temp_image_') => {
  try {
    const key = `${prefix}${uuidv4()}`;
    localStorage.setItem(key, dataUrl);
    return { key, url: dataUrl };
  } catch (error) {
    console.error('Error storing image locally:', error);
    return { key: null, url: dataUrl };
  }
};

/**
 * Lấy hình ảnh từ LocalStorage
 * @param {string} key - Key đã lưu
 */
export const getStoredImage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error getting stored image:', error);
    return null;
  }
};

/**
 * Convert file sang base64
 * @param {File} file - File cần convert
 */
export const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

/**
 * Tạo blob URL từ file
 * @param {File} file - File cần convert
 */
export const createBlobUrl = (file) => {
  try {
    return URL.createObjectURL(file);
  } catch (error) {
    console.error('Error creating blob URL:', error);
    return null;
  }
};

/**
 * Tạo một URL từ file sử dụng các phương pháp khác nhau
 * @param {File} file - File cần xử lý
 */
export const getImageUrlFromFile = async (file) => {
  try {
    // Phương pháp 1: Blob URL (nhanh nhất)
    const blobUrl = createBlobUrl(file);
    if (blobUrl) {
      console.log('Created blob URL successfully');
      return { url: blobUrl, type: 'blob' };
    }
    
    // Phương pháp 2: Base64 (được lưu vào localStorage)
    const base64Data = await convertFileToBase64(file);
    if (base64Data) {
      console.log('Created base64 data URL successfully');
      const result = storeImageLocally(base64Data);
      return { url: result.url, key: result.key, type: 'base64' };
    }
    
    throw new Error('Could not generate image URL from file');
  } catch (error) {
    console.error('Error getting image URL from file:', error);
    throw error;
  }
}; 