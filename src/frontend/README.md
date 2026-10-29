This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Security update: Next.js 16.4.3

Next.js and `eslint-config-next` were upgraded from 16.4.0 to 16.4.3.
The npm lockfile resolves 16.4.3; existing caret dependency ranges are preserved.
`experimental.agentUpgrade: "security"` enables security upgrade reminders; it
does not automatically update dependencies.

Install and verify locally, without Docker:

```bash
npm ci
npm exec -- next --version
npm run build
npm run start -- --hostname 127.0.0.1 --port 3217
```

Open `/` and `/login` at `http://127.0.0.1:3217`. The upgrade was verified with
a production build, HTTP 200 responses, client-side navigation to the login form,
and no browser runtime errors in that smoke flow. Backend authentication was not
exercised by this frontend upgrade check.

Security reference: [npm Next.js advisories](https://registry.npmjs.org/-/npm/v1/security/advisories/bulk).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
