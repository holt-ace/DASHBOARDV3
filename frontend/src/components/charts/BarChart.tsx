import React, { useEffect, useRef } from 'react';
import { Chart, ChartOptions, ChartData, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

interface BarChartProps {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
  height?: number;
  width?: number;
  className?: string;
  horizontal?: boolean;
}

/**
 * BarChart Component
 * 
 * A reusable bar chart component using Chart.js for comparing values across categories.
 * Can be displayed horizontally or vertically, making it versatile for different use cases
 * like comparing processing times, volumes by category, or status counts.
 */
const BarChart: React.FC<BarChartProps> = ({
  data,
  options,
  height = 320,
  width = 100,
  className = '',
  horizontal = false
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart<'bar'> | null>(null);
  
  // Default chart options
  const defaultOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
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
    scales: {
      x: {
        grid: {
          display: !horizontal,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        stacked: false
      },
      y: {
        grid: {
          display: horizontal,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        beginAtZero: true,
        stacked: false
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
          type: 'bar',
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
  }, [data, options, horizontal]);
  
  return (
    <div className={`bar-chart-container ${className}`} style={{ height, width: `${width}%` }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default BarChart;