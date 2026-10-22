import type { Metadata } from "next";
import AuthenticatedRoute from "../../components/AuthenticatedRoute";
import ChatbotPage from "../../features/chatbot/ChatbotPage";

export const metadata: Metadata = {
  title: "Trợ lý AI | JobPilot",
  description: "Hỏi đáp với trợ lý AI về việc làm, CV và định hướng nghề nghiệp.",
};

export default function Page() {
  return <AuthenticatedRoute><ChatbotPage /></AuthenticatedRoute>;
}
