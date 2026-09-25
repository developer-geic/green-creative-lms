import { withAuth } from "next-auth/middleware";
import { lmsAuthCookies } from "@/lib/auth-cookies";

export default withAuth({
  pages: { signIn: "/login" },
  cookies: { sessionToken: lmsAuthCookies.sessionToken },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/classes/:path*",
    "/students/:path*",
    "/attendance/:path*",
    "/progress/:path*",
    "/assessments/:path*",
    "/reports/:path*",
    "/announcements/:path*",
    "/profile/:path*",
    "/stats/:path*",
    "/users/:path*",
    "/import/:path*",
    "/catalogs/:path*",
    "/rbac/:path*",
    "/forbidden",
  ],
};
