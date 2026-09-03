package com.jobportal.modules.chatbot.rag;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Nhập cache InMemoryEmbeddingStore cũ theo luồng, không gọi lại embedding API. */
@Slf4j
@Component
@RequiredArgsConstructor
public class LegacyEmbeddingImporter {

    private static final int BATCH_SIZE = 250;

    private final ObjectMapper objectMapper;

    @Value("${langchain.dimension:1536}")
    private int expectedDimension;

    public long importFile(Path path, EmbeddingStore<TextSegment> target, String label) throws IOException {
        List<Embedding> embeddings = new ArrayList<>(BATCH_SIZE);
        List<TextSegment> segments = new ArrayList<>(BATCH_SIZE);
        long imported = 0;

        try (JsonParser parser = objectMapper.getFactory().createParser(path.toFile())) {
            seekEntriesArray(parser, path);
            while (parser.nextToken() != JsonToken.END_ARRAY) {
                JsonNode entry = objectMapper.readTree(parser);
                embeddings.add(readEmbedding(entry, path));
                segments.add(readSegment(entry));

                if (embeddings.size() == BATCH_SIZE) {
                    target.addAll(embeddings, segments);
                    imported += embeddings.size();
                    log.info("[{}] Imported {} legacy vectors into pgvector", label, imported);
                    embeddings.clear();
                    segments.clear();
                }
            }
        }

        if (!embeddings.isEmpty()) {
            target.addAll(embeddings, segments);
            imported += embeddings.size();
        }
        log.info("[{}] Legacy migration completed: {} vectors", label, imported);
        return imported;
    }

    private void seekEntriesArray(JsonParser parser, Path path) throws IOException {
        while (parser.nextToken() != null) {
            if (parser.currentToken() == JsonToken.FIELD_NAME && "entries".equals(parser.currentName())) {
                if (parser.nextToken() != JsonToken.START_ARRAY) {
                    break;
                }
                return;
            }
        }
        throw new IOException("Invalid legacy embedding file (missing entries array): " + path);
    }

    private Embedding readEmbedding(JsonNode entry, Path path) throws IOException {
        JsonNode vectorNode = entry.path("embedding").path("vector");
        if (!vectorNode.isArray() || vectorNode.size() != expectedDimension) {
            throw new IOException("Invalid vector dimension in " + path + ": " + vectorNode.size());
        }
        float[] vector = new float[vectorNode.size()];
        for (int i = 0; i < vector.length; i++) {
            vector[i] = (float) vectorNode.get(i).asDouble();
        }
        return Embedding.from(vector);
    }

    private TextSegment readSegment(JsonNode entry) {
        JsonNode embedded = entry.path("embedded");
        String text = embedded.path("text").asText("");
        JsonNode metadataNode = embedded.path("metadata");
        if (metadataNode.has("metadata")) {
            metadataNode = metadataNode.path("metadata");
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        if (metadataNode.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = metadataNode.properties().iterator();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                metadata.put(field.getKey(), field.getValue().asText());
            }
        }
        return TextSegment.from(text, Metadata.from(metadata));
    }
}
