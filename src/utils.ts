import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const unprotectedRoutes: string[] = [
    '/',
    '/api/auth/login',
    '/api/auth/verify',
    '/api/auth/resend-verification',
    '/api/auth/register',
]


export { prisma, unprotectedRoutes }