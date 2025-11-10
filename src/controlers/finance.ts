import { prisma, currecys } from '../utils'
import { Request, Response } from 'express'


// Account Controllers

export const getUserAccounts = async (req: Request, res: Response) => {
    const userId = (req as any).userId

    const accounts = await prisma.account.findMany({
        where: { userId }, select: {
            id: true,
            name: true,
            balance: true,
            currency: true
        }
    })
    if (!accounts || accounts.length === 0) {
        return res.status(404).json({ message: 'No accounts found for this user.' })
    }

    return res.status(200).json(accounts)
}

export const getUserAccount = async (req: Request, res: Response) => {
    const { accountId } = req.params
    const userId = (req as any).userId

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId },
        select: {
            id: true,
            name: true,
            balance: true,
            currency: true,
            transactions: {
                select: {
                    id: true,
                    amount: true,
                    description: true,
                    type: true,
                    createdAt: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                            description: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 50
            },
            createdAt: true,
            updatedAt: true
        }
    })

    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }
    return res.status(200).json(account)
}

export const createUserAccount = async (req: Request, res: Response) => {
    const userId = (req as any).userId
    const { name, currency } = req.body

    if (!name || !currency) {
        return res.status(400).json({ message: 'Name and currency are required to create an account.' })
    }

    if (!currecys.includes(currency)) {
        return res.status(400).json({ message: 'Invalid currency. Supported currencies are: ' + currecys.join(', ') })
    }

    const existingAccount = await prisma.account.findFirst({
        where: { userId, name }
    })

    if (existingAccount) {
        return res.status(409).json({ message: 'An account with this name already exists for the user.' })
    }

    const newAccount = await prisma.account.create({
        data: {
            userId,
            name,
            currency,
        },
    })

    return res.status(201).json(newAccount)
}

export const deleteUserAccount = async (req: Request, res: Response) => {
    const { accountId } = req.params
    const userId = (req as any).userId

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })

    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    await prisma.account.delete({
        where: { id: accountId }
    })

    return res.status(204).send();
}

export const updateUserAccount = async (req: Request, res: Response) => {
    const { accountId } = req.params
    const userId = (req as any).userId
    const { name, currency } = req.body

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })

    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    if (currency && !currecys.includes(currency)) {
        return res.status(400).json({ message: 'Invalid currency. Supported currencies are: ' + currecys.join(', ') })
    }
    if (!name && !currency) {
        return res.status(400).json({ message: 'At least one field (name or currency) must be provided for update.' })
    }
    
    if (name) {
        const existingAccount =  await prisma.account.findFirst({
            where: { userId, name, NOT: { id: accountId } }
        })
        if (existingAccount) {
            return res.status(409).json({ message: 'An account with this name already exists for the user.' })
        }
        prisma.account.update({
            where: { id: accountId },
            data: { name }
        })
    }
    if (currecys) {
        await prisma.account.update({
            where: { id: accountId },
            data: { name, currency }
        })
    }
    return res.status(200).json({ message: 'Account updated successfully.' })
}

export const getSupportedCurrencies = async (req: Request, res: Response) => {
    return res.status(200).json({ currencies: currecys })
}


export default { 
    getUserAccounts,
    getUserAccount,
    createUserAccount,
    deleteUserAccount,
    updateUserAccount,
    getSupportedCurrencies
 }