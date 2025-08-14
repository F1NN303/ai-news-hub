import Head from 'next/head';
import Header from '../components/Header';
import { useUser } from '@auth0/nextjs-auth0/client';

export default function Profile() {
  const { user, error, isLoading } = useUser();
  return (
    <>
      <Head>
        <title>Profile - AI News Hub</title>
      </Head>
      <Header />
      <main className="max-w-2xl mx-auto p-4">
        {isLoading && <p>Loading...</p>}
        {error && <p>Error: {error.message}</p>}
        {user && (
          <pre className="bg-slate-100 p-4 rounded overflow-auto">{JSON.stringify(user, null, 2)}</pre>
        )}
      </main>
    </>
  );
}
