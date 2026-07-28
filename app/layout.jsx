import "./globals.css";
import { SHOP_NAME, SHOP_TAGLINE, SHOP_LOGO_URL } from "../lib/shopConfig";

export const metadata = {
  title: SHOP_NAME,
  description: SHOP_TAGLINE,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SHOP_NAME,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C0392B",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap"
        />
        {SHOP_LOGO_URL && <link rel="apple-touch-icon" href={SHOP_LOGO_URL} />}
        {SHOP_LOGO_URL && <link rel="icon" href={SHOP_LOGO_URL} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
