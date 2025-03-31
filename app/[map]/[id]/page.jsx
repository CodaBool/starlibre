export const revalidate = 300 // seconds before a MISS (300 is 5 minutes)
import fs from "fs"
import path from "path"
import { feature } from 'topojson-client'
import Cartographer from "@/components/cartographer"
import GeneratingError from "@/components/generatingError"
import db from "@/lib/db"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { redirect } from "next/navigation"
import { combineAndDownload } from "@/lib/utils"
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_ACCESS_ID,
    secretAccessKey: process.env.CF_ACCESS_SECRET,
  },
})

export default async function mapLobby({ params }) {
  const { map, id, searchParams } = await params
  const skipCombine = id.length === 13 || id === "foundry"
  const isUUID = id.length === 36

  let geojson
  if (!skipCombine) {
    const mapDB = await db.map.findUnique({
      where: { id },
    })
    if (isUUID && !mapDB) {
      // probably a new map that's not in the cache yet
      return <GeneratingError map={map} />
    }
    if (!mapDB?.published) {
      return redirect(`/${map}`)
    }

    const command = new GetObjectCommand({
      Bucket: "maps",
      Key: id,
      ResponseContentType: "application/json",
    })
    const response = await s3.send(command)


    // Read stream to buffer
    const clientGeojson = await response.Body?.transformToString();
    if (!clientGeojson) throw 'file not found'
    geojson = JSON.parse(clientGeojson)

    // add a userCreated prop for better contribute links
    geojson.features = geojson.features.map(feature => {
      feature.properties.userCreated = true;
      return feature;
    })
  }

  const dataDir = path.join(process.cwd(), "/app", "[map]", "topojson");
  const filePath = path.join(dataDir, `${map}.json`)

  // WARN: for some reason a path.resolve is needed here otherwise it cannot find the file
  path.resolve(`app/[map]/topojson/fallout.json`)
  path.resolve(`app/[map]/topojson/lancer.json`)
  path.resolve(`app/[map]/topojson/lancer_starwall.json`)
  path.resolve(`app/[map]/topojson/starwars.json`)
  const content = await fs.promises.readFile(filePath, 'utf8')

  const topojson = JSON.parse(content)
  if (skipCombine) {
    return <Cartographer rawTopojson={topojson} name={map} mapId={id} stargazer={id !== "foundry"} />
  }

  const [data, type] = combineAndDownload("topojson", topojson, geojson)
  const combinedData = JSON.parse(data)

  // TODO: the layer name here will be different for each map
  const layers = Object.keys(combinedData.objects)
  const layerObjects = layers.reduce((acc, layer) => {
    acc[layer] = feature(combinedData, combinedData.objects[layer]).features
    return acc
  }, {})
  return <Cartographer data={layerObjects} name={map} stargazer />
}
