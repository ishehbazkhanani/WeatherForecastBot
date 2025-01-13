import axios from 'axios';
import moment from 'moment';
import { normalizeToMidnight, OPENWEATHER_API_KEY } from '../utils/config.js';
import { DateTimeParam, ForecastByDate } from '../interface/IDialogflow.js';

// Helper function to calculate difference in days
const calculateDifferenceInDays = (dateTime: DateTimeParam | string): number => {
    const today = normalizeToMidnight(new Date());
    if (typeof dateTime === 'object' && dateTime.startDate && dateTime.endDate) {
        const inputEndDate = normalizeToMidnight(new Date(dateTime.endDate));
        return Math.floor((inputEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else {
        const inputDate = normalizeToMidnight(new Date(dateTime as string));
        return Math.floor((inputDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
};

// Helper function to fetch city coordinates
const fetchCityCoordinates = async (city: string): Promise<{ lat: number; lon: number }> => {
    const geocodingUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&appid=${OPENWEATHER_API_KEY}`;
    const response = await axios.get(geocodingUrl);

    if (!response.data || response.data.length === 0) {
        throw new Error(`Could not find the location for city: ${city}`);
    }

    return response.data[0];
};

// Helper function to fetch weather forecast
const fetchForecastData = async (lat: number, lon: number): Promise<any> => {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await axios.get(forecastUrl);
    return response.data;
};

// Helper function to fetch current weather
const fetchCurrentWeather = async (city: string): Promise<any> => {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await axios.get(weatherUrl);
    return response.data;
};

// Helper function to process forecast data
const processForecastData = (data: any, city: string): string => {
    const targetHours = [17, 20, 23];
    const forecastByDate: ForecastByDate = {};

    for (const entry of data.list) {
        const dt = moment.unix(entry.dt);
        const date = dt.format('YYYY-MM-DD');
        const day = dt.format('dddd');
        const hour = dt.hour();

        const today = moment().format('YYYY-MM-DD');
        const startDate = moment(today).add(1, 'day');
        const endDate = startDate.clone().add(7, 'days');

        if (moment(date).isBetween(startDate, endDate, 'day', '[]') && targetHours.includes(hour)) {
            if (!forecastByDate[date]) {
                forecastByDate[date] = { day, forecast: [] };
            }
            forecastByDate[date].forecast.push({
                time: dt.format('HH:mm'),
                temp: entry.main.temp,
                weather: entry.weather[0].description,
                humidity: entry.main.humidity,
            });
        }
    }

    let forecastText = '';
    for (const [date, { day, forecast }] of Object.entries(forecastByDate)) {
        forecastText += `The weather in ${city} on ${day} (${date}) is:\n`;
        forecast.forEach(entry => {
            forecastText += `  - ${entry.time}: ${entry.weather} with a temperature of ${entry.temp}°C and humidity of ${entry.humidity}%.\n`;
        });
        forecastText += '\n';
    }

    return forecastText;
};

// Weather Controller
export const weatherController = async (req: any, res: any) => {
    try {
        const city: string = req.body.queryResult.parameters.address.city;
        const dateTime: DateTimeParam | string = req.body.queryResult.parameters['date-time'];

        const differenceInDays = calculateDifferenceInDays(dateTime);



        if (differenceInDays > 0) {
            const { lat, lon } = await fetchCityCoordinates(city);
            const forecastData = await fetchForecastData(lat, lon);
            const forecastText = processForecastData(forecastData, city);

            return res.status(200).send({ fulfillmentText: forecastText });
        } else {
            const currentWeatherData = await fetchCurrentWeather(city);
            const description = currentWeatherData.weather[0].description;
            const temperature = currentWeatherData.main.temp;

            return res.status(200).send({
                fulfillmentText: `The weather in ${city} today is ${description} with a temperature of ${temperature}°C.`,
            });
        }
    } catch (error: any) {
        console.error("Error:", error.response?.data || error.message);
        return res.status(500).send({
            fulfillmentText: "Something went wrong while processing your request.",
        });
    }
};
