// Augment Express's Request type with fields set by our middleware.
import 'express';

declare global {
  namespace Express {
    interface Request {
      bearerToken?: string;
    }
  }
}
