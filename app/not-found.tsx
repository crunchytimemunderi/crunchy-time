import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="text-9xl mb-4">🍗</div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4 text-gray-700 dark:text-gray-300">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Oops! This page seems to have flown the coop.
        </p>
        <Link 
          href="/"
          className="inline-block px-8 py-4 bg-orange-600 text-white text-lg font-semibold rounded-lg hover:bg-orange-700 transition shadow-lg"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
