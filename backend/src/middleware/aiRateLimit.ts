import rateLimit from 'express-rate-limit';

export const aiChatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Too many AI chat requests. Limit: 50/hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiInsightsLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many insight generation requests. Limit: 10/day.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiQueryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Too many NL query requests. Limit: 30/hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiBudgetLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many budget recommendation requests. Limit: 5/day.' },
  standardHeaders: true,
  legacyHeaders: false,
});
