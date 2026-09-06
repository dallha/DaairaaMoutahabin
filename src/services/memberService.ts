import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  query,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { Member } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const COLLECTION_NAME = 'members';
const membersCol = collection(db, COLLECTION_NAME);

export async function getMembers(
  pageSize: number = 10,
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<{ members: Member[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  try {
    let q = query(membersCol, orderBy('createdAt', 'desc'), limit(pageSize));
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const members = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
    
    return {
      members,
      lastDoc: querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function searchMembers(searchTerm: string, field: 'nom' | 'profession'): Promise<Member[]> {
  try {
    const q = query(
      membersCol,
      where(field, '>=', searchTerm),
      where(field, '<=', searchTerm + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function getMemberById(id: string): Promise<Member | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Member;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
  }
}

export async function addMember(member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const now = serverTimestamp();
    const docRef = await addDoc(membersCol, {
      ...member,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
}

export async function updateMember(id: string, member: Partial<Member>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...member,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteMember(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
