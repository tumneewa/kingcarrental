import "./globals.css";

export const metadata = {
  title: "ระบบจัดการรถเช่า",
  description: "ระบบจัดการหลังร้านสำหรับธุรกิจเช่ารถ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
