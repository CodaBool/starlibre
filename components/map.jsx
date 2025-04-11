'use client'
import maplibregl, {
  MapMouseEvent,
  LngLat,
  LngLatBounds,
} from 'maplibre-gl'
import { useMap, Layer, Source, Popup } from 'react-map-gl/maplibre'
// import { geoPath, geoMercator, geoTransform } from 'd3-geo'
import { useEffect, useRef, useState } from 'react'
import { color, important, positionTooltip, accent, getConsts, hashString, getColorExpression, createPopupHTML } from "@/lib/utils.js"
import { ZoomIn, ZoomOut } from "lucide-react"
import SearchBar from './searchbar'
import * as SVG from './svg.js'
import turfCentroid from '@turf/centroid'
import { domToPng } from 'modern-screenshot'
import * as turf from '@turf/turf'
import Hamburger from './hamburger'
import Toolbox from './toolbox'
import Starfield from './starfield'
// import { Calibrate, Link } from './foundry'

let mode = new Set([])

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
  const [drawerOpen, setDrawerOpen] = useState()
  const [drawerContent, setDrawerContent] = useState()
  const { CENTER, SCALE, CLICK_ZOOM, NO_PAN, LAYER_PRIO, LAYOUT_OVERIDE, IGNORE_POLY, UNIT } = getConsts(name)


  async function pan(d, locations, fit) {
    if (locked && !fit) return
    mode.add("zooming")
    let fly = true, lat, lng, bounds, coordinates = d.geometry.coordinates
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

      // find center of territory or guide
      const centroid = turf.centroid(d)
      coordinates = centroid.geometry.coordinates
      lng = coordinates[0]
      lat = coordinates[1]

      // zoom view to fit territory or guide when searched

      if (fit) {
        bounds = turf.bbox(d)
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
      if (bounds) {
        map.fitBounds([
          [bounds[0], bounds[1]], // bottom-left corner
          [bounds[2], bounds[3]]  // top-right corner
        ], {
          duration: 800,
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
        });
      } else {
        map.flyTo({ center: [lng, lat], duration: 800, zoom })
      }
      setTimeout(() => mode.delete("zooming"), 801)
    }

    setDrawerContent({ locations: locations || [d], coordinates, selected: d.properties.name })
    setDrawerOpen(true)
  }

  useEffect(() => {
    if (!map) return

    function render() {
      if (mode.has("measureStart")) {
        mode.delete("measureStart")
      } else if (mode.has("crosshairZoom")) {
        mode.delete("crosshairZoom")
      }
    }

    const popup = new maplibregl.Popup({
      closeButton: false,
      offset: [0, 20],
      closeOnClick: false,
      maxWidth: "340px",
      anchor: "top",
      className: "fade-in"
    });
    let currentFeatureCoordinates, hoveredStateId

    const mouseMove = (e) => {

      // coordinates
      // if (e.features.length > 0) {
      //   const coordinates = e.features[0].geometry.coordinates.slice()
      //   const popupContent = `Coordinates: ${coordinates.join(", ")}`
      //   new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupContent).addTo(map)
      // }
      // if (mode.has("crosshair")) {
      //   const { lng, lat } = e.lngLat
      //   crosshairX.style.left = `${e.point.x}px`
      //   crosshairY.style.top = `${e.point.y}px`
      //   crosshairX.style.visibility = 'visible'
      //   crosshairY.style.visibility = 'visible'
      // }

      // hover
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

      // popup
      if (e.features[0].properties.type === "text") return
      const featureCoordinates = e.features[0].geometry.coordinates.toString();
      if (currentFeatureCoordinates !== featureCoordinates) {
        currentFeatureCoordinates = featureCoordinates;

        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer';

        let coordinates = e.features[0].geometry.coordinates.slice();
        const popupContent = createPopupHTML(e)

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
        popup.setLngLat(coordinates).setHTML(popupContent).addTo(map.getMap())
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
      map.getCanvas().style.cursor = ''
      const popupElement = document.querySelector('.maplibregl-popup');
      if (popupElement) {
        popupElement.classList.remove('fade-in');
        // popupElement.classList.add('fade-out')
      }
      popup.remove()
    }

    const territoryClick = (e) => {
      if (IGNORE_POLY.includes(e.features[0].properties.type)) return
      const coordinates = e.lngLat;
      const popupContent = createPopupHTML(e)
      popup.setLngLat(coordinates).setHTML(popupContent).addTo(map.getMap());
    }

    map.on("viewreset", render)
    map.on("move", render)
    map.on("moveend", render)
    map.on('mousemove', 'location', mouseMove)
    map.on('mouseleave', 'location', mouseLeave)
    map.on('mousemove', 'guide', mouseMove)
    map.on('mouseleave', 'guide', mouseLeave)
    map.on('click', 'territory', territoryClick)
    render()
    return () => {
      map.off("viewreset", render)
      map.off("move", render)
      map.off("moveend", render)
      map.off('mousemove', 'location', mouseMove)
      map.off('mouseleave', 'location', mouseLeave)
      map.off('mousemove', 'guide', mouseMove)
      map.off('mouseleave', 'guide', mouseLeave)
      map.off('click', 'territory', territoryClick)
    }
  }, [map])

  if (locked || params.get("calibrate")) return null

  /*
  TODO:
  ## obvious
  - something for lancer solar systems
  - toolbox text is above search
  - draw
  - fly when clicked = https://maplibre.org/maplibre-gl-js/docs/examples/center-on-symbol/

  ## Map fine tuning
  - star wars location need to be separated into CANON / LEGENDS
  - star wars needs the grid
  - star wars has its own coordinate system
  - do a webgl check https://maplibre.org/maplibre-gl-js/docs/examples/check-for-support/
  */

  return (
    <>
      <Source id="source" type="geojson" data={data}>
        <Layer
          type="fill"
          id="territory"
          paint={{
            "fill-color": [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              accent(name, .1),
              getColorExpression(name, "fill", "Polygon")
            ],
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
            "line-color": [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              accent(name, 1),
              getColorExpression(name, "stroke", "LineString")
            ],
            "line-width": 2,
            "line-dasharray": [10, 4],
          }}
          filter={['==', '$type', 'LineString']}
        />
        <Layer
          type="symbol"
          layout={{
            "text-rotate": 25,
            "text-offset": [0, 1.3],
            "text-field": ['get', 'name'],
            "text-size": 8,
            "text-optional": false,
          }}
          paint={{
            "text-color": "rgba(255, 255, 255, 0.5)",
          }}
          filter={['==', ['get', 'type'], 'text']}
        />
      </Source>
      {UNIT === "ly" && <Starfield width={width} height={height} />}
      <div className="absolute mt-28 ml-11 mr-[.3em] cursor-pointer z-10 bg-[rgba(0,0,0,.3)] rounded-xl zoom-controls" >
        <ZoomIn size={34} onClick={() => map.zoomIn()} className='m-2 hover:stroke-blue-200' />
        <ZoomOut size={34} onClick={() => map.zoomOut()} className='m-2 mt-4 hover:stroke-blue-200' />
      </div>
      {params.get("search") !== "0" && <SearchBar map={map} name={name} data={data} pan={pan} mobile={mobile} />}

      {/* FOUNDRY */}
      {/* {params.get("link") && <Link mode={mode} svg={svg} width={width} height={height} projection={projection} mobile={mobile} name={name} params={params} />} */}

      {/* LANCER SOLAR SYSTEMS */}
      {/* <Sheet {...drawerContent} setDrawerOpen={setDrawerOpen} drawerOpen={drawerOpen} name={name} map={map} /> */}

      <Toolbox mode={mode} width={width} height={height} mobile={mobile} name={name} map={map} />
      {params.get("hamburger") !== "0" && <Hamburger mode={mode} name={name} c={params.get("c") === "1"} map={map} />}
    </>
  )
}
