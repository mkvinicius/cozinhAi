import type { Request, Response, NextFunction } from "express";
import type { Auth } from "../auth/better-auth.js";

export type Actor =
  | { type: "user"; userId: string; email: string }
  | { type: "none" };

declare global {
  namespace Express {
    interface Request {
      actor: Actor;
    }
  }
}

export function actorMiddleware(auth: Auth) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({ headers: req.headers as Headers });
      if (session?.user) {
        req.actor = { type: "user", userId: session.user.id, email: session.user.email };
      } else {
        req.actor = { type: "none" };
      }
    } catch {
      req.actor = { type: "none" };
    }
    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.actor.type !== "user") {
    res.status(401).json({ ok: false, error: "Não autenticado" });
    return;
  }
  next();
}
