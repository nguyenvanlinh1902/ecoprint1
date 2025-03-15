# KoaJS Development Rules and Best Practices

This document outlines the rules, patterns, and best practices for developing with KoaJS in our functions architecture.

## Architecture Overview

Our serverless functions follow a clean, layered architecture:

```
src/
  ├── index.js            # Entry point for Firebase Functions
  ├── handlers/           # Koa application handlers
  ├── routes/             # API route definitions
  ├── controllers/        # Request handling and response formatting
  ├── services/           # Business logic
  ├── repositories/       # Data access layer
  ├── middleware/         # Reusable middleware
  ├── helpers/            # Utility functions
  ├── config/             # Configuration
  ├── const/              # Constants
  └── exceptions/         # Custom error definitions
```

## Core Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Single Responsibility**: Each file should do one thing well
3. **Dependency Injection**: Dependencies should be passed in, not imported directly when possible
4. **Async/Await**: Use modern async/await syntax instead of callbacks or promise chains
5. **Error Handling**: Centralized error handling with proper logging and client-friendly messages

## KoaJS Setup Rules

### Application Setup

```javascript
// Create Koa application instance
const api = new App();
api.proxy = true;  // Trust proxy headers if behind a load balancer

// Register global middleware (executed in order)
api.use(createErrorHandler());
api.use(authMiddleware());
api.use(corsMiddleware());

// Register routes
const router = apiRouter();
api.use(router.allowedMethods());
api.use(router.routes());

// Global error event handler
api.on('error', errorService.handleError);
```

### Middleware Development

1. **Middleware Function Signature**:
```javascript
export default function middleware() {
  return async (ctx, next) => {
    // Do something before passing to next middleware
    await next();
    // Do something after next middleware completes
  };
}
```

2. **Error Handling Middleware**:
```javascript
export default function errorHandler() {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = {
        error: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : err.message
      };
      ctx.app.emit('error', err, ctx);
    }
  };
}
```

## Routing Rules

1. **Route Organization**:
   - Group routes by feature or resource
   - Use prefixes to segment API
   - Export router factory functions

```javascript
// Group related endpoints
const router = new Router({prefix: '/api/v1'});

// Use HTTP verbs correctly
router.get('/resources', controller.list);       // Get collection
router.post('/resources', controller.create);    // Create resource
router.get('/resources/:id', controller.get);    // Get single resource
router.put('/resources/:id', controller.update); // Full update
router.patch('/resources/:id', controller.patch); // Partial update
router.delete('/resources/:id', controller.delete); // Delete resource
```

## Controller Rules

1. **Keep Controllers Thin**:
   - Focus on request/response handling
   - Delegate business logic to services
   - Extract validation to separate middleware

```javascript
export async function getResource(ctx) {
  const { id } = ctx.params;
  const resource = await resourceService.getById(id);
  
  if (!resource) {
    ctx.status = 404;
    ctx.body = { error: 'Resource not found' };
    return;
  }
  
  ctx.body = resource;
}
```

## Service Rules

1. **Business Logic Encapsulation**:
   - Services contain all business logic
   - Independent from web framework
   - Can be unit tested in isolation

```javascript
export async function getResourceById(id) {
  const resource = await resourceRepository.findById(id);
  
  if (!resource) {
    return null;
  }
  
  // Apply business rules to the resource
  return transformResource(resource);
}
```

## Repository Rules

1. **Data Access Abstraction**:
   - Repositories abstract all database operations
   - Return business entities, not DB models
   - Hide database implementation details

```javascript
export async function findById(id) {
  try {
    const doc = await firestore.collection('resources').doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    throw new DatabaseError('Failed to retrieve resource', error);
  }
}
```

## Error Handling Rules

1. **Custom Error Classes**:
   - Define custom errors for different scenarios
   - Include HTTP status codes
   - Provide user-friendly messages

```javascript
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}
```

2. **Centralized Error Logging**:
```javascript
export function handleError(err, ctx) {
  const requestId = ctx.state.requestId;
  const userId = ctx.state.user?.id;
  
  console.error(
    `Error [${requestId}]`,
    `User: ${userId || 'unauthenticated'}`,
    `URL: ${ctx.url}`,
    err
  );
}
```

## Firebase Functions Integration

1. **Exporting Koa Apps as Functions**:
```javascript
export const api = functions.https.onRequest(apiHandler.callback());
```

2. **Function Configuration**:
```javascript
export const heavyProcessing = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https.onRequest(processingHandler.callback());
```

## Testing Guidelines

1. **Unit Testing**:
   - Test services and repositories in isolation
   - Mock dependencies
   - Focus on business logic

2. **Integration Testing**:
   - Test API endpoints with supertest
   - Use test database
   - Validate response structure

## Performance Best Practices

1. **Avoid Blocking Operations**
2. **Use Promise.all for Concurrent Operations**
3. **Implement Proper Caching Strategies**
4. **Optimize Database Queries**
5. **Minimize Function Cold Starts**

## Security Guidelines

1. **Validate All Input**
2. **Use Middleware for Authentication**
3. **Implement Proper CORS Settings**
4. **Apply Rate Limiting**
5. **Set Appropriate Response Headers**

## Deployment Checklist

1. **Remove Development Code**
2. **Set Environment Variables**
3. **Configure Proper Memory Allocation**
4. **Set Timeouts Appropriately**
5. **Enable Logging and Monitoring**

## Firebase Integration Guidelines

### Firebase Admin SDK Setup

```javascript
// config/firebase.js
import * as admin from 'firebase-admin';
import serviceAccount from '../../serviceAccount.development.json';

let firebaseApp;

/**
 * Initialize Firebase Admin SDK
 * @return {admin.app.App}
 */
export function initializeFirebase() {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
  }
  return firebaseApp;
}

/**
 * Get Firestore instance
 * @return {admin.firestore.Firestore}
 */
export function getFirestore() {
  initializeFirebase();
  return admin.firestore();
}

/**
 * Get Storage instance
 * @return {admin.storage.Storage}
 */
export function getStorage() {
  initializeFirebase();
  return admin.storage();
}

export default {
  initializeFirebase,
  getFirestore,
  getStorage
};
```

### Firestore Data Access Pattern

Follow the Repository pattern when accessing Firestore:

```javascript
// repositories/userRepository.js
import { getFirestore } from '../config/firebase';

const db = getFirestore();
const usersCollection = db.collection('users');

/**
 * Find user by ID
 * @param {string} userId
 * @return {Promise<Object|null>}
 */
export async function findById(userId) {
  try {
    const doc = await usersCollection.doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}

/**
 * Create or update user
 * @param {string} userId
 * @param {Object} userData
 * @return {Promise<Object>}
 */
export async function upsert(userId, userData) {
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const data = {
      ...userData,
      updatedAt: timestamp
    };
    
    // For new users, add createdAt
    if (!(await findById(userId))) {
      data.createdAt = timestamp;
    }
    
    await usersCollection.doc(userId).set(data, { merge: true });
    return { id: userId, ...data };
  } catch (error) {
    throw new Error(`Failed to upsert user: ${error.message}`);
  }
}

/**
 * Delete user
 * @param {string} userId
 * @return {Promise<boolean>}
 */
export async function remove(userId) {
  try {
    await usersCollection.doc(userId).delete();
    return true;
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

/**
 * Query users with filters
 * @param {Object} filters
 * @param {number} limit
 * @return {Promise<Array<Object>>}
 */
export async function query(filters = {}, limit = 10) {
  try {
    let query = usersCollection;
    
    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      query = query.where(field, '==', value);
    });
    
    // Apply limit
    query = query.limit(limit);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw new Error(`Failed to query users: ${error.message}`);
  }
}
```

### Authentication Middleware

Use Firebase Auth for authentication in Koa middleware:

```javascript
// middleware/authMiddleware.js
import * as admin from 'firebase-admin';

/**
 * Middleware that verifies Firebase ID token
 * @return {Function}
 */
export default function authMiddleware() {
  return async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized: No token provided' };
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      ctx.state.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'user'
      };
      await next();
    } catch (error) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized: Invalid token' };
    }
  };
}
```

### Role-Based Authorization

```javascript
// middleware/roleMiddleware.js
/**
 * Middleware that checks if user has required role
 * @param {string|Array<string>} requiredRoles
 * @return {Function}
 */
export default function requireRole(requiredRoles) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return async (ctx, next) => {
    const { user } = ctx.state;
    
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized: Authentication required' };
      return;
    }
    
    if (!roles.includes(user.role)) {
      ctx.status = 403;
      ctx.body = { error: 'Forbidden: Insufficient permissions' };
      return;
    }
    
    await next();
  };
}
```

### Firebase Storage Usage

```javascript
// services/fileService.js
import { getStorage } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

const storage = getStorage();
const bucket = storage.bucket();

/**
 * Upload file to Firebase Storage
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} folderPath
 * @return {Promise<string>} Public URL
 */
export async function uploadFile(fileBuffer, fileName, folderPath = 'uploads') {
  try {
    // Generate unique filename
    const uniqueFilename = `${Date.now()}_${uuidv4()}_${fileName}`;
    const filePath = `${folderPath}/${uniqueFilename}`;
    
    // Create file reference
    const file = bucket.file(filePath);
    
    // Upload buffer
    await file.save(fileBuffer, {
      contentType: 'auto',
      metadata: {
        cacheControl: 'public, max-age=31536000'
      }
    });
    
    // Make file publicly accessible
    await file.makePublic();
    
    // Get public URL
    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Delete file from Firebase Storage
 * @param {string} fileUrl
 * @return {Promise<boolean>}
 */
export async function deleteFile(fileUrl) {
  try {
    // Extract file path from URL
    const filePath = fileUrl.split(`${bucket.name}/`)[1];
    
    if (!filePath) {
      throw new Error('Invalid file URL');
    }
    
    // Delete file
    await bucket.file(filePath).delete();
    return true;
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
```

### Firebase Cloud Functions

```javascript
// index.js
import * as functions from 'firebase-functions';
import apiHandler from './handlers/api';
import scheduledTasks from './handlers/scheduledTasks';

// Standard HTTP function
export const api = functions.https.onRequest(apiHandler.callback());

// Function with custom configuration
export const heavyProcessing = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https.onRequest(processingHandler.callback());

// Firestore trigger function
export const onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const userData = snapshot.data();
    const userId = context.params.userId;
    
    // Do something when a user is created
    console.log(`New user created: ${userId}`);
    
    // Example: Add default settings for new user
    await snapshot.ref.collection('settings').doc('preferences').set({
      theme: 'light',
      notifications: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

// Scheduled function (cron job)
export const dailyCleanup = functions.pubsub
  .schedule('0 0 * * *') // Run at midnight every day
  .timeZone('America/New_York')
  .onRun(scheduledTasks.dailyCleanup);
```

### Firebase Best Practices

1. **Security Rules**: Always define proper Firestore and Storage security rules

2. **Transactions**: Use transactions for atomic operations
```javascript
const firestore = getFirestore();
await firestore.runTransaction(async (transaction) => {
  const docRef = firestore.collection('counters').doc('visits');
  const doc = await transaction.get(docRef);
  
  if (!doc.exists) {
    transaction.set(docRef, { count: 1 });
  } else {
    const newCount = doc.data().count + 1;
    transaction.update(docRef, { count: newCount });
  }
});
```

3. **Batched Writes**: Use batch operations for multiple writes
```javascript
const firestore = getFirestore();
const batch = firestore.batch();

// Add operations to batch
users.forEach(user => {
  const docRef = firestore.collection('users').doc(user.id);
  batch.set(docRef, user);
});

// Commit batch
await batch.commit();
```

4. **Indexes**: Create composite indexes for complex queries

5. **Data Denormalization**: Strategically duplicate data to minimize reads

6. **Collection Groups**: Use collection groups for querying across sub-collections

7. **Security**: Never store API keys or secrets in client-side code

8. **Error Handling**: Always handle Firebase operation errors gracefully

9. **Offline Support**: Implement offline capabilities when appropriate

10. **Cost Management**: Monitor usage to prevent unexpected billing

---

By following these rules and patterns, we ensure our KoaJS functions are maintainable, scalable, and performant.
