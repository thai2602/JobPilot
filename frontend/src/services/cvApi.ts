import { apiRequest } from "./httpClient";

export interface ApiCvSkill {
  id?: number;
  skillId?: number;
  skillName: string;
  level?: string;
}

export interface ApiCvExperience {
  id?: number;
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  technologies?: string[];
}

export interface ApiCvEducation {
  id?: number;
  school?: string;
  major?: string;
  /** Legacy frontend aliases kept for old locally cached CV data. */
  institution?: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
}

export interface ApiCvProject {
  id?: number;
  name?: string;
  /** Legacy frontend aliases kept for old locally cached CV data. */
  projectName?: string;
  description?: string;
  technologies?: string[];
  techStack?: string;
  link?: string;
}

export interface ApiCvAttachment {
  id?: number;
  type: string;
  name: string;
  organization?: string;
  yearOrLevel?: string;
  description?: string;
}

export interface ApiCvSocial {
  id?: number;
  platform: string;
  url: string;
}

export interface ApiUserCv {
  id: number;
  cvName: string;
  fullName?: string;
  jobTitle?: string;
  summary?: string;
  phone?: string;
  email?: string;
  location?: string;
  avatarUrl?: string;
  cvData?: Record<string, unknown>;
  settings?: Record<string, unknown> & { themeColor?: string; template?: string };
  fileUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  skills: ApiCvSkill[];
  experiences: ApiCvExperience[];
  educations: ApiCvEducation[];
  projects: ApiCvProject[];
  attachments: ApiCvAttachment[];
  socials: ApiCvSocial[];
}

export interface ApiCvTemplate {
  id: number;
  name: string;
  description?: string;
  htmlStructure?: string;
  defaultSettings?: Record<string, unknown>;
}

/** Request contract of backend UserCvRequestDTO (response-only fields are excluded). */
export interface SaveCvPayload {
  userId: number;
  templateId?: number;
  cvName: string;
  fullName?: string;
  jobTitle?: string;
  summary?: string;
  phone?: string;
  email?: string;
  location?: string;
  avatarUrl?: string;
  cvData?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  fileUrl?: string;
  skills?: Array<{
    skillId?: number;
    skillName: string;
    level?: string;
  }>;
  experiences?: Array<{
    company: string;
    position: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    technologies?: string[];
  }>;
  educations?: Array<{
    school: string;
    major: string;
    startDate?: string;
    endDate?: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string[];
    link?: string;
  }>;
  attachments?: Array<{
    type: string;
    name: string;
    organization?: string;
    yearOrLevel?: string;
    description?: string;
  }>;
  socials?: Array<{
    platform: string;
    url: string;
  }>;
}

/** Extraction can populate any subset of UserCvRequestDTO. */
export type ExtractedCv = Partial<SaveCvPayload>;

/** Keep canonical backend fields while filling aliases used by older CV screens/cache. */
const normalizeUserCv = (cv: ApiUserCv): ApiUserCv => ({
  ...cv,
  skills: cv.skills ?? [],
  experiences: cv.experiences ?? [],
  educations: (cv.educations ?? []).map((education) => {
    const school = education.school ?? education.institution ?? "";
    const major = education.major ?? education.degree ?? "";
    return {
      ...education,
      school,
      major,
      institution: education.institution ?? school,
      degree: education.degree ?? major,
    };
  }),
  projects: (cv.projects ?? []).map((project) => {
    const name = project.name ?? project.projectName ?? "";
    return {
      ...project,
      name,
      projectName: project.projectName ?? name,
      techStack: project.techStack ?? project.technologies?.join(", "),
    };
  }),
  attachments: cv.attachments ?? [],
  socials: cv.socials ?? [],
});

export const cvApi = {
  async listByUser(userId: number): Promise<ApiUserCv[]> {
    const cvs = await apiRequest<ApiUserCv[]>(`/api/cvs/user/${encodeURIComponent(String(userId))}`);
    return cvs.map(normalizeUserCv);
  },

  listTemplates(): Promise<ApiCvTemplate[]> {
    return apiRequest<ApiCvTemplate[]>("/api/cvs/templates", { auth: false });
  },

  async create(payload: SaveCvPayload): Promise<ApiUserCv> {
    const cv = await apiRequest<ApiUserCv>("/api/cvs", { method: "POST", json: payload });
    return normalizeUserCv(cv);
  },

  async update(id: number, payload: SaveCvPayload): Promise<ApiUserCv> {
    const cv = await apiRequest<ApiUserCv>(`/api/cvs/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      json: payload,
    });
    return normalizeUserCv(cv);
  },

  remove(id: number): Promise<void> {
    return apiRequest<void>(`/api/cvs/${encodeURIComponent(String(id))}`, { method: "DELETE", responseType: "void" });
  },

  extract(file: File): Promise<ExtractedCv> {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Hiện tại hệ thống chỉ hỗ trợ trích xuất CV định dạng PDF.");
    }
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<ExtractedCv>("/api/cvs/extract", { method: "POST", body: formData });
  },
};
