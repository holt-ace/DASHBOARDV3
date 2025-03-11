import React, { useEffect, useRef } from 'react';
import { Chart, ChartOptions, ChartData, registerables, TooltipItem } from 'chart.js';
import 'chartjs-adapter-date-fns'; // Time scale adapter

// Register all Chart.js components
Chart.register(...registerables);

interface ForecastDataPoint {
  date: Date | string;
  value: number;
  isPrediction?: boolean;
}

// Define simpler data structure for time series that Chart.js can handle
type ChartPoint = {
  x: number;  // Timestamp in milliseconds
  y: number;  // Value
};

// Define the fill type for Chart.js datasets with proper types
// Fill modes for line charts - true, false or relative index
export type FillMode = boolean | number;

interface ForecastChartProps {
  historicalData: ForecastDataPoint[];
  forecastData: ForecastDataPoint[];
  options?: ChartOptions<'line'>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  width?: number;
  className?: string;
  confidenceInterval?: {
    upper: ForecastDataPoint[];
    lower: ForecastDataPoint[];
  };
}

/**
 * ForecastChart Component
 * 
 * A specialized line chart for time series forecasting and predictive analytics.
 * Displays historical data alongside predictions with optional confidence intervals.
 * Ideal for delivery time forecasting, inventory projections, and trend analysis.
 */
const ForecastChart: React.FC<ForecastChartProps> = ({
  historicalData,
  forecastData,
  options,
  xAxisLabel = 'Date',
  yAxisLabel = 'Value',
  height = 350,
  width = 100,
  className = '',
  confidenceInterval
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart<'line'> | null>(null);
  
  // Process the data into the format Chart.js expects
  const formatData = (): ChartData<'line'> => {
    // Convert historical data points
    const historicalPoints: ChartPoint[] = historicalData.map(point => ({
      x: new Date(typeof point.date === 'string' ? point.date : point.date).getTime(),
      y: point.value
    }));
    
    // Convert forecast data points
    const forecastPoints: ChartPoint[] = forecastData.map(point => ({
      x: new Date(typeof point.date === 'string' ? point.date : point.date).getTime(),
      y: point.value
    }));
    
    const datasets = [
      {
        label: 'Historical Data',
        data: historicalPoints,
        borderColor: '#4e73df',
        backgroundColor: 'rgba(78, 115, 223, 0.05)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#4e73df',
        fill: false,
        tension: 0.1
      },
      {
        label: 'Forecast',
        data: forecastPoints,
        borderColor: '#1cc88a',
        backgroundColor: 'rgba(28, 200, 138, 0.05)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 3,
        pointBackgroundColor: '#1cc88a',
        fill: false,
        tension: 0.1
      }
    ];
    
    // Add confidence interval datasets if provided
    if (confidenceInterval) {
      // Upper bound
      const upperPoints: ChartPoint[] = confidenceInterval.upper.map(point => ({
        x: new Date(typeof point.date === 'string' ? point.date : point.date).getTime(),
        y: point.value
      }));
      
      // Lower bound
      const lowerPoints: ChartPoint[] = confidenceInterval.lower.map(point => ({
        x: new Date(typeof point.date === 'string' ? point.date : point.date).getTime(),
        y: point.value
      }));
      
      datasets.push({
        label: 'Upper Bound',
        data: upperPoints,
        borderColor: 'rgba(28, 200, 138, 0.3)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        pointBackgroundColor: 'rgba(28, 200, 138, 0.3)',
        tension: 0.1,
        fill: false
      });
      
      datasets.push({
        label: 'Lower Bound',
        data: lowerPoints,
        borderColor: 'rgba(28, 200, 138, 0.3)',
        backgroundColor: 'rgba(28, 200, 138, 0.1)',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        pointBackgroundColor: 'rgba(28, 200, 138, 0.3)',
        tension: 0.1,
        fill: true // Fill to the baseline
      });
    }
    
    return {
      datasets
    };
  };
  
  // Default chart options
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(context: TooltipItem<'line'>[]) {
            const date = context[0].parsed.x;
            return new Date(date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'MMM d, yyyy',
          displayFormats: {
            day: 'MMM d'
          }
        },
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel
        },
        grid: {
          display: false
        }
      },
      y: {
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      line: {
        tension: 0.3
      }
    }
  };
  
  // Create or update the chart when data changes
  useEffect(() => {
    if (chartRef.current) {
      // Destroy previous chart instance if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      
      // Create new chart
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstanceRef.current = new Chart<'line'>(ctx, {
          type: 'line',
          data: formatData(),
          options: {
            ...defaultOptions,
            ...options
          }
        });
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [historicalData, forecastData, options, confidenceInterval, xAxisLabel, yAxisLabel]);
  
  return (
    <div className={`forecast-chart-container ${className}`} style={{ height, width: `${width}%` }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default ForecastChart;