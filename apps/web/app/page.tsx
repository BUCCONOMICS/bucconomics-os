import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-2xl mx-auto p-8 bg-white shadow-lg rounded-lg text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">BUCCONOMICS</h1>
        <p className="text-lg text-gray-600 mb-8">
          On-chain credit for real businesses. Investors supply liquidity;
          verified recipients borrow against community-approved proposals.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/onboarding"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Start investing
          </Link>
          <Link
            href="/compliance"
            className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Take the suitability quiz
          </Link>
        </div>
      </div>
    </main>
  );
}
