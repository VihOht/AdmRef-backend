import { Request, Response } from 'express';
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma, sendEmail } from '../core/utils'


/**
 * Register a new user with email and password.
 * @param req - Request object containing `email` and `password` in the body
 * @param res - Response object to send back the result
 * @returns JSON response indicating success or failure of registration
 */
export const register = async (req: Request, res: Response) => {
    const { email, password }: { email: string; password: string } = req.body ;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required'})
    };

    const existingUser = await prisma.user.findUnique( { where: { email: email } } )
    if (existingUser) {
        return res.status(409).json({ message: 'User already exists'})
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    const username = email.split("@")[0]

    const newUser = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            username,
        }
    })

    const verificationToken = await prisma.token.create({
        data: {
            userId: newUser.id,
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
            type: 'EMAIL_VERIFICATION'
        }
    })


    const verificationLink = `${process.env.FRONTEND_URL}/auth/verify?email=${email}&token=${verificationToken.id}`;
    const result = await sendEmail(email, 'verifyEmail', { verificationLink, subject: 'Verify your email' });    
    if (!result.success) {
        return res.status(500).json({ message: 'Failed to send verification email' + result.error })
    }
    return res.status(201).json({ message: 'User registered, check your email to verify your account'})
}


/**
 * Verify user's email using the provided token.
 * @param req - Request object containing `email` and `token` in the body
 * @param res - Response object to send back the result
 * @returns JSON response indicating success or failure of email verification
 */
export const verifyEmail = async (req: Request, res: Response) => {
    const { email, token } : { email: string; token: string } = req.body as any;

    if (!email || !token) {
        return res.status(400).json({ message: 'Email and token are required'})
    }

    const user = await prisma.user.findUnique( { where: { email: email } } )
    if (!user) {
        return res.status(400).json({ message: 'Invalid email or token'})
    }

    if (user.isVerified) {
        return res.status(400).json({ message: 'Email is already verified'})
    }

    const storedToken = await prisma.token.findUnique( { where: { id: token } } )
    if (!storedToken || storedToken.userId !== user.id || storedToken.usedAt || storedToken.expiresAt < new Date() || storedToken.type !== 'EMAIL_VERIFICATION') {
        return res.status(400).json({ message: 'Invalid or expired token'})
    }

    await prisma.user.update( { where: { id: user.id }, data: { isVerified: true } } )
    await prisma.token.update( { where: { id: storedToken.id }, data: { usedAt: new Date() } } )

    return res.status(200).json({ message: 'Email verified successfully'})
}

/**
 * Resend verification email to the user.
 * @param req - Request object containing `email` in the body
 * @param res - Response object to send back the result
 * @returns JSON response indicating success or failure of resending verification email
 */
export const resendVerification = async (req: Request, res: Response) => {
    const { email } : { email: string } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required'})
    }

    const user = await prisma.user.findUnique( { where: { email: email } } )
    if (!user) {
        return res.status(400).json({ message: 'Invalid email'})
    }

    if (user.isVerified) {
        return res.status(400).json({ message: 'Email is already verified'})
    }

    const existingToken = await prisma.token.findFirst( { where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() }, type: 'EMAIL_VERIFICATION' } } )
    let verificationToken;
    if (existingToken) {
        prisma.token.update( { where: { id: existingToken.id }, data: { expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) } } )
        verificationToken = existingToken;
    } else {
        verificationToken = await prisma.token.create({
            data: {
                userId: user.id,
                expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
                type: 'EMAIL_VERIFICATION'
            }
        })}

    const verificationLink = `${process.env.FRONTEND_URL}/auth/verify?email=${email}&token=${verificationToken.id}`;
    const result = await sendEmail(email, 'verifyEmail', { verificationLink, subject: 'Verify your email' });    
    if (!result.success) {
        return res.status(500).json({ message: 'Failed to send verification email' + result.error })
    }    
    return res.status(200).json({ message: 'Verification email resent'})
}

/**
 * User login with email and password.
 * @param req - Request object containing `email` and `password` in the body
 * @param res - Response object to send back the result
 * @returns JSON response containing JWT `token` on successful login
 */
export const login = async (req: Request, res: Response) => {
    const { email, password }: { email: string, password: string} = req.body
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required'})
    }

    const user = await prisma.user.findUnique( { where: { email: email } } )
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials'})
    }

    const passwordMatch = bcrypt.compareSync(password, user.password)
    if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials'})
    }

    if (!user.isVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in'})
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "NotVerySecure", { expiresIn: '6h'})
    return res.status(200).json({ token });
}

export const me = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({ where: {id: userId}, select: {email: true, username: true}})
    return res.status(200).json(user);
}

export default { register, verifyEmail, resendVerification, login, me }