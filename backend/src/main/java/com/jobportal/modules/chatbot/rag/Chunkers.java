package com.jobportal.modules.chatbot.rag;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.segment.TextSegment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class Chunkers {

    // ── Ngưỡng kích thước ───────────────────────────────────────────────────
    /**
     * Kích thước tối đa (ký tự) của một text chunk tối ưu cho Ragas và LLM
     */
    private static final int SECTION_MAX_CHARS = 600;
    /** Overlap tối ưu giúp giữ ngữ cảnh liền mạch ở ranh giới */
    private static final int SECTION_OVERLAP = 100;

    // ── Splitter fallback dùng cho text thông thường / section dài ──────────
    private final DocumentSplitter fallbackSplitter = DocumentSplitters.recursive(SECTION_MAX_CHARS, SECTION_OVERLAP);

    // ────────────────────────────────────────────────────────────────────────
    // Public API: chọn splitter phù hợp với Document
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Chọn chiến lược chunking tối ưu dựa trên loại tài liệu:
     * - job_description (từ CSV): mỗi document đã là 1 chunk → passthrough
     * - Markdown và văn bản khác: sử dụng Recursive Splitter 600/100 để đảm bảo Overlap 
     *   và tránh tạo ra các chunk siêu nhỏ/rỗng chỉ chứa tiêu đề.
     */
    public List<TextSegment> smartSplit(Document document) {
        String sourceType = document.metadata().getString("source_type");
        String fileName = document.metadata().getString("file_name");

        // CSV Job Description: đã được cắt theo từng row ở Loaders → giữ nguyên
        if ("job_description".equals(sourceType)) {
            Metadata segmentMetadata = copyMetadata(document.metadata());
            segmentMetadata.put("topic", inferTopic(document.text(), ""));
            return List.of(TextSegment.from(document.text(), segmentMetadata));
        }

        // Nếu là Markdown (.md), chunk theo semantic section (##, ###)
        if (fileName != null && fileName.endsWith(".md")) {
            List<TextSegment> semanticSegments = splitByMarkdownSections(document.text(), document.metadata());
            log.debug("Semantic Markdown split → {} segments from \"{}\"", semanticSegments.size(), fileName);
            return semanticSegments;
        }

        // Sử dụng Recursive character splitter 600/100 làm fallback cho các văn bản khác
        List<TextSegment> rawSegments = fallbackSplitter.split(document);
        List<TextSegment> segments = new ArrayList<>();
        for (TextSegment seg : rawSegments) {
            String text = seg.text().trim();
            if (!text.isEmpty() && !text.matches("^[-*_\\s]+$") && text.length() >= 5) {
                Metadata segmentMetadata = copyMetadata(seg.metadata());
                segmentMetadata.put("topic", inferTopic(text, ""));
                segments.add(TextSegment.from(text, segmentMetadata));
            }
        }

        log.debug("Recursive split → {} segments (filtered from {}) from \"{}\"",
                segments.size(), rawSegments.size(), fileName);
        return segments;
    }

    private List<TextSegment> splitByMarkdownSections(String text, Metadata metadata) {
        String[] lines = text.split("\r?\n");
        List<Section> sections = new ArrayList<>();
        Section currentSection = null;

        for (String line : lines) {
            boolean isHeader = line.trim().startsWith("##") || line.trim().startsWith("###");

            if (isHeader) {
                if (currentSection != null && !currentSection.content.toString().trim().isEmpty()) {
                    sections.add(currentSection);
                }
                currentSection = new Section();
                currentSection.header = line.trim();
                currentSection.content.append(line).append("\n");
            } else {
                if (currentSection == null) {
                    currentSection = new Section();
                    currentSection.header = "";
                }
                currentSection.content.append(line).append("\n");
            }
        }
        if (currentSection != null && !currentSection.content.toString().trim().isEmpty()) {
            sections.add(currentSection);
        }

        List<TextSegment> segments = new ArrayList<>();
        // Áp dụng overlap kề cận (~10-15%)
        for (int i = 0; i < sections.size(); i++) {
            Section current = sections.get(i);
            StringBuilder chunkText = new StringBuilder();

            // Tiền ngữ cảnh (Preceding Context - lấy 12% đuôi section trước)
            if (i > 0) {
                Section prev = sections.get(i - 1);
                String prevText = prev.content.toString().trim();
                int overlapLength = (int) (prevText.length() * 0.12);
                if (overlapLength > 10) {
                    int startIdx = prevText.length() - overlapLength;
                    int firstSpace = prevText.indexOf(' ', startIdx);
                    if (firstSpace != -1 && firstSpace < prevText.length() - 5) {
                        startIdx = firstSpace;
                    }
                    String precedingContext = prevText.substring(startIdx).trim();
                    chunkText.append("[Preceding Context]: ...").append(precedingContext).append("\n\n");
                }
            }

            chunkText.append(current.content.toString().trim());

            // Hậu ngữ cảnh (Succeeding Context - lấy 12% đầu section sau)
            if (i < sections.size() - 1) {
                Section next = sections.get(i + 1);
                String nextText = next.content.toString().trim();
                int overlapLength = (int) (nextText.length() * 0.12);
                if (overlapLength > 10) {
                    int endIdx = overlapLength;
                    int lastSpace = nextText.lastIndexOf(' ', endIdx);
                    if (lastSpace != -1 && lastSpace > 5) {
                        endIdx = lastSpace;
                    }
                    String succeedingContext = nextText.substring(0, endIdx).trim();
                    chunkText.append("\n\n[Succeeding Context]: ").append(succeedingContext).append("...");
                }
            }

            Metadata segmentMetadata = copyMetadata(metadata);
            String finalTxt = chunkText.toString().trim();

            // Tag topic phục vụ metadata filtering
            String topic = inferTopic(finalTxt, current.header);
            segmentMetadata.put("topic", topic);

            if (!finalTxt.isEmpty() && !finalTxt.matches("^[-*_\\s]+$") && finalTxt.length() >= 5) {
                segments.add(TextSegment.from(finalTxt, segmentMetadata));
            }
        }

        return segments;
    }

    private String inferTopic(String content, String header) {
        String lower = (header + " " + content).toLowerCase();

        if (lower.contains("java") || lower.contains("spring") || lower.contains("hibernate")) {
            return "java";
        }
        if (lower.contains("red flag") || lower.contains("redflag") || lower.contains("cảnh báo đỏ") || lower.contains("cảnh báo")) {
            return "red_flag";
        }
        if (lower.contains("ats") || lower.contains("applicant tracking") || lower.contains("parser") || lower.contains("bảng biểu")) {
            return "ATS";
        }
        if (lower.contains("experience") || lower.contains("kinh nghiệm") || lower.contains("work history") || lower.contains("star method") || lower.contains("google xyz") || lower.contains("star")) {
            return "work_experience";
        }
        if (lower.contains("kỹ năng") || lower.contains("skill") || lower.contains("competenc") || lower.contains("matrix") || lower.contains("technical")) {
            return "technical_skills";
        }

        return "general_hr";
    }

    private static class Section {
        String header = "";
        StringBuilder content = new StringBuilder();
    }

    /**
     * Phiên bản batch của smartSplit — áp dụng cho toàn bộ danh sách documents.
     */
    public List<TextSegment> smartSplitAll(List<Document> documents) {
        List<TextSegment> all = new ArrayList<>();
        for (Document doc : documents) {
            all.addAll(smartSplit(doc));
        }
        return all;
    }

    /**
     * Splitter đơn giản 600/100 — giữ lại để RagService có thể dùng
     * khi cần giao cho EmbeddingStoreIngestor standard API.
     */
    public DocumentSplitter getRecursiveSplitter() {
        return DocumentSplitters.recursive(SECTION_MAX_CHARS, SECTION_OVERLAP);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ────────────────────────────────────────────────────────────────────────

    /** Tạo bản sao Metadata để tránh mutation chung */
    private Metadata copyMetadata(Metadata source) {
        // Trong v0.29.1, Metadata.put chỉ nhận (String, String)
        // toMap() trả Map<String,Object> nên phải cast từng value sang String
        Metadata copy = new Metadata();
        source.toMap().forEach((k, v) -> {
            if (v != null)
                copy.put(k, v.toString());
        });
        return copy;
    }
}