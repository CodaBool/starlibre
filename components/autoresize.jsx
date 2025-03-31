import { zoomIdentity, selectAll } from 'd3'
import { useEffect, useState } from "react"

let resizeTimeout

export default function AutoResize({ svg, zoom, projection, mobile, width, height, setTooltip, positionTooltip, center }) {

  useEffect(() => {
    if (!svg || !zoom || !projection) return

    // resize crosshair
    selectAll('.crosshair-x')
      .attr('x2', width)
      .attr('y1', height / 2)
      .attr('y2', height / 2)
    selectAll('.crosshair-y')
      .attr('x1', width / 2)
      .attr('x2', width / 2)
      .attr('y2', height)
    setTooltip()
    positionTooltip({ pageX: 0, pageY: 0 })

    if (mobile) {
      console.log("you opened a keyboard probably, ignoring window resize")
      return
    }

    // recenter back on Cradle if the window is resized
    // TODO: support mobile landscape (currently is offcentered)
    const [x, y] = projection(center)

    // debounce the resize events
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const resizeOffsetX = (window.innerWidth - width) / 2
      const resizeOffsetY = (window.innerHeight - height) / 2
      if (Math.abs(width / 2 - x + resizeOffsetX) < 2 && Math.abs(height / 2 - y - 200 + resizeOffsetY) < 2) return
      console.log("window resized, recentering by", Math.floor(width / 2 - x + resizeOffsetX), Math.floor(height / 2 - y - 200 + resizeOffsetY))
      const transform = zoomIdentity.translate(width / 2 - x + resizeOffsetX, height / 2 - y + resizeOffsetY)
      svg.transition().duration(500).call(zoom.transform, transform)
    }, 250)
  }, [width, height])

}
