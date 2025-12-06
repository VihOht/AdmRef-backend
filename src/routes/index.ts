import { Router } from 'express'
import authRouter from './auth'
import financeRouter from './finance'

/**
 * Main router that combines all route modules.
 * Routes are organized under specific paths for better structure.
 */
const mainRouter = Router()

mainRouter.use('/auth', authRouter) // Authentication routes
mainRouter.use('/finance', financeRouter) // Finance-related routes

export { mainRouter };