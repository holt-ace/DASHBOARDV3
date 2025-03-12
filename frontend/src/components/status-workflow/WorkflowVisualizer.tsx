import React, { useState, useEffect, useCallback } from 'react';
import { useD3 } from '@/hooks/useD3';
import * as d3 from 'd3';
import { POStatus, StatusDefinition, POHistoryEntry } from '@/types/purchaseOrder';
import { ApiService } from '@/services/ApiService';

// Define the shape of the node data for D3
interface WorkflowNode {
  id: string;
  label: string;
  description: string;
  color: string;
  isCurrent: boolean;
}

// Define the shape of the link data for D3
interface WorkflowLink {
  source: string;
  target: string;
  isAvailable: boolean;
}

// Interface for transformed workflow data
interface WorkflowData {
  nodes: WorkflowNode[];
  links: WorkflowLink[];
}

// Props for the WorkflowVisualizer component
interface WorkflowVisualizerProps {
  currentStatus: POStatus;
  statusHistory?: POHistoryEntry[];
  availableTransitions: POStatus[];
  onStatusChange: (status: POStatus) => void;
  className?: string;
}

/**
 * WorkflowVisualizer Component
 * 
 * Visualizes the PO workflow as an interactive node-based graph,
 * showing the current status, available transitions, and workflow history.
 * 
 * The graph is rendered using D3.js with force-directed layout for
 * optimal node positioning.
 */
export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  currentStatus,
  statusHistory = [],
  availableTransitions = [],
  onStatusChange,
  className = ''
}) => {
  // State to hold the workflow data fetched from the API
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  // Loading state
  const [loading, setLoading] = useState<boolean>(true);
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Function to map status colors to CSS colors
  const getStatusColor = (colorEnum: string): string => {
    const colorMap: Record<string, string> = {
      'UPLOADED': '#FF9800', // Orange
      'CONFIRMED': '#2196F3', // Blue
      'SHIPPED': '#673AB7',  // Purple
      'INVOICED': '#3F51B5', // Indigo
      'DELIVERED': '#4CAF50', // Green
      'CANCELLED': '#F44336'  // Red
    };
    return colorMap[colorEnum] || '#9E9E9E'; // Default to gray
  };

  // Function to transform API workflow data to D3 format
  const transformWorkflowData = useCallback((
    statuses: Record<string, StatusDefinition>,
    currentStatus: POStatus
  ): WorkflowData => {
    // Transform nodes
    const nodes: WorkflowNode[] = Object.entries(statuses).map(([key, status]) => ({
      id: key,
      label: status.label,
      description: status.description,
      color: getStatusColor(status.color),
      isCurrent: key === currentStatus,
    }));

    // Transform links
    const links: WorkflowLink[] = [];
    Object.entries(statuses).forEach(([key, status]) => {
      status.allowedTransitions.forEach(targetId => {
        links.push({
          source: key,
          target: targetId,
          isAvailable: key === currentStatus && availableTransitions.includes(targetId as POStatus)
        });
      });
    });

    return { nodes, links };
  }, []);

  // Fetch workflow data from API
  useEffect(() => {
    const fetchWorkflow = async () => {
      try { 
        setLoading(true);
        const statuses = await ApiService.getStatuses();
        const transformedData = transformWorkflowData(statuses, currentStatus);
        setWorkflowData(transformedData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workflow data');
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [currentStatus, statusHistory, transformWorkflowData]);
  
  // Clear error state when currentStatus or availableTransitions change
  useEffect(() => {
    setError(null);
  }, [currentStatus, availableTransitions]);

  // D3 rendering function
  const renderD3 = useCallback((
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  ) => {
    if (!workflowData) return;

    // Get the dimensions from the SVG element
    const svgElement = svg.node();
    if (!svgElement) return;

    const width = svgElement.clientWidth || 800;
    const height = svgElement.clientHeight || 200;
    
    // Clear existing elements
    svg.selectAll('*').remove();
    
    // Create a force simulation for the graph layout
    const simulation = d3.forceSimulation(workflowData.nodes as any)
      .force('link', d3.forceLink(workflowData.links).id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50)); // Prevent node overlap

    // Create a group for links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(workflowData.links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.isAvailable ? '#4CAF50' : '#9E9E9E')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.isAvailable ? '0' : '5,5');
    
    // Create a group for nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(workflowData.nodes)
      .enter()
      .append('g')
      .attr('class', d => `node ${d.isCurrent ? 'current' : ''} ${availableTransitions.includes(d.id as POStatus) ? 'available' : ''}`)
      .style('cursor', d => availableTransitions.includes(d.id as POStatus) ? 'pointer' : 'default')
      .on('click', (_, d) => {
        if (availableTransitions.includes(d.id as POStatus)) {
          onStatusChange(d.id as POStatus);
        }
      });

    // Add circles to nodes
    node.append('circle')
      .attr('r', 30)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.id === currentStatus ? '#1565C0' : 'none')
      .attr('stroke-width', 3);
    
    // Add text labels to nodes
    node.append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .text(d => d.label);
    
    // Add tooltips
    node.append('title')
      .text(d => `${d.label}: ${d.description}`);

    // Handle hover effects
    node.on('mouseover', function() {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', 33);
    }).on('mouseout', function() {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', 30);
    });
    
    // Update force simulation on each tick
    simulation.on('tick', () => {
      // Constrain nodes within the SVG bounds
      workflowData.nodes.forEach(d => {
        const r = 30; // Node radius
        (d as any).x = Math.max(r, Math.min(width - r, (d as any).x));
        (d as any).y = Math.max(r, Math.min(height - r, (d as any).y));
      });
      
      // Update link positions
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      // Update node positions
      node.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // Add arrowheads to links
    svg.append('defs').selectAll('marker')
      .data(['available', 'unavailable'])
      .enter().append('marker')
      .attr('id', d => `arrowhead-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 30) // Position the arrowhead at the end of the line
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => d === 'available' ? '#4CAF50' : '#9E9E9E');
    
    // Add arrowheads to links
    link.attr('marker-end', d => `url(#arrowhead-${d.isAvailable ? 'available' : 'unavailable'})`);
    
    // Add hover effect for links
    link.on('mouseover', function() {
      d3.select(this).transition().duration(200).attr('stroke-width', 3);
    }).on('mouseout', function() {
      d3.select(this).transition().duration(200).attr('stroke-width', 2);
    });
    
  }, [workflowData, currentStatus, availableTransitions, onStatusChange]);

  // Use the custom D3 hook to render the visualization
  const svgRef = useD3(renderD3, [workflowData, currentStatus, availableTransitions]);

  // Show loading state
  if (loading) {
    return (
      <div className={`workflow-visualizer ${className}`}>
        <div className="workflow-visualizer__loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading workflow...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`workflow-visualizer ${className}`}>
        <div className="workflow-visualizer__error alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`workflow-visualizer ${className}`}>
      <h3 className="workflow-visualizer__title">Purchase Order Workflow</h3>
      <div className="workflow-visualizer__container">
        <svg
          ref={svgRef}
          className="workflow-visualizer__svg"
          width="100%"
          height="220"
          viewBox="0 0 800 200"
          preserveAspectRatio="xMidYMid meet"
        />
      </div>
      <div className="workflow-visualizer__legend">
        <span className="legend-item current">Current Status</span>
        <span className="legend-item available">Available Transitions</span>
        <span className="legend-item unavailable">Other Statuses</span>
      </div>
    </div>
  );
};

export default WorkflowVisualizer;