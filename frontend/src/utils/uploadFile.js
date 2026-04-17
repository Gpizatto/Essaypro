// Utilitário de upload — usa backend próprio, sem Cloudinary
export const uploadFile = async (file, API_URL) => {
  const MAX_SIZE = 15 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error('Arquivo muito grande. Máximo: 15MB');

  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erro no upload (${res.status})`);
  }

  const data = await res.json();
  return data.url; // URL do tipo /api/files/{file_id}
};
