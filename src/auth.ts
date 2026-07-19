import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  verifyUserCredentials,
  ensureUserSettings,
  findOrCreateUserByEmail,
  emailToName,
} from "@/lib/users";
import { isObjectIdString } from "@/lib/objectId";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

async function normalizeTokenUserId(token: {
  sub?: string;
  email?: string | null;
  name?: string | null;
}) {
  const email = token.email?.toLowerCase();
  if (!email) return;

  if (!isObjectIdString(token.sub)) {
    const dbUser = await findOrCreateUserByEmail(email, token.name ?? undefined);
    token.sub = dbUser.id;
    token.email = dbUser.email;
    token.name = dbUser.name;
  }
}
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      id: "credentials",
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;
        if (!email || !password) return null;

        const user = await verifyUserCredentials(email, password);
        if (!user) return null;

        await ensureUserSettings(user.id, user.email, user.name);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "credentials" && user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
        await normalizeTokenUserId(token);
        return token;
      }
      if (profile) {
        token.email = ((profile as { email?: string; preferred_username?: string }).email
          ?? (profile as { preferred_username?: string }).preferred_username
          ?? token.email) as string;
        token.name = profile.name ?? token.name;
      }

      if (token.email) {
        token.isAdmin = ADMIN_EMAILS.includes((token.email as string).toLowerCase());
      }

      await normalizeTokenUserId(token);
      return token;    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.user.name = (token.name as string) ?? emailToName(token.email as string);
        (session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});
