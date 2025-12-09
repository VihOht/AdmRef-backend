import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../index';
import { prisma } from '../../core';
import { Currency, CategoryDomain, TransactionType } from '@prisma/client';

const toNum = (v: any) => (v?.toNumber ? v.toNumber() : Number(v ?? 0));

describe('Finance Integration - Accounts, Categories, Transactions', () => {
    const testUser = {
        email: 'finint@example.com',
        password: 'TestPassword123',
        hashedPassword: bcrypt.hashSync('TestPassword123', 10),
        username: 'finint'
    };

    let token: string;
    let userId: string;
    let enterpriseId: string;
    let personalId: string;

    const cats: Record<string, { income: string[]; expense: string[] }> = {
        enterprise: { income: [], expense: [] },
        personal: { income: [], expense: [] }
    };

    const txs: Record<string, string[]> = { enterprise: [], personal: [] };

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

        // Create two accounts
        const enterprise = await request(app)
            .post('/api/finance/accounts')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Enterprise', currency: Currency.USD });
        enterpriseId = enterprise.body.id;

        const personal = await request(app)
            .post('/api/finance/accounts')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Personal', currency: Currency.USD });
        personalId = personal.body.id;

        // Helper to create categories
        const createCats = async (accountId: string, key: 'enterprise' | 'personal') => {
            for (let i = 1; i <= 3; i++) {
                const inc = await request(app)
                    .post(`/api/finance/accounts/${accountId}/categories`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ name: `Inc${i}-${key}`, domain: CategoryDomain.INCOME });
                cats[key].income.push(inc.body.id);

                const exp = await request(app)
                    .post(`/api/finance/accounts/${accountId}/categories`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ name: `Exp${i}-${key}`, domain: CategoryDomain.EXPENSE });
                cats[key].expense.push(exp.body.id);
            }
        };

        await createCats(enterpriseId, 'enterprise');
        await createCats(personalId, 'personal');

        // Helper to create 8 tx per account, >=2 incomes & >=2 expenses, one without category
        const seedTx = async (accountId: string, key: 'enterprise' | 'personal') => {
            const payloads = [
                { amount: 500, description: 'Income 1', categoryId: cats[key].income[0] },
                { amount: 300, description: 'Income 2', categoryId: cats[key].income[1] },
                { amount: 150, description: 'Income 3', categoryId: cats[key].income[2] },
                { amount: -120, description: 'Expense 1', categoryId: cats[key].expense[0] },
                { amount: -80, description: 'Expense 2', categoryId: cats[key].expense[1] },
                { amount: -60, description: 'Expense 3', categoryId: cats[key].expense[2] },
                { amount: 50, description: 'Income 4', categoryId: cats[key].income[0] },
                { amount: -40, description: 'Expense no cat' } // the one without category
            ];
            for (const p of payloads) {
                const res = await request(app)
                    .post(`/api/finance/accounts/${accountId}/transactions`)
                    .set('Authorization', `Bearer ${token}`)
                    .send(p);
                txs[key].push(res.body.id);
            }
        };

        await seedTx(enterpriseId, 'enterprise');
        await seedTx(personalId, 'personal');
    });

    afterAll(async () => {
        await prisma.transaction.deleteMany({ where: { accountId: { in: [enterpriseId, personalId] } } });
        await prisma.category.deleteMany({ where: { accountId: { in: [enterpriseId, personalId] } } });
        await prisma.account.deleteMany({ where: { id: { in: [enterpriseId, personalId] } } });
        await prisma.user.deleteMany({ where: { id: userId } });
        await prisma.$disconnect();
    });

    describe('Enterprise account', () => {
        it('lists categories (3 income, 3 expense) for enterprise', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${enterpriseId}/categories`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            const inc = res.body.categories.filter((c: any) => c.domain === CategoryDomain.INCOME);
            const exp = res.body.categories.filter((c: any) => c.domain === CategoryDomain.EXPENSE);
            expect(inc.length).toBe(3);
            expect(exp.length).toBe(3);
        });

        it('has 8 transactions with >=2 incomes and >=2 expenses for enterprise', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${enterpriseId}/transactions`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            const txsList = res.body.transactions;
            expect(txsList.length).toBeGreaterThanOrEqual(8);
            const incomes = txsList.filter((t: any) => t.type === TransactionType.INCOME);
            const expenses = txsList.filter((t: any) => t.type === TransactionType.EXPENSE);
            expect(incomes.length).toBeGreaterThanOrEqual(2);
            expect(expenses.length).toBeGreaterThanOrEqual(2);
            const noCat = txsList.filter((t: any) => !t.categoryId);
            expect(noCat.length).toBeGreaterThanOrEqual(1);
        });

        it('balance matches sum of amounts for enterprise', async () => {
            const account = await prisma.account.findUnique({ where: { id: enterpriseId } });
            const sum = await prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { accountId: enterpriseId }
            });
            expect(toNum(account?.balance)).toBeCloseTo(toNum(sum._sum.amount));
        });
    });

    describe('Personal account', () => {
        it('lists categories (3 income, 3 expense) for personal', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${personalId}/categories`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.categories).toBeDefined();
            expect(Array.isArray(res.body.categories)).toBe(true);

            const inc = res.body.categories.filter((c: any) => c.domain === CategoryDomain.INCOME);
            const exp = res.body.categories.filter((c: any) => c.domain === CategoryDomain.EXPENSE);

            expect(inc.length).toBe(3);
            expect(exp.length).toBe(3);
        });

        it('has 8 transactions with >=2 incomes and >=2 expenses for personal', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${personalId}/transactions`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            const txsList = res.body.transactions;
            expect(txsList.length).toBeGreaterThanOrEqual(8);
            const incomes = txsList.filter((t: any) => t.type === TransactionType.INCOME);
            const expenses = txsList.filter((t: any) => t.type === TransactionType.EXPENSE);
            expect(incomes.length).toBeGreaterThanOrEqual(2);
            expect(expenses.length).toBeGreaterThanOrEqual(2);
            const noCat = txsList.filter((t: any) => !t.categoryId);
            expect(noCat.length).toBeGreaterThanOrEqual(1);
        });

        it('balance matches sum of amounts for personal', async () => {
            const account = await prisma.account.findUnique({ where: { id: personalId } });
            const sum = await prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { accountId: personalId }
            });
            expect(toNum(account?.balance)).toBeCloseTo(toNum(sum._sum.amount));
        });
    });
});