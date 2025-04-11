"use client"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Heart, Github, UserRound, Copyright, Sparkles, Telescope, SquareArrowOutUpRight, MoonStar, Sparkle, BookOpen, Bug, Pencil, Plus, MapPin, RectangleHorizontal, Map, ArrowRightFromLine, Hexagon, ListCollapse, User, LogOut, Ruler, CodeXml, Menu, Crosshair } from "lucide-react"
import { searchBar, accent } from "@/lib/utils.js"
import * as turf from '@turf/turf'
import { useEffect, useRef, useState } from "react"
import { useStore } from "./cartographer"

export default function MenuComponent({ map, data, mobile, name, pan }) {
  const [active, setActive] = useState()
  const [previousFeatureId, setPreviousFeatureId] = useState(null)
  const { editorTable } = useStore()
  const cmd = useRef(null)
  const input = useRef(null)

  async function search(e, d) {
    if (typeof e === "object") e.preventDefault()

    // close search menu
    setActive(false)
    input.current.blur()

    // Reset hover state of the previously hovered feature
    if (previousFeatureId !== null) {
      map.setFeatureState(
        { source: 'source', id: previousFeatureId },
        { hover: false }
      )
    }

    // Set hover state of the new feature
    map.setFeatureState(
      { source: 'source', id: d.id },
      { hover: true }
    )

    // Update the previousFeatureId state
    setPreviousFeatureId(d.id)

    pan(d, null, true)
  }

  useEffect(() => {
    if (input.current) {
      input.current.addEventListener('blur-sm', () => setActive(false));
    }
    function down(e) {
      if (e.code === 'Space' && !editorTable) {
        if (input.current !== document.activeElement) {
          e.preventDefault()
        }
        input.current.focus()
        setActive(true)
      } else if (e.code === "Escape") {
        setActive(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => {
      document.removeEventListener('keydown', down)
      input?.current?.removeEventListener('blur-sm', () => setActive(false));
    }
  }, [editorTable])

  useEffect(() => {
    if (active) {
      if (!mobile) input.current.placeholder = "Escape to close"
    } else {
      input.current.placeholder = mobile ? "Search for a location" : "press Space to search"
    }
  }, [active])

  return (
    <div className="flex mt-5 w-full justify-center absolute z-10 pointer-events-none">
      <Command className="rounded-lg border shadow-md w-[75%] searchbar pointer-events-auto" style={{ backgroundColor: searchBar[name].background, borderColor: searchBar[name].border }}>
        <CommandInput placeholder={mobile ? "Search for a location" : "press Space to search"} ref={input} onClick={() => setActive(true)} style={{ backgroundColor: searchBar[name].background }}
        />
        {active &&
          <CommandList style={{ height: '351px', zIndex: 100 }}>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup ref={cmd} heading="Suggestions">
              {data.features.map((d, index) => (
                <CommandItem key={index} value={d.properties.name} className="cursor-pointer z-100" onMouseDown={e => search(e, d)} onSelect={e => search(e, d)} onTouchEnd={e => search(e, d)}>
                  {d.properties.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        }
      </Command >
    </div>
  )
}
