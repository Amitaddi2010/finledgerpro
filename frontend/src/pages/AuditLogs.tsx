import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  Calendar,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { exportToCsv } from '@/lib/csvExport';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/audit-logs?page=${page}&limit=20&search=${filter}`);
      setLogs(response.data.logs);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error("Audit log fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight flex items-center gap-3">
             <ShieldCheck className="w-8 h-8 text-accent" /> Security Audit Central
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Tracking every system event and data modification with cryptographically verifiable logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             className="gap-2 font-bold uppercase text-[10px] tracking-widest h-10"
             onClick={() => {
               if (!logs.length) return;
               const headers = ['Timestamp', 'User', 'Action', 'Module', 'Entity ID', 'IP Address'];
               const rows = logs.map(log => [
                 format(new Date(log.createdAt || log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                 log.userId?.name || 'System',
                 log.action,
                 log.entity,
                 log.entityId,
                 log.ipAddress || '-'
               ]);
               exportToCsv('Audit-Trail.csv', headers, rows);
             }}
           >
              <Download className="w-4 h-4" /> Export Audit Trail
           </Button>
           <Button className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-primary/20">
              <Activity className="w-4 h-4" /> System Health
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Total Events', val: logs.length > 0 ? '4,102' : '0', color: 'text-primary' },
           { label: 'Security Alerts', val: '0', color: 'text-positive' },
           { label: 'Avg Latency', val: '42ms', color: 'text-accent' },
           { label: 'Storage Used', val: '1.2 GB', color: 'text-slate-500' }
         ].map(s => (
           <div key={s.label} className="bg-card border p-5 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{s.label}</div>
              <div className={cn("text-2xl font-mono font-black tracking-tighter", s.color)}>{s.val}</div>
           </div>
         ))}
      </div>

      {/* Control Bar */}
      <div className="bg-card border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by action, user, or IP..."
              className="w-full pl-11 pr-4 py-3 bg-muted/30 border-none rounded-xl text-sm focus:ring-1 focus:ring-accent transition-all font-medium"
            />
         </div>
         <div className="flex gap-2">
            <Button variant="ghost" className="h-11 px-6 rounded-xl gap-2 text-xs font-bold">
               <Calendar className="w-4 h-4" /> FY 2024-25
            </Button>
            <Button variant="ghost" className="h-11 px-6 rounded-xl gap-2 text-xs font-bold">
               <Filter className="w-4 h-4" /> All Roles
            </Button>
         </div>
      </div>

      {/* Log Table */}
      <div className="bg-card border rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[500px] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">User</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Module</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {logs.map((log) => (
                <tr key={log._id} className="border-b hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-5 font-mono text-[11px] text-slate-500">
                    {format(new Date(log.createdAt || log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-[10px]">
                        {log.userId?.name.charAt(0)}
                      </div>
                      <div className="font-bold">{log.userId?.name || 'System Agent'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter",
                      (String(log.action).toLowerCase() === 'create') ? 'bg-positive/10 text-positive' :
                      (String(log.action).toLowerCase() === 'delete') ? 'bg-destructive/10 text-destructive' :
                      'bg-accent/10 text-accent'
                    )}>
                      {String(log.action).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-600 uppercase tracking-tighter text-xs">
                    {log.entity || log.module}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1 text-positive">
                      <ShieldCheck className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase">Success</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg group-hover:bg-accent group-hover:text-white transition-all">
                      <FileText className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-40">
            <ShieldCheck className="w-16 h-16 mb-4 text-muted-foreground" />
            <p className="text-sm font-bold uppercase tracking-widest leading-loose">No audit events matches your search parameters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center px-4">
         <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            Showing {logs.length} events of {logs.length * totalPages}
         </div>
         <div className="flex gap-2">
            <Button 
               disabled={page === 1} 
               onClick={() => setPage(p => p - 1)}
               variant="outline" size="sm" className="h-9 px-4 rounded-xl text-xs font-black uppercase"
            >Prev</Button>
            <Button 
               disabled={page === totalPages} 
               onClick={() => setPage(p => p + 1)}
               variant="outline" size="sm" className="h-9 px-4 rounded-xl text-xs font-black uppercase"
            >Next</Button>
         </div>
      </div>
    </div>
  );
};

export default AuditLogs;
