import Image from "next/image"
// import lancer from '@/public/lancer_landing.webp'
import placeholder1 from '@/public/placeholder_1_landing.webp'
import placeholder2 from '@/public/placeholder_2_landing.webp'
import placeholder3 from '@/public/placeholder_3_landing.webp'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function page() {
  return (
    <>
      <h1 className="text-5xl my-2 text-center">Sci-Fi Maps</h1 >
      <div className="container mx-auto flex flex-wrap justify-center">
        <Link href="/lancer">
          <Card className="max-w-[150px] cursor-pointer lg:max-w-[441px] rounded-xl m-1">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-center">LANCER</CardTitle >
              <CardDescription className="text-center">CodaBool</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <Image
                src={placeholder2}
                alt="Lancer Map"
                className="hover-grow rounded-xl"
              />
            </CardContent>
          </Card >
        </Link >
        <Link href="/fallout">
          <Card className="max-w-[150px] cursor-pointer lg:max-w-[441px] rounded-xl m-1">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-center">FALLOUT</CardTitle >
              <CardDescription className="text-center">CodaBool</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <Image
                src={placeholder1}
                alt="Fallout Map"
                className="hover-grow rounded-xl"
              />
            </CardContent>
          </Card >
        </Link>
        <Link href="/starwars">
          <Card className="max-w-[150px] cursor-pointer lg:max-w-[441px] rounded-xl m-1">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-center">STARWARS</CardTitle >
              <CardDescription className="text-center">CodaBool</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <Image
                src={placeholder3}
                alt="Starwars Map"
                className="hover-grow rounded-xl"
              />
            </CardContent>
          </Card >
        </Link>
      </div>
      <hr className="my-2" />
      <div className="container mx-auto flex flex-wrap justify-center">
        <Link href="https://www.nightcity.io/red">
          <Card className="m-1 max-w-[150px] cursor-pointer lg:max-w-[200px] rounded-xl">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-center text-sm">CYBERPUNK</CardTitle >
              <CardDescription className="text-[.7em] text-center">Devianaut | DeviousDrizzle</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <Image
                src={placeholder3}
                alt="Cyberpunk RED Map"
                className="hover-grow rounded-xl"
              />
            </CardContent>
          </Card >
        </Link >
        <Link href="https://hbernberg.carto.com/viz/76e286d4-fbab-11e3-b014-0e73339ffa50/embed_map">
          <Card className="m-1 max-w-[150px] cursor-pointer lg:max-w-[200px] rounded-xl">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-center text-sm">STAR WARS</CardTitle >
              <CardDescription className="text-xs text-center">Henry M Bernberg</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <Image
                src={placeholder3}
                alt="Star Wars Map"
                className="hover-grow rounded-xl"
              />
            </CardContent>
          </Card >
        </Link>
        <Link href="https://map.weylandyutani.company/">
          <Card className="m-1 max-w-[150px] cursor-pointer lg:max-w-[200px] rounded-xl">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-center text-sm">ALIEN</CardTitle >
              <CardDescription className="text-xs text-center">Clay DeGruchy</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <Image
                src={placeholder3}
                alt="Alien Map"
                className="hover-grow rounded-xl"
              />
            </CardContent>
          </Card >
        </Link>
        <Link href="https://jambonium.co.uk/40kmap">
          <Card className="m-1 max-w-[150px] cursor-pointer lg:max-w-[200px] rounded-xl">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-center text-sm">WARHAMMER</CardTitle >
              <CardDescription className="text-xs text-center">Michelle Louise Janion</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <Image
                src={placeholder3}
                alt="Warhammer Map"
                className="hover-grow rounded-xl"
              />
            </CardContent>
          </Card >
        </Link>
      </div>
    </>
  )
}
