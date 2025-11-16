'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function CreateETFPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weightingMethod, setWeightingMethod] = useState<'MARKET_CAP' | 'PRICE_WEIGHTED' | 'EQUAL'>('MARKET_CAP');
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

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

  const addStock = (symbol: string) => {
    if (!selectedStocks.includes(symbol)) {
      setSelectedStocks([...selectedStocks, symbol]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeStock = (symbol: string) => {
    setSelectedStocks(selectedStocks.filter((s) => s !== symbol));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedStocks.length === 0) {
      setError('Please add at least one stock');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/etfs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          name,
          description,
          weightingMethod,
          stocks: selectedStocks.map((symbol) => ({ symbol })),
          userId: session?.user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create ETF');
        return;
      }

      router.push(`/etfs/${data.id}`);
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Custom ETF</h1>
          <p className="mt-2 text-gray-600">
            Build your own ETF with custom stock selections and weighting methods
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
          <div>
            <label htmlFor="ticker" className="block text-sm font-medium text-gray-700">
              Ticker Symbol *
            </label>
            <input
              type="text"
              id="ticker"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., MYETF"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              ETF Name *
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., My Custom Technology ETF"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Describe your ETF strategy..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="weightingMethod" className="block text-sm font-medium text-gray-700">
              Weighting Method *
            </label>
            <select
              id="weightingMethod"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={weightingMethod}
              onChange={(e) => setWeightingMethod(e.target.value as any)}
            >
              <option value="MARKET_CAP">Market Cap Weighted</option>
              <option value="PRICE_WEIGHTED">Price Weighted</option>
              <option value="EQUAL">Equal Weighted</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {weightingMethod === 'MARKET_CAP' && 'Stocks are weighted by market capitalization'}
              {weightingMethod === 'PRICE_WEIGHTED' && 'Stocks are weighted by their price'}
              {weightingMethod === 'EQUAL' && 'All stocks have equal weight'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Stocks * ({selectedStocks.length} selected)
            </label>
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
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((stock) => (
                  <button
                    key={stock.id}
                    type="button"
                    onClick={() => addStock(stock.symbol)}
                    disabled={selectedStocks.includes(stock.symbol)}
                    className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{stock.symbol}</p>
                      <p className="text-sm text-gray-600">{stock.name}</p>
                    </div>
                    {selectedStocks.includes(stock.symbol) && (
                      <span className="text-green-600 text-sm">Added</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStocks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Stocks</h3>
              <div className="space-y-2">
                {selectedStocks.map((symbol) => (
                  <div
                    key={symbol}
                    className="flex justify-between items-center p-3 bg-blue-50 rounded-md"
                  >
                    <span className="font-medium text-gray-900">{symbol}</span>
                    <button
                      type="button"
                      onClick={() => removeStock(symbol)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create ETF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
