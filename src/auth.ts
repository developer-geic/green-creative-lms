import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8880/api/v1";

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${API_BASE}/lms/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Refresh failed");

    return {
      ...token,
      accessToken: json.data.access_token,
      refreshToken: json.data.refresh_token ?? token.refreshToken,
      expiresAt: Date.now() + json.data.expires_in * 1000,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(`${API_BASE}/lms/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(credentials),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Login failed");

        return {
          id: String(json.data.user.id),
          name: json.data.user.name,
          email: json.data.user.email,
          accessToken: json.data.access_token,
          refreshToken: json.data.refresh_token,
          expiresAt: Date.now() + json.data.expires_in * 1000,
          user: json.data.user,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          accessToken: (user as any).accessToken,
          refreshToken: (user as any).refreshToken,
          expiresAt: (user as any).expiresAt,
          user: (user as any).user,
        };
      }
      if (token.expiresAt && Date.now() < (token.expiresAt as number) - 60_000) {
        return token;
      }
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      (session as any).user = token.user;
      return session;
    },
  },
};
