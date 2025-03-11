import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

/**
 * Custom hook for integrating D3.js with React
 * 
 * This hook provides a clean way to use D3's imperative DOM manipulation
 * within React's declarative component lifecycle.
 *
 * @param renderFn - D3 rendering function that receives the root SVG selection
 * @param dependencies - Array of dependencies that should trigger a re-render
 * @returns A ref object to attach to the SVG element
 * 
 * @example
 * ```tsx
 * const svgRef = useD3((svg) => {
 *   // D3 rendering code here
 *   svg.selectAll('rect')
 *     .data(data)
 *     .join('rect')
 *     .attr('width', 40)
 *     .attr('height', d => d);
 * }, [data]);
 * 
 * return <svg ref={svgRef}></svg>;
 * ```
 */
export const useD3 = (
  renderFn: (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void,
  dependencies: any[] = []
) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current) {
      const svg = d3.select(ref.current);
      renderFn(svg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderFn, ...dependencies]);

  return ref;
};