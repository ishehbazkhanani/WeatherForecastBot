export interface DateTimeParam {
    startDate?: string;
    endDate?: string;
}

export interface ForecastEntry {
    time: string;
    temp: number;
    weather: string;
    humidity: number;
}

export interface ForecastByDate {
    [date: string]: {
        day: string;
        forecast: ForecastEntry[];
    };
}
