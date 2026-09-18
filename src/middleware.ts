import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
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
    "/forbidden",
  ],
};
