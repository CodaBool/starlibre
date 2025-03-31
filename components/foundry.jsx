
import { useEffect } from "react"
import * as d3 from 'd3'
import { pointer, zoomTransform, geoDistance, select, selectAll } from 'd3'
import { useMap } from 'react-map-gl/maplibre'
// import { geoPath, geoMercator, geoTransform } from 'd3-geo'
import distance from '@turf/distance'
import { point as turfPoint } from '@turf/helpers'
import maplibregl from 'maplibre-gl'
import { getConsts } from '@/lib/utils'
import { toast } from "sonner"

export function Calibrate({ mode, g, width, height, mobile, svgRef, name }) {
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

    const text = svg.append('text')
      .attr('x', width / 2)
      .attr('y', () => mobile ? 100 : 120)
      .attr('class', 'textbox')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('opacity', 0.7)
      .style('font-size', () => mobile ? '1.2em' : '1.8em')
      .style('pointer-events', 'none')
      .style('visibility', 'hidden')

    const updateCenterCoordinates = () => {
      const center = map.getCenter()
      const lat = center.lat.toFixed(3)
      const lng = center.lng.toFixed(3)
      text.text(`Lat: ${lat}° | Lng: ${lng}°`).style('visibility', 'visible')
    }

    map.on('move', updateCenterCoordinates)


    const centerCrosshairX = svg
      .append("line")
      .attr('x1', width / 2 - 50)
      .attr('x2', width / 2 + 50)
      .attr('y1', height / 2)
      .attr('y2', height / 2)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,2')
      .attr('pointer-events', 'none')

    const centerCrosshairY = svg
      .append("line")
      .attr('x1', width / 2)
      .attr('x2', width / 2)
      .attr('y1', height / 2 - 50)
      .attr('y2', height / 2 + 50)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,2')
      .attr('pointer-events', 'none')

    updateCenterCoordinates()


    const zoomText = svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 30)
      .attr('class', 'zoom-textbox')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('opacity', 0.7)
      .style('font-size', () => mobile ? '1.2em' : '1.8em')
      .style('pointer-events', 'none')
      .style('visibility', 'visible')

    const updateZoomLevel = () => {
      const zoomLevel = map.getZoom().toFixed(2)
      zoomText.text(`Zoom: ${zoomLevel}`)
    }

    map.on('zoom', updateZoomLevel)

    updateZoomLevel()

    const handleSubmit = () => {
      const center = map.getCenter()
      const autoZoom = Number(map.getZoom().toFixed(2))
      const autoLat = Number(center.lat.toFixed(3))
      const autoLng = Number(center.lng.toFixed(3))
      console.log('submitting', {
        type: 'calibrate',
        autoZoom,
        autoLat,
        autoLng,
      })

      window.parent.postMessage({
        type: 'calibrate',
        autoZoom,
        autoLat,
        autoLng,
      }, '*')
    }

    const button = d3.select(map.getCanvasContainer())
      .append('button')
      .text('Submit')
      .attr('class', 'absolute top-6 left-1/2 transform -translate-x-1/2 w-30 bg-[#302831] text-white py-2 px-4 rounded cursor-pointer')
      .style('z-index', 10)
      .on('click', handleSubmit)
  }, [map])

  return (
    <>
    </>
  )
}

export function Link({ mode, g, width, height, mobile, svgRef, name, params }) {
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

    const text = svg.append('text')
      .attr('x', width / 2)
      .attr('y', 120)
      .attr('class', 'textbox')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('opacity', 0.7)
      .style('font-size', '1.8em')
      .style('pointer-events', 'none')
      .style('visibility', 'hidden')

    const zoomText = svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 30)
      .attr('class', 'zoom-textbox')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('opacity', 0.7)
      .style('font-size', () => mobile ? '1.2em' : '1.8em')
      .style('pointer-events', 'none')
      .style('visibility', 'visible')


    const handleSubmit = () => {
      const maps = JSON.parse(localStorage.getItem('maps') || '{}')
      console.log('submitting', maps, params.get("id"), params.get("secret"), maps[params.get("id")])

      const id = params.get("id")
      const secret = params.get("secret")
      const map = maps[name + "-" + id]
      if (!map || !id || !secret) {
        console.log('ERR: missing map, uuid, or secret', map, id, secret)
        toast.warning("Something was wrong with your request")
        return
      }

      fetch('/api/map', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ geojson: map.geojson, id, secret, source: 'foundry iframe' }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            toast.warning(data.error)
          } else {
            toast.success(`Remote map for ${map.map} updated successfully`)
            window.parent.postMessage({
              type: 'link',
              message: "success"
            }, '*')
          }
        })
        .catch(error => {
          console.log(error)
          toast.warning("A server error occurred")
        })
    }

    const button = d3.select(map.getCanvasContainer())
      .append('button')
      .text('Submit')
      .attr('class', 'absolute top-6 left-1/2 transform -translate-x-1/2 w-30 bg-[#302831] text-white py-2 px-4 rounded cursor-pointer')
      .style('z-index', 10)
      .on('click', handleSubmit)

    const unsavedChangesText = d3.select(map.getCanvasContainer())
      .append('div')
      .attr('class', 'absolute top-16 left-1/2 transform -translate-x-1/2 w-30 text-white py-2 px-4 w-[200px] flex justify-center unsaved-text')
      .style('z-index', 10)
      .style('visibility', "hidden")
      .html('<p><svg xmlns="http://www.w3.org/2000/svg" stroke="white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-bounce inline"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg> Unsaved Changes</p>')
  }, [map])




  return (
    <>
    </>
  )
}
