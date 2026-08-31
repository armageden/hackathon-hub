'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api, queryKeys } from '@/lib/api';
import { 
  Database, 
  Server, 
  HardDrive, 
  Activity, 
  CheckCircle, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';

interface DatabaseHealthData {
  database: string;
  user: string;
  postgres_version: string;
  server_time: string;
  active_connections: number;
}

interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}

interface DetailedHealthResponse {
  success: boolean;
  data?: DetailedHealthData;
  error?: { code: string; message: string };
}

interface DetailedHealthData {
  status: string;
  database: DatabaseHealthData;
  tables: string[];
  recent_migrations: Array<{ id: number; filename: string; applied_at: string }>;
  uptime: number;
  memory: MemoryUsage;
}

export function DatabaseStatusCard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.healthDetailed,
    queryFn: async () => {
      const res: DetailedHealthResponse = await api.get<DetailedHealthData>('/health/detailed');
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch health');
      return res.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const health = data;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Database Status</CardTitle>
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !health) {
    return (
      <Card className="border-red-500/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Database Connection Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-400 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button 
            onClick={() => refetch()}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
        </CardContent>
      </Card>
    );
  }

  const db = health.database;
  const uptimeHours = Math.floor(health.uptime / 3600);
  const uptimeMinutes = Math.floor((health.uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(health.uptime % 60);
  const memUsedMB = Math.round(health.memory.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(health.memory.heapTotal / 1024 / 1024);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-400" />
          Database Status
        </CardTitle>
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Connected
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Database className="h-4 w-4" />
              <span className="text-sm">Database</span>
            </div>
            <p className="font-mono text-lg text-white truncate">{db.database}</p>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Server className="h-4 w-4" />
              <span className="text-sm">User</span>
            </div>
            <p className="font-mono text-lg text-white">{db.user}</p>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Active Connections</span>
            </div>
            <p className="font-mono text-lg text-white">{db.active_connections}</p>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm">Tables</span>
            </div>
            <p className="font-mono text-lg text-white">{health.tables.length}</p>
          </div>
        </div>

        {/* Server Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
          <div>
            <p className="text-xs text-gray-500 mb-1">PostgreSQL Version</p>
            <p className="font-mono text-sm text-white truncate">{db.postgres_version.split(' ')[0]} {db.postgres_version.split(' ')[1]}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Server Time (UTC)</p>
            <p className="font-mono text-sm text-white">{new Date(db.server_time).toISOString().replace('T', ' ').substring(0, 19)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Backend Uptime</p>
            <p className="font-mono text-sm text-white">{uptimeHours}h {uptimeMinutes}m {uptimeSeconds}s</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 mb-1">Memory Usage</p>
            <p className="font-mono text-sm text-white">{memUsedMB} MB / {memTotalMB} MB</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Recent Migrations</p>
            <p className="font-mono text-sm text-white">{health.recent_migrations.length} applied</p>
          </div>
        </div>

        {/* Tables List */}
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-gray-900/50">
            <span className="font-medium text-white flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Tables ({health.tables.length})
            </span>
            <span className="text-gray-400">Click to expand</span>
          </summary>
          <div className="mt-2 p-4 bg-gray-900/50 rounded-lg border border-gray-800 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {health.tables.map((table) => (
                <code key={table} className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-gray-300 hover:text-white transition-colors">
                  {table}
                </code>
              ))}
            </div>
          </div>
        </details>

        {/* Recent Migrations */}
        {health.recent_migrations.length > 0 && (
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-gray-900/50">
              <span className="font-medium text-white flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Migrations
              </span>
              <span className="text-gray-400">Click to expand</span>
            </summary>
            <div className="mt-2 p-4 bg-gray-900/50 rounded-lg border border-gray-800 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                {health.recent_migrations.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <code className="text-xs font-mono text-gray-300">{m.filename}</code>
                    <span className="text-xs text-gray-500">{formatDateTime(m.applied_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
          <button 
            onClick={() => refetch()}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <a 
            href="http://localhost:5050" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-outline flex items-center gap-2"
          >
            <Server className="h-4 w-4" />
            Open pgAdmin
          </a>
        </div>
      </CardContent>
    </Card>
  );
}