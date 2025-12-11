import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }),
  ],
  events: {
    async signIn({ user, account, profile }) {
      
    },
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
        console.log('jwt', token, user, account, profile);
      if (user && user.email) {
        const principal = {
          auth_typ: "aad",
          name_typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
          role_typ: "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
          claims: [
            {
              typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
              val: user.email,
            },
            {
              typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
              val: user.name || user.email,
            },
            {
              typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
              val: user.id || user.email,
            },
          ],
        };

        const principalJson = JSON.stringify(principal);
        const base64Principal = Buffer.from(principalJson).toString('base64');

        token.principal = base64Principal;
        token.email = user.email;
        token.name = user.name || user.email;
      }

      return token;
    },
    async session({ session, token }) {
        console.log('session', session);
        console.log('token', token);
      // Add principal to session
      if (token.principal) {
        session.principal = token.principal as string;
        session.email = token.email as string;
        session.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});

