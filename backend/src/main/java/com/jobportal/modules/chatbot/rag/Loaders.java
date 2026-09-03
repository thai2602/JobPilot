package com.jobportal.modules.chatbot.rag;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.document.loader.FileSystemDocumentLoader;
import dev.langchain4j.data.document.parser.TextDocumentParser;
import dev.langchain4j.data.document.parser.apache.pdfbox.ApachePdfBoxDocumentParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

@Slf4j
@Component
public class Loaders {

    /**
     * Đọc file PDF, Markdown, Text, và CSV từ thư mục cấu hình.
     * Mỗi dòng CSV được chuyển thành một Document độc lập để embed tốt hơn.
     */
    public List<Document> loadDocumentsFromPath(Path path) {
        List<Document> documents = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(path)) {
            paths.filter(Files::isRegularFile)
                 .forEach(file -> {
                     try {
                         String fileName = file.toString().toLowerCase();
                         if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
                             documents.add(FileSystemDocumentLoader.loadDocument(file, new TextDocumentParser()));
                             log.info("Loaded Text/Markdown file: {}", file.getFileName());
                         } else if (fileName.endsWith(".pdf")) {
                             documents.add(FileSystemDocumentLoader.loadDocument(file, new ApachePdfBoxDocumentParser()));
                             log.info("Loaded PDF file: {}", file.getFileName());
                         } else if (fileName.endsWith(".csv")) {
                             List<Document> csvDocs = loadCsvAsDocuments(file);
                             documents.addAll(csvDocs);
                             log.info("Loaded CSV file: {} → {} job documents", file.getFileName(), csvDocs.size());
                         }
                     } catch (Exception e) {
                         log.error("Failed to load document: {}", file, e);
                     }
                 });
        } catch (Exception e) {
            log.error("Error walking through path: {}", path, e);
        }
        return documents;
    }

    /**
     * Chuyển đổi mỗi dòng CSV thành một Document có nội dung có cấu trúc.
     * CSV format: JobID,Title,ExperienceLevel,YearsOfExperience,Skills,Responsibilities,Keywords
     */
    private List<Document> loadCsvAsDocuments(Path csvFile) {
        List<Document> docs = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(Files.newInputStream(csvFile), StandardCharsets.UTF_8))) {

            String headerLine = reader.readLine();
            if (headerLine == null) return docs;

            String[] headers = parseCsvLine(headerLine);
            String line;
            int lineNum = 1;

            while ((line = reader.readLine()) != null) {
                lineNum++;
                if (line.isBlank()) continue;
                try {
                    String[] values = parseCsvLine(line);
                    if (values.length < headers.length) continue;

                    // Build structured text block để AI dễ hiểu ngữ nghĩa
                    StringBuilder sb = new StringBuilder();
                    sb.append("[JOB DESCRIPTION]\n");
                    for (int i = 0; i < headers.length && i < values.length; i++) {
                        String header = headers[i].trim();
                        String value  = values[i].trim();
                        if (!value.isEmpty()) {
                            sb.append(header).append(": ").append(value).append("\n");
                        }
                    }

                    Metadata metadata = new Metadata();
                    metadata.put("source_type", "job_description");
                    metadata.put("file_name", csvFile.getFileName().toString());
                    metadata.put("row", String.valueOf(lineNum));
                    if (values.length > 1 && !values[1].isBlank()) {
                        metadata.put("job_title", values[1].trim());
                    }
                    if (values.length > 2 && !values[2].isBlank()) {
                        metadata.put("experience_level", values[2].trim());
                    }

                    docs.add(Document.from(sb.toString(), metadata));
                } catch (Exception rowEx) {
                    log.warn("Skipped malformed CSV row #{} in {}: {}", lineNum, csvFile.getFileName(), rowEx.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse CSV file: {}", csvFile, e);
        }
        return docs;
    }

    /**
     * Parse một dòng CSV đơn giản, xử lý các giá trị bao quanh bởi dấu ngoặc kép.
     */
    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                fields.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        fields.add(current.toString());
        return fields.toArray(new String[0]);
    }
}
