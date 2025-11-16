'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ETFCard from '@/components/ETFCard';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [etfs, setEtfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchETFs();
    }
  }, [status]);

  const fetchETFs = async () => {
    try {
      const response = await fetch('/api/etfs');
      const data = await response.json();
      setEtfs(data);
    } catch (error) {
      console.error('Error fetching ETFs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const predefinedETFs = etfs.filter((etf) => !etf.isCustom);
  const customETFs = etfs.filter((etf) => etf.isCustom);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {session.user?.name || session.user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total ETFs</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {etfs.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">
              Predefined ETFs
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {predefinedETFs.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Custom ETFs</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {customETFs.length}
            </p>
          </div>
        </div>

        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Predefined ETFs
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predefinedETFs.map((etf) => (
              <ETFCard key={etf.id} etf={etf} />
            ))}
          </div>
          {predefinedETFs.length === 0 && (
            <p className="text-gray-500 text-center py-8">No ETFs found</p>
          )}
        </section>

        {customETFs.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Custom ETFs
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customETFs.map((etf) => (
                <ETFCard key={etf.id} etf={etf} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
