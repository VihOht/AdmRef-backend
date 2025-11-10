import { Router } from 'express'
import authRouter from './auth'
import financeRouter from './finance'


const mainRouter = Router()

mainRouter.use('/auth', authRouter)
mainRouter.use('/finance', financeRouter)

export { mainRouter };