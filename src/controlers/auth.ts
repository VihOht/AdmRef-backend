import { Request, Response } from 'express';
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../utils'

const register = async (req: Request, res: Response) => {
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
            isVerified: true
        }
    })
    
    return res.status(201).json({ message: 'User registered, check your email to verify your account'})
}

const login = async (req: Request, res: Response) => {
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

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "NotVerySecure", { expiresIn: '2h'})
    return res.status(200).json({ token });
}

const me = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({ where: {id: userId}, select: {email: true, username: true}})
    return res.status(200).json({ user });
}

export default { register, login, me }