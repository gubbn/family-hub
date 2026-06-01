'use client'

import { useEffect, useState } from 'react'
import { getSetting } from '../lib/settings'

type WeatherData = {
  temperature: number
  rainChance: number
  weatherCode: number
}

function getWeatherIcon(code: number) {
  if (code === 0) return '☀️'
  if ([1, 2, 3].includes(code)) return '⛅'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 61, 63, 65].includes(code)) return '🌧️'
  if ([71, 73, 75].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '🌤️'
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWeather() {
      try {
        setLoading(true)
        setErrorMessage('')

        const homePostcode = await getSetting('home_postcode')

        if (!homePostcode) {
          throw new Error('No home postcode set')
        }

        const postcodeResponse = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(
            homePostcode.trim()
          )}`
        )

        if (!postcodeResponse.ok) {
          throw new Error('Postcode lookup failed')
        }

        const postcodeData = await postcodeResponse.json()

        if (!postcodeData.result) {
          throw new Error('Postcode not found')
        }

        const { latitude, longitude } = postcodeData.result

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_days=1&timezone=auto`
        )

        if (!weatherResponse.ok) {
          throw new Error('Weather lookup failed')
        }

        const weatherData = await weatherResponse.json()

        if (!weatherData.current) {
          throw new Error('Weather data missing')
        }

        setWeather({
          temperature: Math.round(weatherData.current.temperature_2m),
          weatherCode: weatherData.current.weather_code,
          rainChance: weatherData.hourly?.precipitation_probability?.[0] ?? 0,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Weather unavailable'

        console.error('Weather load failed:', error)
        setErrorMessage(message)
      } finally {
        setLoading(false)
      }
    }

    loadWeather()
  }, [])

  if (loading) {
    return (
      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
        Loading weather...
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div
        title={errorMessage}
        className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700"
      >
        Weather unavailable
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
        Weather unavailable
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-800">
      <span>{getWeatherIcon(weather.weatherCode)}</span>
      <span className="font-semibold">{weather.temperature}°C</span>
      <span>{weather.rainChance}% rain</span>
    </div>
  )
}