import { Router } from 'express'
import authController from '../controlers/auth'


/**
 * Router for authentication-related endpoints.
 * Handles user registration, login, email verification, and user info retrieval.
 * @returns {Router} - Express router for authentication endpoints
 */
const router = Router()

router.post('/register', authController.register) // Register a new user
router.post('/verify', authController.verifyEmail) // Verify user's email
router.post('/resend-verification', authController.resendVerification) // Resend verification email
router.post('/login', authController.login) // User login
router.get('/me', authController.me) // Get current authenticated user's information

export default router