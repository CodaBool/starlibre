export const dynamic = 'force-static'
import fs from "fs"
import path from "path"
import { feature } from 'topojson-client'
import Cartographer from "@/components/cartographer"
import { combineAndDownload } from "@/lib/utils"

export default async function mapLobby({ params }) {
  const dataDir = path.join(process.cwd(), "/app", "[map]", "topojson");

  const { map } = await params
  const filePath = path.join(dataDir, `${map}.json`)
  if (map === "favicon.ico") return
  const content = await fs.promises.readFile(filePath, 'utf8')

  // WARN: for some reason a path.resolve is needed here otherwise it cannot find the file
  // even if its just in a console log
  // path.resolve(`app/[map]/topojson/fallout.json`)
  // path.resolve(`app/[map]/topojson/lancer.json`)
  path.resolve(`app/[map]/topojson/fallout.json`)
  path.resolve(`app/[map]/topojson/lancer.json`)
  path.resolve(`app/[map]/topojson/lancer_test.json`)
  path.resolve(`app/[map]/topojson/lancer_starwall.json`)
  path.resolve(`app/[map]/topojson/starwars.json`)
  // const content = await fs.promises.readFile(path.resolve(`app/[map]/topojson/${map}.json`), 'utf8')
  // const content = await fs.promises.readFile(process.cwd() + '/app/fallout/fallout.json', 'utf8')
  // const content = fs.readFileSync(filePath, 'utf-8')
  const topojson = JSON.parse(content)

  // if (map === "lancer_test" || map === "lancer") {
  //   return <Cartographer data={topojson} name={map} />
  // }
  const [data, type] = combineAndDownload("geojson", topojson, {})

  const territory = feature(topojson, topojson.objects.territory)
  const location = feature(topojson, topojson.objects.location)
  const guide = feature(topojson, topojson.objects.guide)
  //
  // console.log(data, territory)

  // TODO: the layer name here will be different for each map
  // const layers = Object.keys(topojson.objects)
  // const layerObjects = layers.reduce((acc, layer) => {
  //   acc[layer] = feature(topojson, topojson.objects[layer]).features
  //   return acc
  // }, {})
  return <Cartographer data={data} name={map} />
  // return <Cartographer data={{ territory, location, guide }} name={map} />
}

export async function generateStaticParams() {
  const dataDir = path.join(process.cwd(), "/app", "[map]", "topojson")
  const files = fs.readdirSync(dataDir).filter(f => fs.statSync(path.join(dataDir, f)))
  return files.map(file => ({ slug: file }))
}


// follow this https://vercel.com/guides/loading-static-file-nextjs-api-route
//
// but there is this issue when trying static content
// google "nextjs static build process.cwd Error: ENOENT: no such file or directory, open /var/task"
