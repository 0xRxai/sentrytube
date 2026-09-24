export type Role = "user" | "moderator" | "admin";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  role: Role;
};

export type Video = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  playback_id: string | null;
  status: string;
  moderation_status: string;
  location: string | null;
  view_count: number;
  created_at: string;
  profiles?: Pick<Profile, "id" | "username" | "display_name"> | null;
  video_tags?: { tags: { id: string; slug: string; label: string } | null }[];
};

export const isStaff = (r?: Role) => r === "moderator" || r === "admin";
export const isAdmin = (r?: Role) => r === "admin";
