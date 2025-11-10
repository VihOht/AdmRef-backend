import { PrismaClient, Prisma } from "@prisma/client";
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';


const prisma = new PrismaClient()

const unprotectedRoutes: string[] = [
    '/',
    '/api/auth/login',
    '/api/auth/verify',
    '/api/auth/resend-verification',
    '/api/auth/register',
]

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
    });

    const htmlContent = await fs.promises.readFile(path.join(templatePath, html + '.html'), 'utf-8');
    const renderedHtml = ejs.render(htmlContent, data);

    const result = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: data.subject || "AdmRef Notification",
        html: renderedHtml,
    });

    if (!result.messageId) {
        return { success: false, error: 'Failed to send email' + result };
    }
    return { success: true };
};

export { prisma, unprotectedRoutes, sendEmail };