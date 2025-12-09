import { Router } from 'express';
import { financeController } from '../controlers'


/**
 * Router for finance-related endpoints.
 * Handles account management, transactions, and categories.
 * All routes are protected and require authentication.
 * @returns {Router} - Express router for finance endpoints
 */
const financeRouter = Router();

financeRouter.get('/accounts', financeController.getUserAccounts); // Get all accounts for the authenticated user
financeRouter.get('/accounts/:accountId', financeController.getUserAccount); // Get a specific account by ID for the authenticated user
financeRouter.post('/accounts', financeController.createUserAccount); // Create a new account for the authenticated user
financeRouter.delete('/accounts/:accountId', financeController.deleteUserAccount); // Delete an account by ID for the authenticated user
financeRouter.put('/accounts/:accountId', financeController.updateUserAccount); // Update an account by ID for the authenticated user
financeRouter.get('/currencies', financeController.getSupportedCurrencies); // Get a list of supported currencies

financeRouter.get('/accounts/:accountId/transactions/:transactionId', financeController.getAccountTransaction); // Get a specific transaction by ID for a specific account
financeRouter.get('/accounts/:accountId/transactions', financeController.getAccountTransactions); // Get all transactions for a specific account
financeRouter.post('/accounts/:accountId/transactions', financeController.createAccountTransaction); // Create a new transaction for a specific account
financeRouter.delete('/accounts/:accountId/transactions/:transactionId', financeController.deleteAccountTransaction); // Delete a specific transaction from a specific account
financeRouter.put('/accounts/:accountId/transactions/:transactionId', financeController.updateAccountTransaction); // Update a specific transaction from a specific account

financeRouter.get('/accounts/:accountId/categories', financeController.getAccountCategories); // Get all categories for a specific account
financeRouter.get('/accounts/:accountId/categories/:categoryId', financeController.getAccountCategory); // Get a specific category by ID for a specific account
financeRouter.post('/accounts/:accountId/categories', financeController.createAccountCategory); // Create a new category for a specific account
financeRouter.delete('/accounts/:accountId/categories/:categoryId', financeController.deleteAccountCategory); // Delete a specific category from a specific account
financeRouter.put('/accounts/:accountId/categories/:categoryId', financeController.updateAccountCategory); // Update a specific category from a specific account

export default financeRouter;