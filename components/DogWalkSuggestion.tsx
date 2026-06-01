'use client'

import { useEffect, useState } from 'react'

export default function DogWalkSuggestion() {
  const [bestTime, setBestTime] = useState<string | null>(null)

  useEffect(() => {
    async function loadWeather() {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=51.4543&longitude=-0.9781&hourly=precipitation_probability&forecast_days=1&timezone=auto'
      )

      const data = await res.json()

      const now = new Date()

      const bestHour = data.hourly.time.find((time: string, index: number) => {
        const hourDate = new Date(time)
        const rainChance = data.hourly.precipitation_probability[index]

        return hourDate > now && rainChance <= 30
      })

      if (bestHour) {
        setBestTime(
          new Date(bestHour).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })
        )
      } else {
        setBestTime(null)
      }
    }

    loadWeather()
  }, [])

  if (!bestTime) {
    return <span>🐶 Take a raincoat - showers expected</span>
  }

  return <span>🐶 Best dog walk from {bestTime}</span>
}