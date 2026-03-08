import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '../types';

WebBrowser.maybeCompleteAuthSession();

const GDRIVE_AUTH_KEY = '@dd_tracker_gdrive_token';
const GDRIVE_FILE_NAME = 'dd-tracker-data.json';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

if (!GOOGLE_CLIENT_ID) {
  console.warn(
    '[googleDrive] EXPO_PUBLIC_GOOGLE_CLIENT_ID is not set. ' +
      'Google Drive sync will not work. ' +
      'Set this in your .env file before building.'
  );
}

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const scopes = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
];

export interface GoogleAuthState {
  accessToken: string;
  email?: string;
}

/**
 * Persist auth token to AsyncStorage.
 */
async function saveAuthState(state: GoogleAuthState): Promise<void> {
  await AsyncStorage.setItem(GDRIVE_AUTH_KEY, JSON.stringify(state));
}

/**
 * Load persisted auth token from AsyncStorage.
 */
export async function loadAuthState(): Promise<GoogleAuthState | null> {
  try {
    const json = await AsyncStorage.getItem(GDRIVE_AUTH_KEY);
    if (!json) return null;
    return JSON.parse(json) as GoogleAuthState;
  } catch {
    return null;
  }
}

/**
 * Sign out and clear the stored token.
 */
export async function signOut(): Promise<void> {
  const auth = await loadAuthState();
  if (auth?.accessToken) {
    try {
      await fetch(
        `${discovery.revocationEndpoint}?token=${encodeURIComponent(auth.accessToken)}`,
        { method: 'POST' }
      );
    } catch (_) {
      // Ignore revocation errors
    }
  }
  await AsyncStorage.removeItem(GDRIVE_AUTH_KEY);
}

/**
 * Build AuthSession request.
 */
export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'ddtracker' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      scopes,
      responseType: AuthSession.ResponseType.Token,
      prompt: AuthSession.Prompt.Consent,
    },
    discovery
  );

  return { request, response, promptAsync };
}

/**
 * Search for the backup file in Google Drive.
 */
async function findDriveFile(accessToken: string): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${GDRIVE_FILE_NAME}' and trashed=false&spaces=drive&fields=files(id,name,modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id as string;
  }
  return null;
}

/**
 * Upload (create or update) items to Google Drive.
 */
export async function uploadToDrive(
  items: FoodItem[],
  accessToken: string
): Promise<boolean> {
  try {
    const content = JSON.stringify(items, null, 2);
    const existingFileId = await findDriveFile(accessToken);

    if (existingFileId) {
      // Update existing file
      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: content,
        }
      );
      return res.ok;
    } else {
      // Create new file
      const metadata = {
        name: GDRIVE_FILE_NAME,
        mimeType: 'application/json',
        description: 'Dd-Tracker food items backup',
      };

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append('file', new Blob([content], { type: 'application/json' }));

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        }
      );
      return res.ok;
    }
  } catch (err) {
    console.error('Google Drive upload failed:', err);
    return false;
  }
}

/**
 * Download items from Google Drive.
 */
export async function downloadFromDrive(
  accessToken: string
): Promise<FoodItem[] | null> {
  try {
    const fileId = await findDriveFile(accessToken);
    if (!fileId) return null;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) return null;
    const items = await res.json();
    return items as FoodItem[];
  } catch (err) {
    console.error('Google Drive download failed:', err);
    return null;
  }
}
