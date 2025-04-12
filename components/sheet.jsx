import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from '@/components/ui/badge.jsx'
import Link from "next/link"
import { color, accent, genLink } from "@/lib/utils.js"
import * as SVG from './svg.js'
import { useMap } from 'react-map-gl/maplibre'
import { useEffect } from "react"

export default function SheetComponent({ setDrawerOpen, drawerOpen, locations, coordinates, name, selected }) {
  const { map } = useMap()

  function handleMouseOver(properties, geometry) {
    // let className = ".territory"

    // if (geometry.type === "LineString") {
    //   className = ".guide"
    // } else if (geometry.type === "Point") {
    //   className = ".location"
    // }
    // selectAll(className)
    //   .filter(d => d.properties.name === properties.name)
    //   .classed('animate-pulse', true)
    //   .attr('fill', () => className === ".guide" ? "none" : accent(name, 1))
    //   .attr('stroke', () => className === ".location" ? null : accent(name, 1))
  }

  function handleMouseOut(properties, geometry) {
    // let className = ".territory"
    // if (geometry.type === "LineString") {
    //   className = ".guide"
    // } else if (geometry.type === "Point") {
    //   className = ".location"
    // }
    // selectAll(className)
    //   .filter(d => d.properties.name === properties.name)
    //   .classed('animate-pulse', false)
    //   .attr('fill', d => className === ".guide" ? "none" : color(name, d.properties, "fill", d.geometry.type))
    //   .attr('stroke', d => className === ".location" ? null : color(name, d.properties, "stroke", d.geometry.type))
  }

  function handle(e) {
    e.preventDefault()
  }

  useEffect(() => {

    // move editor table
    const el = document.querySelector(".editor-table")
    if (el) {
      if (drawerOpen) {
        el.style.bottom = "40%"
      } else {
        el.style.bottom = "20px"
      }
    }
  }, [drawerOpen])

  return (
    <Sheet onOpenChange={setDrawerOpen} open={drawerOpen} modal={false} style={{ color: 'white' }}>
      <SheetContent side="bottom" style={{ maxHeight: '38vh', overflowY: 'auto' }} className="map-sheet" onPointerDownOutside={handle}>
        <SheetHeader >
          <SheetTitle className="text-center">{coordinates ? `lat: ${Math.floor(coordinates[1])}, lng: ${Math.floor(coordinates[0])}` : 'unknown'}</SheetTitle>
          <SheetDescription />
        </SheetHeader >
        <div className="flex flex-wrap justify-center">
          {locations?.map((d, index) => {
            const { properties, geometry } = d
            const params = new URLSearchParams({
              description: properties.description || "",
              name: properties.name,
              map: name,
            }).toString()
            const icon = SVG[d.properties.type]
            const remoteIcon = d.properties.icon
            const card = (
              <Card
                className="min-h-[80px] m-2 min-w-[150px] cursor-pointer"
                onMouseOver={() => handleMouseOver(properties, geometry)}
                onMouseOut={() => handleMouseOut(properties, geometry)}
              >
                <CardContent className={`p-2 text-center ${selected === properties.name ? 'bg-yellow-800' : 'hover:bg-yellow-950'}`}>
                  {properties.unofficial && <Badge variant="destructive" className="mx-auto">unofficial</Badge>}
                  <p className="font-bold text-xl text-center">{properties.name}</p>
                  {remoteIcon ?
                    <p className="text-center text-gray-400 flex justify-center">
                      <svg width="20" height="20" className="m-1">
                        <image href={remoteIcon} width="20" height="20" />
                      </svg>
                      {properties.type}
                    </p>
                    : <p className="text-center text-gray-400 flex justify-center"><span dangerouslySetInnerHTML={{ __html: icon }} style={{ fill: "white", margin: '.2em' }} />{properties.type}</p>
                  }
                  {properties.faction && <Badge className="mx-auto">{properties.faction}</Badge>}
                  {properties.destroyed && <Badge className="mx-auto">destroyed</Badge>}
                  {properties.capital && <Badge variant="destructive" className="mx-auto">capital</Badge>}
                </CardContent>
              </Card >
            )
            return properties.name === selected ? (
              <Link
                href={genLink(d, name, "href")}
                target={genLink(d, name, "target")}
                key={index}
              >
                {card}
              </Link>
            ) : <div key={index} onClick={() => {

              // duplicate of map pan()
              const arbitraryNumber = locations.length > 5 ? 9.5 : 10
              let zoomFactor = Math.pow(2, arbitraryNumber - map.getZoom())
              zoomFactor = Math.max(zoomFactor, 4)
              const latDiff = (map.getBounds().getNorth() - map.getBounds().getSouth()) / zoomFactor
              const lat = d.geometry.coordinates[1] - latDiff / 2

              map.easeTo({ center: [d.geometry.coordinates[0], lat], duration: 800 })
            }}>{card}</div>
          })}
        </div>
      </SheetContent >
    </Sheet >
  )
}
