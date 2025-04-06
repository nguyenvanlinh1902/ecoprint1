# Hướng dẫn Upload Ảnh với Firebase Storage

Tài liệu này mô tả cách mã nguồn xử lý tải lên và lưu trữ ảnh trong dự án. Hiện tại, dự án đang sử dụng Shopify API để lưu trữ ảnh thay vì Firebase Storage trực tiếp, mặc dù Firebase đã được khởi tạo trong mã nguồn.

## 1. Khởi tạo Firebase

### File: `packages/assets/src/helpers.js`

```javascript
import axios from 'axios';
import createApp from '@shopify/app-bridge';
import {authenticatedFetch} from '@shopify/app-bridge-utils';
import {Redirect} from '@shopify/app-bridge/actions';
import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getApiPrefix} from '@functions/const/app';
import {isEmbeddedApp} from '@assets/config/app';
import {getStorage} from 'firebase/storage';

const app = initializeApp({
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export const embedApp = createEmbedApp();
export const client = axios.create({timeout: 60000});
export const api = createApi();

function isFormData(data) {
  return data instanceof FormData;
}

/**
 * @return {(uri: string, options?: {headers?, body?, method?: 'GET' | 'POST' | 'PUT' | 'DELETE'}) => Promise<any>}
 */
function createApi() {
  const prefix = getApiPrefix(isEmbeddedApp);

  if (isEmbeddedApp) {
    const fetchFunction = authenticatedFetch(embedApp);
    return async (uri, options = {}) => {
      if (options.body) {
        options.body = isFormData(options.body) ? options.body : JSON.stringify(options.body);
        options.headers = options.headers || {};
        if (!isFormData(options.body)) {
          options.headers['Content-Type'] = 'application/json';
        }
      }
      const response = await fetchFunction(prefix + uri, options);
      checkHeadersForReauthorization(response.headers, embedApp);
      return await response.json();
    };
  }

  const sendRequest = async (uri, options) => {
    const idToken = await auth.currentUser.getIdToken(false);
    return client
      .request({
        ...options,
        headers: {
          accept: 'application/json',
          ...(options.headers || {}),
          'x-auth-token': idToken
        },
        url: prefix + uri,
        method: options.method,
        data: options.body
      })
      .then(res => res.data);
  };

  return async (uri, options = {}) => sendRequest(uri, options);
}
```

## 2. Frontend Component - DropZone

### File: `packages/assets/src/hooks/modal/useDropZone.js`

```javascript
import {
  ActionList,
  BlockStack,
  Box,
  Button,
  DropZone,
  Icon,
  InlineGrid,
  Popover,
  RangeSlider,
  Spinner,
  Text,
  TextField
} from '@shopify/polaris';
import {DeleteIcon, ImageAddIcon, InfoIcon} from '@shopify/polaris-icons';
import React, {useRef, useState} from 'react';
import GroupButtons from '@assets/components/molecules/GroupButtons';
import {alignmentOptions} from '@functions/const/survey/options';
import {isEmpty} from '@avada/utils';
import useUploadFile from '@assets/hooks/api/useUploadFile';

const acceptImageType = ['image/jpg', 'image/jpeg', 'image/png', 'image/svg'];

/**
 * Hook xử lý tải lên ảnh thông qua DropZone
 */
export default function useDropZone({
  questionImage,
  handleChangeQuestionImage,
  showImageResize,
  labelImage,
  labelAlignment,
  showImageAlignment = true
}) {
  const [loadingDrop, setLoadingDrop] = useState(false);
  const [error, setError] = useState({message: ''});
  const [open, setOpen] = useState(false);

  const dropZoneRef = useRef(null);

  const {uploading, handleUpload: handleUploadImage} = useUploadFile({
    url: '/shopify/file',
    fullResp: true,
    successMsg: 'File uploaded'
  });

  const handleUpload = async file => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = async () => {
      try {
        const {data} = await handleUploadImage(file);
        if (isEmpty(data)) return;
        handleChangeQuestionImage('url', data.url);
        setError({message: ''});
      } catch (error) {
        setError({message: error.message});
      }
    };
  };

  const handleOnDrop = async droppedFiles => {
    setLoadingDrop(true);
    const [file] = droppedFiles;

    if (!acceptImageType.includes(file.type)) {
      setError({message: 'Type of image file is not supported'});
      return;
    }

    // Error handling for file size 2MB
    if (file.size > 2097152) {
      setLoadingDrop(false);
      setError({message: 'This file exceeds the size limit.', error: 'Max file size is 2MB'});
      return;
    }
    await handleUpload(file);
  };

  const imageUrl = questionImage?.url;

  const uploadDropZone = (
    <>
      <Box id={imageUrl ? 'Avada-DropZone--HasImage' : ''}>
        <BlockStack gap="100">
          <Text as="span">{labelImage}</Text>
          <input
            style={{display: 'none'}}
            type="file"
            ref={dropZoneRef}
            onChange={e => handleOnDrop(e.target.files)}
          />
          <DropZone
            error={!!error.error}
            errorOverlayText={error.message}
            accept="image/*"
            type="image"
            allowMultiple={false}
            onDrop={handleOnDrop}
          >
            {(uploading || imageUrl) && (
              <>
                <Box id="Avada-DropZone--Image" padding={400}>
                  {uploading ? <Spinner /> : <img src={imageUrl} alt="questionImage" />}
                </Box>
              </>
            )}
            {!uploading && !imageUrl && (
              <>
                {error.message && (
                  <div className="Avada-Image__Error">
                    <BlockStack gap="100">
                      <Icon source={InfoIcon} tone={'critical'} />
                      <Text tone="critical" as="span" fontWeight="semibold">
                        {error.message}
                      </Text>
                      {error?.error && (
                        <Text alignment={'center'} tone="critical" as="span">
                          {error.error}
                        </Text>
                      )}
                    </BlockStack>
                  </div>
                )}
                {!error.message && (
                  <DropZone.FileUpload
                    actionTitle="Add Image"
                    actionHint={'Accepts .svg, .jpg, .jpeg, and .png'}
                  />
                )}
              </>
            )}
          </DropZone>
          {/* Nút thay đổi và xóa ảnh */}
        </BlockStack>
      </Box>
    </>
  );

  return {uploadDropZone, handleOnDrop, loadingDrop};
}
```

## 3. Upload File Hook

### File: `packages/assets/src/hooks/api/useUploadFile.js`

```javascript
import {useState} from 'react';
import {useStore} from '@assets/reducers/storeReducer';
import {api} from '@assets/helpers';
import {setToast} from '@assets/actions/storeActions';
import {handleError} from '@assets/services/errorService';
import querystring from 'query-string';

/**
 * Hook xử lý tải lên file
 */
export default function useUploadFile({
  url,
  fullResp = false,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const {dispatch} = useStore();
  const [uploading, setUploading] = useState(false);
  const handleUpload = async file => {
    try {
      setUploading(true);
      const formData = new FormData();
      const {name, type} = file;
      formData.append('file', file);
      const resp = await api(
        `${url +
          '?' +
          querystring.stringify({
            fileName: name,
            mimeType: type.replace('image/', '')
          })}`,
        {
          body: formData,
          method: 'POST'
        }
      );
      if (resp.success) {
        setToast(dispatch, resp.message || successMsg);
      }
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      return fullResp ? resp : resp.success;
    } catch (e) {
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? {success: false, error: e.message} : false;
    } finally {
      setUploading(false);
    }
  };

  return {uploading, handleUpload};
}
```

## 4. Backend Controller

### File: `packages/functions/src/controllers/shopifyController.js`

```javascript
import {getShopById} from '@avada/core';
import {
  handleGetCustomersTags,
  handleSearchCollections,
  handleSearchProducts,
  handleUploadFile
} from '../services/graphqlService';
import {
  getFileBusBoy,
  prepareImageData,
  retryGetImageUpload,
  stream2buffer
} from '../helpers/media/getFile';
import {initShopify} from '@functions/services/shopifyService';
import {getCurrentShop} from '@functions/helpers/auth';
import shopifyConfig from '@functions/config/shopify';

/**
 * Controller xử lý tải lên file
 */
export const uploadFile = async ctx => {
  try {
    const shopID = getCurrentShop(ctx);
    const shop = await getShopById(shopID, shopifyConfig.accessTokenKey);
    const shopify = initShopify(shop);
    const {file: fileUploaded} = await getFileBusBoy(ctx);
    const buffer = await stream2buffer(fileUploaded);
    const [file] = await handleUploadFile({shopify, file: buffer, ...ctx.req.query});
    const data = await retryGetImageUpload({id: file.id, shopify});

    if (data.image) {
      return (ctx.body = {
        success: true,
        data: prepareImageData(data)
      });
    }
    return (ctx.body = {
      success: false,
      data: {},
      error: 'Cannot fetch image after upload'
    });
  } catch (e) {
    console.error(e);
    return (ctx.body = {
      success: false,
      data: {},
      error: e.message
    });
  }
};
```

## 5. File Handling Utilities

### File: `packages/functions/src/helpers/media/getFile.js`

```javascript
import Busboy from 'busboy';
import {delay} from '@avada/utils';
import {getMediaImageById} from '@functions/services/graphqlService';

/**
 * Chuyển đổi stream thành buffer
 */
export function stream2buffer(stream) {
  return new Promise((resolve, reject) => {
    const _buf = [];
    stream.on('data', chunk => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', err => reject(err));
  });
}

/**
 * Xử lý file từ request với Busboy
 */
export function getFileBusBoy(ctx) {
  return new Promise(resolve => {
    // eslint-disable-next-line new-cap
    const busboy = Busboy({
      headers: ctx.req.headers
    });
    // This code will process each file uploaded.
    busboy.on('file', (fieldName, file, {filename}) => {
      resolve({fieldName, file, filename});
    });

    busboy.on('finish', async () => {});

    busboy.end(ctx.req.rawBody);
  });
}

/**
 * Chuẩn bị dữ liệu ảnh để trả về
 */
export const prepareImageData = data => {
  return {
    altText: data.alt,
    mimeType: data.mimeType.replace('image/', ''),
    title: data.image.url.match(/\/([^/]+\.[a-zA-Z0-9]+)\?/)[1],
    url: data.image.url
  };
};

/**
 * Thử lại việc lấy ảnh từ Shopify
 */
export async function retryGetImageUpload({shopify, id, count = 0}) {
  const data = await getMediaImageById({shopify, id});
  if (data.image || count >= 5) return data;

  await delay(200);
  return retryGetImageUpload({shopify, id, count: count + 1});
}
```

## 6. GraphQL Service (Upload to Shopify)

### File: `packages/functions/src/services/graphqlService.js`

```javascript
import {
  createFileMutation,
  generateStagedUploadsMutation
} from '@functions/const/graphql/mutation/upload';
import {getMediaImageQuery} from '@functions/const/graphql/queries/media';
import fetch from 'node-fetch';
import FormData from 'form-data';

/**
 * Xử lý tải lên file lên Shopify
 */
export async function handleUploadFile({shopify, ...params}) {
  try {
    const {fileName, mimeType, file} = params;
    const data = await shopify.graphql(generateStagedUploadsMutation, {
      mimeType: `image/${mimeType}`,
      fileName
    });

    const {url: urlString, resourceUrl, parameters} = data.stagedUploadsCreate.stagedTargets[0];
    const form = new FormData();
    parameters.forEach(({name, value}) => {
      form.append(name, value);
    });
    form.append('file', file);

    await fetch(urlString, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders()
      }
    });

    const createFileVariables = {
      files: {
        alt: '',
        contentType: 'IMAGE',
        originalSource: resourceUrl
      }
    };
    const {fileCreate} = await shopify.graphql(createFileMutation, createFileVariables);
    return fileCreate.files;
  } catch (e) {
    console.log('upload file error', e);
    console.log('upload file error', e.message);
    throw e;
  }
}

/**
 * Lấy thông tin ảnh từ Shopify bằng ID
 */
export async function getMediaImageById({id, shopify}) {
  const {node} = await shopify.graphql(getMediaImageQuery, {id});
  return node;
}
```

## 7. GraphQL Mutations

### File: `packages/functions/src/const/graphql/mutation/upload.js`

```javascript
export const generateStagedUploadsMutation = `
  mutation generateStagedUploads($fileName: String!, $mimeType: String!) {
    stagedUploadsCreate(input: [
      {
        filename: $fileName,
        mimeType: $mimeType,
        resource: IMAGE,
        httpMethod: POST
      }
    ])
      {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field, message
      }
    }
  }
`;

export const createFileMutation = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        alt
        ... on MediaImage {
          id
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
```

## 8. Firebase Storage Rules

### File: `storage.rules`

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## 9. Hướng dẫn sử dụng Firebase Storage trực tiếp

Hiện tại, ứng dụng đang sử dụng Shopify để lưu trữ ảnh. Để chuyển sang sử dụng Firebase Storage, bạn cần thực hiện các bước sau:

### 1. Cập nhật Firebase Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 2. Tạo service mới để tải lên Firebase

```javascript
// File: packages/assets/src/services/firebaseService.js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@assets/helpers';

export async function uploadToFirebase(file, path) {
  try {
    // Tạo đường dẫn lưu trữ với thời gian để tránh trùng lặp
    const timestamp = new Date().getTime();
    const storageRef = ref(storage, `${path}/${timestamp}_${file.name}`);
    
    // Tải lên file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Lấy URL download
    const url = await getDownloadURL(snapshot.ref);
    
    return { success: true, url };
  } catch (e) {
    console.error(e);
    return { success: false, error: e.message };
  }
}
```

### 3. Sửa đổi hook useUploadFile để sử dụng Firebase

```javascript
// Thay đổi packages/assets/src/hooks/api/useUploadFile.js
import { useState } from 'react';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';
import { uploadToFirebase } from '@assets/services/firebaseService';

export default function useUploadFile({
  fullResp = false,
  path = 'images',
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async file => {
    try {
      setUploading(true);
      const result = await uploadToFirebase(file, path);
      
      if (result.success) {
        setToast(dispatch, successMsg);
      } else {
        setToast(dispatch, result.error || errorMsg, true);
      }
      
      return fullResp ? result : result.success;
    } catch (e) {
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, handleUpload };
}
```

## Kết luận

Dự án hiện tại sử dụng Shopify Admin API để lưu trữ ảnh, không phải Firebase Storage trực tiếp. Để chuyển sang Firebase Storage, bạn cần cập nhật rules và tạo các hàm tiện ích để tải lên và lấy URL như hướng dẫn ở trên.

Lưu ý rằng Firebase cung cấp nhiều tính năng bổ sung như:
- Theo dõi tiến trình tải lên
- Điều khiển kích thước và định dạng ảnh
- Dễ dàng xóa ảnh không cần thiết
- Quản lý metadata
