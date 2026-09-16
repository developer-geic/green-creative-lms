import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user?: {
      id?: number;
      email?: string | null;
      name?: string | null;
      role?: string | null;
      status?: string;
      avatar?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
    user?: Session["user"];
  }
}
