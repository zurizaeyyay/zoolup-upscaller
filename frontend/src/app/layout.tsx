import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Image Upscaller',
    description: 'A simple image upscaling web app',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`antialiased`}>{children}</body>
        </html>
    );
}
