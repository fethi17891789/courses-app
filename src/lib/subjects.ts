// Shared constants for the subjects (PDF) feature.

// Max upload size, enforced client-side, server-side, and at the Storage bucket level.
export const MAX_SUBJECT_SIZE = 5 * 1024 * 1024; // 5 MB

export const SUBJECTS_BUCKET = "subjects";

// How long a minted signed URL stays valid. Kept long (and cached client-side) so the
// browser / service-worker cache can serve repeat views without new egress.
export const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days
