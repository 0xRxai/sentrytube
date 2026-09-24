// Mux HLS stream + thumbnail helpers (same playback ids as the web app).
export function hlsUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function thumbnailUrl(playbackId: string, time = 1): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=640`;
}
