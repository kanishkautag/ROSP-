import prisma from "@rosp/db";
import { cookies } from "next/headers";
import crypto from "crypto";

export const SESSION_COOKIE_NAME = "rosp_session";
const SESSION_EXPIRATION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface AuthSession {
  user: SessionUser | null;
}

/**
 * Creates a database session for the given user.
 */
export async function createSession(userId: string): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_EXPIRATION_DAYS);

  await prisma.session.create({
    data: {
      userId,
      sessionToken,
      expires,
    },
  });

  return sessionToken;
}

/**
 * Deletes a session token from the database.
 */
export async function destroySession(sessionToken?: string): Promise<void> {
  if (!sessionToken) return;
  try {
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  } catch (error) {
    console.error("Failed to delete session:", error);
  }
}

/**
 * Resolves the currently authenticated user from HTTP cookie or dev fallback.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true },
      });

      if (session && session.expires > new Date()) {
        return {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        };
      }
    }

    // In development mode, if no active cookie session is set, fallback to demo or dev user
    if (process.env.NODE_ENV !== "production") {
      const devUser = await prisma.user.findFirst({
        where: { email: { in: ["demo@rosp.local", "dev@rosp.local"] } },
        orderBy: { email: "asc" }, // "demo@rosp.local" comes before "dev@rosp.local"
      });
      if (devUser) {
        return {
          id: devUser.id,
          email: devUser.email,
          name: devUser.name,
          image: devUser.image,
        };
      }
    }
  } catch (error) {
    console.warn("Could not retrieve current user from session:", error);
  }

  return null;
}

export async function getSession(): Promise<AuthSession> {
  const user = await getCurrentUser();
  return { user };
}
