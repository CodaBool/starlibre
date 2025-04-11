import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'

export default function Starfield({ width, height }) {
  const starGeoJSON = useMemo(() => {
    const numStars = Math.floor((width * height) / 8000)
    const features = []
    for (let i = 0; i < numStars; i++) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            // assume map is global, space-style – random across lon/lat
            Math.random() * 360 - 180,
            Math.random() * 180 - 90,
          ]
        },
        properties: {
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.3 + 0.1,
        }
      })
    }
    return {
      type: "FeatureCollection",
      features
    }
  }, [width, height])

  return (
    <Source id="starfield" type="geojson" data={starGeoJSON}>
      <Layer
        id="stars"
        type="circle"
        paint={{
          "circle-radius": ['get', 'size'],
          "circle-color": "white",
          "circle-opacity": ['get', 'opacity'],
        }}
      />
    </Source>
  )
}
