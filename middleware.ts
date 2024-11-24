// https://nextjs.org/docs/app/building-your-application/routing/middleware
import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

// With NextAuth.js 4.2.0 and Next.js 12, you can now protect your pages via the middleware pattern more easily.
// If you only want to secure certain pages, export a config object with a matcher:
export const config = {
  matcher: [
    '/',
    '/:id',
    '/api/:path((?!register|test).*)',
    '/login',
    '/register',
  ],
};
