// src/services/eventsService.ts
import { collection, doc, getDocs, setDoc, DocumentData, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from 'firebase/firestore';
import { db } from './firebase'; // Your initialized Firebase app
import { Event } from '../types/firestore'; // Your interfaces

// 1. Define the Converter
const eventConverter: FirestoreDataConverter<Event> = {
  toFirestore(event: Event): DocumentData {
    // Note: We don't save the 'id' inside the document fields since it's the document key
    const { id, ...data } = event; 
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Event {
    const data = snapshot.data(options)!;
    return { id: snapshot.id, ...data } as Event;
  }
};

// 2. Create the strongly-typed collection reference
export const eventsRef = collection(db, 'events').withConverter(eventConverter);

// 3. Export helper functions that your UI will actually call
export async function getAllEvents(): Promise<Event[]> {
  // Because of the converter, querySnapshot is automatically typed as Event[]
  const querySnapshot = await getDocs(eventsRef);
  return querySnapshot.docs.map(doc => doc.data()); 
}

export async function createEvent(newEvent: Event): Promise<void> {
  // Because of the converter, TypeScript will ensure newEvent has all required Event fields
  const newDocRef = doc(eventsRef); // Auto-generate ID
  newEvent.id = newDocRef.id;
  await setDoc(newDocRef, newEvent);
}