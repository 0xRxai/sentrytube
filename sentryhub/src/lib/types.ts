export type Role = "user" | "moderator" | "admin";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  created_at: string;
};

export type FeatureFlag = {
  key: string;
  label: string;
  description: string | null;
  min_role: Role;
};

export type AdPlacement = "feed" | "sidebar" | "preroll";

export type Ad = {
  id: string;
  campaign_id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  target_url: string;
  placement: AdPlacement;
  weight: number;
  active: boolean;
  created_at: string;
};

export type AdCampaign = {
  id: string;
  name: string;
  advertiser: string | null;
  status: "active" | "paused" | "ended";
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type EventType = "video_view" | "watch_progress" | "ad_impression" | "ad_click";

export type CreatorVideoStat = {
  video_id: string;
  title: string;
  status: VideoStatus;
  moderation_status: ModerationStatus;
  views: number;
  watch_seconds: number;
  likes: number;
  comments: number;
  created_at: string;
};

export type TagCategory = {
  id: string;
  slug: string;
  label: string;
  sort: number;
};

export type Tag = {
  id: string;
  category_id: string;
  slug: string;
  label: string;
};

export type CategoryWithTags = TagCategory & { tags: Tag[] };

export type VideoStatus = "uploading" | "processing" | "ready" | "errored";
export type ModerationStatus = "active" | "hidden" | "removed";

export type Video = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  provider: string;
  upload_id: string | null;
  asset_id: string | null;
  playback_id: string | null;
  status: VideoStatus;
  moderation_status: ModerationStatus;
  thumbnail_url: string | null;
  location: string | null;
  event_date: string | null;
  duration_seconds: number | null;
  view_count: number;
  created_at: string;
};

export type VideoWithOwner = Video & {
  profiles: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
  video_tags?: { tags: Tag | null }[];
};

export type Comment = {
  id: string;
  video_id: string;
  author_id: string;
  body: string;
  is_removed: boolean;
  created_at: string;
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url"> | null;
};

export type ReportReason = "illegal" | "harassment" | "spam" | "privacy" | "other";
export type ReportStatus = "open" | "actioned" | "dismissed";

export type Report = {
  id: string;
  reporter_id: string;
  target_type: "video" | "comment";
  video_id: string | null;
  comment_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  videos: Pick<Video, "id" | "title"> | null;
  comments: Pick<Comment, "id" | "body" | "video_id"> | null;
  reporter: Pick<Profile, "username" | "display_name"> | null;
};

export type NotificationPrefs = {
  user_id: string;
  notify_new_video: boolean;
  notify_comments: boolean;
  notify_likes: boolean;
};

export type NotificationType = "new_video" | "comment" | "like";

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  video_id: string | null;
  comment_id: string | null;
  tag_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: Pick<Profile, "username" | "display_name"> | null;
  videos: Pick<Video, "id" | "title"> | null;
  tags: Pick<Tag, "slug" | "label"> | null;
};
