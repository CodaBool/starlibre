import { useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'
import * as turf from '@turf/turf'
import { getConsts } from '@/lib/utils'

export default function Toolbox({ mode, map, width, height, mobile, name }) {
  const { UNIT } = getConsts(name)

  const linestring = {
    'type': 'Feature',
    'geometry': {
      'type': 'LineString',
      'coordinates': []
    }
  }

  useEffect(() => {
    if (!map) return

    const crosshairLength = height / 5
    // horizontal line
    const crosshairX = document.createElement('div')
    crosshairX.className = 'crosshair crosshair-x'
    crosshairX.style.position = 'absolute'
    crosshairX.style.top = '50%'
    crosshairX.style.left = '50%'
    crosshairX.style.height = '1px'
    crosshairX.style.visibility = 'hidden'
    crosshairX.style.border = '1px dashed rgba(255, 255, 255, 0.5)'
    crosshairX.style.width = `${Math.min(Math.max(crosshairLength, 50), width - 50)}px`
    crosshairX.style.transform = 'translateX(-50%)'
    document.body.appendChild(crosshairX)

    // vertical line
    const crosshairY = document.createElement('div')
    crosshairY.className = 'crosshair crosshair-y'
    crosshairY.style.position = 'absolute'
    crosshairY.style.top = '50%'
    crosshairY.style.left = '50%'
    crosshairY.style.width = '1px'
    crosshairY.style.visibility = 'hidden'
    crosshairY.style.border = '1px dashed rgba(255, 255, 255, 0.5)'
    crosshairY.style.height = `${Math.min(Math.max(crosshairLength, 50), height - 50)}px`
    crosshairY.style.transform = 'translateY(-50%)'
    document.body.appendChild(crosshairY);

    const text = document.createElement('div')
    text.className = 'textbox'
    text.style.position = 'absolute'
    text.style.left = '50%';
    text.style.transform = 'translateX(-50%)';
    text.style.top = mobile ? '70px' : '90px'
    text.style.color = 'white'
    text.style.opacity = 0.7
    text.style.fontSize = mobile ? '1.5em' : '2.2em'
    text.style.pointerEvents = 'none'
    text.style.visibility = 'hidden'
    text.style.textAlign = 'center'
    document.body.appendChild(text)

    map.on('click', e => {
      if (!mode.has("measure")) return

      const features = map.queryRenderedFeatures(e.point, {
        layers: ['measure-points']
      })

      const geojson = map.getSource('toolbox')._data

      // Remove the linestring from the group
      // So we can redraw it based on the points collection
      if (geojson.features.length > 1) geojson.features.pop();

      // If a feature was clicked, remove it from the map
      if (features.length) {
        const id = features[0].properties.id;
        geojson.features = geojson.features.filter((point) => {
          return point.properties.id !== id;
        });
      } else {
        const point = {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [e.lngLat.lng, e.lngLat.lat]
          },
          'properties': {
            'id': String(new Date().getTime())
          }
        };

        geojson.features.push(point);
      }

      if (geojson.features.length > 1) {
        linestring.geometry.coordinates = geojson.features.map(
          (point) => {
            return point.geometry.coordinates;
          }
        )

        geojson.features.push(linestring);
        if (name === "fallout") {
          const miles = turf.length(linestring, { units: 'miles' });
          const walkingSpeedMph = 3; // average walking speed in miles per hour
          const walkingTimeHours = miles / walkingSpeedMph;
          text.textContent = `${miles.toFixed(1)} miles | ${walkingTimeHours.toFixed(1)} hours on foot (3mph)`;
        } else if (name.includes("lancer")) {
          const km = turf.length(linestring);
          // Janederscore's map is 135ly across. Convert km so they match up
          const lightYears = km * 0.013043478;
          const relativeTime = (lightYears / Math.sinh(Math.atanh(0.995))).toFixed(1);
          text.textContent = `${lightYears.toFixed(1)}ly | ${relativeTime} rel. years (.995u) | ${(lightYears / 0.995).toFixed(1)} observer years`;
        } else if (name === "starwars") {
          const km = turf.length(linestring);
          // TODO: find a conversion and research how hyperspace works
          const lightYears = km * 0.013043478;
          const relativeTime = (lightYears / Math.sinh(Math.atanh(0.995))).toFixed(1);
          text.textContent = `${lightYears.toFixed(1)}ly | ${relativeTime} rel. years (.995u) | ${(lightYears / 0.995).toFixed(1)} observer years`;
        }
        text.style.visibility = 'visible';
      }

      map.getSource('toolbox').setData(geojson)
    })

    // Crosshair Logic
    map.on('mousemove', "measure-points", e => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('move', () => {
      if (mode.has("crosshair")) {
        const { lng, lat } = map.getCenter()
        crosshairX.style.visibility = 'visible'
        crosshairY.style.visibility = 'visible'
        if (UNIT === "ly") {
          text.textContent = `X: ${lng.toFixed(1)} | Y: ${lat.toFixed(1)}`;
        } else {
          text.textContent = `Lat: ${lat.toFixed(3)}° | Lng: ${lng.toFixed(3)}°`;
        }
        text.style.visibility = 'visible'
      }
    })
    map.on('mouseleave', "measure-points", e => {
      map.getCanvas().style.cursor = 'grab'
    })

    return () => {
      document.body.removeChild(crosshairX)
      document.body.removeChild(crosshairY)
      document.body.removeChild(text)
    }
  }, [map])

  return (
    <Source id="toolbox" type="geojson" data={{
      type: 'FeatureCollection',
      features: []
    }}>
      <Layer
        type="circle"
        id="measure-points"
        paint={{
          'circle-radius': 4,
          'circle-color': 'orange'
        }}
        filter={['==', '$type', 'Point']}
      />
      <Layer
        type="line"
        id="measure-lines"
        layout={{
          'line-cap': 'round',
          'line-join': 'round'
        }}
        paint={{
          'line-color': 'rgba(255, 165, 0, 0.8)',
          'line-width': 2,
          "line-dasharray": [5, 4],
        }}
        filter={['==', '$type', 'LineString']}
      />
    </Source>
  )
}
