'use client'
import { useEffect, useState } from 'react'
import MapComponent from './map'
import { combineAndDownload, getConsts, isMobile } from '@/lib/utils'
import Map from 'react-map-gl/maplibre'
import Controls from './controls.jsx'
import Editor from './editor'
import { useSearchParams, useRouter } from 'next/navigation'
import { create } from 'zustand'
import { feature } from 'topojson-client'
import randomName from '@scaleway/random-name'

export const useStore = create((set) => ({
  editorTable: null,
  setEditorTable: editorTable => set({ editorTable }),
}))

export default function Cartographer({ name, data, stargazer, rawTopojson, mapId }) {
  const { SCALE, CENTER, STYLE, VIEW, MAX_ZOOM, MIN_ZOOM, BOUNDS, BG } = getConsts(name)
  const [size, setSize] = useState()
  const mobile = isMobile()
  const [draw, setDraw] = useState()
  const params = useSearchParams()
  const router = useRouter()
  VIEW.zoom = params.get("z") || VIEW.zoom
  VIEW.longitude = params.get("lng") || VIEW.longitude
  VIEW.latitude = params.get("lat") || VIEW.latitude
  const locked = params.get("locked") === "1"
  const showControls = params.get("controls") !== "0" && !mobile && !stargazer && !locked
  const showEditor = params.get("editor") !== "0" && !mobile && !stargazer && !locked

  let loading = false

  useEffect(() => {
    if (params.get("width") && params.get("height")) {
      setSize({ width: Number(params.get("width")), height: Number(params.get("height")) })
    } else {
      setSize({ width: window.innerWidth, height: window.innerHeight })
      const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // combine server topojson with a local geojson
  if (rawTopojson && mapId && size) {
    if (typeof localStorage === 'undefined') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-indigo-900 rounded-full" />
        </div>
      )
    }

    const maps = JSON.parse(localStorage.getItem('maps')) || {}
    if (mapId === "foundry") {
      const uuid = params.get("uuid")
      fetch(`/api/v1/map/${uuid}`)
        .then(res => res.json())
        .then(res => {
          if (res.error) {
            window.parent.postMessage({
              type: 'error',
              message: res.error,
            }, '*')
          } else {
            if (res.type !== "FeatureCollection") {
              window.parent.postMessage({
                type: 'error',
                message: res.error,
              }, '*')
              return
            }
            const prev = JSON.parse(localStorage.getItem('maps')) || {}
            const mapKey = name + "-" + uuid
            localStorage.setItem('maps', JSON.stringify({
              ...prev, [mapKey]: {
                geojson: res,
                name: prev[mapKey]?.name || randomName('', ' '),
                updated: Date.now(),
                map: name,
              }
            }))
            // console.log("redirect to", `/${name}?id=${uuid}&hamburger=0&search=0&link=foundry&secret=${params.get("secret")}`)
            router.replace(`/${name}?id=${uuid}&hamburger=0&search=0&link=foundry&secret=${params.get("secret")}`)
          }
        })
        .catch(message => {
          window.parent.postMessage({
            type: 'error',
            message,
          }, '*');
        })
    } else if (Object.keys(maps).length > 0) {
      const localGeojson = maps[name + "-" + mapId]
      if (localGeojson?.geojson) {
        localGeojson.geojson.features = localGeojson.geojson.features.map(feature => {
          feature.properties.userCreated = true;
          return feature;
        })
        const [rawGeojson, type] = combineAndDownload("topojson", rawTopojson, localGeojson.geojson)
        const combinedData = JSON.parse(rawGeojson)

        // TODO: the layer name here will be different for each map
        const layers = Object.keys(combinedData.objects)
        const newData = layers.reduce((acc, layer) => {
          acc[layer] = feature(combinedData, combinedData.objects[layer]).features
          return acc
        }, {})
        data = newData
      } else {
        setTimeout(() => router.replace(`/${name}`), 200)
        loading = true
      }
    } else {
      setTimeout(() => router.replace(`/${name}`), 200)
      loading = true
    }
  }

  // wait until I know how large the window is
  // this only takes miliseconds it seems, so its fine to wait
  if (!size || mapId === "foundry") loading = true
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-indigo-900 rounded-full" />
      </div>
    )
  }

  console.log("controls", showControls, "editor", showEditor, "locked", locked)

  return (
    <>
      <Map
        id="map"
        dragRotate={false}
        scrollZoom={!locked}
        dragPan={!locked}
        doubleClickZoom={!locked}
        attributionControl={false}
        initialViewState={VIEW}
        maxZoom={MAX_ZOOM}
        minZoom={MIN_ZOOM}
        style={{ width: size.width, height: size.height }}
        mapStyle={STYLE}
      >
        <MapComponent width={size.width} height={size.height} name={name} data={data} mobile={mobile} SCALE={SCALE} CENTER={CENTER} params={params} stargazer={stargazer} locked={locked} />
      </Map>
    </>
  )
}
