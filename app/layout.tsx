import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "rongshuitong-agent.qsgeorge897.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;
  return {
    title: "融税通｜融资准备与协同 Agent",
    description: "帮助中小微企业把经营事实转化为可验证、可整改、可提交的融资证据。",
    icons: { icon: "/favicon.svg" },
    openGraph: {
      title: "融税通｜融资准备与协同 Agent",
      description: "让经营事实成为可验证的融资证据",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "融税通融资准备与协同 Agent" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "融税通｜融资准备与协同 Agent",
      description: "让经营事实成为可验证的融资证据",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
