import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }
  const token = auth.split(" ")[1];
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(auth.split(" ")[1]);
    } catch {
      // ignore invalid token
    }
  }
  next();
}
