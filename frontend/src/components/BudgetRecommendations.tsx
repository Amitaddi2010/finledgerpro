import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BudgetRecommendationsProps {
  financialYear: string;
}

const BudgetRecommendations: React.FC<BudgetRecommendationsProps> = ({ financialYear }) => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/ai/budget-recommendations`, { financialYear });
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.error("Budget rec error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [financialYear]);

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden h-full flex flex-col">
      <div className="relative z-10 space-y-6 flex-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <h3 className="font-heading font-black text-xs uppercase tracking-widest">AI Recommendations</h3>
          </div>
          <button 
            onClick={fetchRecommendations}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 scrollbar-hide">
          {recommendations.length > 0 ? (
            recommendations.map((rec, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors group">
                 <div className="flex gap-4">
                    <div className={cn(
                      "p-2 rounded-xl shrink-0 mt-1",
                      rec.priority === 'High' ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"
                    )}>
                       {rec.type === 'saving' ? <TrendingUp className="w-4 h-4" /> : 
                        rec.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : 
                        <Lightbulb className="w-4 h-4" />}
                    </div>
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="text-xs font-bold text-white/50 uppercase tracking-tighter">{rec.category}</span>
                         <span className={cn(
                           "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                           rec.priority === 'High' ? "bg-destructive text-white" : "bg-slate-700 text-slate-300"
                         )}>
                           {rec.priority}
                         </span>
                       </div>
                       <h4 className="text-sm font-bold mb-1 leading-snug">{rec.title}</h4>
                       <p className="text-xs text-white/60 leading-relaxed font-medium">
                         {rec.suggestion}
                       </p>
                    </div>
                 </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
               <Lightbulb className="w-10 h-10 mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest leading-loose">
                 {loading ? 'Analyzing your spending patterns...' : 'No critical insights for this period yet.'}
               </p>
            </div>
          )}
        </div>

        {recommendations.length > 0 && (
           <Button variant="ghost" className="w-full bg-white/5 border-white/5 hover:bg-accent hover:text-white text-white/70 font-black text-[10px] uppercase tracking-widest h-12 transition-all">
             Apply All Optimizations
           </Button>
        )}
      </div>

      {/* Background radial */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
    </div>
  );
};

export default BudgetRecommendations;
