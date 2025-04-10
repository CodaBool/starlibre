'use client'
import maplibregl, {
  MapMouseEvent,
  LngLat,
} from 'maplibre-gl'
import { useMap, Layer, Source, Popup } from 'react-map-gl/maplibre'
// import { geoPath, geoMercator, geoTransform } from 'd3-geo'
import { useEffect, useRef, useState } from 'react'
import { color, important, positionTooltip, accent, ignoreList, getConsts, hashString, getColorExpression } from "@/lib/utils.js"
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
  const { CENTER, SCALE, CLICK_ZOOM, NO_PAN, LAYER_PRIO, LAYOUT_OVERIDE } = getConsts(name)


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


    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false
    });
    let currentFeatureCoordinates, hoveredStateId

    const mouseMove = (e) => {
      if (e.features.length > 0) {
        if (hoveredStateId) {
          map.setFeatureState(
            { source: 'source', id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = e.features[0].id;
        map.setFeatureState(
          { source: 'source', id: hoveredStateId },
          { hover: true }
        );
      }

      const featureCoordinates = e.features[0].geometry.coordinates.toString();
      if (currentFeatureCoordinates !== featureCoordinates) {
        currentFeatureCoordinates = featureCoordinates;

        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer';

        let coordinates = e.features[0].geometry.coordinates.slice();
        const description = e.features[0].properties.description || e.features[0].properties.name

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        if (e.features[0].geometry.type === "LineString") {
          if (!e.lngLat) return
          coordinates = [e.lngLat.lng, e.lngLat.lat]
        }
        if (!coordinates) {
          console.error("failed to get coordinates", coordinates, e)
        }
        popup.setLngLat(coordinates).setHTML(description).addTo(map.getMap())
      }
    }
    const mouseLeave = (e) => {
      if (hoveredStateId) {
        map.setFeatureState(
          { source: 'source', id: hoveredStateId },
          { hover: false }
        );
      }
      hoveredStateId = null;

      currentFeatureCoordinates = undefined;
      map.getCanvas().style.cursor = '';
      popup.remove()
    }

    map.on("viewreset", render)
    map.on("move", render)
    map.on("moveend", render)
    map.on('mousemove', 'location', mouseMove)
    map.on('mouseleave', 'location', mouseLeave)
    map.on('mousemove', 'guide', mouseMove)
    map.on('mouseleave', 'guide', mouseLeave)
    render()

    return () => {
      map.off("viewreset", render)
      map.off("move", render)
      map.off("moveend", render)
      map.off('mousemove', 'location', mouseMove)
      map.off('mouseleave', 'location', mouseLeave)
      map.off('mousemove', 'guide', mouseMove)
      map.off('mouseleave', 'guide', mouseLeave)
    }
  }, [map])

  if (locked) return (<Tooltip {...tooltip} mobile={mobile} />)
  if (params.get("calibrate")) return (
    <>
      <Tooltip {...tooltip} mobile={mobile} />
    </>
  )

  /*
  TODO:
  - add color to symbols
  - better popup, should have type
  - color location different on hover
  */

  return (
    <>
      <Source id="source" type="geojson" data={JSON.parse(data)} generateId>
        <Layer
          type="fill"
          paint={{
            "fill-color": getColorExpression(name, "fill", "Polygon"),
            'fill-outline-color': getColorExpression(name, "stroke", "Polygon"),
          }}
          filter={['==', '$type', 'Polygon']}
        />
        <Layer
          type="symbol"
          id="location"
          layout={{
            // "symbol-spacing": 250, // default 250 (in px)
            // "icon-allow-overlap": true, // default false
            "icon-overlap": "always",
            // "icon-optional": true, // default false
            "icon-overlap": "cooperative",
            "icon-size": .6,
            // "text-anchor": "top",
            "text-offset": [0, 1.3],
            "icon-padding": 0, // default 2
            "icon-image": ["get", "type"],
            // fallback image example 1
            // "icon-image": ["coalesce", ["image", "myImage"], ["image", "fallbackImage"]],
            // fallback image example 2
            // 'icon-image': [
            //   'coalesce',
            //   ['image', ['concat', ['get', 'icon'], '_15']],
            //   ['image', 'marker_15']
            // ],
            "text-field": ['get', 'name'],
            "text-font": ["Noto Sans Bold"],
            "text-size": 10,
            "text-max-width": 10,
            "text-line-height": 1.2,
            "text-optional": true,
            ...LAYOUT_OVERIDE || {},
          }}
          paint={{
            "text-color": "#ffffff",
            "icon-color": [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              accent(name, 1),
              getColorExpression(name, "fill", "Point")
            ],
          }}
          filter={['==', '$type', 'Point']}
        />
        <Layer
          type="line"
          id="guide"
          paint={{
            "line-color": getColorExpression(name, "stroke", "LineString"),
            "line-width": 2,
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
      <AutoResize svg={svg} zoom={zoom} projection={projection} mobile={mobile} width={width} height={height} setTooltip={setTooltip} positionTooltip={positionTooltip} center={CENTER} />
      <Tooltip {...tooltip} mobile={mobile} />
      <div className="absolute mt-28 ml-11 mr-[.3em] cursor-pointer z-10 bg-[rgba(0,0,0,.3)] rounded-xl zoom-controls" >
        <ZoomIn size={34} onClick={() => map.zoomIn()} className='m-2 hover:stroke-blue-200' />
        <ZoomOut size={34} onClick={() => map.zoomOut()} className='m-2 mt-4 hover:stroke-blue-200' />
      </div>
    </>
  )
}
