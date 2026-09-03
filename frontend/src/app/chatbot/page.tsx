import AuthenticatedRoute from "../../components/AuthenticatedRoute";
import ChatbotPage from "../../features/chatbot/ChatbotPage";

export default function Page() {
  return <AuthenticatedRoute><ChatbotPage /></AuthenticatedRoute>;
}
