# API Routes Overview

This document outlines all available API endpoints, their purposes, and authentication requirements.

---

## Authentication Routes

| Method | Path | Description | Auth |
|--------|------|--------------|------|
| POST | `/api/auth/register` | Register a new user account and send the confirmation email | ❌ |
| POST | `/api/auth/verify-email` | Verify email and activate user account | ❌ |
| POST | `/api/auth/login` | Authenticate user and return JWT token | ❌ |
| GET | `/api/auth/me` | Get the currently authenticated user | ✅ |

---

## User Routes

| Method | Path | Description | Auth |
|--------|------|--------------|------|
| GET | `/api/users/:id (or 'me')` | Get user details by ID | ✅ |
| PUT | `/api/users/:id (or 'me')`  | Update user information | ✅ |
| DELETE | `/api/users/:id (or 'me')` | Delete a user account | ✅ |

**notes:** for owner instead of id uses "me", for admin uses id (you're not allowed to modify other user if not admin)

---

## Account Routes

| Method | Path | Description | Auth |
|--------|------|--------------|------|
| GET | `/api/accounts` | List all accounts for the authenticated user | ✅ |
| POST | `/api/accounts` | Create a new account for the user | ✅ |
| GET | `/api/accounts/:accountId` | Get details of a specific account | ✅ |
| PUT | `/api/accounts/:accountId` | Update account details | ✅ |
| DELETE | `/api/accounts/:accountId` | Delete an account | ✅ |

---

## Transaction Routes

| Method | Path | Description | Auth |
|--------|------|--------------|------|
| GET | `/api/accounts/:accountId/transactions` | List all transactions for an account | ✅ |
| POST | `/api/accounts/:accountId/transactions` | Create a new transaction (income or expense) | ✅ |
| GET | `/api/accounts/:accountId/transactions/:txId` | Get a transaction by ID | ✅ |
| PUT | `/api/accounts/:accountId/transactions/:txId` | Update a transaction | ✅ |
| DELETE | `/api/accounts/:accountId/transactions/:txId` | Delete a transaction | ✅ |

---

## Category Routes

| Method | Path | Description | Auth |
|--------|------|--------------|------|
| GET | `/api/categories/:type` | List all income|expense categories | ✅ |
| POST | `/api/categories/:type` | Create a new income|expense category | ✅ |
| PUT | `/api/categories/:type/:catId` | Update an income|expense category | ✅ |
| DELETE | `/api/categories/:type/:catId` | Delete an income|expense category | ✅ |

**notes:** `type` can be either `expenses` or `incomes`


---

## Reports Routes

| Method | Path | Description | Auth |
|--------|------|--------------|------|
| GET | `/api/reports/balance` | Get balance summary for all user accounts | ✅ |
| GET | `/api/reports/summary?from=&to=` | Get transaction summary between date ranges | ✅ |

---

## Token-based Acess

**Protected Endpoint:**  

**Headers:**  
`Authorization: Bearer <user_token>`


Go back to [Project Overview](./project_overview.md)