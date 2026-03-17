import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  RefreshCw,
  Zap
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer
} from 'recharts';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Insights: React.FC = () => {
  const { financialYear } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightData, setInsightData] = useState<any>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/ai/insights/latest?financialYear=${financialYear}`);
      setInsightData(response.data);
    } catch (err) {
      console.error("Insights fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    setRefreshing(true);
    try {
      const response = await api.post('/ai/generate-insights', { financialYear });
      setInsightData(response.data);
    } catch (err) {
      console.error("Insight generation error", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [financialYear]);

  if (loading) return <div className="space-y-8 animate-pulse">
    <div className="h-64 bg-slate-200 rounded-3xl dark:bg-slate-800" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="h-48 bg-slate-200 rounded-2xl dark:bg-slate-800" />
      <div className="h-48 bg-slate-200 rounded-2xl dark:bg-slate-800" />
    </div>
  </div>;

  const healthScoreData = [
    { name: 'Health', value: insightData?.healthScore || 0 },
    { name: 'Remainder', value: 100 - (insightData?.healthScore || 0) }
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* AI Hero Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="max-w-xl space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-accent">
                <Sparkles className="w-3 h-3" /> AI Driven Intelligence
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-black tracking-tight leading-tight">
                Your Financial <span className="text-accent underline decoration-slate-600 underline-offset-8">Cognitive Engine</span>
              </h1>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Analyzing {insightData?.analysisPeriod || 'current FY'} benchmarks with advanced neural vision. Total insights generated: {insightData?.metricsCount || 0}.
              </p>
              <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                 <Button 
                   onClick={generateNewInsights} 
                   disabled={refreshing}
                   className="bg-accent hover:bg-accent/90 text-white font-black px-6 gap-2 h-11"
                 >
                   {refreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                   Regenerate Intelligence
                 </Button>
                 <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold h-11">
                    Export AI Report
                 </Button>
              </div>
           </div>

           <div className="relative w-48 h-48 md:w-64 md:h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={healthScoreData}
                    cx="50%"
                    cy="50%"
                    innerRadius="75%"
                    outerRadius="95%"
                    startAngle={225}
                    endAngle={-45}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="rgba(255,255,255,0.05)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div className="text-4xl md:text-6xl font-mono font-black tracking-tighter">{insightData?.healthScore}%</div>
                 <div className="text-[10px] uppercase font-black text-white/40 tracking-widest">Health Score</div>
              </div>
           </div>
        </div>
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[120px] -mr-32 -mt-32 transition-all group-hover:bg-accent/30 duration-1000" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[80px] -ml-16 -mb-16" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Key Inisghts Column */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center gap-3">
             <BrainCircuit className="w-6 h-6 text-primary" />
             <h3 className="font-heading font-black text-lg tracking-tight uppercase">Operational Intelligence</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insightData?.insights?.map((insight: any, i: number) => (
                <div key={i} className="bg-card border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                   <div className="flex justify-between items-start mb-4">
                      <div className={cn(
                        "p-2 rounded-xl border",
                        insight.type === 'positive' ? "bg-positive/10 border-positive/20 text-positive" : 
                        insight.type === 'warning' ? "bg-warning/10 border-warning/20 text-warning" : 
                        "bg-accent/10 border-accent/20 text-accent"
                      )}>
                        {insight.type === 'positive' ? <CheckCircle2 className="w-5 h-5" /> : 
                         insight.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : 
                         <TrendingUp className="w-5 h-5" />}
                      </div>
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {insight.category}
                      </div>
                   </div>
                   <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">{insight.title}</h4>
                   <p className="text-sm text-muted-foreground leading-relaxed">
                     {insight.description}
                   </p>
                </div>
              ))}
           </div>
        </div>

        {/* Anomalies and Protection */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
             <ShieldCheck className="w-6 h-6 text-destructive" />
             <h3 className="font-heading font-black text-lg tracking-tight uppercase">Audit & Anomalies</h3>
           </div>

           <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-6 relative overflow-hidden">
             <div className="relative z-10 space-y-6">
                {insightData?.anomalies?.length > 0 ? (
                  insightData.anomalies.map((anomaly: any, i: number) => (
                    <div key={i} className="flex gap-4 p-4 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-destructive/10 backdrop-blur-sm">
                       <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                       <div>
                          <div className="text-xs font-black text-destructive uppercase tracking-widest mb-1">{anomaly.type}</div>
                          <div className="text-sm font-bold mb-1">{anomaly.title}</div>
                          <p className="text-xs text-muted-foreground">{anomaly.description}</p>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-positive/30 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-500">No critical anomalies detected in current audit scan.</p>
                  </div>
                )}
             </div>
           </div>

           <div className="bg-card border p-6 rounded-2xl shadow-sm">
              <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">Firm Health Benchmarks</h4>
              <div className="space-y-5">
                 {[
                   { label: 'Margin Stability', value: 88 },
                   { label: 'Tax Compliance', value: 94 },
                   { label: 'Budget Precision', value: 72 }
                 ].map(b => (
                    <div key={b.label} className="space-y-2">
                       <div className="flex justify-between text-[11px] font-bold uppercase tracking-tighter">
                          <span>{b.label}</span>
                          <span>{b.value}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-muted rounded-full">
                          <div className="h-full bg-slate-900 rounded-full" style={{ width: `${b.value}%` }} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
