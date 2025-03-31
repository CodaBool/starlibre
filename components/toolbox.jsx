
import { useEffect } from "react"
import * as d3 from 'd3'
import { pointer, zoomTransform, geoDistance, select, selectAll } from 'd3'
import { useMap } from 'react-map-gl/maplibre'
// import { geoPath, geoMercator, geoTransform } from 'd3-geo'
import distance from '@turf/distance'
import { point as turfPoint } from '@turf/helpers'
import maplibregl from 'maplibre-gl'
import { getConsts } from '@/lib/utils'

let point

export default function Toolbox({ mode, g, width, height, mobile, svgRef, name }) {
  const { map } = useMap()
  const { UNIT } = getConsts(name)

  useEffect(() => {
    if (!map) return

    const svg = d3
      .select(map.getCanvasContainer())
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("position", "absolute")
      .style("z-index", 6)
      .attr('pointer-events', 'none')

    point = svg
      .append("circle")
      .attr('class', 'point-click')
      .attr('r', 4)
      .attr('fill', 'orange')
      .style("visibility", "hidden")
      .attr('pointer-events', 'none')
    const line = svg
      .append("line")
      .attr('class', 'line-click')
      .attr('stroke', 'orange')
      .attr('stroke-dasharray', "5px,5px")
      .style("visibility", "hidden")
      .attr('pointer-events', 'none')

    const crosshairX = svg
      .append("line")
      .attr('class', 'crosshair crosshair-x')
      .attr('x2', width)
      .attr('y1', height / 2)
      .attr('y2', height / 2)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('pointer-events', 'none')
      .style('visibility', 'hidden')

    const crosshairY = svg
      .append("line")
      .attr('class', 'crosshair crosshair-x')
      .attr('x1', width / 2)
      .attr('x2', width / 2)
      .attr('y2', height)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('pointer-events', 'none')
      .style('visibility', 'hidden')

    const text = svg.append('text')
      .attr('x', width / 2)
      .attr('y', () => mobile ? 100 : 120)
      .attr('class', 'textbox')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('opacity', 0.7)
      .style('font-size', () => mobile ? '1.5em' : '2.2em')
      .style('pointer-events', 'none')
      .style('visibility', 'hidden')

    const pointRef = document.querySelector(".point-click")
    const lineRef = document.querySelector(".line-click")

    function render() {
      const { x, y } = map.project(new maplibregl.LngLat(point.attr("lng"), point.attr("lat")))
      point.attr("cx", x).attr("cy", y)
    }

    map.on("move", render)
    render()

    // left app
    window.addEventListener('mouseout', (e) => {
      crosshairX.style('visibility', 'hidden')
      crosshairY.style('visibility', 'hidden')
      line.style('visibility', 'hidden')
    })

    // mobile & desktop event for click ends
    // TODO: see if this can be shortened
    window.addEventListener("pointerdown", e => {
      const [mouseX, mouseY] = pointer(e)
      const { lat, lng } = map.unproject([mouseX, mouseY])

      if (mode.has("crosshair")) {
        mode.add("crosshairZoom")
        setTimeout(() => {
          if (!mode.has("crosshairZoom") || !mode.has("crosshair")) return
          crosshairX.attr('lng', lng).attr('lat', lat).attr('y1', mouseY).attr('y2', mouseY).style('visibility', 'visible')
          crosshairY.attr('lng', lng).attr('lat', lat).attr('x1', mouseX).attr('x2', mouseX).style('visibility', 'visible')
          if (UNIT === "ly") {
            text.text(`X: ${lng.toFixed(1)} | Y: ${lat.toFixed(1)} `).style('visibility', 'visible')
          } else {
            text.text(`Lat: ${lat.toFixed(3)}° | Lng: ${lng.toFixed(3)}°`).style('visibility', 'visible')
          }
        }, 120)
      } else if (mode.has("measure")) {
        mode.add("measureStart")
        setTimeout(() => {
          if (!mode.has("measureStart") || !pointRef || !mode.has("measure")) return
          if (text._groups[0][0].style.visibility === "hidden") {
            select("textbox").style("visibility", "visible")
          }
          pointRef.style.visibility = 'visible'
          select(lineRef.current).raise()
          select(pointRef).raise()

          if (mobile) {
            if (line.attr("x1") === null) {

              // first point

              point.attr('lng', lng).attr('lat', lat).attr('cx', mouseX).attr('cy', mouseY)
              lineRef.style.visibility = 'hidden'
              line.attr('x1', lng).attr('y1', lat)
            } else if (line.attr("x2") === null) {

              // second point, measure

              lineRef.setAttribute('x2', mouseX)
              lineRef.setAttribute('y2', mouseY)
              lineRef.setAttribute('x1', point.attr("cx"))
              lineRef.setAttribute('y1', point.attr("cy"))
              lineRef.style.visibility = 'visible'
              const turfPoint1 = turfPoint([point.attr("lng"), point.attr("lat")])
              const turfPoint2 = turfPoint([lng, lat])

              if (name === "fallout") {
                const miles = distance(turfPoint1, turfPoint2, { units: 'miles' })
                const walkingSpeedMph = 3; // average walking speed in miles per hour
                const walkingTimeHours = miles / walkingSpeedMph;
                text.text(`${miles.toFixed(1)} miles | ${walkingTimeHours.toFixed(1)} hours on foot (3mph)`)
                text.style("visibility", "visible")
              } else if (name.includes("lancer")) {
                const km = distance(turfPoint1, turfPoint2)
                // Janederscore's map is 135ly across. Convert km so they match up
                const lightYears = km * 0.013043478
                const relativeTime = (lightYears / Math.sinh(Math.atanh(0.995))).toFixed(1)
                text.text(`${lightYears.toFixed(1)}ly | ${relativeTime} rel. years (.995u) | ${(lightYears / 0.995).toFixed(1)} observer years`)
              }
            } else {

              // reset

              point.attr('lng', lng).attr('lat', lat).attr('cx', mouseX).attr('cy', mouseY)
              lineRef.style.visibility = 'hidden'
              line.attr('x1', lng).attr('y1', lat)
              line.attr('x2', null).attr('y2', null)
            }
          } else {
            point.attr('lng', lng).attr('lat', lat).attr('cx', mouseX).attr('cy', mouseY).style('visibility', 'visible')
            if (!line.attr("x1") || line.attr("x1") === 0) return
            line.attr('x1', lng).attr('y1', lat)
            line.attr('x2', lng).attr('y2', lat)
          }
        }, 200)
      }
    })

    window.addEventListener("mousemove", (e) => {
      if (mobile) return
      if (mode.has("crosshair")) {
        const [mouseX, mouseY] = pointer(e)
        const { lat, lng } = map.unproject([mouseX, mouseY])
        crosshairX.attr('y1', mouseY).attr('y2', mouseY).style('visibility', 'visible')
        crosshairY.attr('x1', mouseX).attr('x2', mouseX).style('visibility', 'visible')
        if (UNIT === "ly") {
          text.text(`X: ${lng.toFixed(1)} | Y: ${lat.toFixed(1)} `).style('visibility', 'visible')
        } else {
          text.text(`Lat: ${lat.toFixed(3)}° | Lng: ${lng.toFixed(3)}°`).style('visibility', 'visible')
        }
      } else if (mode.has("measure")) {
        if (!pointRef) return
        if (!pointRef.getAttribute('cx')) return
        if (!point.attr("lng")) return
        if (lineRef.style.visibility === "hidden") {
          lineRef.style.visibility = 'visible'
        }
        if (pointRef.style.visibility === "hidden") {
          pointRef.style.visibility = 'visible'
        }
        if (text._groups[0][0].style.visibility === "hidden") {
          text.style("visibility", "visible")
        }
        const [mouseX, mouseY] = pointer(e)
        const { lat, lng } = map.unproject([mouseX, mouseY])
        lineRef.setAttribute('x2', mouseX)
        lineRef.setAttribute('y2', mouseY)
        lineRef.setAttribute('x1', point.attr("cx"))
        lineRef.setAttribute('y1', point.attr("cy"))

        const turfPoint1 = turfPoint([point.attr("lng"), point.attr("lat")])
        const turfPoint2 = turfPoint([lng, lat])
        if (UNIT === "miles") {
          const miles = distance(turfPoint1, turfPoint2, { units: 'miles' })
          const walkingSpeedMph = 3; // average walking speed in miles per hour
          const walkingTimeHours = miles / walkingSpeedMph;
          text.text(`${miles.toFixed(1)} miles | ${walkingTimeHours.toFixed(1)} hours on foot (3mph)`);
        } else if (UNIT === "ly") {
          const km = distance(turfPoint1, turfPoint2)
          // Janederscore's map is 135ly across. Convert km so they match up
          const lightYears = km * 0.013043478
          const relativeTime = (lightYears / Math.sinh(Math.atanh(0.995))).toFixed(1)
          text.text(`${lightYears.toFixed(1)}ly | ${relativeTime} rel. years (.995u) | ${(lightYears / 0.995).toFixed(1)} observer years`)
        }
      }
    })
  }, [map])

  return (
    <>
    </>
  )
}
