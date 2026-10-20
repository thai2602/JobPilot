package com.jobportal.modules.cv;

import com.jobportal.common.exception.BadRequestException;
import com.jobportal.common.exception.NotFoundException;
import com.jobportal.common.exception.UnauthorizedException;
import com.jobportal.modules.cv.dto.CvTemplateResponse;
import com.jobportal.modules.cv.dto.UserCvRequestDTO;
import com.jobportal.modules.cv.dto.UserCvResponse;
import com.jobportal.modules.user.User;
import com.jobportal.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * CV use cases. Every owner-scoped method takes the JWT user id and reports CVs of other users as 404.
 * Public methods return response DTOs, mapped inside the transaction so lazy collections are loaded.
 */
@Service
@RequiredArgsConstructor
public class CvService {

    private final UserCvRepository userCvRepository;
    private final CvTemplateRepository cvTemplateRepository;
    private final UserRepository userRepository;
    private final CvMapper cvMapper;

    /** Entities for in-process callers (AI tools); controllers use {@link #listMyCvs}. */
    @Transactional(readOnly = true)
    public List<UserCv> getUserCvs(Long userId) {
        return userCvRepository.findByUserIdAndIsDeletedFalse(userId);
    }

    @Transactional(readOnly = true)
    public List<UserCvResponse> listMyCvs(Long userId) {
        return cvMapper.toResponses(getUserCvs(userId));
    }

    @Transactional(readOnly = true)
    public List<CvTemplateResponse> getAllTemplates() {
        return cvMapper.toTemplateResponses(cvTemplateRepository.findAll());
    }

    /** Returns the CV only if it belongs to {@code ownerId}; otherwise 404 (never reveal other users' CVs). */
    @Transactional(readOnly = true)
    public UserCvResponse getOwnedCv(Long id, Long ownerId) {
        return cvMapper.toResponse(findOwnedCv(id, ownerId));
    }

    @Transactional
    public UserCvResponse createCv(Long ownerId, UserCvRequestDTO dto) {
        UserCv cv = new UserCv();
        User user = userRepository.findById(ownerId)
                .orElseThrow(() -> new UnauthorizedException("Bạn cần đăng nhập để tiếp tục"));
        cv.setUser(user);
        return cvMapper.toResponse(applyDtoAndSave(cv, dto));
    }

    @Transactional
    public UserCvResponse updateCv(Long id, Long ownerId, UserCvRequestDTO dto) {
        UserCv cv = findOwnedCv(id, ownerId);
        // Clear existing elements to replace with new data from DTO
        cv.getSkills().clear();
        cv.getExperiences().clear();
        cv.getProjects().clear();
        cv.getEducations().clear();
        cv.getAttachments().clear();
        cv.getSocials().clear();
        return cvMapper.toResponse(applyDtoAndSave(cv, dto));
    }

    private UserCv findOwnedCv(Long id, Long ownerId) {
        return userCvRepository.findByIdAndUserIdAndIsDeletedFalse(id, ownerId)
                .orElseThrow(() -> new NotFoundException("CV not found"));
    }

    private UserCv applyDtoAndSave(UserCv cv, UserCvRequestDTO dto) {
        if (dto.getTemplateId() != null) {
            CvTemplate template = cvTemplateRepository.findById(dto.getTemplateId())
                    .orElseThrow(() -> new BadRequestException("Template không tồn tại"));
            cv.setTemplate(template);
        }

        // Map basic properties
        cv.setCvName(dto.getCvName());
        cv.setFullName(dto.getFullName());
        cv.setJobTitle(dto.getJobTitle());
        cv.setSummary(dto.getSummary());
        cv.setPhone(dto.getPhone());
        cv.setEmail(dto.getEmail());
        cv.setLocation(dto.getLocation());
        cv.setAvatarUrl(dto.getAvatarUrl());
        cv.setCvData(dto.getCvData());
        cv.setSettings(dto.getSettings());
        cv.setFileUrl(dto.getFileUrl());

        // Process Skills
        // Lưu tất cả skills từ frontend: cả free-text (chỉ có skillName) lẫn skill có skillId (từ lookup table).
        if (dto.getSkills() != null) {
            for (UserCvRequestDTO.SkillDTO s : dto.getSkills()) {
                if (s.getSkillName() == null || s.getSkillName().isBlank()) continue; // bỏ qua skill trống
                UserCvSkill skill = new UserCvSkill();
                skill.setSkillName(s.getSkillName().trim());
                skill.setSkillId(s.getSkillId()); // null nếu là free-text skill, OK
                skill.setLevel(s.getLevel());
                cv.addSkill(skill);
            }
        }

        // Process Experiences
        if (dto.getExperiences() != null) {
            for (UserCvRequestDTO.ExperienceDTO e : dto.getExperiences()) {
                UserCvExperience exp = new UserCvExperience();
                exp.setCompany(e.getCompany());
                exp.setPosition(e.getPosition());
                exp.setStartDate(e.getStartDate());
                exp.setEndDate(e.getEndDate());
                exp.setDescription(e.getDescription());
                exp.setTechnologies(e.getTechnologies());
                cv.addExperience(exp);
            }
        }

        // Process Projects
        if (dto.getProjects() != null) {
            for (UserCvRequestDTO.ProjectDTO p : dto.getProjects()) {
                UserCvProject proj = new UserCvProject();
                proj.setName(p.getName());
                proj.setDescription(p.getDescription());
                proj.setTechnologies(p.getTechnologies());
                proj.setLink(p.getLink());
                cv.addProject(proj);
            }
        }

        // Process Educations
        if (dto.getEducations() != null) {
            for (UserCvRequestDTO.EducationDTO e : dto.getEducations()) {
                UserCvEducation edu = new UserCvEducation();
                edu.setSchool(e.getSchool());
                edu.setMajor(e.getMajor());
                edu.setStartDate(e.getStartDate());
                edu.setEndDate(e.getEndDate());
                cv.addEducation(edu);
            }
        }

        // Process Attachments
        if (dto.getAttachments() != null) {
            for (UserCvRequestDTO.AttachmentDTO a : dto.getAttachments()) {
                UserCvAttachment att = new UserCvAttachment();
                att.setType(a.getType());
                att.setName(a.getName());
                att.setOrganization(a.getOrganization());
                att.setYearOrLevel(a.getYearOrLevel());
                att.setDescription(a.getDescription());
                cv.addAttachment(att);
            }
        }

        // Process Socials
        if (dto.getSocials() != null) {
            for (UserCvRequestDTO.SocialDTO s : dto.getSocials()) {
                UserCvSocial soc = new UserCvSocial();
                soc.setPlatform(s.getPlatform());
                soc.setUrl(s.getUrl());
                cv.addSocial(soc);
            }
        }

        return userCvRepository.save(cv);
    }
    
    @Transactional
    public void deleteCv(Long id, Long ownerId) {
        UserCv cv = findOwnedCv(id, ownerId);
        cv.setIsDeleted(true);
        userCvRepository.save(cv);
    }
}
