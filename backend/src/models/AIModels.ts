import mongoose, { Schema, Document } from 'mongoose';

// AI Insights
export interface IAIInsight extends Document {
  companyId: mongoose.Types.ObjectId;
  financialYear: string;
  summary: string;
  insights: {
    type: 'positive' | 'warning' | 'critical' | 'neutral';
    title: string;
    detail: string;
    action: string;
    metric: string;
  }[];
  anomalies: {
    category: string;
    description: string;
    magnitude: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  healthScore: number;
  healthLabel: string;
  generatedAt: Date;
}

const aiInsightSchema = new Schema<IAIInsight>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  financialYear: { type: String, required: true },
  summary: { type: String },
  insights: [{ type: Schema.Types.Mixed }],
  anomalies: [{ type: Schema.Types.Mixed }],
  healthScore: { type: Number },
  healthLabel: { type: String },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const AIInsight = mongoose.model<IAIInsight>('AIInsight', aiInsightSchema);

// AI Token Usage
export interface IAITokenUsage extends Document {
  userId: mongoose.Types.ObjectId;
  feature: string;
  tokensUsed: number;
  modelName: string;
  durationMs: number;
  timestamp: Date;
}

const aiTokenUsageSchema = new Schema<IAITokenUsage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  feature: { type: String, required: true },
  tokensUsed: { type: Number, default: 0 },
  modelName: { type: String },
  durationMs: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

aiTokenUsageSchema.index({ userId: 1, timestamp: -1 });

export const AITokenUsage = mongoose.model<IAITokenUsage>('AITokenUsage', aiTokenUsageSchema);
