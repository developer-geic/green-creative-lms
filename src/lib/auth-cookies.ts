const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const hostPrefix = useSecureCookies ? "__Host-" : "";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: useSecureCookies,
};

/** Isolated from green-creative-fe; browsers share cookies across localhost ports. */
export const lmsAuthCookies = {
  sessionToken: {
    name: `${cookiePrefix}lms.session-token`,
    options: cookieOptions,
  },
  callbackUrl: {
    name: `${cookiePrefix}lms.callback-url`,
    options: cookieOptions,
  },
  csrfToken: {
    name: `${hostPrefix}lms.csrf-token`,
    options: cookieOptions,
  },
};
