
import { useEffect } from "react"
import { useMap } from 'react-map-gl/maplibre'
// import { geoPath, geoMercator, geoTransform } from 'd3-geo'
import distance from '@turf/distance'
import { point as turfPoint } from '@turf/helpers'
import maplibregl from 'maplibre-gl'
import { getConsts } from '@/lib/utils'
import { toast } from "sonner"

let text, zText, crosshairX, crosshairY

export function Calibrate({ mode, width, height, mobile, name }) {
  const { map } = useMap()
  const { UNIT } = getConsts(name)

  // duplicate of toolbox
  function handleMove() {
    const { lng, lat } = map.getCenter()
    crosshairX.style.visibility = 'visible'
    crosshairY.style.visibility = 'visible'
    if (UNIT === "ly") {
      text.textContent = `Y: ${lat.toFixed(1)} | X: ${lng.toFixed(1)}`;
    } else {
      text.textContent = `Lat: ${lat.toFixed(3)}° | Lng: ${lng.toFixed(3)}°`;
    }
    text.style.visibility = 'visible'
  }

  useEffect(() => {
    if (!map) return

    const crosshairLength = height / 5

    // Find the parent of the <div mapboxgl-children> element
    const mapboxChildrenParent = document.querySelector('div[mapboxgl-children=""]')

    // horizontal line
    crosshairX = document.createElement('div')
    crosshairX.className = 'crosshair crosshair-x'
    crosshairX.style.position = 'absolute'
    crosshairX.style.top = '50%'
    crosshairX.style.left = '50%'
    crosshairX.style.height = '1px'
    crosshairX.style.zIndex = 2;
    crosshairX.style.border = '1px dashed rgba(255, 255, 255, 0.5)'
    crosshairX.style.width = `${Math.min(Math.max(crosshairLength, 50), width - 50)}px`
    crosshairX.style.transform = 'translateX(-50%)'
    mapboxChildrenParent.appendChild(crosshairX)

    // vertical line
    crosshairY = document.createElement('div')
    crosshairY.className = 'crosshair crosshair-y'
    crosshairY.style.position = 'absolute'
    crosshairY.style.top = '50%'
    crosshairY.style.left = '50%'
    crosshairY.style.width = '1px'
    crosshairY.style.zIndex = 2;
    crosshairY.style.border = '1px dashed rgba(255, 255, 255, 0.5)'
    crosshairY.style.height = `${Math.min(Math.max(crosshairLength, 50), height - 50)}px`
    crosshairY.style.transform = 'translateY(-50%)'
    mapboxChildrenParent.appendChild(crosshairY)

    text = document.createElement('div')
    text.className = 'textbox'
    text.style.position = 'absolute'
    text.style.left = '50%';
    text.style.zIndex = 2;
    text.style.transform = 'translateX(-50%)';
    text.style.top = mobile ? '70px' : '90px'
    text.style.color = 'white'
    text.style.opacity = 0.7
    text.style.fontSize = mobile ? '1.5em' : '2.2em'
    text.style.pointerEvents = 'none'
    text.style.textAlign = 'center'
    mapboxChildrenParent.appendChild(text)

    zText = document.createElement('div')
    zText.className = 'textbox'
    zText.style.position = 'absolute'
    zText.style.left = '50%';
    zText.style.zIndex = 2;
    zText.style.transform = 'translateX(-50%)';
    zText.style.bottom = mobile ? '70px' : '90px'
    zText.style.color = 'white'
    zText.style.opacity = 0.7
    zText.style.fontSize = mobile ? '1.5em' : '2.2em'
    zText.style.pointerEvents = 'none'
    zText.style.textAlign = 'center'
    mapboxChildrenParent.appendChild(zText)

    const button = document.createElement('button')
    button.textContent = 'Submit'
    button.className = 'absolute top-6 left-1/2 transform -translate-x-1/2 w-30 bg-[#302831] text-white py-2 px-4 rounded cursor-pointer'
    button.style.zIndex = 100
    button.addEventListener('click', () => {
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
    })
    document.body.appendChild(button)

    // translate this


    const updateCenterCoordinates = () => {
      const { lat, lng } = map.getCenter()
      if (UNIT === "ly") {
        text.textContent = `Y: ${lat.toFixed(1)} | X: ${lng.toFixed(1)}`;
      } else {
        text.textContent = `Lat: ${lat.toFixed(3)}° | Lng: ${lng.toFixed(3)}°`;
      }
    }
    updateCenterCoordinates()
    map.on('move', updateCenterCoordinates)

    const updateZoomLevel = () => {
      const zoomLevel = map.getZoom().toFixed(2)
      zText.textContent = `Zoom: ${zoomLevel}`
    }
    updateZoomLevel()
    map.on('zoom', updateZoomLevel)
  }, [map])

  return null
}

export function Link({ mode, width, height, mobile, name, params }) {
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
