var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Import necessary modules
import express from 'express';
import axios from 'axios';
import moment from 'moment';
import { OPENWEATHER_API_KEY } from './config.js';
const app = express();
const PORT = process.env.PORT || 3000;
if (!OPENWEATHER_API_KEY) {
    throw new Error("Missing OpenWeatherMap API key. Please set it in the environment variables.");
}
// Middleware to parse JSON bodies
app.use(express.json());
// Helper function to normalize dates to midnight
const normalizeToMidnight = (date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};
// Webhook endpoint for Dialogflow
app.post('/webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const city = req.body.queryResult.parameters.address.city;
        const dateTime = req.body.queryResult.parameters['date-time'];
        let differenceInDays;
        if (typeof dateTime === 'object' && dateTime.startDate && dateTime.endDate) {
            const { startDate, endDate } = dateTime;
            const today = normalizeToMidnight(new Date());
            const inputStartDate = normalizeToMidnight(new Date(startDate));
            const inputEndDate = normalizeToMidnight(new Date(endDate));
            differenceInDays = Math.floor((inputEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        else {
            const today = normalizeToMidnight(new Date());
            const inputDate = normalizeToMidnight(new Date(dateTime));
            differenceInDays = Math.floor((inputDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        console.log({ differenceInDays });
        // Determine the date category
        let dateCategory;
        if (differenceInDays === 0) {
            dateCategory = "today";
        }
        else if (differenceInDays === 1) {
            dateCategory = "tomorrow";
        }
        else if (differenceInDays <= 7) {
            dateCategory = `in ${differenceInDays} days`;
        }
        else {
            dateCategory = "outside the 8-day forecast range";
        }
        // Get latitude and longitude for the city
        const geocodingUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&appid=${OPENWEATHER_API_KEY}`;
        const geocodingResponse = yield axios.get(geocodingUrl);
        if (!geocodingResponse.data || geocodingResponse.data.length === 0) {
            return res.status(404).send({
                fulfillmentText: `Could not find the location for city: ${city}`,
            });
        }
        const { lat, lon } = geocodingResponse.data[0];
        if (differenceInDays === 8) {
            const oneCallUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&exclude=hourly,alerts&appid=${OPENWEATHER_API_KEY}&units=metric`;
            const response = yield axios.get(oneCallUrl);
            const data = response.data;
            const targetHours = [17, 20, 23]; // Hours of interest
            const forecastByDate = {};
            // Group forecast data by date
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
            // Create a summary response
            let forecastText = '';
            for (const [date, { day, forecast }] of Object.entries(forecastByDate)) {
                forecastText += `The weather in ${city} on ${day} (${date}) is:\n`;
                forecast.forEach(entry => {
                    forecastText += `  - ${entry.time}: ${entry.weather} with a temperature of ${entry.temp}°C and humidity of ${entry.humidity}%.\n`;
                });
                forecastText += '\n';
            }
            return res.status(200).send({
                fulfillmentText: forecastText,
            });
        }
        else if (differenceInDays === 0) {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            const weatherResponse = yield axios.get(weatherUrl);
            const weatherData = weatherResponse.data;
            const description = weatherData.weather[0].description;
            const temperature = weatherData.main.temp;
            return res.status(200).send({
                fulfillmentText: `The weather in ${city} ${dateCategory} is ${description} with a temperature of ${temperature}°C.`,
            });
        }
        return res.status(400).send({
            fulfillmentText: "Unable to process the request.",
        });
    }
    catch (error) {
        console.error("Error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return res.status(500).send({
            fulfillmentText: "Something went wrong while processing your request.",
        });
    }
}));
// Start the server
app.listen(PORT, () => {
    console.log(`Webhook server is running on http://localhost:${PORT}`);
});
