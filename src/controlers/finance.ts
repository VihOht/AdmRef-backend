import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../utils'
import { Request, Response } from 'express'
import { CategoryDomain, Currency, TransactionType } from '@prisma/client'


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

    if (!Currency.hasOwnProperty(currency)) {
        return res.status(400).json({ message: 'Invalid currency. Supported currencies are: ' + Object.values(Currency).join(', ') })
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

    if (currency && !Object.values(Currency).includes(currency)) {
        return res.status(400).json({ message: 'Invalid currency. Supported currencies are: ' + Object.values(Currency).join(', ') })
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
    if (currency) {
        await prisma.account.update({
            where: { id: accountId },
            data: { name, currency }
        })
    }
    return res.status(200).json({ message: 'Account updated successfully.' })
}

export const getSupportedCurrencies = async (req: Request, res: Response) => {
    return res.status(200).json({ currencies: Object.values(Currency) })
}

// Transactions Controllers

export const getAccountTransaction = async (req: Request, res: Response) => {
    const { accountId, transactionId } = req.params
    const userId = (req as any).userId

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })
    
    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    const transaction = await prisma.transaction.findFirst({
        where: { id: transactionId,  accountId },
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
                    description: true,
                }
            },
            updatedAt: true
        }
    })
}

export const getAccountTransactions = async (req: Request, res: Response) => {
    const { accountId } = req.params
    const userId = (req as any).userId

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })
    
    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }
    const transactions = await prisma.transaction.findMany({
        where: { accountId },
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
                    description: true,
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return res.status(200).json({ transactions })
}

const createAccountTransaction = async (req: Request, res: Response) => {
    const { accountId } = req.params
    const userId = (req as any).userId
    const { amount, description, categoryId } = req.body

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })

    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    if (!amount) {
        return res.status(400).json({ message: 'Amount is required to create a transaction.' })
    }

    if (categoryId){
        const category = await prisma.category.findFirst({
            where: { id: categoryId, accountId }
        })
        if (!category) {
            return res.status(404).json({ message: 'Category not found for this account.' })
        }
    }


    const newTransaction = await prisma.transaction.create({
        data: {
            accountId,
            amount,
            description,
            type: amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
            categoryId
        }
    })

    const total = Decimal.add(account.balance, new Decimal(amount))

    await prisma.account.update({
        where: { id: accountId },
        data: { balance: total }
    })

    return res.status(201).json(newTransaction)
}

const deleteAccountTransaction = async (req: Request, res: Response) => {
    const { accountId, transactionId } = req.params
    const userId = (req as any).userId

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })

    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    const transaction = await prisma.transaction.findFirst({
        where: { id: transactionId, accountId }
    })

    if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found.' })
    }

    await prisma.transaction.delete({
        where: { id: transactionId }
    })

    const total = Decimal.sub(account.balance, new Decimal(transaction.amount))

    await prisma.account.update({
        where: { id: accountId },
        data: { balance: total }
    })

    return res.status(204).send();
}

const updateAccountTransaction = async (req: Request, res: Response) => {
    const { accountId, transactionId } = req.params
    const userId = (req as any).userId
    const { amount, description, categoryId } = req.body

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })

    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    const transaction = await prisma.transaction.findFirst({
        where: { id: transactionId, accountId }
    })

    if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found.' })
    }

    if (!amount && !description && !categoryId) {
        return res.status(400).json({ message: 'At least one field (amount, description, categoryId) must be provided for update.' })
    }

    let updatedAmount = transaction.amount
    let type = transaction.type
    if (amount !== undefined) {
        updatedAmount = amount
        type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE
    }

    const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
            amount: updatedAmount,
            description: description !== undefined ? description : transaction.description,
            categoryId: categoryId !== undefined ? categoryId : transaction.categoryId,
            type: type
        }
    })

    if (amount !== undefined) {
        const balanceAdjustment = Decimal.sub(new Decimal(updatedAmount), new Decimal(transaction.amount))
        const newBalance = Decimal.add(account.balance, balanceAdjustment)

        await prisma.account.update({
            where: { id: accountId },
            data: { balance: newBalance }
        })
    }

    return res.status(200).json(updatedTransaction)
}

// Categories Controllers

const getAccountCategories = async (req: Request, res: Response) => {
    const { accountId } = req.params
    const userId = (req as any).userId

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })
    
    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }
    const categories = await prisma.category.findMany({
        where: { accountId },
        select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: {
            name: 'asc'
        }
    })

    return res.status(200).json({ categories })
}

const getAccountCategory = async (req: Request, res: Response) => {
    const { accountId, categoryId } = req.params
    const userId = (req as any).userId

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })
    
    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    const category = await prisma.category.findFirst({
        where: { id: categoryId, accountId },
        select: {
            id: true,
            accountId: true,
            name: true,
            domain: true,
            description: true,
            createdAt: true,
            updatedAt: true
        }
    })

    if (!category) {
        return res.status(404).json({ message: 'Category not found for this account.' })
    }

    return res.status(200).json(category)
}

const createAccountCategory = async (req: Request, res: Response) => {
    const { accountId } = req.params
    const userId = (req as any).userId
    const { name, description, domain } = req.body
    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })
    
    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }
    if (!name || !domain) {
        return res.status(400).json({ message: 'Name and domain are required to create a category.' })
    }

    if (!Object.values(CategoryDomain).includes(domain)) {
        return res.status(400).json({ message: 'Invalid domain. Supported domains are: ' + Object.values(CategoryDomain).join(', ') })
    }

    const existingCategory = await prisma.category.findFirst({
        where: { accountId, name }
    })
    if (existingCategory) {
        return res.status(409).json({ message: 'A category with this name already exists for the account.' })
    }

    const newCategory = await prisma.category.create({
        data: {
            accountId,
            name,
            description: description || '',
            domain
        }
    })

    return res.status(201).json(newCategory)
}

const deleteAccountCategory = async (req: Request, res: Response) => {
    const { accountId, categoryId } = req.params
    const userId = (req as any).userId

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })
    
    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    const category = await prisma.category.findFirst({
        where: { id: categoryId, accountId }
    })

    if (!category) {
        return res.status(404).json({ message: 'Category not found for this account.' })
    }

    await prisma.category.delete({
        where: { id: categoryId }
    })

    return res.status(204).send();
}

const updateAccountCategory = async (req: Request, res: Response) => {
    const { accountId, categoryId } = req.params
    const userId = (req as any).userId
    const { name, description, domain } = req.body

    const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
    })

    if (!account) {
        return res.status(404).json({ message: 'Account not found.' })
    }

    const category = await prisma.category.findFirst({
        where: { id: categoryId, accountId }
    })

    if (!category) {
        return res.status(404).json({ message: 'Category not found for this account.' })
    }

    if (domain && !Object.values(CategoryDomain).includes(domain)) {
        return res.status(400).json({ message: 'Invalid domain. Supported domains are: ' + Object.values(CategoryDomain).join(', ') })
    }

    const updatedCategory = await prisma.category.update({
        where: { id: categoryId },
        data: {
            name: name || category.name,
            description: description !== undefined ? description : category.description,
            domain: domain || category.domain
        }
    })

    return res.status(200).json(updatedCategory)
}





export default { 
    getUserAccounts,
    getUserAccount,
    createUserAccount,
    deleteUserAccount,
    updateUserAccount,
    getSupportedCurrencies,

    getAccountTransactions,
    createAccountTransaction,
    deleteAccountTransaction,
    updateAccountTransaction,

    getAccountCategories,
    getAccountCategory,
    createAccountCategory,
    deleteAccountCategory,
    updateAccountCategory
 }