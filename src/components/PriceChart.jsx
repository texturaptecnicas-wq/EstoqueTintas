import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const PriceChart = ({ priceHistory }) => {
  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        Dados insuficientes para gerar o gráfico.
      </div>
    );
  }

  // Prepare data for the chart (needs to be ascending order for time series)
  const chartData = [...priceHistory]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(record => {
      const dateObj = new Date(record.date);
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear().toString().slice(-2);
      
      return {
        dateStr: `${month}/${year}`,
        fullDate: dateObj.toLocaleDateString('pt-BR'),
        price: Number(record.price) || 0,
        variation: Number(record.variation) || 0
      };
    });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const variationPrefix = data.variation > 0 ? '+' : '';
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-800 mb-1">{data.fullDate}</p>
          <p className="text-sm text-blue-600 font-bold">
            Preço: {formatCurrency(data.price)}
          </p>
          {data.variation !== 0 && (
            <p className={`text-xs mt-1 font-medium ${data.variation > 0 ? 'text-red-500' : 'text-green-500'}`}>
              Variação: {variationPrefix}{data.variation.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="dateStr" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#6b7280' }} 
            dy={10}
          />
          <YAxis 
            tickFormatter={(val) => `R$ ${val}`} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#6b7280' }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            type="monotone"
            name="Evolução de Preço"
            dataKey="price"
            stroke="hsl(var(--chart-primary))"
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--chart-primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;