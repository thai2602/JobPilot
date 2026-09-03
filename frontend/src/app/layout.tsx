import "../index.css";
import "../responsive.css";
import Header from "../layouts/Header";
import Footer from "../layouts/Footer";
import GlobalSavedTray from "../components/GlobalSavedTray";
import FloatingChatbot from "../components/FloatingChatbot";
import RouteAwareMain from "../components/RouteAwareMain";
import { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "JobPilot - Tư vấn & Kết nối việc làm",
  description: "Nền tảng tư vấn và kết nối việc làm, hỗ trợ ứng viên định hướng nghề nghiệp và tối ưu CV.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen bg-white text-gray-900 flex flex-col">
          <div className="pointer-events-none fixed inset-0 -z-10 opacity-40" />
          <Header />
          <RouteAwareMain>
            {children}
          </RouteAwareMain>
          <GlobalSavedTray />
          <FloatingChatbot />
          <Footer />
        </div>
        <Script
          id="google-identity-services"
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
