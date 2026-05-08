import { ProjectPhotoGrid } from "../components/photo-grid/ProjectPhotoGrid";
import type { ProjectPhoto } from "../types/project";

interface PhotosPageProps {
  photos: ProjectPhoto[];
  isLoading: boolean;
  error?: string;
}

export function PhotosPage({ photos, isLoading, error }: PhotosPageProps) {
  return <ProjectPhotoGrid photos={photos} isLoading={isLoading} isLoadingMore={false} hasMore={false} error={error} onLoadMore={() => undefined} />;
}
