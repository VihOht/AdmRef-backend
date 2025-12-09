import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import { prisma } from '../../core';
import bcrypt from 'bcryptjs';
import { Currency } from '@prisma/client';

describe('Finance - Accounts Endpoints', () => {
    const testUser = {
        email: 'financetest@example.com',
        password: 'TestPassword123',
        hashedPassword: bcrypt.hashSync('TestPassword123', 10),
        username: 'financetest'
    };

    let userId: string;
    let token: string;
    let accountId: string;

    beforeAll(async () => {
        // Create a verified user
        const user = await prisma.user.create({
            data: {
                email: testUser.email,
                password: testUser.hashedPassword,
                username: testUser.username,
                isVerified: true
            }
        });
        userId = user.id;

        // Generate a valid JWT token
        token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'NotVerySecure', { expiresIn: '6h' });
    });

    afterAll(async () => {
        // Clean up
        await prisma.transaction.deleteMany({ where: { account: { userId } } });
        await prisma.category.deleteMany({ where: { account: { userId } } });
        await prisma.account.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.$disconnect();
    });

    describe('GET /api/finance/currencies', () => {
        it('should return list of supported currencies', async () => {
            const response = await request(app)
                .get('/api/finance/currencies')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('currencies');
            expect(Array.isArray(response.body.currencies)).toBe(true);
            expect(response.body.currencies).toContain('USD');
        });
    });

    describe('POST /api/finance/accounts', () => {
        it('should create a new account successfully', async () => {
            const response = await request(app)
                .post('/api/finance/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Account',
                    currency: Currency.USD
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', 'Test Account');
            expect(response.body).toHaveProperty('currency', Currency.USD);
            expect(response.body).toHaveProperty('balance');

            accountId = response.body.id;
        });

        it('should fail to create account without authentication', async () => {
            const response = await request(app)
                .post('/api/finance/accounts')
                .send({
                    name: 'Test Account',
                    currency: Currency.USD
                });

            expect(response.status).toBe(401);
        });

        it('should fail to create account with missing name', async () => {
            const response = await request(app)
                .post('/api/finance/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currency: Currency.USD
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message', 'Name and currency are required to create an account.');
        });

        it('should fail to create account with missing currency', async () => {
            const response = await request(app)
                .post('/api/finance/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Account'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message', 'Name and currency are required to create an account.');
        });

        it('should fail to create account with invalid currency', async () => {
            const response = await request(app)
                .post('/api/finance/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Account',
                    currency: 'INVALID'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid currency');
        });

        it('should fail to create duplicate account', async () => {
            const response = await request(app)
                .post('/api/finance/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Account',
                    currency: Currency.USD
                });

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('message', 'An account with this name already exists for the user.');
        });
    });

    describe('GET /api/finance/accounts', () => {
        it('should return all user accounts', async () => {
            const response = await request(app)
                .get('/api/finance/accounts')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('balance');
            expect(response.body[0]).toHaveProperty('currency');
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .get('/api/finance/accounts');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/finance/accounts/:accountId', () => {
        it('should return a specific account with details', async () => {
            const response = await request(app)
                .get(`/api/finance/accounts/${accountId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', accountId);
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('balance');
            expect(response.body).toHaveProperty('currency');
            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });

        it('should fail with invalid account ID', async () => {
            const response = await request(app)
                .get('/api/finance/accounts/invalid-id')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('message', 'Account not found.');
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .get(`/api/finance/accounts/${accountId}`);

            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/finance/accounts/:accountId', () => {
        it('should update account name successfully', async () => {
            const response = await request(app)
                .put(`/api/finance/accounts/${accountId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Updated Account' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('account');

            // Verify persisted value
            const updated = await prisma.account.findUnique({ where: { id: accountId } });
            expect(updated?.name).toBe('Updated Account');
        });

        it('should update account currency successfully', async () => {
            const response = await request(app)
                .put(`/api/finance/accounts/${accountId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currency: Currency.EUR
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('account');
            expect(response.body.account).toHaveProperty('currency', Currency.EUR);
        });

        it('should fail to update with invalid currency', async () => {
            const response = await request(app)
                .put(`/api/finance/accounts/${accountId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currency: 'INVALID'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid currency');
        });

        it('should fail to update without any fields', async () => {
            const response = await request(app)
                .put(`/api/finance/accounts/${accountId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message', 'At least one field (name or currency) must be provided for update.');
        });

        it('should fail with duplicate account name', async () => {
            // Create another account
            const newAccount = await request(app)
                .post('/api/finance/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Another Account',
                    currency: Currency.USD
                });

            // Try to update with existing name
            const response = await request(app)
                .put(`/api/finance/accounts/${newAccount.body.id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Updated Account'
                });

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('message', 'An account with this name already exists for the user.');
        });

        it('should fail with invalid account ID', async () => {
            const response = await request(app)
                .put('/api/finance/accounts/invalid-id')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Updated Name'
                });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('message', 'Account not found.');
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .put(`/api/finance/accounts/${accountId}`)
                .send({
                    name: 'Updated Name'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('DELETE /api/finance/accounts/:accountId', () => {
        it('should delete an account successfully', async () => {
            // Create a temporary account to delete
            const tempAccount = await request(app)
                .post('/api/finance/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Temp Account',
                    currency: Currency.USD
                });

            const response = await request(app)
                .delete(`/api/finance/accounts/${tempAccount.body.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(204);

            // Verify account is deleted
            const getResponse = await request(app)
                .get(`/api/finance/accounts/${tempAccount.body.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(getResponse.status).toBe(404);
        });

        it('should fail with invalid account ID', async () => {
            const response = await request(app)
                .delete('/api/finance/accounts/invalid-id')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('message', 'Account not found.');
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .delete(`/api/finance/accounts/${accountId}`);

            expect(response.status).toBe(401);
        });
    });
});