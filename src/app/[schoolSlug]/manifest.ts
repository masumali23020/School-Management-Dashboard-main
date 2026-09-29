import { MetadataRoute } from "next";
import prisma from "@/lib/db";

export default async function manifest({
  params,
}: {
  params: { school: string };
}): Promise<MetadataRoute.Manifest> {
  const school = await prisma.school.findUnique({
    where: { slug: params.school },
  });

  const name = school?.schoolName || "School App";

  return {
    name,
    short_name: name,
    description: `${name} Dashboard`,
    start_url: `/${params.school}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: `/api/icon?school=${params.school}&size=192`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `/api/icon?school=${params.school}&size=512`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}