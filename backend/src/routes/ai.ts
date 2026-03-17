import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';
import { aiChatLimiter, aiInsightsLimiter, aiQueryLimiter, aiBudgetLimiter } from '../middleware/aiRateLimit';
import { getGroqClient, GROQ_MODEL } from '../lib/groq';
import { buildFinancialContext } from '../lib/financialContext';
import { AIInsight, AITokenUsage } from '../models/AIModels';
import { ExpenseTransaction } from '../models/ExpenseTransaction';
import { config } from '../config';

const router = Router();

// AI Chat (SSE streaming)
router.post('/chat', authMiddleware, aiChatLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { messages, financialYear } = req.body;

    if (!config.groqApiKey) {
      return res.status(503).json({ error: 'AI service not configured. Please set GROQ_API_KEY.' });
    }

    const context = await buildFinancialContext(req.companyId!, financialYear);
    const groq = getGroqClient();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const startTime = Date.now();

    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: config.groqMaxTokens,
      temperature: config.groqTemperature,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are FinLedger AI, an expert Chartered Accountant and financial analyst assistant embedded in FinLedger Pro, a CA financial management platform for Indian businesses.

You have access to the company's real-time financial data below. Always:
- Answer with specific ₹ figures from the context (never make up numbers)
- Use Indian number formatting: lakhs (₹X.XX L), crores (₹X.XX Cr)
- Reference the Indian Financial Year (April–March)
- Apply Indian accounting standards (Ind AS) and GST context where relevant
- Be concise, actionable, and CA-grade professional
- If asked something outside the financial data, say so clearly

${context}`,
        },
        ...messages,
      ],
    });

    let totalTokens = 0;
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        totalTokens += 1;
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // Log token usage
    await AITokenUsage.create({
      userId: req.user!._id,
      feature: 'chat',
      tokensUsed: totalTokens,
      modelName: GROQ_MODEL,
      durationMs: Date.now() - startTime,
    });
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI chat failed: ' + error.message });
    }
  }
});

// Generate Insights
router.post('/generate-insights', authMiddleware, aiInsightsLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.body;

    if (!config.groqApiKey) {
      return res.status(503).json({ error: 'AI service not configured. Please set GROQ_API_KEY.' });
    }

    const context = await buildFinancialContext(req.companyId!, financialYear);
    const groq = getGroqClient();
    const startTime = Date.now();

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: config.groqMaxTokens,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are a CA-grade financial analyst. Analyse the financial data and return ONLY valid JSON — no markdown, no explanation outside the JSON.',
        },
        {
          role: 'user',
          content: `Analyse this financial data and return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence executive summary of financial health",
  "insights": [
    {
      "type": "positive|warning|critical|neutral",
      "title": "short insight title (max 8 words)",
      "detail": "1-2 sentence explanation with specific ₹ figures",
      "action": "one actionable recommendation for the CA",
      "metric": "the key metric this relates to"
    }
  ],
  "anomalies": [
    {
      "category": "expense category name",
      "description": "what anomaly was detected",
      "magnitude": "% change or ₹ amount",
      "severity": "low|medium|high"
    }
  ],
  "healthScore": 0-100,
  "healthLabel": "Excellent|Good|Fair|Needs Attention|Critical"
}

Financial data:
${context}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || '{}';
    let insights;
    try {
      insights = JSON.parse(raw);
    } catch {
      insights = { summary: raw, insights: [], anomalies: [], healthScore: 50, healthLabel: 'Fair' };
    }

    await AIInsight.create({
      companyId: req.companyId,
      financialYear,
      ...insights,
      generatedAt: new Date(),
    });

    await AITokenUsage.create({
      userId: req.user!._id,
      feature: 'generate-insights',
      tokensUsed: response.usage?.total_tokens || 0,
      modelName: GROQ_MODEL,
      durationMs: Date.now() - startTime,
    });

    res.json(insights);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate insights: ' + error.message });
  }
});

// Get latest insights
router.get('/insights/latest', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const insight = await AIInsight.findOne({ companyId: req.companyId, financialYear }).sort({ generatedAt: -1 });
    res.json(insight || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// Parse NL query
router.post('/parse-query', authMiddleware, aiQueryLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.body;

    if (!config.groqApiKey) {
      return res.status(503).json({ error: 'AI service not configured. Please set GROQ_API_KEY.' });
    }

    const groq = getGroqClient();
    const startTime = Date.now();

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 512,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You parse natural language financial queries into structured filter JSON for FinLedger Pro's pivot table.
Available dimensions: category, month (Apr/May/Jun/Jul/Aug/Sep/Oct/Nov/Dec/Jan/Feb/Mar), quarter (Q1/Q2/Q3/Q4 of Indian FY), branch, costCentre, vendor, transactionType (income/expense/both).
Available aggregations: sum, average, count, percentOfTotal.
Return ONLY valid JSON, no explanation.`,
        },
        {
          role: 'user',
          content: `Parse this query into pivot filter JSON: "${query}"
Return format:
{
  "rows": "dimension for rows",
  "columns": "dimension for columns",
  "filters": {
    "transactionType": "income|expense|both",
    "months": ["Apr", "May", ...] or null,
    "quarters": ["Q1"] or null,
    "categories": ["category name"] or null,
    "branches": ["branch name"] or null,
    "costCentres": ["cc name"] or null
  },
  "aggregation": "sum|average|count|percentOfTotal",
  "humanReadable": "confirmation sentence describing what will be shown"
}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { error: 'Could not parse query', raw };
    }

    await AITokenUsage.create({
      userId: req.user!._id,
      feature: 'parse-query',
      tokensUsed: response.usage?.total_tokens || 0,
      modelName: GROQ_MODEL,
      durationMs: Date.now() - startTime,
    });

    res.json(parsed);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to parse query: ' + error.message });
  }
});

// Budget Recommendations
router.post('/budget-recommendations', authMiddleware, aiBudgetLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.body;

    if (!config.groqApiKey) {
      return res.status(503).json({ error: 'AI service not configured. Please set GROQ_API_KEY.' });
    }

    const context = await buildFinancialContext(req.companyId!, financialYear);
    const groq = getGroqClient();
    const startTime = Date.now();

    // Get 24-month spend history
    const spendHistory = await ExpenseTransaction.aggregate([
      { $match: { companyId: req.companyId } },
      { $group: { _id: { fy: '$financialYear', month: '$month', category: '$category' }, total: { $sum: '$amount' } } },
      { $sort: { '_id.fy': 1, '_id.month': 1 } },
    ]);

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: config.groqMaxTokens,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: 'You are a CA-grade budget analyst. Return ONLY valid JSON, no markdown or explanation outside JSON.',
        },
        {
          role: 'user',
          content: `Analyse spend history and current budget status. Return:
{
  "yearEndForecast": { "revenue": number, "expenses": number, "netProfit": number, "confidence": "low|medium|high" },
  "recommendations": [{ "category": "string", "currentBudget": number, "recommendedBudget": number, "changePercent": number, "rationale": "string", "priority": "high|medium|low" }],
  "atRiskCategories": [{ "category": "string", "projectedOverspend": number, "projectedOverspendPct": number, "recommendation": "string" }],
  "savingsOpportunities": [{ "description": "string", "estimatedSaving": number, "effort": "easy|medium|hard" }]
}

Financial context:
${context}

Spend history:
${JSON.stringify(spendHistory.slice(0, 50))}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || '{}';
    let recommendations;
    try {
      recommendations = JSON.parse(raw);
    } catch {
      recommendations = { error: 'Could not parse recommendations', raw };
    }

    await AITokenUsage.create({
      userId: req.user!._id,
      feature: 'budget-recommendations',
      tokensUsed: response.usage?.total_tokens || 0,
      modelName: GROQ_MODEL,
      durationMs: Date.now() - startTime,
    });

    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate recommendations: ' + error.message });
  }
});

// Token usage (Admin only)
router.get('/token-usage', authMiddleware, rbac('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

    const usage = await AITokenUsage.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: { feature: '$feature', date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } },
          totalTokens: { $sum: '$tokensUsed' },
          requests: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
        },
      },
      { $sort: { '_id.date': -1 } },
    ]);

    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch token usage' });
  }
});

export default router;
