import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../index';
import { prisma } from '../../core';
import { Currency, TransactionType, CategoryDomain } from '@prisma/client';

describe('Finance - Transactions Endpoints', () => {
    const testUser = {
        email: 'financetx@example.com',
        password: 'TestPassword123',
        hashedPassword: bcrypt.hashSync('TestPassword123', 10),
        username: 'financetx'
    };

    let userId: string;
    let token: string;
    let accountId: string;
    let categoryId: string;
    let transactionId: string;

    beforeAll(async () => {
        const user = await prisma.user.create({
            data: {
                email: testUser.email,
                password: testUser.hashedPassword,
                username: testUser.username,
                isVerified: true
            }
        });
        userId = user.id;
        token = jwt.sign({ userId }, process.env.JWT_SECRET || 'NotVerySecure', { expiresIn: '6h' });

        const account = await prisma.account.create({
            data: { userId, name: 'Tx Account', currency: Currency.USD }
        });
        accountId = account.id;

        const cat = await prisma.category.create({
            data: { accountId, name: 'General', domain: CategoryDomain.INCOME, description: 'General' }
        });
        categoryId = cat.id;
    });

    afterAll(async () => {
        await prisma.transaction.deleteMany({ where: { accountId } });
        await prisma.category.deleteMany({ where: { accountId } });
        await prisma.account.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.$disconnect();
    });

    describe('POST /api/finance/accounts/:accountId/transactions', () => {
        it('creates an income transaction and updates balance', async () => {
            const response = await request(app)
                .post(`/api/finance/accounts/${accountId}/transactions`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 100,
                    description: 'Salary',
                    categoryId
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('type', TransactionType.INCOME);

            transactionId = response.body.id;

            const account = await prisma.account.findUnique({ where: { id: accountId } });
            expect(account?.balance.toNumber ? account.balance.toNumber() : Number(account?.balance)).toBe(100);
        });

        it('fails with missing amount', async () => {
            const res = await request(app)
                .post(`/api/finance/accounts/${accountId}/transactions`)
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'No amount' });

            expect(res.status).toBe(400);
        });

        it('fails with invalid account', async () => {
            const res = await request(app)
                .post(`/api/finance/accounts/invalid/transactions`)
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 10 });

            expect(res.status).toBe(404);
        });

        it('fails with category not in account', async () => {
            const otherAccount = await prisma.account.create({
                data: { userId, name: 'Other', currency: Currency.USD }
            });
            const otherCat = await prisma.category.create({
                data: { accountId: otherAccount.id, name: 'OtherCat', domain: CategoryDomain.EXPENSE }
            });

            const res = await request(app)
                .post(`/api/finance/accounts/${accountId}/transactions`)
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 5, categoryId: otherCat.id });

            expect(res.status).toBe(404);

            await prisma.category.delete({ where: { id: otherCat.id } });
            await prisma.account.delete({ where: { id: otherAccount.id } });
        });
    });

    describe('GET /api/finance/accounts/:accountId/transactions', () => {
        it('lists transactions for the account', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${accountId}/transactions`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('transactions');
            expect(Array.isArray(res.body.transactions)).toBe(true);
            expect(res.body.transactions.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/finance/accounts/:accountId/transactions/:transactionId', () => {
        it('gets a specific transaction', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${accountId}/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', transactionId);
            expect(res.body).toHaveProperty('amount');
        });
    });

    describe('PUT /api/finance/accounts/:accountId/transactions/:transactionId', () => {
        it('updates amount and adjusts balance/type', async () => {
            const res = await request(app)
                .put(`/api/finance/accounts/${accountId}/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: -50, description: 'Groceries' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', transactionId);
            expect(res.body).toHaveProperty('type', TransactionType.EXPENSE);

            const toNum = (v: any) => v?.toNumber ? v.toNumber() : Number(v ?? 0);

            const account = await prisma.account.findUnique({ where: { id: accountId } });
            const sum = await prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { accountId }
            });
            const expectedBalance = toNum(sum._sum.amount);

            expect(toNum(account?.balance)).toBe(expectedBalance);
        });

        it('fails when no fields provided', async () => {
            const res = await request(app)
                .put(`/api/finance/accounts/${accountId}/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/finance/accounts/:accountId/transactions/:transactionId', () => {
        it('deletes transaction and updates balance', async () => {
            const res = await request(app)
                .delete(`/api/finance/accounts/${accountId}/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(204);

            const toNum = (v: any) => v?.toNumber ? v.toNumber() : Number(v ?? 0);

            const account = await prisma.account.findUnique({ where: { id: accountId } });
            const sum = await prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { accountId }
            });
            const expectedBalance = toNum(sum._sum.amount);

            expect(toNum(account?.balance)).toBe(expectedBalance);

            const getRes = await request(app)
                .get(`/api/finance/accounts/${accountId}/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body).toBeNull();
        });

        it('fails with invalid transaction id', async () => {
            const res = await request(app)
                .delete(`/api/finance/accounts/${accountId}/transactions/invalid`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});