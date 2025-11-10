import { Router } from 'express';
import financeController from '../controlers/finance';

const financeRouter = Router();

financeRouter.get('/accounts', financeController.getUserAccounts);
financeRouter.get('/accounts/:accountId', financeController.getUserAccount);
financeRouter.post('/accounts', financeController.createUserAccount);
financeRouter.delete('/accounts/:accountId', financeController.deleteUserAccount);
financeRouter.put('/accounts/:accountId', financeController.updateUserAccount);
financeRouter.get('/currencies', financeController.getSupportedCurrencies);

financeRouter.get('/accounts/:accountId/transactions', financeController.getAccountTransactions);
financeRouter.post('/accounts/:accountId/transactions', financeController.createAccountTransaction);
financeRouter.delete('/accounts/:accountId/transactions/:transactionId', financeController.deleteAccountTransaction);
financeRouter.put('/accounts/:accountId/transactions/:transactionId', financeController.updateAccountTransaction);

financeRouter.get('/accounts/:accountId/categories', financeController.getAccountCategories);
financeRouter.get('/accounts/:accountId/categories/:categoryId', financeController.getAccountCategory);
financeRouter.post('/accounts/:accountId/categories', financeController.createAccountCategory);
financeRouter.delete('/accounts/:accountId/categories/:categoryId', financeController.deleteAccountCategory);
financeRouter.put('/accounts/:accountId/categories/:categoryId', financeController.updateAccountCategory);

export default financeRouter;