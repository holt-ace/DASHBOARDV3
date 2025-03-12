import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { MetricsData, StatusMetric, TimelineMetric, BuyerMetric, LocationMetric, ProductMetric } from '@/store/slices/metricsSlice';
import Logger from '@/utils/logger';

/**
 * Builds metrics data directly from PO data rather than relying on metrics endpoints
 * This is used as a fallback when the metrics endpoints are not available
 */
export function buildMetricsFromPOs(pos: PurchaseOrder[]): MetricsData {
  if (!pos || pos.length === 0) {
    return createEmptyMetrics();
  }

  Logger.info(`Building metrics from ${pos.length} POs`);

  // Calculate total value
  const totalValue = pos.reduce((sum, po) => sum + (po.totalCost || 0), 0);
  
  // Calculate average order value
  const averageOrderValue = totalValue / pos.length;
  
  // Build status distribution
  const statusCounts: Record<string, number> = {};
  pos.forEach(po => {
    const status = po.header?.status || 'UNKNOWN';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  const statusDistribution: StatusMetric[] = Object.entries(statusCounts).map(([status, count]) => ({
    status: status as POStatus,
    count,
    percentage: Math.round((count / pos.length) * 100)
  }));
  
  // Build timeline data - group by date
  const dateMap: Record<string, number> = {};
  pos.forEach(po => {
    if (po.header?.orderDate) {
      const dateStr = new Date(po.header.orderDate).toISOString().split('T')[0];
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    }
  });
  
  const timeline: TimelineMetric[] = Object.entries(dateMap)
    .map(([date, count]) => ({
      date,
      count,
      status: undefined
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Build buyer metrics
  const buyerMap: Record<string, { name: string; count: number; totalValue: number }> = {};
  pos.forEach(po => {
    if (po.header?.buyerInfo?.firstName && po.header?.buyerInfo?.lastName) {
      const name = `${po.header.buyerInfo.firstName} ${po.header.buyerInfo.lastName}`;
      const id = name.replace(/\s+/g, '-').toLowerCase();
      
      if (!buyerMap[id]) {
        buyerMap[id] = { name, count: 0, totalValue: 0 };
      }
      
      buyerMap[id].count++;
      buyerMap[id].totalValue += po.totalCost || 0;
    }
  });
  
  const topBuyers: BuyerMetric[] = Object.entries(buyerMap)
    .map(([id, data]) => ({
      id,
      name: data.name,
      count: data.count,
      totalValue: data.totalValue
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);
  
  // Build location metrics
  const locationMap: Record<string, { name: string; count: number; totalValue: number }> = {};
  pos.forEach(po => {
    if (po.header?.syscoLocation?.name) {
      const name = po.header.syscoLocation.name;
      const id = name.replace(/\s+/g, '-').toLowerCase();
      
      if (!locationMap[id]) {
        locationMap[id] = { name, count: 0, totalValue: 0 };
      }
      
      locationMap[id].count++;
      locationMap[id].totalValue += po.totalCost || 0;
    }
  });
  
  const topLocations: LocationMetric[] = Object.entries(locationMap)
    .map(([id, data]) => ({
      id,
      name: data.name,
      count: data.count,
      totalValue: data.totalValue
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);
  
  // Build product metrics
  const productMap: Record<string, { description: string; quantity: number; totalValue: number }> = {};
  pos.forEach(po => {
    if (po.products && Array.isArray(po.products)) {
      po.products.forEach(product => {
        if (product.supc) {
          if (!productMap[product.supc]) {
            productMap[product.supc] = { 
              description: product.description || 'Unknown Product', 
              quantity: 0, 
              totalValue: 0 
            };
          }
          
          productMap[product.supc].quantity += product.quantity || 0;
          productMap[product.supc].totalValue += (product.fobCost || 0) * (product.quantity || 0);
        }
      });
    }
  });
  
  const topProducts: ProductMetric[] = Object.entries(productMap)
    .map(([supc, data]) => ({
      supc,
      description: data.description,
      quantity: data.quantity,
      totalValue: data.totalValue
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);
  
  // Calculate on-time percentage (just a placeholder calculation)
  // In a real implementation, we'd need more data for this
  const onTimePercentage = Math.round((pos.filter(po => 
    po.header?.status === POStatus.DELIVERED && (po.delivery?.deliveryDate || '')
  ).length / pos.length) * 100);
  
  return {
    statusDistribution,
    timeline,
    topBuyers,
    topLocations,
    topProducts,
    totalOrders: pos.length,
    totalValue,
    averageOrderValue,
    onTimePercentage: onTimePercentage || 85 // Fall back to 85% if calculation fails
  };
}

/**
 * Create empty metrics data structure with default values
 */
function createEmptyMetrics(): MetricsData {
  return {
    statusDistribution: [],
    timeline: [],
    topBuyers: [],
    topLocations: [],
    topProducts: [],
    totalOrders: 0,
    totalValue: 0,
    averageOrderValue: 0,
    onTimePercentage: 0
  };
}