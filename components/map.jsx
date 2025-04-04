'use client'
import maplibregl, {
  MapMouseEvent,
  LngLat,
} from 'maplibre-gl'
import { useMap, Layer, Source } from 'react-map-gl/maplibre'
// import { geoPath, geoMercator, geoTransform } from 'd3-geo'
import { useEffect, useRef, useState } from 'react'
import { color, important, positionTooltip, accent, ignoreList, getConsts, hashString } from "@/lib/utils.js"
import { ZoomIn, ZoomOut } from "lucide-react"
import Tooltip from './tooltip'
// import AutoResize from './autoresize'
import * as SVG from './svg.js'
import turfCentroid from '@turf/centroid'
import { domToPng } from 'modern-screenshot'
import * as turf from '@turf/turf'
// import { Calibrate, Link } from './foundry'

let projection, svg, zoom, path, g, tooling, clickCir, guideLabel, mode = new Set([])

// Function to generate circle data from center (longitude, latitude) and radius
function generateCircle(center, radius) {
  const centerPoint = turf.point(center)
  const circle = turf.circle(centerPoint, radius, { units: 'kilometers' })
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: circle.geometry.coordinates
        }
      }
    ]
  }
}

export async function getIcon(d, fillRGBA) {
  const icon = d.properties.icon || SVG[d.properties.type]
  const fill = fillRGBA || d.properties.fill
  const stroke = d.properties.stroke

  // if (d.properties.userCreated) {
  //   // console.log(d)
  //   window.parent.postMessage({
  //     type: 'log',
  //     message: d,
  //   }, '*')
  // }

  // Apply to all <path>, <circle>, <rect>, etc.
  const forceAttrs = (svg, fill, stroke) => {
    if (fill) {
      svg = svg.replace(/(<(path|circle|rect|polygon|g)[^>]*?)\s*(fill=".*?")?/gi, (match, before) => {
        return `${before} fill="${fill}" `;
      });
    }
    if (stroke) {
      svg = svg.replace(/(<(path|circle|rect|polygon|g)[^>]*?)\s*(stroke=".*?")?/gi, (match, before) => {
        return `${before} stroke="${stroke}" `;
      });
    }
    return svg;
  };

  if (icon && !icon.startsWith("http")) {
    return forceAttrs(icon, fill, stroke);
  }

  if (icon?.startsWith("http")) {
    try {
      const res = await fetch(icon)
      let remoteSvg = await res.text();
      return forceAttrs(remoteSvg, fill, stroke);
    } catch (e) {
      console.log(`WARN: failed to fetch icon: ${icon}`, e);
      return null;
    }
  }

  return null;
}


export default function Map({ width, height, data, name, mobile, params, locked }) {
  const { map } = useMap()
  const [tooltip, setTooltip] = useState()
  const [drawerOpen, setDrawerOpen] = useState()
  const [drawerContent, setDrawerContent] = useState()
  const { CENTER, SCALE, CLICK_ZOOM, NO_PAN, LAYER_PRIO } = getConsts(name)


  async function pan(d, locations, fit) {
    if (locked && !fit) return
    mode.add("zooming")
    let fly = true, lat, lng, coordinates = d.geometry.coordinates
    let zoomedOut = map.getZoom() < 6

    // force a zoom if panning to location by search
    if (fit) zoomedOut = true
    let zoom = map.getZoom()

    if (d.geometry.type === "Point") {
      [lng, lat] = coordinates

      // zoom in for location clicks, if zoomed out
      if (zoomedOut) {
        zoom = CLICK_ZOOM
      }

    } else {

      // remove sheet circle
      if (document.querySelector(".click-circle")) {
        document.querySelector(".click-circle").remove()
      }

      // find center of territory or guide
      const centroid = turf.centroid(d)
      coordinates = centroid.geometry.coordinates
      lng = coordinates[0]
      lat = coordinates[1]

      // zoom view to fit territory or guide when searched
      if (fit) {
        const bounds = path.bounds(d);
        const [[x0, y0], [x1, y1]] = bounds;
        const dx = x1 - x0;
        const dy = y1 - y0;
        const padding = 20;
        const newZoom = Math.min(
          map.getZoom() + Math.log2(Math.min(map.getContainer().clientWidth / (dx + padding), map.getContainer().clientHeight / (dy + padding))),
          map.getMaxZoom()
        )
        zoom = newZoom
      }
      if (!zoomedOut) fly = false
    }

    // offset for sheet
    // TODO: doesn't this always need to be done?
    if (zoomedOut) {
      const arbitraryNumber = locations?.length > 5 ? 9.5 : 10
      let zoomFactor = Math.pow(2, arbitraryNumber - map.getZoom())
      zoomFactor = Math.max(zoomFactor, 4)
      const latDiff = (map.getBounds().getNorth() - map.getBounds().getSouth()) / zoomFactor
      lat = coordinates[1] - latDiff / 2
    }

    if (fly) {
      map.flyTo({ center: [lng, lat], duration: 800, zoom })
      setTimeout(() => mode.delete("zooming"), 801)
    }

    setDrawerContent({ locations: locations || [d], coordinates, selected: d.properties.name })
    setDrawerOpen(true)
  }

  function hover(e, { properties, geometry }) {
    if ((mode.has("crosshair") && mobile) || locked) return
    const guide = geometry.type === "LineString"
    const location = geometry.type === "Point"
    const territory = geometry.type?.includes("Poly")
    if (e.type === "mouseover") {
      setTooltip(properties)
      positionTooltip(e)
      // if (ignoreList[name].includes(properties.type)) return
      // // if (territory) d3.select(e.currentTarget).attr('fill', accent(name, 0.01))
      // if (location) d3.select(e.currentTarget).attr('fill', accent(name, 1))
      // if (guide || territory) d3.select(e.currentTarget).attr('stroke', accent(name, 0.2))
      // if (location || guide) d3.select(e.currentTarget).style('cursor', 'crosshair')
    } else if (e.type === "mouseout") {
      // if (!guide) d3.select(e.currentTarget).attr('fill', color(name, properties, "fill", geometry.type))
      // if (!location) d3.select(e.currentTarget).attr('stroke', color(name, properties, "stroke", geometry.type))
      setTooltip()
      document.querySelector(".map-tooltip").style.visibility = "hidden"
    }
  }

  function getTextCoord(d) {
    if (d.properties.type !== "line") {
      const point = map.project(new maplibregl.LngLat(...turf.centroid(d).geometry.coordinates))
      return [point.x, point.y]
    }
    const i = data.territory.filter(d => d.properties.type === "line").findIndex(line => line.properties.name === d.properties.name)
    // Compute the geographic centroid of the feature
    const pointy = turf.point([-77, 42]);
    const offsetCoord = turf.destination(pointy, ((i + 1) * 550), 45)
    const point = map.project(new maplibregl.LngLat(...offsetCoord.geometry.coordinates))
    return [point.x, point.y]
  }

  useEffect(() => {
    if (!map) return

    // console.log("map", data)
    // map.on('load', () => {
    //   map.getMap().addSource('map', {
    //     type: 'geojson',
    //     data
    //   })

    //   map.getMap().addLayer({
    //     'id': 'territory',
    //     'type': 'fill',
    //     'source': 'map',
    //     'paint': {
    //       'fill-color': '#888888',
    //       'fill-opacity': 0.4
    //     },
    //     'filter': ['==', '$type', 'Polygon']
    //   });

    //   map.getMap().addLayer({
    //     'id': 'location',
    //     'type': 'circle',
    //     'source': 'map',
    //     'paint': {
    //       'circle-radius': 6,
    //       'circle-color': '#B42222'
    //     },
    //     'filter': ['==', '$type', 'Point']
    //   });
    // });

    function render() {
      // prevents measure dot from being moved on pan for both mobile and desktop
      if (mode.has("measureStart")) {
        mode.delete("measureStart")
      } else if (mode.has("crosshairZoom")) {
        mode.delete("crosshairZoom")
      } else if (mode.has("crosshair")) {
        document.querySelector(".map-tooltip").style.visibility = "hidden"
      }
      if (mode.has("measure")) {
        if (document.querySelector(".line-click")) {
          document.querySelector(".line-click").style.visibility = 'hidden'
        }
      }
    }

    map.on("viewreset", render)
    map.on("move", render)
    map.on("moveend", render)
    render()

    return () => {
      map.off("viewreset", render)
      map.off("move", render)
      map.off("moveend", render)
    }
  }, [map])

  if (locked) return (<Tooltip {...tooltip} mobile={mobile} />)
  if (params.get("calibrate")) return (
    <>
      <Tooltip {...tooltip} mobile={mobile} />
    </>
  )

  const territoryLayer = {
    id: 'territory',
    type: 'fill',
    source: 'map',
    // filter: ['==', '$type', 'Polygon'],
    paint: {
      'fill-color': '#4E3FC8'
    }
  }
  const pointLayer = {
    id: 'location',
    type: 'circle',
    source: 'map',
    // 'source-layer': 'map',
    filter: ['==', '$type', 'Point'],
    paint: {
      'circle-radius': 50,
      'circle-color': '#B42222'
    }
  }

  const riskLevelsFillLayer = {
    id: 'risk-levels-fill',
    type: 'fill',
    paint: {
      'fill-color': ['case',
        ['==', ['get', 'level'], 5], '#de1b1b',
        ['==', ['get', 'level'], 4], '#de5f1b',
        ['==', ['get', 'level'], 3], '#de8a1b',
        ['==', ['get', 'level'], 2], '#dec71b',
        ['==', ['get', 'level'], 1], '#ded41b',
        ['==', ['get', 'level'], 0], '#fafafa',
        '#fafafa'],
      'fill-opacity': ['case',
        ['has', 'level'], 0.8, 0
      ]
    }
  }

  const riskLevelsFillLayer2 = {
    id: 'data',
    type: 'fill',
    paint: {
      'fill-color': "red",
      'fill-opacity': 0.8
    }
  }

  return (
    <>
      <Source type="geojson" data={JSON.parse(data)}>
        <Layer
          type="fill"
          paint={{
            "fill-color": "#088",
            "fill-opacity": 0.4,
          }}
          filter={['==', '$type', 'Polygon']}
        />
        <Layer
          type="symbol"
          layout={{
            "symbol-spacing": 250,
            "icon-allow-overlap": false,
            "icon-overlap": "cooperative",
            "icon-size": 1,
            "icon-text-fit": "none",

            // basic no fallback
            // 'icon-image': 'custom-marker',

            // fallback image
            "icon-image": ["coalesce", ["image", "myImage"], ["image", "fallbackImage"]],

            // fallback image
            // 'icon-image': [
            //   'coalesce',
            //   ['image', ['concat', ['get', 'icon'], '_15']],
            //   ['image', 'marker_15']
            // ],

            // "text-field": ['get', 'name'],
            // 'text-font': [
            //   'Open Sans Semibold',
            //   'Arial Unicode MS Bold'
            // ],
            // "text-size": 16,
            // "text-max-width": 10,
            // "text-line-height": 1.2,
            // "text-line-height": 1.2,
            // "text-optional": true,

          }}
          style={{
            "glyphs": "",

          }}
          paint={{
            // "symbol-placement": "",
            // "circle-radius": 2,
            // "circle-color": "#f00",
          }}
          filter={['==', '$type', 'Point']}
        />
        <Layer
          type="line"
          paint={{
            "line-color": "blue",
            "line-width": 1,
            "line-opacity": .9,
            "line-dasharray": [10, 4],
          }}
          filter={['==', '$type', 'LineString']}
        />
      </Source>
      <Tooltip {...tooltip} mobile={mobile} />
    </>
  )

  return (
    <>
      <Source type="geojson" data={data}>
        {/* <Layer {...riskLevelsFillLayer2} /> */}
        <Layer {...pointLayer} />
        <Layer {...territoryLayer} />
      </Source>
      {/* <Layer {...pointLayer} /> */}
      <Tooltip {...tooltip} mobile={mobile} />
    </>
  )

  return (
    <>
      <AutoResize svg={svg} zoom={zoom} projection={projection} mobile={mobile} width={width} height={height} setTooltip={setTooltip} positionTooltip={positionTooltip} center={CENTER} />
      <Tooltip {...tooltip} mobile={mobile} />
      <div className="absolute mt-28 ml-11 mr-[.3em] cursor-pointer z-10 bg-[rgba(0,0,0,.3)] rounded-xl zoom-controls" >
        <ZoomIn size={34} onClick={() => map.zoomIn()} className='m-2 hover:stroke-blue-200' />
        <ZoomOut size={34} onClick={() => map.zoomOut()} className='m-2 mt-4 hover:stroke-blue-200' />
      </div>
    </>
  )
}
