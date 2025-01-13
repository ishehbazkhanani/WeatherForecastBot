import dotenv from 'dotenv';
dotenv.config(); // Load environment variables
export const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
if (!OPENWEATHER_API_KEY) {
    throw new Error("Missing OpenWeatherMap API key. Please set it in the environment variables.");
}
