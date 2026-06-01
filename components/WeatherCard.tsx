"use client";

import { useEffect, useState } from "react";

type WeatherData = {
  temperature: number;
  rainChance: number;
  weatherCode: number;
};

function getWeatherIcon(code: number) {
  if (code === 0) return "☀️";
  if ([1, 2, 3].includes(code)) return "⛅";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
  if ([71, 73, 75].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌤️";
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    async function loadWeather() {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=51.4543&longitude=-0.9781&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_days=1&timezone=auto"
      );

      const data = await res.json();

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        weatherCode: data.current.weather_code,
        rainChance: data.hourly.precipitation_probability?.[0] ?? 0,
      });
    }

    loadWeather();
  }, []);

  if (!weather) {
    return <span className="text-xs text-gray-400">Loading weather...</span>;
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-800">
      <span>{getWeatherIcon(weather.weatherCode)}</span>
      <span className="font-semibold">{weather.temperature}°C</span>
      <span>{weather.rainChance}% rain</span>
    </div>
  );
}