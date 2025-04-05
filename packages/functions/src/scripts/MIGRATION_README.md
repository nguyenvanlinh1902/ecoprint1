# Migration from `users` to `userProfiles` Collection

This document outlines the process for migrating user data from the legacy `users` collection to the new `userProfiles` collection in Firestore.

## Background

Initially, the application was using two separate collections:
- `users`: Primary collection for user data
- `userProfiles`: Secondary collection for additional profile information

To simplify the data model and improve performance, we're consolidating all user data into the `userProfiles` collection.

## Migration Process

### Step 1: Run the Migration Script

First, run the migration script to copy all data from the `users` collection to the `userProfiles` collection:

```bash
# From the functions directory
cd packages/functions
node -e "import('./src/scripts/migrateUserProfiles.js')"
```

This script will:
- Read all documents from the `users` collection
- For each document, create or update a corresponding document in the `userProfiles` collection
- Preserve all fields and data

### Step 2: Verify the Migration

After running the script, verify that all data has been successfully migrated by comparing the document counts and sampling a few records:

```bash
# Count documents in users collection
firebase firestore:get users --limit=1000 | wc -l

# Count documents in userProfiles collection
firebase firestore:get userProfiles --limit=1000 | wc -l
```

The counts should match or userProfiles should have more documents.

### Step 3: Update Application Code

The application code has been updated to use the `userProfiles` collection instead of `users`. Key changes include:

1. New service file: `userProfileService.js` that handles all user operations
2. Updated controller files to use the new service
3. Updated Firestore rules to maintain proper access controls

### Step 4: Testing

Before deploying to production, thoroughly test the application to ensure:
- User authentication works correctly
- User profile data is displayed properly
- Admin functions for managing users operate as expected
- Transaction history and balance operations function correctly

### Step 5: Deployment

Once testing is complete, deploy the updated code to production.

### Step 6: Legacy Support Period

For a period of time (recommended: 30 days), we'll maintain backward compatibility by:
- Keeping the `users` collection in read-only mode
- Monitoring for any issues related to the migration

### Step 7: Clean Up (Optional)

After the support period, if no issues have been reported, you may optionally remove the `users` collection to free up storage:

```bash
# This is a destructive operation - only perform after confirming migration success
# and after a sufficient support period
firebase firestore:delete users --all-collections
```

## Troubleshooting

If issues arise during or after migration:

1. **Missing User Data**: Run the migration script again with the `--force` flag to ensure all records are copied
2. **Authentication Issues**: Verify that the Auth service is properly connecting to the `userProfiles` collection
3. **Permission Problems**: Check Firestore security rules to ensure they're correctly configured for the new collection

## Rollback Plan

If critical issues occur, rollback can be performed by:

1. Reverting the code changes to use the `users` collection
2. Deploying the reverted code
3. Fixing any issues with the migration plan

## Contact

For questions or issues related to this migration, contact the development team. 