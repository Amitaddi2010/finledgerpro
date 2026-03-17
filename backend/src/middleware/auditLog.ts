import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';

export const auditLogMiddleware = (module: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    // Only log write operations that were successful
    res.send = function (body) {
      res.send = originalSend;
      
      const methodsToLog = ['POST', 'PUT', 'PATCH', 'DELETE'];
      if (methodsToLog.includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
        // Run in background to avoid blocking response
        const user = (req as any).user;
        const companyId = (req as any).companyId || user?.companyId;
        if (user) {
          const action =
            req.method === 'POST' ? 'create' :
            req.method === 'DELETE' ? 'delete' :
            'update';

          AuditLog.create({
            userId: user._id || user.id,
            companyId,
            action,
            entity: module,
            details: `User performed ${req.method} on ${req.originalUrl}`,
            ipAddress: req.ip,
          }).catch(err => console.error("Audit log creation failed", err));
        }
      }
      
      return res.send(body);
    };

    next();
  };
};
