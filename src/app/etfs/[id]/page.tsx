'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';

export default function ETFDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [etf, setEtf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStock, setShowAddStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      fetchETF();
    }
  }, [params.id]);

  const fetchETF = async () => {
    try {
      const response = await fetch(`/api/etfs/${params.id}`);
      if (!response.ok) {
        throw new Error('ETF not found');
      }
      const data = await response.json();
      setEtf(data);
    } catch (error) {
      console.error('Error fetching ETF:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const searchStocks = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching stocks:', error);
    }
  };

  const addStock = async (symbol: string) => {
    try {
      const response = await fetch(`/api/etfs/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addStocks: [symbol],
        }),
      });

      if (response.ok) {
        await fetchETF();
        setShowAddStock(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error adding stock:', error);
    }
  };

  const removeStock = async (symbol: string) => {
    if (!confirm(`Remove ${symbol} from this ETF?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/etfs/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeStocks: [symbol],
        }),
      });

      if (response.ok) {
        await fetchETF();
      }
    } catch (error) {
      console.error('Error removing stock:', error);
    }
  };

  const deleteETF = async () => {
    if (!confirm('Are you sure you want to delete this ETF? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/etfs/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error deleting ETF:', error);
    }
  };

  if (loading) {
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

  if (!etf) {
    return null;
  }

  const sortedCompositions = [...(etf.compositions || [])].sort((a, b) => b.weight - a.weight);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{etf.ticker}</h1>
              <p className="mt-2 text-xl text-gray-600">{etf.name}</p>
              {etf.description && (
                <p className="mt-2 text-gray-600">{etf.description}</p>
              )}
            </div>
            <div className="flex space-x-2">
              {etf.isCustom && session && (
                <>
                  <button
                    onClick={() => setShowAddStock(!showAddStock)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {showAddStock ? 'Cancel' : 'Add Stock'}
                  </button>
                  <button
                    onClick={deleteETF}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Delete ETF
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {etf.weightingMethod === 'MARKET_CAP' && 'Market Cap Weighted'}
              {etf.weightingMethod === 'PRICE_WEIGHTED' && 'Price Weighted'}
              {etf.weightingMethod === 'EQUAL' && 'Equal Weighted'}
            </span>
            {etf.isCustom && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Custom ETF
              </span>
            )}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {etf.compositions?.length || 0} Holdings
            </span>
          </div>
        </div>

        {showAddStock && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Stock</h3>
            <input
              type="text"
              placeholder="Search stocks by symbol or name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchStocks(e.target.value);
              }}
            />
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((stock) => (
                  <div
                    key={stock.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{stock.symbol}</p>
                      <p className="text-sm text-gray-600">{stock.name}</p>
                    </div>
                    <button
                      onClick={() => addStock(stock.symbol)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  {etf.isCustom && session && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedCompositions.map((composition) => (
                  <tr key={composition.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {composition.stock.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {composition.stock.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {composition.stock.sector || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {composition.weight.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${composition.stock.currentPrice.toFixed(2)}
                    </td>
                    {etf.isCustom && session && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => removeStock(composition.stock.symbol)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
