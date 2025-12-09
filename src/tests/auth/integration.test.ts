import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import { prisma } from '../../core';
import * as utils from '../../core/utils';

// Mock the sendEmail function
jest.mock('../../core/utils', () => ({
    ...jest.requireActual('../../core/utils'),
    sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

describe('Authentication Integration Test', () => {
    const testUser = {
        email: 'integration@example.com',
        password: 'TestPassword123'
    };

    let verificationToken: string;
    let loginToken: string;

    beforeAll(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // Clean up
        await prisma.token.deleteMany({ where: { user: { email: testUser.email } } });
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.$disconnect();
    });

    it('should register a user and intercept the verification token', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'User registered, check your email to verify your account');

        // Verify sendEmail was called
        expect(utils.sendEmail).toHaveBeenCalled();

        // Extract token from the email call
        const emailCall = (utils.sendEmail as jest.Mock).mock.calls[0];
        const emailData = emailCall[2];
        
        // Extract token from verification link or directly from data
        const verificationLink = emailData.verificationLink || emailData.link || emailData.token;
        if (typeof verificationLink === 'string') {
            const tokenMatch = verificationLink.match(/token=([^&]+)/);
            verificationToken = tokenMatch ? tokenMatch[1] : verificationLink;
        } else {
            // If token is passed directly in emailData
            verificationToken = emailData.token;
        }

        // If still no token, get it directly from database
        if (!verificationToken) {
            const user = await prisma.user.findUnique({ where: { email: testUser.email } });
            const token = await prisma.token.findFirst({
                where: {
                    userId: user!.id,
                    type: 'EMAIL_VERIFICATION'
                }
            });
            verificationToken = token!.id;
        }

        expect(verificationToken).toBeTruthy();

        // Verify user exists but is not verified
        const user = await prisma.user.findUnique({ where: { email: testUser.email } });
        expect(user).not.toBeNull();
        expect(user?.isVerified).toBe(false);
    });

    it('should resend verification and verify token was reused', async () => {
        const firstToken = verificationToken;
        const initialCallCount = (utils.sendEmail as jest.Mock).mock.calls.length;

        const response = await request(app)
            .post('/api/auth/resend-verification')
            .send({
                email: testUser.email
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Verification email resent');

        // Verify sendEmail was called again
        expect(utils.sendEmail).toHaveBeenCalledTimes(initialCallCount + 1);

        // Verify only one token exists in database
        const tokens = await prisma.token.findMany({
            where: {
                user: { email: testUser.email },
                type: 'EMAIL_VERIFICATION'
            }
        });
        expect(tokens.length).toBe(1);
        expect(tokens[0].id).toBe(firstToken);
    });

    it('should verify email with the reused token', async () => {
        const response = await request(app)
            .post('/api/auth/verify')
            .send({
                email: testUser.email,
                token: verificationToken
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Email verified successfully');

        // Verify user is now verified
        const user = await prisma.user.findUnique({ where: { email: testUser.email } });
        expect(user?.isVerified).toBe(true);

        // Verify token is marked as used
        const token = await prisma.token.findUnique({ where: { id: verificationToken } });
        expect(token?.usedAt).not.toBeNull();
    });

    it('should login and store the JWT token', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');

        // Store the token
        loginToken = response.body.token;

        // Verify the token is valid
        const decoded = jwt.verify(loginToken, process.env.JWT_SECRET || 'NotVerySecure') as any;
        expect(decoded).toHaveProperty('userId');
    });

    it('should verify user info with me endpoint using login token', async () => {
        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${loginToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('email', testUser.email);
        expect(response.body.user).toHaveProperty('username', testUser.email.split('@')[0]);
        // Only check isVerified if it's returned by the endpoint
        if (response.body.user.hasOwnProperty('isVerified')) {
            expect(response.body.user.isVerified).toBe(true);
        }
        expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail to login with unverified user after re-registration', async () => {
        // This tests the complete flow integrity
        const newUser = {
            email: 'integration2@example.com',
            password: 'TestPassword123'
        };

        // Register
        await request(app)
            .post('/api/auth/register')
            .send(newUser);

        // Try to login without verification
        const response = await request(app)
            .post('/api/auth/login')
            .send(newUser);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Please verify your email before logging in');

        // Cleanup
        await prisma.token.deleteMany({ where: { user: { email: newUser.email } } });
        await prisma.user.deleteMany({ where: { email: newUser.email } });
    });
});