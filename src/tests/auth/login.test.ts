import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import { prisma } from '../../core';
import bcrypt from 'bcryptjs';

describe('Login Endpoint', () => {
    const testUser = {
        email: 'testuser@example.com',
        password: "TestPassword123",
        hashedPassword: bcrypt.hashSync("TestPassword123", 10)
    };

    beforeAll(async () => {
        // Create a test user in the database
        await prisma.user.create({
            data: {
                email: testUser.email,
                password: testUser.hashedPassword, // In real scenario, this should be hashed
                isVerified: true,
            }
        });
    });

    afterAll(async () => {
        // Clean up the test user from the database
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.$disconnect();
    });

    it('should login successfully with valid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');

        // Verify the token
        const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || "NotVerySecure");
        expect(decoded).toHaveProperty('userId');
    });

    it('should fail login with invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'WrongPassword'
            });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should fail login with missing fields', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
});