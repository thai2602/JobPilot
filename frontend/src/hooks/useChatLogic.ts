import { useState } from 'react';
import { ChatMessage } from '../utils/chatbot';
import { chatApi } from '../services/chatbotApi';
import { useCvContext } from '../features/cv-builder/CvContext';

export const useChatLogic = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { cvData } = useCvContext();

    const sendMessage = async (content: string) => {
        if (!content.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const hasData = Object.entries(cvData).some(([k, v]) => k !== 'color' && typeof v === 'string' && v.trim() !== '');
            const apiMessage = hasData 
                ? `[Dữ liệu CV hiện tại của tôi (JSON): ${JSON.stringify(cvData)}]\n\n${content}`
                : content;

            const reply = await chatApi.sendMessage(apiMessage);
            const aiMessage: ChatMessage = { role: 'ai', content: reply };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = { role: 'ai', content: 'Xin lỗi, đã có lỗi xảy ra khi kết nối tới server.' };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        isLoading,
        sendMessage,
    };
};
