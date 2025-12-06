import { PrismaClient, Prisma } from "@prisma/client";
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';

/**
 * Prisma Client instance for database interactions.
 * @see https://www.prisma.io/docs/concepts/components/prisma-client
 */
const prisma = new PrismaClient()

/**
 * List of routes that do not require authentication.
 * These routes can be accessed without a valid JWT token.
 * Modify this list as needed to include all unprotected routes.
 */
const unprotectedRoutes: string[] = [
    '/',
    '/api/auth/login',
    '/api/auth/verify',
    '/api/auth/resend-verification',
    '/api/auth/register',
]
/**
 * Sends an email using a specified HTML template and data.
 * @param to - Recipient email address
 * @param html - Name of the HTML template file (without extension)
 * @param data - Data to be injected into the template
 * 
 * @returns { success: boolean, error?: string } - An object indicating success or failure of the email sending operation
 */
const sendEmail = async (to: string, html: string, data: any) => {
    
    const templatePath = path.join(__dirname, 'templates');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    }); // Create a transporter object using SMTP transport

    const htmlContent = await fs.promises.readFile(path.join(templatePath, html + '.html'), 'utf-8');
    const renderedHtml = ejs.render(htmlContent, data); // Render the HTML template with data

    const result = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: data.subject || "AdmRef Notification",
        html: renderedHtml,
    }); // Send email with defined transport object

    if (!result.messageId) {
        return { success: false, error: 'Failed to send email' + result };
    }
    return { success: true };
};

export { prisma, unprotectedRoutes, sendEmail };