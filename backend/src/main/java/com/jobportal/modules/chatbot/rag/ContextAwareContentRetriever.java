package com.jobportal.modules.chatbot.rag;

import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Context-Aware Query Router.
 *
 * Phân tích nội dung câu hỏi và định tuyến sang đúng vector store:
 *
 * ┌─────────────────────────────┬─────────────────────────┐
 * │ Câu hỏi chứa HR signals │ → hrRetriever │
 * │ Câu hỏi chứa Job signals │ → active job retriever │
 * │ Câu hỏi lịch sử/xu hướng │ → historical retriever │
 * │ Câu hỏi tổng hợp / mơ hồ │ → merge store phù hợp │
 * └─────────────────────────────┴─────────────────────────┘
 */
@Slf4j
public class ContextAwareContentRetriever implements ContentRetriever {

    private final ContentRetriever hrRetriever;
    private final ContentRetriever jobRetriever;
    private final ContentRetriever historicalRetriever;
    private final int routeScoreMargin;
    private final int mergedMaxResults;

    /** Từ khóa liên quan đến đánh giá CV / tiêu chí HR */
    private static final Set<String> HR_SIGNALS = Set.of(
            "cv", "resume", "hồ sơ", "chấm điểm", "đánh giá cv", "nhận xét cv",
            "phân tích cv", "review cv", "cải thiện cv", "tối ưu cv", "audit cv",
            "trình bày cv", "thiết kế cv", "viết cv", "kinh nghiệm", "gạch đầu dòng",
            "ats", "applicant tracking", "tiêu chí", "khung chấm", "star", "xyz",
            "red flag", "điểm mạnh", "điểm yếu", "hồ sơ của tôi", "cv của tôi",
            "bộ hồ sơ", "hr", "nhà tuyển dụng đánh giá", "score", "bullet point",
            "action verb", "động từ hành động", "động từ mạnh", "quantif");

    /** Từ khóa liên quan đến thị trường việc làm / JD */
    private static final Set<String> JOB_SIGNALS = Set.of(
            "việc làm", "tìm việc", "job", "lương", "mức lương",
            "yêu cầu tuyển dụng", "mô tả công việc", "tuyển dụng",
            "vị trí tuyển", "cơ hội nghề nghiệp", "thị trường việc làm",
            "salary", "jd", "job description", "hiring", "recruitment",
            "kỹ năng cần có", "ngành it tuyển", "frontend developer tuyển");

    /** Từ khóa yêu cầu dữ liệu đã đóng/hết hạn hoặc phân tích xu hướng quá khứ. */
    private static final Set<String> HISTORICAL_SIGNALS = Set.of(
            "lịch sử", "historical", "đã đóng", "hết hạn", "quá khứ", "trước đây",
            "dữ liệu cũ", "năm trước", "xu hướng", "thống kê", "biến động",
            "phân tích thị trường", "nhu cầu tuyển dụng", "thị trường việc làm");

    public ContextAwareContentRetriever(ContentRetriever hrRetriever,
                                        ContentRetriever jobRetriever,
                                        int routeScoreMargin,
                                        int mergedMaxResults) {
        this(hrRetriever, jobRetriever, query -> List.of(), routeScoreMargin, mergedMaxResults);
    }

    public ContextAwareContentRetriever(ContentRetriever hrRetriever,
                                        ContentRetriever jobRetriever,
                                        ContentRetriever historicalRetriever,
                                        int routeScoreMargin,
                                        int mergedMaxResults) {
        this.hrRetriever = hrRetriever;
        this.jobRetriever = jobRetriever;
        this.historicalRetriever = historicalRetriever;
        this.routeScoreMargin = Math.max(0, routeScoreMargin);
        this.mergedMaxResults = Math.max(1, mergedMaxResults);
    }

    @Override
    public List<Content> retrieve(Query query) {
        return retrieveWithTrace(query).contents();
    }

    /** Truy xuất kèm trace để endpoint eval và log có thể giải thích quyết định routing. */
    public RetrievalResult retrieveWithTrace(Query query) {
        String originalText = query.text();
        String cleanText = cleanQueryText(originalText);
        Query cleanQuery = Query.from(cleanText);

        // Routing phải dựa trên câu hỏi đã làm sạch, tránh để JSON CV dài làm lệch điểm tín hiệu.
        String text = cleanText.toLowerCase(Locale.ROOT);
        int hrScore = signalScore(text, HR_SIGNALS);
        int jobScore = signalScore(text, JOB_SIGNALS);
        int historicalScore = signalScore(text, HISTORICAL_SIGNALS);
        Route route = chooseRoute(hrScore, jobScore, historicalScore);

        List<Content> hrResults = usesHr(route) ? safeRetrieve(hrRetriever, cleanQuery) : List.of();
        List<Content> jobResults = usesJob(route) ? safeRetrieve(jobRetriever, cleanQuery) : List.of();
        List<Content> historicalResults = usesHistorical(route)
                ? safeRetrieve(historicalRetriever, cleanQuery) : List.of();

        int candidateCount = hrResults.size() + jobResults.size() + historicalResults.size();
        List<Content> deduplicated = mergeBalanced(List.of(hrResults, jobResults, historicalResults));
        int duplicatesRemoved = Math.max(0, candidateCount - deduplicated.size());
        List<Content> retrieved = new ArrayList<>(deduplicated.subList(
                0, Math.min(mergedMaxResults, deduplicated.size())));

        // DYNAMIC METADATA FILTERING FOR JAVA QUERIES
        boolean isJavaQuery = text.contains("java");
        boolean metadataFiltered = false;
        if (isJavaQuery) {
            List<Content> javaFiltered = retrieved.stream()
                    .filter(content -> {
                        if (content.textSegment() == null || content.textSegment().metadata() == null) {
                            return false;
                        }
                        String sourceType = content.textSegment().metadata().getString("source_type");
                        // Job documents already matched Java through hybrid retrieval. The
                        // legacy topic filter only applies to HR knowledge chunks.
                        if ("database_job".equals(sourceType) || "historical_job".equals(sourceType)) {
                            return true;
                        }
                        String topic = content.textSegment().metadata().getString("topic");
                        return "java".equals(topic) || "technical_skills".equals(topic);
                    })
                    .toList();

            if (!javaFiltered.isEmpty() && javaFiltered.size() < retrieved.size()) {
                log.debug("[RAG Router] Java dynamic metadata filtering kept {}/{} chunks.",
                        javaFiltered.size(), retrieved.size());
                retrieved = javaFiltered;
                metadataFiltered = true;
            }
        }

        RetrievalTrace trace = new RetrievalTrace(
                route, hrScore, jobScore, historicalScore,
                hrResults.size(), jobResults.size(), historicalResults.size(),
                duplicatesRemoved, retrieved.size(), metadataFiltered);
        log.info("[RAG Retrieval] route={}, scores(hr/job/history)={}/{}/{}, results(hr/job/history/final)={}/{}/{}/{}, deduplicated={}, metadataFiltered={}, query=\"{}\"",
                route, hrScore, jobScore, historicalScore,
                hrResults.size(), jobResults.size(), historicalResults.size(), retrieved.size(),
                duplicatesRemoved, metadataFiltered, truncate(cleanText));
        return new RetrievalResult(List.copyOf(retrieved), trace);
    }

    private Route chooseRoute(int hrScore, int jobScore, int historicalScore) {
        if (historicalScore > 0) {
            if (hrScore > 0 && jobScore == 0) {
                return Route.HR_HISTORICAL;
            }
            if (jobScore > 0 || hrScore > 0) {
                return Route.JOB_HISTORY;
            }
            return Route.HISTORICAL;
        }
        if (hrScore == 0 && jobScore == 0) {
            return Route.BOTH;
        }
        if (hrScore >= jobScore + routeScoreMargin && hrScore > jobScore) {
            return Route.HR;
        }
        if (jobScore >= hrScore + routeScoreMargin && jobScore > hrScore) {
            return Route.JOB;
        }
        return Route.BOTH;
    }

    private boolean usesHr(Route route) {
        return route == Route.HR || route == Route.BOTH || route == Route.HR_HISTORICAL;
    }

    private boolean usesJob(Route route) {
        return route == Route.JOB || route == Route.BOTH || route == Route.JOB_HISTORY;
    }

    private boolean usesHistorical(Route route) {
        return route == Route.HISTORICAL || route == Route.JOB_HISTORY || route == Route.HR_HISTORICAL;
    }

    private int signalScore(String text, Set<String> signals) {
        int score = 0;
        for (String signal : signals) {
            if (text.contains(signal)) {
                score += signal.indexOf(' ') >= 0 ? 2 : 1;
            }
        }
        return score;
    }

    private List<Content> safeRetrieve(ContentRetriever retriever, Query query) {
        List<Content> contents = retriever.retrieve(query);
        return contents == null ? List.of() : contents;
    }

    /** Round-robin giúp kết quả BOTH không bị HR chiếm hết trước khi áp dụng limit. */
    private List<Content> mergeBalanced(List<List<Content>> resultGroups) {
        int totalSize = resultGroups.stream().mapToInt(List::size).sum();
        List<Content> interleaved = new ArrayList<>(totalSize);
        int size = resultGroups.stream().mapToInt(List::size).max().orElse(0);
        for (int index = 0; index < size; index++) {
            for (List<Content> group : resultGroups) {
                if (index < group.size()) {
                    interleaved.add(group.get(index));
                }
            }
        }
        return deduplicate(interleaved);
    }

    private List<Content> deduplicate(List<Content> contents) {
        Map<String, Content> unique = new LinkedHashMap<>();
        for (Content content : contents) {
            if (content != null) {
                unique.putIfAbsent(contentKey(content), content);
            }
        }
        return new ArrayList<>(unique.values());
    }

    private String contentKey(Content content) {
        if (content.textSegment() == null) {
            return "content:" + content.hashCode();
        }
        String sourceType = null;
        String sourceId = null;
        if (content.textSegment().metadata() != null) {
            sourceType = content.textSegment().metadata().getString("source_type");
            sourceId = content.textSegment().metadata().getString("source_id");
        }
        if (sourceId != null && !sourceId.isBlank()) {
            return "source:" + String.valueOf(sourceType) + ':' + sourceId;
        }
        String rawText = content.textSegment().text();
        if (rawText == null) {
            return "segment:" + content.hashCode();
        }
        String normalizedText = rawText
                .strip()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
        return "text:" + normalizedText;
    }

    /**
     * Dọn dẹp câu truy vấn: Loại bỏ các khối JSON CV khổng lồ trước khi đem đi tìm
     * kiếm Vector.
     * Chỉ giữ lại phần chỉ thị (instruction) của người dùng nhằm đảm bảo Vector
     * Match chính xác.
     */
    private String cleanQueryText(String text) {
        if (text == null)
            return "";

        // Loại bỏ block JSON nếu có (tìm từ dấu { đầu tiên đến } cuối cùng)
        int firstBrace = text.indexOf('{');
        int lastBrace = text.lastIndexOf('}');

        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            String prefix = text.substring(0, firstBrace).trim();
            String suffix = text.substring(lastBrace + 1).trim();

            // Loại bỏ các từ mang tính kỹ thuật/chuyển tiếp
            prefix = prefix.replaceAll("(?i)dữ liệu sau\\s*\\(json\\):?", "");
            prefix = prefix.replaceAll("(?i)dựa trên\\s*$", "");

            String combined = (prefix + " " + suffix).trim();
            if (!combined.isEmpty()) {
                return combined;
            }
        }

        // Nếu không có JSON, nhưng chuỗi quá dài -> lấy 250 ký tự đầu và cuối
        if (text.length() > 600) {
            return text.substring(0, 250) + " " + text.substring(text.length() - 250);
        }

        return text;
    }

    private String truncate(String text) {
        return text.length() > 90 ? text.substring(0, 90) + "…" : text;
    }

    public enum Route {
        HR,
        JOB,
        HISTORICAL,
        BOTH,
        JOB_HISTORY,
        HR_HISTORICAL
    }

    public record RetrievalTrace(
            Route route,
            int hrSignalScore,
            int jobSignalScore,
            int historicalSignalScore,
            int hrResults,
            int jobResults,
            int historicalResults,
            int duplicatesRemoved,
            int returnedResults,
            boolean metadataFiltered) {
    }

    public record RetrievalResult(List<Content> contents, RetrievalTrace trace) {
    }
}
