import { JOB_COLORS } from "@/renderer/features/shared/constants/jobColors";

export const getJobColor = (job: string): string => {
  return JOB_COLORS[job?.toUpperCase()] || "#CBD5E1"; // 기본값 gray-300
};
