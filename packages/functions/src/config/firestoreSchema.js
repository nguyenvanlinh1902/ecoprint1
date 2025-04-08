const firestoreSchema = {
  collections: {
    users: {
      fields: {
        email: 'string',
        password: 'string',
        companyName: 'string',
        phone: 'string',
        role: 'string',
        status: 'string',
        balance: 'number',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    },
    products: {
      fields: {
        name: 'string',
        colors: 'array',
        sizes: 'array',
        sku: 'string',
        basePrice: 'number',
        type: 'string',
        customizationOptions: 'array',
        active: 'boolean',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    },
    orders: {
      fields: {
        userId: 'string',
        productId: 'string',
        customizations: 'array',
        quantity: 'number',
        shippingAddress: 'object',
        designFiles: 'array',
        status: 'string',
        basePrice: 'number',
        customizationFee: 'number',
        shippingFee: 'number',
        totalPrice: 'number',
        batchImportId: 'string',
        isPaid: 'boolean',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    },
    transactions: {
      fields: {
        userId: 'string',
        type: 'string',
        amount: 'number',
        status: 'string',
        paymentProof: 'string',
        orderId: 'string',
        note: 'string',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    },
    batchImports: {
      fields: {
        userId: 'string',
        fileName: 'string',
        status: 'string',
        orderCount: 'number',
        totalPrice: 'number',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    }
  }
};

export default firestoreSchema; 