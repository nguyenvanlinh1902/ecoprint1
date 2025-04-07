const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

// Create Koa app
const app = new Koa();

// Apply middlewares
app.use(cors());
app.use(bodyParser());

// Create router
const router = new Router();

// Simple routes for testing
router.get('/', (ctx) => {
  ctx.body = {
    success: true,
    message: 'API is working',
    timestamp: new Date()
  };
});

// Product options routes
router.get('/product-options', (ctx) => {
  ctx.body = {
    success: true,
    data: [
      {
        id: '1',
        name: 'Position',
        type: 'print',
        description: 'Print positions on products',
        positions: [
          { id: '1', name: 'Front', description: 'Front of the product', additionalPrice: 0 },
          { id: '2', name: 'Back', description: 'Back of the product', additionalPrice: 2 }
        ]
      },
      {
        id: '2',
        name: 'Color',
        type: 'color',
        description: 'Color options for products',
        positions: []
      }
    ]
  };
});

router.get('/product-options/:id', (ctx) => {
  const { id } = ctx.params;
  ctx.body = {
    success: true,
    data: {
      id,
      name: `Option ${id}`,
      type: 'print',
      description: 'Sample description',
      positions: []
    }
  };
});

// Add router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
  console.log('Routes:');
  router.stack.forEach(layer => {
    if (layer.methods && layer.methods.length > 0) {
      console.log(`${layer.methods.join(',')} ${layer.path}`);
    }
  });
}); 