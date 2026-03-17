import React, { useState, useEffect } from 'react';
import { 
  Table as PivotIcon, 
  Settings2, 
  ArrowRightLeft, 
  Download
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/formatINR';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import NLQueryBar from '@/components/NLQueryBar';
import { exportToCsv } from '@/lib/csvExport';

const PivotTable: React.FC = () => {
  const { financialYear } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState({
    rows: ['category'],
    columns: ['month'],
    aggregator: 'sum',
    aggregationField: 'amount'
  });

  const [filters, setFilters] = useState<any>({
    transactionType: 'income',
  });

  const fetchPivot = async () => {
    setLoading(true);
    try {
      const rows = config.rows?.[0] || 'category';
      const cols = config.columns?.[0] || 'month';
      const response = await api.get('/pivot', {
        params: {
          rows,
          cols,
          aggregation: config.aggregator,
          transactionType: filters.transactionType,
          financialYear,
        },
      });

      // Transform backend matrix into the UI shape this page expects
      const rowKeys: string[] = response.data.rowKeys || [];
      const colKeys: string[] = response.data.colKeys || [];
      const matrix = response.data.matrix || {};
      const rowTotals = response.data.rowTotals || {};

      const rowsOut = rowKeys.map((rk) => ({
        category: rk,
        branch: rk,
        costCentre: rk,
        data: matrix[rk] || {},
        total: rowTotals[rk] || 0,
      }));

      const grandTotals: Record<string, number> = response.data.colTotals || {};

      setData({
        columns: colKeys,
        rows: rowsOut,
        grandTotals,
        overallTotal: response.data.grandTotal || 0,
      });
    } catch (err) {
      console.error("Pivot fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPivot();
  }, [financialYear, config, filters.transactionType]);

  const toggleDim = (dim: string, type: 'rows' | 'columns') => {
    setConfig(prev => {
      const list = [...prev[type]];
      if (list.includes(dim)) {
        return { ...prev, [type]: list.filter(d => d !== dim) };
      } else {
        return { ...prev, [type]: [...list, dim] };
      }
    });
  };

  return (
    <div className="space-y-8 flex flex-col h-full overflow-hidden">
      {/* Configuration Header */}
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Settings2 className="w-5 h-5 text-accent" />
            <h3 className="font-heading font-black text-sm uppercase tracking-widest text-muted-foreground">Pivot Configuration</h3>
          </div>
          
          <div className="flex flex-wrap gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Rows</label>
              <div className="flex gap-2">
                {['category', 'branch', 'costCentre'].map(dim => (
                  <button 
                    key={dim}
                    onClick={() => toggleDim(dim, 'rows')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                      config.rows.includes(dim) ? "bg-accent text-white border-accent" : "bg-muted text-muted-foreground border-transparent hover:border-slate-300"
                    )}
                  >
                    {dim.charAt(0).toUpperCase() + dim.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Columns</label>
              <div className="flex gap-2">
                {['month', 'financialYear'].map(dim => (
                  <button 
                    key={dim}
                    onClick={() => toggleDim(dim, 'columns')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                      config.columns.includes(dim) ? "bg-accent text-white border-accent" : "bg-muted text-muted-foreground border-transparent hover:border-slate-300"
                    )}
                  >
                    {dim.charAt(0).toUpperCase() + dim.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Type</label>
              <div className="flex p-1 bg-muted rounded-xl">
                 <button 
                   onClick={() => setFilters({ ...filters, transactionType: 'income' })}
                   className={cn("px-4 py-1 rounded-lg text-xs font-bold transition-all", filters.transactionType === 'income' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                 >Incomes</button>
                 <button 
                   onClick={() => setFilters({ ...filters, transactionType: 'expense' })}
                   className={cn("px-4 py-1 rounded-lg text-xs font-bold transition-all", filters.transactionType === 'expense' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                 >Expenses</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              if (!data?.rows || !data?.columns) return;
              const headers = [...config.rows, ...data.columns, 'Total'];
              const rows = data.rows.map((row: any) => [
                ...config.rows.map(dim => row[dim]),
                ...data.columns.map((col: string) => row.data[col] || 0),
                row.total
              ]);
              exportToCsv(`Pivot-Table-${financialYear}.csv`, headers, rows);
            }}
          >
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={fetchPivot} className="gap-2 shadow-lg shadow-primary/20">
            <ArrowRightLeft className="w-4 h-4" /> Recalculate
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-8 flex-1 overflow-hidden">
        <NLQueryBar
          onQueryComplete={(result) => {
            if (result?.config) {
              setConfig((prev) => ({ ...prev, ...result.config }));
            }
            if (result?.filters) {
              setFilters((prev: any) => ({ ...prev, ...result.filters }));
            }
          }}
        />

        <div className="flex-1 bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            </div>
          )}
          
          <div className="overflow-auto max-h-full">
            <table className="w-full text-left border-collapse border-spacing-0">
               <thead className="sticky top-0 bg-card z-20">
                  <tr className="border-b bg-muted/20">
                     {config.rows.map(rowDim => (
                       <th key={rowDim} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-r">{rowDim}</th>
                     ))}
                     {data?.columns?.map((col: string) => (
                       <th key={col} className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground min-w-[120px]">{col}</th>
                     ))}
                     <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 min-w-[120px] sticky right-0 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">Grand Total</th>
                  </tr>
               </thead>
               <tbody className="text-sm font-medium">
                  {data?.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/10 transition-colors group">
                      {config.rows.map(rowDim => (
                        <td key={rowDim} className="px-6 py-4 font-bold border-r whitespace-nowrap">{row[rowDim] || '—'}</td>
                      ))}
                      {data?.columns?.map((col: string) => (
                        <td key={col} className="px-6 py-4 text-center font-mono text-xs">
                          {row.data[col] ? formatINR(row.data[col]) : '—'}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right font-mono font-black text-primary bg-primary/5 sticky right-0 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] group-hover:bg-primary/10 transition-colors">
                        {formatINR(row.total)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Grand Total Row */}
                  {data?.grandTotals && (
                    <tr className="bg-primary text-primary-foreground font-black sticky bottom-0">
                      <td colSpan={config.rows.length} className="px-6 py-5 uppercase tracking-wider font-heading">Total {filters.transactionType}</td>
                      {data?.columns?.map((col: string) => (
                        <td key={col} className="px-6 py-5 text-center font-mono text-[13px]">
                          {formatINR(data.grandTotals[col] || 0)}
                        </td>
                      ))}
                      <td className="px-6 py-5 text-right font-mono text-lg sticky right-0 bg-accent text-white shadow-[-4px_0_10px_rgba(0,0,0,0.2)]">
                        {formatINR(data.overallTotal)}
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
          </div>
          
          {(!data?.rows || data.rows.length === 0) && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-50">
               <PivotIcon className="w-16 h-16 mb-4 text-muted-foreground" />
               <h3 className="text-lg font-heading font-bold mb-2">No Matching Data</h3>
               <p className="max-w-xs text-sm">Adjust your filters or dimensions to see pivoted financial results.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Info */}
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">
         <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Live Query: {config.rows.join(' × ')} split by {config.columns.join(', ')}
         </div>
         <div>Displaying {data?.rows?.length || 0} groupings</div>
      </div>
    </div>
  );
};

export default PivotTable;
