import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import { prisma } from '../../core';
import bcrypt from 'bcryptjs';

describe('Me Endpoint', () => {
    const testUser = {
        email: 'testme@example.com',
        password: 'TestPassword123',
        hashedPassword: bcrypt.hashSync('TestPassword123', 10),
        username: 'testme'
    };

    let userId: string;
    let token: string;

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
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.$disconnect();
    });

    it('should return user info with valid token', async () => {
        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('email', testUser.email);
        expect(response.body.user).toHaveProperty('username', testUser.username);
        expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail without authorization header', async () => {
        const response = await request(app)
            .get('/api/auth/me');

        expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
    });

    it('should fail with expired token', async () => {
        const expiredToken = jwt.sign({ userId }, process.env.JWT_SECRET || 'NotVerySecure', { expiresIn: '0s' });

        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
    });
});