import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadForm from "@/components/UploadForm";
import type { CategoryWithTags } from "@/lib/types";

export default async function UploadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("tag_categories")
    .select("*, tags(*)")
    .order("sort");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Upload Sentry footage</h1>
      <UploadForm categories={(categories as CategoryWithTags[]) ?? []} />
    </div>
  );
}
