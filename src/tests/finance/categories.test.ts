import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../index';
import { prisma } from '../../core';
import { Currency, CategoryDomain } from '@prisma/client';

describe('Finance - Categories Endpoints', () => {
    const testUser = {
        email: 'financetcat@example.com',
        password: 'TestPassword123',
        hashedPassword: bcrypt.hashSync('TestPassword123', 10),
        username: 'financetcat'
    };

    let userId: string;
    let token: string;
    let accountId: string;
    let categoryId: string;

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
            data: { userId, name: 'Cat Account', currency: Currency.USD }
        });
        accountId = account.id;
    });

    afterAll(async () => {
        await prisma.category.deleteMany({ where: { accountId } });
        await prisma.account.deleteMany({ where: { id: accountId } });
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.$disconnect();
    });

    describe('POST /api/finance/accounts/:accountId/categories', () => {
        it('creates a category successfully', async () => {
            const res = await request(app)
                .post(`/api/finance/accounts/${accountId}/categories`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Income',
                    domain: CategoryDomain.INCOME,
                    description: 'Income cat'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('domain', CategoryDomain.INCOME);
            categoryId = res.body.id;
        });

        it('fails without auth', async () => {
            const res = await request(app)
                .post(`/api/finance/accounts/${accountId}/categories`)
                .send({ name: 'NoAuth', domain: CategoryDomain.INCOME });
            expect(res.status).toBe(401);
        });

        it('fails with missing fields', async () => {
            const res = await request(app)
                .post(`/api/finance/accounts/${accountId}/categories`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'NoDomain' });
            expect(res.status).toBe(400);
        });

        it('fails with invalid domain', async () => {
            const res = await request(app)
                .post(`/api/finance/accounts/${accountId}/categories`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Bad', domain: 'GENERAL' });
            expect(res.status).toBe(400);
        });

        it('fails with duplicate name', async () => {
            const res = await request(app)
                .post(`/api/finance/accounts/${accountId}/categories`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Income', domain: CategoryDomain.EXPENSE });
            expect(res.status).toBe(409);
        });
    });

    describe('GET /api/finance/accounts/:accountId/categories', () => {
        it('lists categories for the account', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${accountId}/categories`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('categories');
            expect(Array.isArray(res.body.categories)).toBe(true);
            expect(res.body.categories.length).toBeGreaterThan(0);
        });

        it('fails without auth', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${accountId}/categories`);
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/finance/accounts/:accountId/categories/:categoryId', () => {
        it('gets a specific category', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${accountId}/categories/${categoryId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', categoryId);
            expect(res.body).toHaveProperty('name', 'Income');
        });

        it('fails with invalid id', async () => {
            const res = await request(app)
                .get(`/api/finance/accounts/${accountId}/categories/invalid`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/finance/accounts/:accountId/categories/:categoryId', () => {
        it('updates category fields', async () => {
            const res = await request(app)
                .put(`/api/finance/accounts/${accountId}/categories/${categoryId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Updated Income', description: 'Updated desc' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Updated Income');
            expect(res.body).toHaveProperty('description', 'Updated desc');
        });

        it('fails with invalid domain', async () => {
            const res = await request(app)
                .put(`/api/finance/accounts/${accountId}/categories/${categoryId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ domain: 'GENERAL' });
            expect(res.status).toBe(400);
        });

        it('fails when account not found', async () => {
            const res = await request(app)
                .put(`/api/finance/accounts/invalid/categories/${categoryId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'x' });
            expect(res.status).toBe(404);
        });

        it('fails when category not found', async () => {
            const res = await request(app)
                .put(`/api/finance/accounts/${accountId}/categories/invalid`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'x' });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/finance/accounts/:accountId/categories/:categoryId', () => {
        it('deletes a category', async () => {
            const res = await request(app)
                .delete(`/api/finance/accounts/${accountId}/categories/${categoryId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(204);

            const check = await request(app)
                .get(`/api/finance/accounts/${accountId}/categories/${categoryId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(check.status).toBe(404);
        });

        it('fails with invalid id', async () => {
            const res = await request(app)
                .delete(`/api/finance/accounts/${accountId}/categories/invalid`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('fails without auth', async () => {
            const res = await request(app)
                .delete(`/api/finance/accounts/${accountId}/categories/${categoryId}`);
            expect(res.status).toBe(401);
        });
    });
});