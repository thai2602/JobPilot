export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
}

export interface ChatRequest {
    message: string;
}

export interface ChatResponse {
    reply: string;
}
