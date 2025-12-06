import { Request } from 'express';



// Interfaces for core types used across the application

export interface AuthRequest extends Request {
    userId?: string;
}

export interface User {
    id: string;
    email: string;
    password: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Token {
    id: string;
    userId: string;
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
}

export interface Account {
    id: string;
    userId: string;
    name: string;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Transaction {
    id: string;
    accountId: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    date: Date;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Category {
    id: string;
    accountId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}


export interface getAccountsRequestInt extends AuthRequest {
    userId: string;
}