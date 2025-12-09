import request from 'supertest';
import app from '../../index';
import { prisma } from '../../core';
import * as utils from '../../core/utils';

// Mock the sendEmail function
jest.mock('../../core/utils', () => ({
    ...jest.requireActual('../../core/utils'),
    sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

describe('Register Endpoint', () => {
    const testUser = {
        email: 'newuser@example.com',
        password: 'TestPassword123'
    };

    beforeEach(() => {
        // Reset the mock before each test
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Clean up the test user from the database
        await prisma.token.deleteMany({ where: { user: { email: testUser.email } } });
        await prisma.user.deleteMany({ where: { email: testUser.email } });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should register successfully with valid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'User registered, check your email to verify your account');

        // Verify the user was created in the database
        const user = await prisma.user.findUnique({ where: { email: testUser.email } });
        expect(user).not.toBeNull();
        expect(user?.isVerified).toBe(false);

        // Verify sendEmail was called
        expect(utils.sendEmail).toHaveBeenCalledTimes(1);
        expect(utils.sendEmail).toHaveBeenCalledWith(
            testUser.email,
            'verifyEmail',
            expect.objectContaining({
                subject: 'Verify your email'
            })
        );
    });

    it('should fail registration with existing email', async () => {
        // Create a user first
        await request(app)
            .post('/api/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        // Try to register again with the same email
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should fail registration with missing email', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                password: testUser.password
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email and password are required');
    });

    it('should fail registration with missing password', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: testUser.email
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email and password are required');
    });

    it('should fail registration with missing fields', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email and password are required');
    });

    it('should handle email sending failure', async () => {
        // Mock sendEmail to return failure
        (utils.sendEmail as jest.Mock).mockResolvedValueOnce({ success: false, error: 'SMTP error' });

        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Failed to send verification email');
    });
});