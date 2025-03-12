import Logger from './logger';

/**
 * Debug Helper for tracking component lifecycle and rendering issues
 */
export class DebugHelper {
  private static readonly DEBUG_ENABLED = true;

  /**
   * Track component mounting
   * @param componentName Name of the component
   * @param props Optional props to log
   */
  public static componentDidMount(componentName: string, props?: any): void {
    if (!this.DEBUG_ENABLED) return;
    Logger.debug(`[MOUNT] ${componentName} mounted`, props ? { props } : undefined);
  }

  /**
   * Track component unmounting
   * @param componentName Name of the component
   */
  public static componentWillUnmount(componentName: string): void {
    if (!this.DEBUG_ENABLED) return;
    Logger.debug(`[UNMOUNT] ${componentName} will unmount`);
  }

  /**
   * Track component updates
   * @param componentName Name of the component
   * @param prevProps Previous props (optional)
   * @param nextProps Next props (optional)
   */
  public static componentDidUpdate(componentName: string, prevProps?: any, nextProps?: any): void {
    if (!this.DEBUG_ENABLED) return;
    
    Logger.debug(`[UPDATE] ${componentName} updated`, {
      ...(prevProps ? { prevProps } : {}),
      ...(nextProps ? { nextProps } : {})
    });
  }

  /**
   * Track rendering errors
   * @param componentName Name of the component
   * @param error The error that occurred
   */
  public static renderError(componentName: string, error: Error): void {
    Logger.error(`[RENDER ERROR] ${componentName} failed to render:`, error);
  }

  /**
   * Track data fetching
   * @param componentName Name of the component
   * @param dataType Type of data being fetched
   * @param status Status of the fetch (start, success, error)
   * @param details Additional details
   */
  public static dataFetch(
    componentName: string, 
    dataType: string, 
    status: 'start' | 'success' | 'error',
    details?: any
  ): void {
    if (!this.DEBUG_ENABLED) return;
    
    Logger.debug(`[DATA ${status.toUpperCase()}] ${componentName} - ${dataType}`, details);
  }

  /**
   * Track visualization rendering
   * @param componentName Name of the component
   * @param renderedItems Number of items rendered
   * @param renderTime Time taken to render in ms (optional)
   */
  public static visualizationRendered(
    componentName: string,
    renderedItems: number,
    renderTime?: number
  ): void {
    if (!this.DEBUG_ENABLED) return;
    
    Logger.debug(
      `[VISUALIZATION] ${componentName} rendered ${renderedItems} items` + 
      (renderTime ? ` in ${renderTime}ms` : '')
    );
  }
}

export default DebugHelper;