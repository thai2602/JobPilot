package com.jobportal.modules.cv;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobportal.modules.cv.dto.UserCvRequestDTO;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.parser.apache.pdfbox.ApachePdfBoxDocumentParser;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CvExtractionAgnosticService {

    private final ChatLanguageModel chatLanguageModel;
    private final ObjectMapper objectMapper;

    // Prompt được xây dựng bọc thép, ép trả về định dạng JSON markdown
    private static final String CV_EXTRACTION_PROMPT = """
        Bạn là một hệ thống trích xuất dữ liệu CV tự động. Nhiệm vụ của bạn là đọc nội dung văn bản CV dưới đây và điền thông tin vào định dạng JSON yêu cầu.
        
        QUY TẮC BẮT BUỘC:
        1. CHỈ TRẢ VỀ DUY NHẤT một block code chứa JSON. KHÔNG giải thích, KHÔNG thêm bất kỳ văn bản nào trước hoặc sau JSON.
        2. Dữ liệu phải được bọc trong markdown block: ```json và ```
        3. Tuyệt đối tuân thủ chính xác các key, bao gồm cả các object lồng nhau (nested objects) trong JSON mẫu dưới đây. Không tự ý đổi tên key (ví dụ: dùng "education" chứ không dùng "educations").
        4. Nếu thông tin nào không có trong CV, hãy gán giá trị là null (đối với chuỗi/số/object) hoặc mảng rỗng [] (đối với danh sách).
        5. Đối với các trường hệ thống không có trong text CV (như id, avatar, settings), hãy gán null hoặc giữ nguyên giá trị mặc định như trong mẫu.
        6. Lọc bỏ các thông tin thừa không thuộc bất kỳ trường nào trong cấu trúc JSON.
        7. PHÂN BIỆT RÕ RÀNG giữa "experiences" (Kinh nghiệm làm việc) và "projects" (Dự án cá nhân):
           - "experiences" CHỈ chứa các công việc làm thuê thực tế tại các công ty/tổ chức (phải có tên công ty và vị trí công việc rõ ràng, ví dụ: FPT Software, Software Engineer).
           - "projects" CHỈ chứa các dự án cá nhân, dự án tốt nghiệp, bài tập lớn, ứng dụng hoặc sản phẩm tự làm. Tuyệt đối KHÔNG đưa các dự án này vào mục "experiences" dưới dạng các công ty trống hoặc vị trí trống.
        
        JSON MẪU ĐÍCH:
        ```json
        {
          "title": "Tiêu đề CV (VD: Frontend Developer CV)",
          "fullName": "Tên đầy đủ",
          "jobTitle": "Vị trí công việc",
          "email": "Email",
          "phone": "Số điện thoại",
          "location": "Địa chỉ / Khu vực",
          "avatarUrl": null,
          "summary": "Tóm tắt bản thân",
          "skills": [
            {
              "skillName": "Tên kỹ năng (VD: JavaScript, React)",
              "level": "Mức độ thành thạo (VD: Beginner, Intermediate, Advanced)"
            }
          ],
          "experiences": [
            {
              "company": "Tên công ty",
              "position": "Vị trí",
              "startDate": "YYYY-MM",
              "endDate": "YYYY-MM hoặc Present",
              "description": "Mô tả công việc",
              "technologies": ["Công nghệ 1", "Công nghệ 2"]
            }
          ],
          "projects": [
            {
              "name": "Tên dự án",
              "description": "Mô tả dự án",
              "technologies": ["Công nghệ 1", "Công nghệ 2"],
              "link": "Link dự án"
            }
          ],
          "educations": [
            {
              "school": "Tên trường",
              "major": "Chuyên ngành",
              "startDate": "YYYY",
              "endDate": "YYYY hoặc Present"
            }
          ],
          "attachments": [
            {
              "type": "Loại chứng chỉ / giải thưởng (VD: CERTIFICATE, AWARD, SCHOLARSHIP)",
              "name": "Tên chứng chỉ / giải thưởng (VD: JLPT N3, IELTS 7.5)",
              "organization": "Tổ chức cấp (VD: Japan Foundation, IDP)",
              "yearOrLevel": "Năm hoặc cấp độ (VD: 2024, N3, 7.5)",
              "description": "Mô tả ngắn gọn (nếu có)"
            }
          ],
          "socials": [
            {
              "platform": "Tên nền tảng (VD: LinkedIn, GitHub)",
              "url": "Đường dẫn liên kết (VD: https://github.com/username)"
            }
          ],
          "settings": {
            "themeColor": "#2563eb",
            "fontFamily": "Inter",
            "layout": "two-column"
          }
        }
        ```
        
        NỘI DUNG CV CẦN TRÍCH XUẤT:
        %s
        """;

    public CvExtractionAgnosticService(ChatLanguageModel chatLanguageModel) {
        this.chatLanguageModel = chatLanguageModel;
        this.objectMapper = new ObjectMapper()
                // Bỏ qua các key bị model tự chế thêm để không gây lỗi parse
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false); 
    }

    /**
     * Hàm chính: Đọc PDF -> Trích xuất Text -> Đưa vào LLM -> Regex bóc tách JSON -> Parse ra Object
     */
    public UserCvRequestDTO extractCvData(MultipartFile file) throws IOException {
        // 1. Đọc file PDF sang Text
        String cvText = parsePdfToText(file);

        // 2. Format Prompt
        String finalPrompt = String.format(CV_EXTRACTION_PROMPT, cvText);

        // 3. Gọi Model (Bất kể là Llama 3, Gemma 4, hay GPT)
        String llmResponse = chatLanguageModel.generate(finalPrompt);

        // 4. Bóc tách JSON
        String jsonStr = extractJsonFromMarkdown(llmResponse);
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            throw new RuntimeException("LLM không trả về định dạng JSON hợp lệ.");
        }

        // 5. Parse JSON thành DTO
        try {
            return objectMapper.readValue(jsonStr, UserCvRequestDTO.class);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi parse JSON từ LLM: " + e.getMessage());
        }
    }

    private String parsePdfToText(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename != null && !filename.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("Chỉ hỗ trợ file PDF. File tải lên: " + filename);
        }
        try {
            ApachePdfBoxDocumentParser parser = new ApachePdfBoxDocumentParser();
            Document document = parser.parse(file.getInputStream());
            String text = document.text();
            if (text != null) {
                // Loại bỏ tất cả các ký tự điều khiển lỗi (Control Characters) trừ các khoảng trắng chuẩn (\n, \r, \t)
                text = text.replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", "");
            }
            return text;
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().contains("text cannot be null or blank")) {
                throw new IllegalArgumentException("Không thể trích xuất văn bản từ file PDF. File PDF này có thể là file ảnh/scan hoặc không có chữ. Vui lòng sử dụng file PDF có thể bôi đen chữ.");
            }
            throw new IOException("Lỗi khi đọc file PDF: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new IOException("Lỗi khi đọc file PDF: " + e.getMessage(), e);
        }
    }

    private String extractJsonFromMarkdown(String text) {
        Pattern pattern = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        
        // Fallback: Kiểm tra xem toàn bộ câu trả lời có phải là JSON thuần không
        if (text.trim().startsWith("{") && text.trim().endsWith("}")) {
            return text.trim();
        }
        
        return null;
    }
}
