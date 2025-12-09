import request from 'supertest';
import app from '../../index';
import { prisma } from '../../core';
import bcrypt from 'bcryptjs';

describe('Verify Email Endpoint', () => {
    const testUser = {
        email: 'testverify@example.com',
        password: 'TestPassword123',
        hashedPassword: bcrypt.hashSync('TestPassword123', 10)
    };

    let userId: string;
    let validToken: string;

    beforeEach(async () => {
        // Create an unverified user
        const user = await prisma.user.create({
            data: {
                email: testUser.email,
                password: testUser.hashedPassword,
                username: testUser.email.split('@')[0],
                isVerified: false
            }
        });
        userId = user.id;

        // Create a valid verification token
        const token = await prisma.token.create({
            data: {
                userId: user.id,
                expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
                type: 'EMAIL_VERIFICATION'
            }
        });
        validToken = token.id;
    });

    afterEach(async () => {
        // Clean up tokens and user
        await prisma.token.deleteMany({ where: { user: { email: testUser.email } } });
        await prisma.user.deleteMany({ where: { email: testUser.email } });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should verify email successfully with valid token', async () => {
        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email,
                token: validToken
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Email verified successfully');

        // Verify user is now verified
        const user = await prisma.user.findUnique({ where: { email: testUser.email } });
        expect(user?.isVerified).toBe(true);

        // Verify token is marked as used
        const token = await prisma.token.findUnique({ where: { id: validToken } });
        expect(token?.usedAt).not.toBeNull();
    });

    it('should fail with missing email', async () => {
        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                token: validToken
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email and token are required');
    });

    it('should fail with missing token', async () => {
        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email and token are required');
    });

    it('should fail with invalid email', async () => {
        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: 'nonexistent@example.com',
                token: validToken
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid email or token');
    });

    it('should fail with invalid token', async () => {
        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email,
                token: 'invalid-token-id'
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });

    it('should fail with expired token', async () => {
        // Create an expired token
        const expiredToken = await prisma.token.create({
            data: {
                userId: userId,
                expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
                type: 'EMAIL_VERIFICATION'
            }
        });

        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email,
                token: expiredToken.id
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });

    it('should fail with already used token', async () => {
        // Mark token as used
        await prisma.token.update({
            where: { id: validToken },
            data: { usedAt: new Date() }
        });

        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email,
                token: validToken
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });

    it('should fail for already verified user', async () => {
        // Verify the user first
        await prisma.user.update({
            where: { id: userId },
            data: { isVerified: true }
        });

        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email,
                token: validToken
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email is already verified');
    });

    it('should fail with token belonging to different user', async () => {
        // Create another user
        const anotherUser = await prisma.user.create({
            data: {
                email: 'another@example.com',
                password: testUser.hashedPassword,
                username: 'another',
                isVerified: false
            }
        });

        // Create token for another user
        const anotherToken = await prisma.token.create({
            data: {
                userId: anotherUser.id,
                expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
                type: 'EMAIL_VERIFICATION'
            }
        });

        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email,
                token: anotherToken.id
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');

        // Cleanup
        await prisma.token.deleteMany({ where: { userId: anotherUser.id } });
        await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('should fail with wrong token type', async () => {
        // Create a token with different type
        const wrongTypeToken = await prisma.token.create({
            data: {
                userId: userId,
                expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
                type: 'PASSWORD_RESET' // Wrong type
            }
        });

        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email,
                token: wrongTypeToken.id
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });
});