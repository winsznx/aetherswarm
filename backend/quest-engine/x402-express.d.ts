declare module 'x402-express' {
    import { Request, Response, NextFunction } from 'express';

    export function paymentMiddleware(options?: any): (req: Request, res: Response, next: NextFunction) => void;
}
