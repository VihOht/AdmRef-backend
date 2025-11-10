import { Router } from 'express'
import authController from '../controlers/auth'

const router = Router()

router.post('/register', authController.register)
router.post('/verify', authController.verifyEmail)
router.post('/resend-verification', authController.resendVerification)
router.post('/login', authController.login)
router.get('/me', authController.me)

export default router