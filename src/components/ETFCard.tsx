import Link from 'next/link';

interface ETFCardProps {
  etf: {
    id: string;
    ticker: string;
    name: string;
    description?: string;
    weightingMethod: string;
    isCustom: boolean;
    currentValue?: number;
    compositions?: Array<{
      stock: {
        symbol: string;
        name: string;
      };
      weight: number;
    }>;
  };
}

export default function ETFCard({ etf }: ETFCardProps) {
  const weightingMethodLabel = {
    MARKET_CAP: 'Market Cap Weighted',
    PRICE_WEIGHTED: 'Price Weighted',
    EQUAL: 'Equal Weighted',
  }[etf.weightingMethod] || etf.weightingMethod;

  const topHoldings = etf.compositions
    ?.sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  return (
    <Link href={`/etfs/${etf.id}`}>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{etf.ticker}</h3>
            <p className="text-sm text-gray-600">{etf.name}</p>
          </div>
          {etf.isCustom && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Custom
            </span>
          )}
        </div>

        {etf.description && (
          <p className="text-sm text-gray-700 mb-4">{etf.description}</p>
        )}

        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {weightingMethodLabel}
          </span>
        </div>

        {topHoldings && topHoldings.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Top Holdings
            </p>
            <div className="space-y-2">
              {topHoldings.map((holding) => (
                <div
                  key={holding.stock.symbol}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-700">{holding.stock.symbol}</span>
                  <span className="text-gray-500">
                    {holding.weight.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {etf.compositions && (
          <p className="text-xs text-gray-500 mt-4">
            {etf.compositions.length} holdings
          </p>
        )}
      </div>
    </Link>
  );
}
