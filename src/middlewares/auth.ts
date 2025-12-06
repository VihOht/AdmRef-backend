import { Request, Response, NextFunction } from 'express';
import { unprotectedRoutes } from '../core/utils';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../core/types';


/**
 * Middleware to validate JWT tokens in incoming requests.
 * Skips validation for unprotected routes.
 * Extracts userId from the token and attaches it to the request object.
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
*/
export const jwtValidator = (req: AuthRequest, res: Response, next: NextFunction) => {
    
    if (unprotectedRoutes.includes(req.path)) {
        return next();
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing'});
    } 

    const headerToken = authHeader.split(' ')
    if (headerToken.length !== 2 || headerToken[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Invalid authorization format'});
    }

    const token = headerToken[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "NotVerySecure") as { userId: string };
        req.userId = decoded.userId;
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token'});
    }
};