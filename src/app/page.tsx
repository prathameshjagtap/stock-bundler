export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4 text-center">
          Stock Bundler
        </h1>
        <p className="text-center text-lg mb-8">
          ETF Management Platform - Coming Soon
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-6 border border-gray-300 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">View ETFs</h3>
            <p className="text-gray-600">Browse top index ETFs and their compositions</p>
          </div>
          <div className="p-6 border border-gray-300 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Create Custom ETFs</h3>
            <p className="text-gray-600">Build your own ETFs with custom weightings</p>
          </div>
          <div className="p-6 border border-gray-300 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Track Performance</h3>
            <p className="text-gray-600">Monitor and compare ETF performance over time</p>
          </div>
        </div>
      </div>
    </main>
  );
}
