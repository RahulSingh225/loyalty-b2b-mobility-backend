/**
 * Auth.js integration helper.
 * Requires installing `@auth/core` and `@auth/core/adapters` if you want adapters.
 * This file exposes a configured Auth.js handler for Express usage.
 */
import { NextRequest } from '@auth/core/dist/core/types';
import { auth } from '@auth/core';
import CredentialsProvider from '@auth/core/providers/credentials';
import type { Request, Response } from 'express';
import { redisAdapter } from './redisAdapter';
import { userService } from '../services/userService';
import { sign as jwtSign } from './jwt';

// NOTE: This is a helper to create an Auth.js handler. In Express you can call it
// inside a route to handle signin/callbacks. For a full integration, prefer a framework
// specific adapter or the middleware provided by Auth.js.

export const createAuthHandler = () => {
  return auth({
    providers: [
      CredentialsProvider({
        id: 'credentials',
        name: 'Credentials',
        credentials: {
          phone: { label: 'Phone', type: 'text' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials) return null;
          const [u] = await userService.findMany({ phone: credentials.phone } as any) as any;
          if (!u) return null;
          // TODO: validate password using bcrypt
          return { id: u.id, name: u.name, phone: u.phone } as any;
        },
      }),
    ],
    session: { strategy: 'jwt' },
    // Use Redis via custom callbacks or adapter for storing session data if you prefer
    callbacks: {
      async jwt({ token, user }) {
        if (user) token.sub = String(user.id);
        return token;
      },
      async session({ session, token }) {
        session.user = { id: token.sub } as any;
        return session;
      },
    },
    // adapter: customAdapterUsingRedis(redisAdapter),
  });
};

// Helper to run inside Express route
export const handleAuthRequest = async (req: Request, res: Response) => {
  const handler = createAuthHandler();
  // Auth.js is primarily designed for Next.js; using it in Express requires running
  // the handler function directly with a compatible Request-like object. For most
  // use-cases, prefer implementing signin routes that call userService and issue JWTs.
  // This function is a placeholder showing how you might expose Auth.js handler.
  return handler(req as any, res as any);
};
