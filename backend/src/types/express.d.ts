// Extends Express's Request with the fields our auth middleware attaches.
// This is the ONLY place patientId/userId should come from in any handler -
// never read them from req.body or req.query/params for patient-data routes.
import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      patientId?: string;
    }
  }
}

export {};
