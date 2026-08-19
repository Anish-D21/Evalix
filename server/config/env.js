import 'dotenv/config';

// Single place to read process.env so the rest of the codebase never
// touches process.env directly.
export const env = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  fastapiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export default env;
