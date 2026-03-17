import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/finledger',
  jwtSecret: process.env.JWT_SECRET || 'finledger-jwt-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'finledger-refresh-secret-change-me',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  corsOrigin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : 'http://localhost:5173',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  groqMaxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '2048', 10),
  groqTemperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.3'),
  nodeEnv: process.env.NODE_ENV || 'development',
};
