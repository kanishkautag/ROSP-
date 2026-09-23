import prisma from "@rosp/db";

/**
 * Authentication configuration and helpers.
 * Prepared for OAuth2 / Auth.js integration.
 * In Phase 1 development, this provides session resolution with fallback to the local dev user.
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface AuthSession {
  user: SessionUser | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  // In development, find or fallback to dev user
  try {
    const devUser = await prisma.user.findFirst({
      where: { email: "dev@rosp.local" },
    });

    if (devUser) {
      return {
        id: devUser.id,
        email: devUser.email,
        name: devUser.name,
        image: devUser.image,
      };
    }
  } catch (error) {
    console.warn("Could not retrieve current user from database:", error);
  }

  return null;
}

export async function getSession(): Promise<AuthSession> {
  const user = await getCurrentUser();
  return { user };
}
