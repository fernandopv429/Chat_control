
export interface Tool {
  id: string;
  name: string;
}

export interface Knowledge {
  type: 'text' | 'file';
  content: string; // Text content or Base64 for files
  fileName?: string;
}

export interface UserInfo {
  name: string;
  phone: string;
  email: string;
}
