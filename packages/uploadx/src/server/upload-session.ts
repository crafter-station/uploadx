interface UploadSessionFile {
  key: string;
  name: string;
  size: number;
  type: string;
}

export interface UploadSession {
  id: string;
  routeEndpoint: string;
  files: UploadSessionFile[];
  metadata: unknown;
  createdAt: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Simple in-memory session store for tracking uploads
 * between presign and completion steps.
 */
class UploadSessionStore {
  private sessions = new Map<string, UploadSession>();

  create(routeEndpoint: string, files: UploadSessionFile[], metadata: unknown): UploadSession {
    const id = crypto.randomUUID();
    const session: UploadSession = {
      id,
      routeEndpoint,
      files,
      metadata,
      createdAt: Date.now(),
    };
    this.sessions.set(id, session);
    this.cleanup();
    return session;
  }

  get(id: string): UploadSession | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    // Check if session has expired
    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }

  /** Remove expired sessions. */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}

export const uploadSessions = new UploadSessionStore();
