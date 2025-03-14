import * as transactionService from '../services/transactionService.js';
import { CustomError } from '../exceptions/customError.js';

/**
 * Tạo yêu cầu nạp tiền
 */
export const createDeposit = async (ctx) => {
  const { user } = ctx.state;
  const { amount, note } = ctx.request.body;
  
  // Validate dữ liệu
  if (!amount || amount <= 0) {
    throw new CustomError('Invalid amount', 400);
  }
  
  // Xử lý upload ảnh chứng minh thanh toán
  let paymentProofUrl = null;
  if (ctx.request.files && ctx.request.files.paymentProof) {
    const file = ctx.request.files.paymentProof;
    paymentProofUrl = await transactionService.uploadPaymentProof(file, user.uid);
  } else {
    throw new CustomError('Payment proof is required', 400);
  }
  
  const newTransaction = await transactionService.createTransaction({
    userId: user.uid,
    type: 'deposit',
    amount,
    paymentProof: paymentProofUrl,
    note
  });
  
  ctx.status = 201;
  ctx.body = {
    success: true,
    message: 'Deposit request created successfully',
    data: newTransaction
  };
};

/**
 * Thanh toán đơn hàng
 */
export const payOrder = async (ctx) => {
  const { user } = ctx.state;
  const { orderId } = ctx.params;
  
  const result = await transactionService.payForOrder(user.uid, orderId);
  
  ctx.body = {
    success: true,
    message: 'Order paid successfully',
    data: result
  };
};

/**
 * Thanh toán nhiều đơn hàng từ batch import
 */
export const payBatchOrders = async (ctx) => {
  const { user } = ctx.state;
  const { batchId } = ctx.params;
  
  const result = await transactionService.payForBatchOrders(user.uid, batchId);
  
  ctx.body = {
    success: true,
    message: 'Batch orders paid successfully',
    data: result
  };
};

/**
 * Lấy lịch sử giao dịch của người dùng
 */
export const getUserTransactions = async (ctx) => {
  const { user } = ctx.state;
  const { type, status, page = 1, limit = 10 } = ctx.query;
  
  const transactions = await transactionService.getUserTransactions(
    user.uid, 
    type, 
    status,
    page,
    limit
  );
  
  ctx.body = {
    success: true,
    data: transactions
  };
};

/**
 * Lấy tất cả giao dịch (Admin only)
 */
export const getAllTransactions = async (ctx) => {
  const { type, status, page = 1, limit = 10 } = ctx.query;
  
  const transactions = await transactionService.getAllTransactions(
    type, 
    status,
    page,
    limit
  );
  
  ctx.body = {
    success: true,
    data: transactions
  };
};

/**
 * Xác nhận/từ chối giao dịch (Admin only)
 */
export const updateTransactionStatus = async (ctx) => {
  const { transactionId } = ctx.params;
  const { status, note } = ctx.request.body;
  
  if (!['completed', 'rejected'].includes(status)) {
    throw new CustomError('Invalid status', 400);
  }
  
  const updatedTransaction = await transactionService.updateTransactionStatus(
    transactionId,
    status,
    note
  );
  
  ctx.body = {
    success: true,
    message: `Transaction ${status}`,
    data: updatedTransaction
  };
}; 