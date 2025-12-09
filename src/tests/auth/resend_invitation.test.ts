import request from 'supertest';
import app from '../../index';
import { prisma } from '../../core';
import * as utils from '../../core/utils';
import bcrypt from 'bcryptjs';

// Mock the sendEmail function
jest.mock('../../core/utils', () => ({
    ...jest.requireActual('../../core/utils'),
    sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

describe('Resend Verification Endpoint', () => {
    const testUser = {
        email: 'unverified@example.com',
        password: 'TestPassword123',
        hashedPassword: bcrypt.hashSync('TestPassword123', 10)
    };

    beforeEach(async () => {
        // Reset the mock before each test
        jest.clearAllMocks();
        
        // Create an unverified user
        await prisma.user.create({
            data: {
                email: testUser.email,
                password: testUser.hashedPassword,
                username: testUser.email.split('@')[0],
                isVerified: false
            }
        });
    });

    afterEach(async () => {
        // Clean up tokens and user
        await prisma.token.deleteMany({ where: { user: { email: testUser.email } } });
        await prisma.user.deleteMany({ where: { email: testUser.email } });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should resend verification email successfully', async () => {
        const response = await request(app)
            .post('/api/auth/resend-verification')
            .send({
                email: testUser.email
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Verification email resent');

        // Verify sendEmail was called
        expect(utils.sendEmail).toHaveBeenCalledTimes(1);
        expect(utils.sendEmail).toHaveBeenCalledWith(
            testUser.email,
            'verifyEmail',
            expect.objectContaining({
                subject: 'Verify your email'
            })
        );

        // Verify token was created
        const token = await prisma.token.findFirst({
            where: {
                user: { email: testUser.email },
                type: 'EMAIL_VERIFICATION'
            }
        });
        expect(token).not.toBeNull();
    });

    it('should reuse existing valid token', async () => {
        // Create an existing valid token
        const user = await prisma.user.findUnique({ where: { email: testUser.email } });
        const existingToken = await prisma.token.create({
            data: {
                userId: user!.id,
                expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
                type: 'EMAIL_VERIFICATION'
            }
        });

        const response = await request(app)
            .post('/api/auth/resend-verification')
            .send({
                email: testUser.email
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Verification email resent');

        // Verify only one token exists
        const tokens = await prisma.token.findMany({
            where: {
                userId: user!.id,
                type: 'EMAIL_VERIFICATION'
            }
        });
        expect(tokens.length).toBe(1);
    });

    it('should fail with missing email', async () => {
        const response = await request(app)
            .post('/api/auth/resend-verification')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email is required');
    });

    it('should fail with invalid email', async () => {
        const response = await request(app)
            .post('/api/auth/resend-verification')
            .send({
                email: 'nonexistent@example.com'
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid email');
    });

    it('should fail for already verified user', async () => {
        // Update user to verified
        await prisma.user.update({
            where: { email: testUser.email },
            data: { isVerified: true }
        });

        const response = await request(app)
            .post('/api/auth/resend-verification')
            .send({
                email: testUser.email
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email is already verified');
    });

    it('should handle email sending failure', async () => {
        // Mock sendEmail to return failure
        (utils.sendEmail as jest.Mock).mockResolvedValueOnce({ 
            success: false, 
            error: 'SMTP error' 
        });

        const response = await request(app)
            .post('/api/auth/resend-verification')
            .send({
                email: testUser.email
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Failed to send verification email');
    });
});