import Head from 'next/head';
import Header from '../components/Header';

export default function Home() {
  return (
    <>
      <Head>
        <title>AI News Hub | Latest in AI, OpenAI & ChatGPT</title>
        <meta name="description" content="Stay updated with the latest AI news, OpenAI developments, ChatGPT updates, and innovations in artificial intelligence." />
        <link rel="canonical" href="/" />
      </Head>
      <Header />
      <main className="max-w-6xl mx-auto px-4">
        <section className="text-center py-16">
          <h1 className="hero-title font-bold gradient-bg bg-clip-text text-transparent animate-text-gradient">AI News Hub</h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Your source for the latest AI news and developments.</p>
        </section>
      </main>
    </>
  );
}
