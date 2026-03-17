import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface NLQueryBarProps {
  onQueryComplete: (result: { config: any; filters?: any; humanReadable?: string }) => void;
}

const NLQueryBar: React.FC<NLQueryBarProps> = ({ onQueryComplete }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const response = await api.post('/ai/parse-query', { query });
      const parsed = response.data || {};

      const aggRaw = String(parsed.aggregation || 'sum').toLowerCase();
      const aggregator = aggRaw === 'average' ? 'avg' : aggRaw === 'avg' ? 'avg' : aggRaw === 'count' ? 'count' : 'sum';

      const rows = parsed.rows ? [String(parsed.rows)] : ['category'];
      const columns = parsed.columns ? [String(parsed.columns)] : ['month'];

      onQueryComplete({
        config: {
          rows,
          columns,
          aggregator,
          aggregationField: 'amount',
        },
        filters: parsed.filters || undefined,
        humanReadable: parsed.humanReadable || undefined,
      });
      if (parsed.humanReadable) setHint(String(parsed.humanReadable));
    } catch (err) {
      console.error("NL Query Parse error", err);
      const anyErr: any = err;
      setError(anyErr?.response?.data?.error || anyErr?.message || 'Failed to parse query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group max-w-2xl mx-auto w-full">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
      <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border overflow-hidden">
        <div className="pl-4 pr-2">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
        </div>
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="e.g., Show me monthly revenue split by branch for current FY"
          className="flex-1 bg-transparent border-none py-3 px-2 text-sm focus:ring-0 outline-none placeholder:text-muted-foreground font-medium"
        />
        <Button 
          onClick={handleQuery}
          disabled={loading || !query.trim()}
          className="rounded-xl px-5 h-11 gap-2 shadow-lg shadow-accent/20 transition-all font-black text-xs uppercase"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Ask AI
        </Button>
      </div>
      {(error || hint) && (
        <div className="mt-3 px-4 text-xs">
          {error && <div className="text-destructive font-semibold">{error}</div>}
          {!error && hint && <div className="text-muted-foreground font-semibold">{hint}</div>}
        </div>
      )}
      <div className="mt-3 flex gap-4 px-4 justify-center">
         {['Monthly Expenses', 'Branch Income', 'FY Profit'].map(tag => (
           <button 
             key={tag}
             onClick={() => setQuery(`Show me ${tag.toLowerCase()} for current FY`)}
             className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors"
           >
             #{tag}
           </button>
         ))}
      </div>
    </div>
  );
};

export default NLQueryBar;
