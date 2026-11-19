/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ship the hand-entered contacts with the serverless functions on Vercel.
  outputFileTracingIncludes: { '/**': ['./data/contacts.json', './data/lessons.json', './data/seed/**'] },
  serverExternalPackages: ['nodemailer'],
};
export default nextConfig;
