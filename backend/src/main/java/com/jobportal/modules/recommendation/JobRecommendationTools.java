package com.jobportal.modules.recommendation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JobRecommendationTools {

    private final JobRecommendationService recommendationService;
    private final ObjectMapper objectMapper;

    @Tool("Search the live JobPilot database for current published and unexpired jobs together with their public company information. " +
          "Use this tool when the user asks for suitable jobs, hiring companies, job opportunities, salary, location, level, or requirements. " +
          "Extract concise keywords from the user's CV or question before calling it. Never invent jobs that are not returned by this tool.")
    public String searchOpenJobs(
            String keywords,
            String location,
            String jobLevel,
            Integer limit) {
        int safeLimit = limit == null ? 8 : limit;
        try {
            return objectMapper.writeValueAsString(
                    recommendationService.searchOpenJobContext(keywords, location, jobLevel, safeLimit));
        } catch (JsonProcessingException exception) {
            return "{\"error\":\"Không thể chuyển dữ liệu công việc thành JSON.\"}";
        }
    }
}
