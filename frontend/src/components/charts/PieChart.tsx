import React, { useEffect, useRef } from 'react';
import { 
  Chart, 
  ChartOptions, 
  ChartData, 
  registerables,
  TooltipItem
} from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

interface PieChartProps {
  data: ChartData<'pie'> | ChartData<'doughnut'>;
  options?: ChartOptions<'pie'> | ChartOptions<'doughnut'>;
  type?: 'pie' | 'doughnut';
  height?: number;
  width?: number;
  className?: string;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right' | false;
}

// Type for the chart instance based on the chart type
type PieOrDoughnutChart = Chart<'pie'> | Chart<'doughnut'>;

/**
 * PieChart Component
 * 
 * A reusable pie/doughnut chart component using Chart.js for displaying
 * categorical distributions and proportions. Perfect for showing status
 * distributions, category breakdowns, and proportion analysis.
 */
const PieChart: React.FC<PieChartProps> = ({
  data,
  options,
  type = 'pie',
  height = 320,
  width = 100,
  className = '',
  legendPosition = 'right'
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<PieOrDoughnutChart | null>(null);
  
  // Default chart options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: legendPosition ? {
        position: legendPosition,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      } : {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'pie' | 'doughnut'>) {
            const label = context.label || '';
            const value = context.formattedValue;
            const dataset = context.dataset;
            const total = (dataset.data as number[]).reduce((acc, current) => acc + current, 0);
            const percentage = Math.round(((context.raw as number) / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    // Make doughnut charts have a reasonable hole size
    cutout: type === 'doughnut' ? '60%' : undefined
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
        // Here we use @ts-ignore to bypass type checking because Chart.js typing
        // has difficulty with dynamically determined chart types
        // @ts-ignore
        chartInstanceRef.current = new Chart<'pie' | 'doughnut'>(ctx, {
          type,
          data: data as ChartData<'pie'>,
          options: {
            ...defaultOptions,
            ...(options || {})
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
  }, [data, options, type]);
  
  return (
    <div className={`pie-chart-container ${className}`} style={{ height, width: `${width}%` }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default PieChart;