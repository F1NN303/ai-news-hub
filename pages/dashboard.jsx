import Head from 'next/head';
import Link from 'next/link';
import { getSession } from '@auth0/nextjs-auth0';
import Header from '../components/Header';

export default function Dashboard({ user }) {
  return (
    <>
      <Head>
        <title>Dashboard - AI News Hub</title>
      </Head>
      <Header />
      <main className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Hello, {user?.name || user?.email}</h1>
        <Link href="/" className="text-primary hover:underline">Back home</Link>
      </main>
    </>
  );
}

export async function getServerSideProps({ req, res }) {
  const session = await getSession(req, res);
  if (!session || !session.user) {
    return {
      redirect: {
        destination: '/api/auth/login',
        permanent: false,
      },
    };
  }
  return { props: { user: session.user } };
}
