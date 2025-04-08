# EcoPrint Application

## Overview
EcoPrint is a web application that provides printing services, user management, and transaction handling.

## Project Structure
The project is organized as a monorepo with the following packages:
- `packages/functions`: Firebase Cloud Functions backend
- `packages/assets`: Frontend assets and React components

## Important Configuration Details

### Firebase Configuration
The application uses Firebase for authentication, storage, and database. The correct configuration is essential for the application to function properly.

#### Storage Bucket Configuration
The Firebase Storage bucket URL must follow the format: `your-project-id.firebasestorage.app`

Correct format:
```
storageBucket: "ecoprint1-3cd5c.firebasestorage.app"
```

Incorrect format (will cause errors):
```
storageBucket: "ecoprint1-3cd5c.appspot.com"
```

### API Routes
- API routes are defined in `/packages/functions/src/routes/apiRoutes.js`
- The application uses dedicated controllers for handling business logic
- Upload functionality is managed through middleware and file upload controllers

## Setup Instructions

1. Install dependencies:
```
yarn install
```

2. Set up Firebase configuration:
   - Create a `.env` file based on `.env.example`
   - Make sure to use the correct Storage bucket URL format

3. Start the development server:
```
yarn dev
```

## Development Guidelines

### Controllers
- Controllers should handle business logic
- File uploads should use the dedicated upload middleware
- Always use `ctx.req.body` instead of `ctx.request.body`

### Middleware
- Upload middleware is in `simpleUploadMiddleware.js`
- File handling logic should be centralized in appropriate controllers

### Order Comments Feature
The application includes a comments feature for communication between customers and admins:

#### Customer Side
- Customers can add comments to their orders from the OrderDetailPage
- The comments are visible to both customers and administrators
- This provides a channel for inquiries, special requests, or other communication

#### Admin Side
- Admins can view all customer comments in the admin OrderDetailPage
- Admins can reply to customer comments directly from the admin interface
- Comments are displayed chronologically with timestamps and user information
- Private admin notes are also available for internal use only

## Troubleshooting

### Common Issues
- Storage bucket URL format incorrect - should be `projectId.appspot.com`
- Permission issues - ensure Firebase service account has proper permissions
- Upload issues - check middleware configuration and file size limits

## Contact
For any questions or support, please contact the development team.