
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppPageShell } from "../../components/AppPageShell";
import { MyVideosClient } from "../../components/MyVideosClient";
import { listVideosByUserId } from "../../lib/video-repository";
import { auth } from "../../lib/auth";

export default async function VideosPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const videos = await listVideosByUserId(userId);

  return (
    <AppPageShell
      title="My Videos"
      subtitle="Browse, play, download, and manage videos created under your account."
    >
      <MyVideosClient initialVideos={videos as any[]} />
    </AppPageShell>
  );
}