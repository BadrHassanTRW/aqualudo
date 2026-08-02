export const metadata = {
  title: 'أكوا لودو · Aqua Ludo',
  description: 'Water-sports academy on the Nile in Cairo — rowing, kayaking, SUP, wakeboard, water fitness.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
