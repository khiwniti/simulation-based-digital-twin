import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

/**
 * Historian Interface Service
 * Provides interfaces to industrial historian systems (PI System, Wonderware, etc.)
 * Handles historical data retrieval, aggregation, and caching
 */

export interface HistorianTag {
  tagName: string;
  description: string;
  engineeringUnits: string;
  dataType: 'float' | 'int' | 'string' | 'boolean';
  archiveInterval: number; // seconds
  compressionEnabled: boolean;
  compressionDeviation: number;
}

export interface HistorianQuery {
  tagNames: string[];
  startTime: Date;
  endTime: Date;
  interval?: number; // seconds, for interpolated data
  aggregationType?: 'raw' | 'average' | 'min' | 'max' | 'count' | 'stddev';
  includeQuality?: boolean;
}

export interface HistorianDataPoint {
  tagName: string;
  timestamp: Date;
  value: any;
  quality: 'good' | 'bad' | 'uncertain' | 'stale';
  interpolated?: boolean;
}

export interface HistorianConfig {
  type: 'pi' | 'wonderware' | 'ignition' | 'custom';
  host: string;
  port: number;
  apiPath: string;
  authentication: {
    type: 'basic' | 'windows' | 'token';
    username?: string;
    password?: string;
    token?: string;
    domain?: string;
  };
  ssl: boolean;
  timeout: number;
}

// PI System specific interfaces
interface PIWebAPIResponse {
  Items: Array<{
    Name: string;
    Value: {
      Value: any;
      Timestamp: string;
      Good: boolean;
      Questionable: boolean;
      Substituted: boolean;
    };
  }>;
}

// Wonderware specific interfaces
interface WonderwareQueryResult {
  ErrorCode: number;
  ErrorMessage: string;
  Data: Array<{
    TagName: string;
    DateTime: string;
    Value: any;
    Quality: number;
  }>;
}

class HistorianInterfaceService extends EventEmitter {
  private historians: Map<string, HistorianConfig> = new Map();
  private httpClients: Map<string, AxiosInstance> = new Map();
  private tagCache: Map<string, HistorianTag> = new Map();
  private dataCache: Map<string, HistorianDataPoint[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a historian connection
   */
  async registerHistorian(id: string, config: HistorianConfig): Promise<void> {
    this.historians.set(id, config);
    
    // Create HTTP client for REST APIs
    const client = axios.create({
      baseURL: `${config.ssl ? 'https' : 'http'}://${config.host}:${config.port}${config.apiPath}`,
      timeout: config.timeout,
      headers: this.getAuthHeaders(config)
    });
    
    this.httpClients.set(id, client);
    
    // Test connection
    await this.testConnection(id);
    
    console.log(`Registered historian: ${id} (${config.type})`);
    this.emit('historianRegistered', { id, config });
  }

  /**
   * Get authentication headers based on config
   */
  private getAuthHeaders(config: HistorianConfig): Record<string, string> {
    const headers: Record<string, string> = {};
    
    switch (config.authentication.type) {
      case 'basic':
        const credentials = Buffer.from(
          `${config.authentication.username}:${config.authentication.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'token':
        headers['Authorization'] = `Bearer ${config.authentication.token}`;
        break;
      case 'windows':
        // Windows authentication typically handled at transport level
        // May require additional configuration
        break;
    }
    
    return headers;
  }

  /**
   * Test historian connection
   */
  private async testConnection(historianId: string): Promise<void> {
    const config = this.historians.get(historianId);
    if (!config) throw new Error(`Historian not found: ${historianId}`);
    
    try {
      switch (config.type) {
        case 'pi':
          await this.testPIConnection(historianId);
          break;
        case 'wonderware':
          await this.testWonderwareConnection(historianId);
          break;
        case 'ignition':
          await this.testIgnitionConnection(historianId);
          break;
        default:
          console.log(`Custom historian ${historianId} - assuming connection is valid`);
      }
    } catch (error) {
      console.error(`Failed to connect to historian ${historianId}:`, error);
      throw error;
    }
  }

  /**
   * Test PI System connection
   */
  private async testPIConnection(historianId: string): Promise<void> {
    const client = this.httpClients.get(historianId);
    if (!client) throw new Error(`HTTP client not found for ${historianId}`);
    
    // Test with PI Web API home endpoint
    const response = await client.get('/');
    if (response.status !== 200) {
      throw new Error(`PI Web API returned status ${response.status}`);
    }
  }

  /**
   * Test Wonderware connection
   */
  private async testWonderwareConnection(historianId: string): Promise<void> {
    const client = this.httpClients.get(historianId);
    if (!client) throw new Error(`HTTP client not found for ${historianId}`);
    
    // Test with Wonderware REST API info endpoint
    const response = await client.get('/Info');
    if (response.status !== 200) {
      throw new Error(`Wonderware API returned status ${response.status}`);
    }
  }

  /**
   * Test Ignition connection
   */
  private async testIgnitionConnection(historianId: string): Promise<void> {
    const client = this.httpClients.get(historianId);
    if (!client) throw new Error(`HTTP client not found for ${historianId}`);
    
    // Test with Ignition status endpoint
    const response = await client.get('/StatusPing');
    if (response.status !== 200) {
      throw new Error(`Ignition API returned status ${response.status}`);
    }
  }

  /**
   * Query historical data
   */
  async queryHistoricalData(
    historianId: string,
    query: HistorianQuery
  ): Promise<HistorianDataPoint[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(historianId, query);
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    const config = this.historians.get(historianId);
    if (!config) throw new Error(`Historian not found: ${historianId}`);
    
    let data: HistorianDataPoint[] = [];
    
    switch (config.type) {
      case 'pi':
        data = await this.queryPIData(historianId, query);
        break;
      case 'wonderware':
        data = await this.queryWonderwareData(historianId, query);
        break;
      case 'ignition':
        data = await this.queryIgnitionData(historianId, query);
        break;
      default:
        throw new Error(`Unsupported historian type: ${config.type}`);
    }
    
    // Cache the results
    this.cacheData(cacheKey, data);
    
    // Emit data retrieved event
    this.emit('dataRetrieved', {
      historianId,
      query,
      dataPoints: data.length
    });
    
    return data;
  }

  /**
   * Query PI System data
   */
  private async queryPIData(
    historianId: string,
    query: HistorianQuery
  ): Promise<HistorianDataPoint[]> {
    const client = this.httpClients.get(historianId);
    if (!client) throw new Error(`HTTP client not found for ${historianId}`);
    
    const data: HistorianDataPoint[] = [];
    
    // Build PI Web API query
    const params = {
      startTime: query.startTime.toISOString(),
      endTime: query.endTime.toISOString(),
      interval: query.interval ? `${query.interval}s` : undefined,
      summaryType: this.mapAggregationTypeToPI(query.aggregationType)
    };
    
    // Query each tag
    for (const tagName of query.tagNames) {
      try {
        const response = await client.get<PIWebAPIResponse>(
          `/streams/${encodeURIComponent(tagName)}/recorded`,
          { params }
        );
        
        // Convert PI response to standard format
        for (const item of response.data.Items) {
          data.push({
            tagName,
            timestamp: new Date(item.Value.Timestamp),
            value: item.Value.Value,
            quality: this.mapPIQuality(item.Value),
            interpolated: item.Value.Substituted
          });
        }
      } catch (error) {
        console.error(`Error querying PI tag ${tagName}:`, error);
      }
    }
    
    return data;
  }

  /**
   * Query Wonderware data
   */
  private async queryWonderwareData(
    historianId: string,
    query: HistorianQuery
  ): Promise<HistorianDataPoint[]> {
    const client = this.httpClients.get(historianId);
    if (!client) throw new Error(`HTTP client not found for ${historianId}`);
    
    const data: HistorianDataPoint[] = [];
    
    // Build Wonderware query
    const payload = {
      Tags: query.tagNames,
      StartDateTime: query.startTime.toISOString(),
      EndDateTime: query.endTime.toISOString(),
      Resolution: query.interval || 0,
      RetrievalMode: this.mapAggregationTypeToWonderware(query.aggregationType)
    };
    
    try {
      const response = await client.post<WonderwareQueryResult>(
        '/History/WideQuery',
        payload
      );
      
      if (response.data.ErrorCode !== 0) {
        throw new Error(`Wonderware error: ${response.data.ErrorMessage}`);
      }
      
      // Convert Wonderware response to standard format
      for (const item of response.data.Data) {
        data.push({
          tagName: item.TagName,
          timestamp: new Date(item.DateTime),
          value: item.Value,
          quality: this.mapWonderwareQuality(item.Quality),
          interpolated: false
        });
      }
    } catch (error) {
      console.error(`Error querying Wonderware:`, error);
      throw error;
    }
    
    return data;
  }

  /**
   * Query Ignition data
   */
  private async queryIgnitionData(
    historianId: string,
    query: HistorianQuery
  ): Promise<HistorianDataPoint[]> {
    const client = this.httpClients.get(historianId);
    if (!client) throw new Error(`HTTP client not found for ${historianId}`);
    
    const data: HistorianDataPoint[] = [];
    
    // Build Ignition query
    const params = {
      paths: query.tagNames.join(','),
      startDate: query.startTime.getTime(),
      endDate: query.endTime.getTime(),
      returnSize: 10000,
      aggregationMode: this.mapAggregationTypeToIgnition(query.aggregationType)
    };
    
    try {
      const response = await client.get('/History', { params });
      
      // Convert Ignition response to standard format
      // Note: Actual format depends on Ignition configuration
      if (Array.isArray(response.data)) {
        for (const item of response.data) {
          data.push({
            tagName: item.path,
            timestamp: new Date(item.t),
            value: item.v,
            quality: item.q >= 192 ? 'good' : 'bad',
            interpolated: false
          });
        }
      }
    } catch (error) {
      console.error(`Error querying Ignition:`, error);
      throw error;
    }
    
    return data;
  }

  /**
   * Get interpolated data at specific intervals
   */
  async getInterpolatedData(
    historianId: string,
    tagNames: string[],
    startTime: Date,
    endTime: Date,
    interval: number
  ): Promise<HistorianDataPoint[]> {
    const query: HistorianQuery = {
      tagNames,
      startTime,
      endTime,
      interval,
      aggregationType: 'raw'
    };
    
    return this.queryHistoricalData(historianId, query);
  }

  /**
   * Get aggregated data
   */
  async getAggregatedData(
    historianId: string,
    tagNames: string[],
    startTime: Date,
    endTime: Date,
    interval: number,
    aggregationType: 'average' | 'min' | 'max' | 'count' | 'stddev'
  ): Promise<HistorianDataPoint[]> {
    const query: HistorianQuery = {
      tagNames,
      startTime,
      endTime,
      interval,
      aggregationType
    };
    
    return this.queryHistoricalData(historianId, query);
  }

  /**
   * Subscribe to real-time updates from historian
   */
  subscribeToRealTimeUpdates(
    historianId: string,
    tagNames: string[],
    callback: (data: HistorianDataPoint) => void
  ): void {
    const key = `${historianId}:${tagNames.join(',')}`;
    
    // Clear existing interval if any
    const existing = this.pollingIntervals.get(key);
    if (existing) {
      clearInterval(existing);
    }
    
    // Poll for latest values
    const interval = setInterval(async () => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 60000); // Last minute
        
        const data = await this.queryHistoricalData(historianId, {
          tagNames,
          startTime,
          endTime,
          aggregationType: 'raw'
        });
        
        // Get latest value for each tag
        const latestByTag = new Map<string, HistorianDataPoint>();
        for (const point of data) {
          const existing = latestByTag.get(point.tagName);
          if (!existing || point.timestamp > existing.timestamp) {
            latestByTag.set(point.tagName, point);
          }
        }
        
        // Emit latest values
        latestByTag.forEach(point => callback(point));
        
      } catch (error) {
        console.error(`Error polling historian ${historianId}:`, error);
      }
    }, 5000); // Poll every 5 seconds
    
    this.pollingIntervals.set(key, interval);
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromRealTimeUpdates(historianId: string, tagNames: string[]): void {
    const key = `${historianId}:${tagNames.join(',')}`;
    const interval = this.pollingIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(key);
    }
  }

  /**
   * Map aggregation type to PI System
   */
  private mapAggregationTypeToPI(type?: string): string {
    switch (type) {
      case 'average': return 'Average';
      case 'min': return 'Minimum';
      case 'max': return 'Maximum';
      case 'count': return 'Count';
      case 'stddev': return 'StdDev';
      default: return 'None';
    }
  }

  /**
   * Map aggregation type to Wonderware
   */
  private mapAggregationTypeToWonderware(type?: string): string {
    switch (type) {
      case 'average': return 'Average';
      case 'min': return 'Min';
      case 'max': return 'Max';
      case 'count': return 'Counter';
      default: return 'BestFit';
    }
  }

  /**
   * Map aggregation type to Ignition
   */
  private mapAggregationTypeToIgnition(type?: string): string {
    switch (type) {
      case 'average': return 'Average';
      case 'min': return 'MinMax';
      case 'max': return 'MinMax';
      default: return 'AsStored';
    }
  }

  /**
   * Map PI quality flags
   */
  private mapPIQuality(value: any): 'good' | 'bad' | 'uncertain' | 'stale' {
    if (value.Good) return 'good';
    if (value.Questionable) return 'uncertain';
    return 'bad';
  }

  /**
   * Map Wonderware quality codes
   */
  private mapWonderwareQuality(quality: number): 'good' | 'bad' | 'uncertain' | 'stale' {
    if (quality >= 192) return 'good';
    if (quality >= 64) return 'uncertain';
    return 'bad';
  }

  /**
   * Generate cache key
   */
  private getCacheKey(historianId: string, query: HistorianQuery): string {
    return `${historianId}:${query.tagNames.join(',')}:${query.startTime.getTime()}:${query.endTime.getTime()}:${query.aggregationType || 'raw'}`;
  }

  /**
   * Get cached data if valid
   */
  private getCachedData(cacheKey: string): HistorianDataPoint[] | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (expiry && expiry > Date.now()) {
      return this.dataCache.get(cacheKey) || null;
    }
    return null;
  }

  /**
   * Cache data with expiry
   */
  private cacheData(cacheKey: string, data: HistorianDataPoint[]): void {
    this.dataCache.set(cacheKey, data);
    this.cacheExpiry.set(cacheKey, Date.now() + 300000); // 5 minute cache
    
    // Clean old cache entries
    this.cleanCache();
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cacheExpiry.forEach((expiry, key) => {
      if (expiry < now) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.dataCache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }

  /**
   * Export data to CSV format
   */
  exportToCSV(data: HistorianDataPoint[]): string {
    if (data.length === 0) return '';
    
    // Header
    let csv = 'TagName,Timestamp,Value,Quality\n';
    
    // Data rows
    for (const point of data) {
      csv += `${point.tagName},${point.timestamp.toISOString()},${point.value},${point.quality}\n`;
    }
    
    return csv;
  }

  /**
   * Get registered historians
   */
  getHistorians(): Map<string, HistorianConfig> {
    return new Map(this.historians);
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    // Clear all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    
    // Clear caches
    this.dataCache.clear();
    this.cacheExpiry.clear();
    
    console.log('Historian Interface Service shut down');
  }
}

// Export singleton instance
export const historianInterfaceService = new HistorianInterfaceService();

// Export class for testing
export { HistorianInterfaceService };