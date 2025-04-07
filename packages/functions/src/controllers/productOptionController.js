import ProductOptionModel from '../models/ProductOptionModel.js';
import { handleError } from '../utils/errorHandler.js';

// Get all product options
export const getAllOptions = async (ctx) => {
  try {
    const options = await ProductOptionModel.findAll();
    ctx.body = {
      success: true,
      data: options
    };
  } catch (error) {
    handleError(ctx, error);
  }
};

// Get option by ID
export const getOptionById = async (ctx) => {
  try {
    const { id } = ctx.params;
    const option = await ProductOptionModel.findById(id);
    
    if (!option) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Product option not found'
      };
      return;
    }
    
    ctx.body = {
      success: true,
      data: option
    };
  } catch (error) {
    handleError(ctx, error);
  }
};

// Create new option
export const createOption = async (ctx) => {
  try {
    // Kiểm tra và lấy dữ liệu từ request
    let data;
    
    // Kiểm tra các cách khác nhau để lấy body
    if (ctx.req && ctx.req.body) {
      console.log('Using ctx.req.body');
      data = ctx.req.body;
    } else if (ctx.request && ctx.request.body) {
      console.log('Using ctx.request.body');
      data = ctx.request.body;
    } else {
      console.log('No body found, trying to parse raw body');
      try {
        data = JSON.parse(ctx.request.rawBody || '{}');
      } catch (e) {
        console.error('Error parsing raw body:', e);
        data = {};
      }
    }
    
    // Log request data for debugging
    console.log('Create option request body:', data);
    console.log('Request headers:', ctx.headers);
    console.log('Request method:', ctx.method);
    
    // Validate required fields
    if (!data || !data.name) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Name is required for product option'
      };
      return;
    }
    
    // Chuẩn bị dữ liệu cho việc tạo option
    const optionData = {
      name: data.name,
      description: data.description || '',
      type: data.type || 'print',
      positions: Array.isArray(data.positions) ? data.positions : []
    };
    
    const option = await ProductOptionModel.create(optionData);
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      data: option,
      message: 'Product option created successfully'
    };
  } catch (error) {
    console.error('Error creating product option:', error);
    handleError(ctx, error);
  }
};

// Update option
export const updateOption = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    // Kiểm tra và lấy dữ liệu từ request
    let data;
    
    // Kiểm tra các cách khác nhau để lấy body
    if (ctx.req && ctx.req.body) {
      console.log('Update - Using ctx.req.body');
      data = ctx.req.body;
    } else if (ctx.request && ctx.request.body) {
      console.log('Update - Using ctx.request.body');
      data = ctx.request.body;
    } else {
      console.log('Update - No body found, trying to parse raw body');
      try {
        data = JSON.parse(ctx.request.rawBody || '{}');
      } catch (e) {
        console.error('Error parsing raw body:', e);
        data = {};
      }
    }
    
    // Log request data for debugging
    console.log('Update option request body:', data);
    console.log('Update params id:', id);
    
    // Check if option exists
    const option = await ProductOptionModel.findById(id);
    if (!option) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Product option not found'
      };
      return;
    }
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData = {};
    
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type) updateData.type = data.type;
    if (Array.isArray(data.positions)) updateData.positions = data.positions;
    
    const updatedOption = await ProductOptionModel.update(id, updateData);
    
    ctx.body = {
      success: true,
      data: updatedOption,
      message: 'Product option updated successfully'
    };
  } catch (error) {
    console.error('Error updating product option:', error);
    handleError(ctx, error);
  }
};

// Delete option
export const deleteOption = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const option = await ProductOptionModel.findById(id);
    if (!option) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Product option not found'
      };
      return;
    }
    
    await ProductOptionModel.delete(id);
    
    ctx.body = {
      success: true,
      message: 'Product option deleted successfully'
    };
  } catch (error) {
    handleError(ctx, error);
  }
};

// Add position to option
export const addPosition = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    // Kiểm tra và lấy dữ liệu từ request
    let positionData;
    
    // Kiểm tra các cách khác nhau để lấy body
    if (ctx.req && ctx.req.body) {
      console.log('AddPosition - Using ctx.req.body');
      positionData = ctx.req.body;
    } else if (ctx.request && ctx.request.body) {
      console.log('AddPosition - Using ctx.request.body');
      positionData = ctx.request.body;
    } else {
      console.log('AddPosition - No body found, trying to parse raw body');
      try {
        positionData = JSON.parse(ctx.request.rawBody || '{}');
      } catch (e) {
        console.error('Error parsing raw body:', e);
        positionData = {};
      }
    }
    
    // Log request data for debugging
    console.log('Add position request body:', positionData);
    console.log('Add position to option id:', id);
    
    if (!positionData || !positionData.name) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Position name is required'
      };
      return;
    }
    
    const option = await ProductOptionModel.findById(id);
    if (!option) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Product option not found'
      };
      return;
    }
    
    // Chuẩn bị dữ liệu vị trí
    const newPositionData = {
      name: positionData.name,
      basePrice: parseFloat(positionData.basePrice) || 0,
      default: Boolean(positionData.default),
      id: positionData.id
    };
    
    const position = await ProductOptionModel.addPosition(id, newPositionData);
    
    ctx.body = {
      success: true,
      data: position,
      message: 'Position added successfully'
    };
  } catch (error) {
    console.error('Error adding position:', error);
    handleError(ctx, error);
  }
};

// Remove position from option
export const removePosition = async (ctx) => {
  try {
    const { id, positionId } = ctx.params;
    
    const option = await ProductOptionModel.findById(id);
    if (!option) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Product option not found'
      };
      return;
    }
    
    const result = await ProductOptionModel.removePosition(id, positionId);
    
    ctx.body = {
      success: true,
      data: result,
      message: 'Position removed successfully'
    };
  } catch (error) {
    handleError(ctx, error);
  }
}; 