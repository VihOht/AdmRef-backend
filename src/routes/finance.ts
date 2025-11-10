import { Router } from 'express';
import financeController from '../controlers/finance';

const financeRouter = Router();

financeRouter.get('/accounts', financeController.getUserAccounts);
financeRouter.get('/accounts/:accountId', financeController.getUserAccount);
financeRouter.post('/accounts', financeController.createUserAccount);
financeRouter.delete('/accounts/:accountId', financeController.deleteUserAccount);
financeRouter.put('/accounts/:accountId', financeController.updateUserAccount);
financeRouter.get('/currencies', financeController.getSupportedCurrencies);

export default financeRouter;