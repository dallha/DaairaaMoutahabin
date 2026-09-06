import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ActivityLogItem } from '../types';

const COLLECTION_NAME = 'auditLogs';

export async function addAuditLog(log: Omit<ActivityLogItem, 'id' | 'timestamp'>) {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      ...log,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to add audit log:', error);
  }
}
