import { ImageResponse } from "next/og";
import prisma from "@/lib/db";
import Image from "next/image";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const slug = searchParams.get("school") || "";

  const sizeParam = searchParams.get("size");
  const size = sizeParam ? parseInt(sizeParam, 10) : 512;

  const school = await prisma.school.findUnique({
    where: { slug },
  });

  const logo = school?.logoUrl;
  const name = school?.schoolName || "School";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {logo ? (
          <Image
            src={logo}
            width={Math.floor(size * 0.8)}
            height={Math.floor(size * 0.8)}
            style={{ objectFit: "contain" }}
            alt={name}
          />
        ) : (
          <div
            style={{
              fontSize: Math.floor(size / 6),
              color: "#0f172a",
            }}
          >
            {name}
          </div>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}