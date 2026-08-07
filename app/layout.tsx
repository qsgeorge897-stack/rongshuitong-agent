import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "融税通｜小微融资智能管家",
  description: "面向小微企业的财税健康检查与普惠融资准备 Agent",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
