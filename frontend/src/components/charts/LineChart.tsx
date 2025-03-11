import React, { useEffect, useRef } from 'react';
import { Chart, ChartOptions, ChartData, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

interface LineChartProps {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
  height?: number;
  width?: number;
  className?: string;
}

/**
 * LineChart Component
 * 
 * A reusable line chart component using Chart.js for displaying time series data.
 * Ideal for trends and historical analysis of metrics over time.
 */
const LineChart: React.FC<LineChartProps> = ({
  data,
  options,
  height = 320,
  width = 100,
  className = ''
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart<'line'> | null>(null);
  
  // Default chart options
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    hover: {
      mode: 'nearest',
      intersect: true
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
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
        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data,
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
  }, [data, options]);
  
  return (
    <div className={`line-chart-container ${className}`} style={{ height, width: `${width}%` }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default LineChart;