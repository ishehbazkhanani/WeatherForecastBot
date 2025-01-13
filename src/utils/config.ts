import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

export const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';

if (!OPENWEATHER_API_KEY) {
    throw new Error("Missing OpenWeatherMap API key. Please set it in the environment variables.");
}

export const normalizeToMidnight = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};